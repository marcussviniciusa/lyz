import { Request, Response } from 'express';
import Setting from '../models/Setting';

// Constantes
const OPENAI_API_KEY = 'openai_api_key';

/**
 * Obter a chave de API atual da OpenAI
 */
export const getOpenAIApiKey = async (req: Request, res: Response): Promise<void> => {
  try {
    // Buscar a configuração no banco de dados
    const setting = await Setting.findOne({
      where: { key: OPENAI_API_KEY }
    });

    res.status(200).json({
      success: true,
      config: setting ? setting.value : null
    });
  } catch (error) {
    console.error('Erro ao obter chave de API da OpenAI:', error);
    res.status(500).json({
      success: false,
      message: 'Erro ao obter chave de API da OpenAI'
    });
  }
};

/**
 * Atualizar a chave de API da OpenAI
 */
export const updateOpenAIApiKey = async (req: Request, res: Response): Promise<void> => {
  try {
    const { apiKey } = req.body;
    
    if (!apiKey || !apiKey.startsWith('sk-')) {
      res.status(400).json({
        success: false,
        message: 'A chave de API fornecida é inválida. Deve começar com "sk-"'
      });
      return;
    }
    
    // Atualizar ou criar a configuração no banco de dados
    const [setting, created] = await Setting.findOrCreate({
      where: { key: OPENAI_API_KEY },
      defaults: { 
        key: OPENAI_API_KEY,
        value: apiKey
      }
    });
    
    if (!created) {
      setting.value = apiKey;
      await setting.save();
    }
    
    console.log('Chave de API da OpenAI salva com sucesso no banco de dados');
    
    res.status(200).json({
      success: true,
      message: 'Chave de API da OpenAI atualizada com sucesso'
    });
  } catch (error) {
    console.error('Erro ao atualizar chave de API da OpenAI:', error);
    res.status(500).json({
      success: false,
      message: 'Erro ao atualizar chave de API da OpenAI'
    });
  }
};
