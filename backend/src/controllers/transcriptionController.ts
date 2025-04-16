import { Request, Response } from 'express';
import fs from 'fs';
import path from 'path';
import { v4 as uuidv4 } from 'uuid';
import { SpeechClient } from '@google-cloud/speech';
import Setting from '../models/Setting';

// Constantes
const GOOGLE_SPEECH_CONFIG_KEY = 'google_speech_credentials';

export const transcribeAudio = async (req: Request, res: Response): Promise<void> => {
  try {
    if (!req.file) {
      res.status(400).json({ error: 'Nenhum arquivo de áudio enviado', transcription: '' });
      return;
    }

    const audioFilePath = req.file.path;
    const audioBuffer = fs.readFileSync(audioFilePath);

    // Usar a API do Google Speech para transcrição
    let transcription = '';
    let transcriptionSource = 'google';
    
    console.log(`Informações do arquivo de áudio:`);
    console.log(`Nome original: ${req.file.originalname}`);
    console.log(`Tipo MIME: ${req.file.mimetype}`);
    console.log(`Tamanho: ${req.file.size} bytes`);
    
    // Verificar se o diretório uploads existe (para arquivos temporários)
    const uploadsDir = path.join(__dirname, '../../uploads');
    if (!fs.existsSync(uploadsDir)) {
      fs.mkdirSync(uploadsDir, { recursive: true });
    }

    try {
      // Verificar se temos configurações personalizadas do Google Speech
      const setting = await Setting.findOne({
        where: { key: GOOGLE_SPEECH_CONFIG_KEY }
      });
      
      // Opções para o cliente Speech
      let clientOptions = {};
      
      // Se temos configurações personalizadas salvas no banco
      if (setting && setting.value) {
        try {
          // Tentar usar as credenciais configuradas pelo superadmin
          const credentialsJson = JSON.parse(setting.value);
          
          // Usar as credenciais diretamente em memória, sem escrever em arquivo
          clientOptions = {
            credentials: credentialsJson
          };
          console.log('Usando configuração personalizada do Google Speech diretamente do banco de dados');
        } catch (configError) {
          console.error('Erro ao processar configuração do Google Speech:', configError);
          // Se falhar, continuará usando as configurações padrão
        }
      } else {
        console.log('Usando configuração padrão do Google Speech (variáveis de ambiente)');
      }
      
      // Criar o cliente do Speech-to-Text com as opções determinadas
      const speechClient = new SpeechClient(clientOptions);
      
      const audio = {
        content: audioBuffer.toString('base64'),
      };
      
      // Determinar o tipo de arquivo com base no nome ou conteúdo do arquivo
      let fileExtension = '';
      if (req.file && req.file.originalname) {
        fileExtension = req.file.originalname.split('.').pop()?.toLowerCase() || '';
      }
      
      // Configurar o encoding baseado no tipo de arquivo
      let encoding: 'LINEAR16' | 'OGG_OPUS' | 'WEBM_OPUS' = 'LINEAR16';
      
      // Verificar o tipo de arquivo por extensão ou MIME type
      const isOggOpus = fileExtension === 'ogg' || fileExtension === 'opus' || 
                     (req.file?.mimetype && (req.file.mimetype.includes('ogg') || req.file.mimetype.includes('opus')));
      
      const isWebm = fileExtension === 'webm' || 
                  (req.file?.mimetype && req.file.mimetype.includes('webm'));
                  
      // Verificar se é um formato de áudio comum para gravação de microfone do navegador
      const isWebAudio = req.file?.mimetype && (
          req.file.mimetype.includes('webm') ||
          req.file.mimetype.includes('audio/webm') ||
          req.file.mimetype.includes('audio/ogg') ||
          req.file.mimetype.includes('audio/wav') ||
          req.file.mimetype.includes('audio/mp4')
      );
                  
      if (isOggOpus) {
        encoding = 'OGG_OPUS';
        console.log('Detectado formato de áudio OGG_OPUS');
      } else if (isWebm || isWebAudio) {
        // Para gravações de microfone do navegador, é mais seguro usar WEBM_OPUS
        encoding = 'WEBM_OPUS';
        console.log('Detectado formato de áudio WEBM_OPUS ou áudio do navegador');
      } else {
        console.log(`Usando formato padrão LINEAR16 para extensão: ${fileExtension}, mimetype: ${req.file?.mimetype || 'desconhecido'}`);
      }
      
      // Para formatos OGG_OPUS e WEBM_OPUS, não devemos especificar a taxa de amostragem
      // A API Google Speech vai obter essa informação do próprio cabeçalho do arquivo
      // Deixar que o Google Speech detecte automaticamente a taxa de amostragem
      // para evitar erros quando o formato real do arquivo não corresponde à extensão ou MIME type
      const request = {
        audio: audio,
        config: {
          encoding: encoding,
          languageCode: 'pt-BR'
          // Não especificamos sampleRateHertz para que seja detectado automaticamente
        }
      };
      
      console.log(`Enviando requisição de transcrição com encoding: ${encoding}`);
      console.log('Taxa de amostragem não especificada, será detectada automaticamente do arquivo');
      
      const [response] = await speechClient.recognize(request);
      
      console.log('Resposta do Google Speech:', JSON.stringify(response, null, 2));
      
      if (response.results && response.results.length > 0) {
        transcription = response.results
          .map(result => result.alternatives[0].transcript)
          .join('\n');
          
        console.log(`Transcrição realizada com sucesso: "${transcription}"`);
      } else {
        console.log('Google Speech não detectou fala no áudio ou retornou resultado vazio');
      }
      
      console.log('Processamento de transcrição concluído usando Google Speech');
    } catch (error) {
      console.error('Erro ao usar Google Speech:', error);
      throw new Error('Não foi possível realizar a transcrição do áudio. Verifique se as APIs estão configuradas corretamente.');
    }

    // Limpar o arquivo temporário
    fs.unlinkSync(audioFilePath);

    // Garantir que sempre temos um valor para transcrição, mesmo que vazio
    res.status(200).json({ 
      transcription: transcription || '', 
      source: transcriptionSource 
    });
  } catch (error) {
    console.error('Erro na transcrição:', error);
    // Garantir que sempre enviamos um campo de transcrição, mesmo em caso de erro
    res.status(500).json({ 
      error: 'Erro ao processar a transcrição', 
      message: error instanceof Error ? error.message : 'Erro desconhecido',
      transcription: '' 
    });
  }
};
