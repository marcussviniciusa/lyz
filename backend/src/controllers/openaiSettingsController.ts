import { Request, Response } from 'express';
import Setting from '../models/Setting';

// Constantes
const OPENAI_API_KEY = 'openai_api_key';
const GOOGLE_API_KEY = 'google_api_key';
const ANTHROPIC_API_KEY = 'anthropic_api_key';

/**
 * Obter todas as chaves de API
 */
export const getAllApiKeys = async (req: Request, res: Response): Promise<void> => {
  try {
    // Buscar todas as configurações de API no banco de dados
    const settings = await Setting.findAll({
      where: { 
        key: [OPENAI_API_KEY, GOOGLE_API_KEY, ANTHROPIC_API_KEY] 
      }
    });

    // Converter para objeto para facilitar o uso no frontend
    const apiKeys = {
      openai: null,
      google: null,
      anthropic: null
    };

    settings.forEach(setting => {
      switch (setting.key) {
        case OPENAI_API_KEY:
          apiKeys.openai = setting.value;
          break;
        case GOOGLE_API_KEY:
          apiKeys.google = setting.value;
          break;
        case ANTHROPIC_API_KEY:
          apiKeys.anthropic = setting.value;
          break;
      }
    });

    res.status(200).json({
      success: true,
      data: { apiKeys }
    });
  } catch (error) {
    console.error('Erro ao obter chaves de API:', error);
    res.status(500).json({
      success: false,
      message: 'Erro ao obter chaves de API'
    });
  }
};

/**
 * Atualizar uma chave de API específica
 */
export const updateApiKey = async (req: Request, res: Response): Promise<void> => {
  try {
    const { provider } = req.params;
    const { apiKey } = req.body;
    
    // Validar o provedor
    let settingKey: string;
    let validationPrefix: string;
    
    switch (provider.toLowerCase()) {
      case 'openai':
        settingKey = OPENAI_API_KEY;
        validationPrefix = 'sk-';
        break;
      case 'google':
        settingKey = GOOGLE_API_KEY;
        validationPrefix = 'AIza';
        break;
      case 'anthropic':
        settingKey = ANTHROPIC_API_KEY;
        validationPrefix = 'sk-ant-';
        break;
      default:
        res.status(400).json({
          success: false,
          message: 'Provedor inválido. Use: openai, google ou anthropic'
        });
        return;
    }
    
    // Validar formato da chave
    if (!apiKey || !apiKey.startsWith(validationPrefix)) {
      res.status(400).json({
        success: false,
        message: `A chave de API do ${provider} deve começar com "${validationPrefix}"`
      });
      return;
    }
    
    // Atualizar ou criar a configuração no banco de dados
    const [setting, created] = await Setting.findOrCreate({
      where: { key: settingKey },
      defaults: { 
        key: settingKey,
        value: apiKey
      }
    });
    
    if (!created) {
      setting.value = apiKey;
      await setting.save();
    }
    
    console.log(`Chave de API do ${provider} salva com sucesso no banco de dados`);
    
    res.status(200).json({
      success: true,
      message: `Chave de API do ${provider} atualizada com sucesso`
    });
  } catch (error) {
    console.error('Erro ao atualizar chave de API:', error);
    res.status(500).json({
      success: false,
      message: 'Erro ao atualizar chave de API'
    });
  }
};

/**
 * Remover uma chave de API específica
 */
export const removeApiKey = async (req: Request, res: Response): Promise<void> => {
  try {
    const { provider } = req.params;
    
    // Validar o provedor
    let settingKey: string;
    
    switch (provider.toLowerCase()) {
      case 'openai':
        settingKey = OPENAI_API_KEY;
        break;
      case 'google':
        settingKey = GOOGLE_API_KEY;
        break;
      case 'anthropic':
        settingKey = ANTHROPIC_API_KEY;
        break;
      default:
        res.status(400).json({
          success: false,
          message: 'Provedor inválido. Use: openai, google ou anthropic'
        });
        return;
    }
    
    // Remover a configuração
    const deletedRows = await Setting.destroy({
      where: { key: settingKey }
    });
    
    if (deletedRows === 0) {
      res.status(404).json({
        success: false,
        message: `Chave de API do ${provider} não encontrada`
      });
      return;
    }
    
    console.log(`Chave de API do ${provider} removida com sucesso`);
    
    res.status(200).json({
      success: true,
      message: `Chave de API do ${provider} removida com sucesso`
    });
  } catch (error) {
    console.error('Erro ao remover chave de API:', error);
    res.status(500).json({
      success: false,
      message: 'Erro ao remover chave de API'
    });
  }
};

// Manter compatibilidade com funções antigas
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
