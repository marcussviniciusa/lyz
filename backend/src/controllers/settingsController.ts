import { Request, Response } from 'express';
import Setting from '../models/Setting';

// Constantes
const GOOGLE_SPEECH_CONFIG_KEY = 'google_speech_credentials';
const OPENAI_API_KEY = 'openai_api_key';

/**
 * Obter a configuração atual do Google Speech
 */
export const getGoogleSpeechConfig = async (req: Request, res: Response): Promise<void> => {
  try {
    // Buscar a configuração no banco de dados
    const setting = await Setting.findOne({
      where: { key: GOOGLE_SPEECH_CONFIG_KEY }
    });

    res.status(200).json({
      success: true,
      config: setting ? setting.value : null
    });
  } catch (error) {
    console.error('Erro ao obter configuração do Google Speech:', error);
    res.status(500).json({
      success: false,
      message: 'Erro ao obter configuração do Google Speech'
    });
  }
};

/**
 * Atualizar a configuração do Google Speech
 */
export const updateGoogleSpeechConfig = async (req: Request, res: Response): Promise<void> => {
  try {
    const { config } = req.body;
    
    // Verificar se o JSON é válido
    if (config) {
      try {
        // Parse para garantir que é um JSON válido
        JSON.parse(config);
      } catch (e) {
        res.status(400).json({
          success: false,
          message: 'O JSON fornecido é inválido'
        });
        return;
      }
    }
    
    // Atualizar ou criar a configuração no banco de dados
    const [setting, created] = await Setting.findOrCreate({
      where: { key: GOOGLE_SPEECH_CONFIG_KEY },
      defaults: { 
        key: GOOGLE_SPEECH_CONFIG_KEY,
        value: config || null
      }
    });
    
    if (!created) {
      setting.value = config || null;
      await setting.save();
    }
    
    // Armazenamos apenas no banco de dados
    // Não tentamos escrever no arquivo de sistema porque pode estar montado como volume somente leitura
    console.log('Configuração do Google Speech salva com sucesso no banco de dados');
    
    res.status(200).json({
      success: true,
      message: 'Configuração do Google Speech atualizada com sucesso'
    });
  } catch (error) {
    console.error('Erro ao atualizar configuração do Google Speech:', error);
    res.status(500).json({
      success: false,
      message: 'Erro ao atualizar configuração do Google Speech'
    });
  }
};
