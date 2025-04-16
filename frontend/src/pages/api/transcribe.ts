import type { NextApiRequest, NextApiResponse } from 'next';
import { IncomingForm, Files, Fields } from 'formidable';
import fs from 'fs';
import path from 'path';
import axios from 'axios';

// Desabilitar a análise automática do corpo da requisição pelo Next.js
export const config = {
  api: {
    bodyParser: false,
  },
};

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    // Criar diretório para uploads temporários
    const uploadDir = path.join(process.cwd(), 'tmp');
    
    // Certificar-se de que o diretório de upload existe
    if (!fs.existsSync(uploadDir)) {
      fs.mkdirSync(uploadDir, { recursive: true });
    }
    
    // Configurar o formidable para v2
    const form = new IncomingForm({
      keepExtensions: true,
      uploadDir: uploadDir,
      maxFileSize: 10 * 1024 * 1024, // 10MB
    });

    // Parseamos o formulário usando Promise para usar com async/await
    const [fields, files] = await new Promise<[Fields, Files]>((resolve, reject) => {
      form.parse(req, (err, fields, files) => {
        if (err) return reject(err);
        resolve([fields, files]);
      });
    });

    try {
      // Obter o arquivo de áudio
      const audioFile = files.audio;
      if (!audioFile || (Array.isArray(audioFile) && audioFile.length === 0)) {
        return res.status(400).json({ error: 'No audio file provided' });
      }

      // Garantir que temos acesso ao arquivo
      const audioFileObj = Array.isArray(audioFile) ? audioFile[0] : audioFile;

      // Criar FormData para enviar ao backend
      const formData = new FormData();
      const fileBuffer = fs.readFileSync(audioFileObj.filepath);
      
      // Anexar arquivo ao FormData
      const blob = new Blob([fileBuffer], { type: audioFileObj.mimetype || 'audio/wav' });
      formData.append('audio', blob, audioFileObj.originalFilename || 'recording.wav');

      // Enviar para o backend
      const apiUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001';
      // Usar apenas /transcribe para evitar duplicação do /api
      const response = await axios.post(`${apiUrl}/transcribe`, formData, {
        headers: {
          'Content-Type': 'multipart/form-data',
        },
      });

      // Limpar o arquivo temporário
      try {
        fs.unlinkSync(audioFileObj.filepath);
      } catch (cleanupErr) {
        console.error('Erro ao limpar arquivo temporário:', cleanupErr);
      }

      // Retornar a resposta do backend
      return res.status(200).json(response.data);
    } catch (error: any) {
      console.error('Erro ao enviar áudio para transcrição:', error);
      return res.status(error?.response?.status || 500).json({
        error: error?.response?.data?.error || 'Error processing transcription',
      });
    }
  } catch (error) {
    console.error('Erro no handler de transcrição:', error);
    return res.status(500).json({ error: 'Internal server error' });
  }
}
