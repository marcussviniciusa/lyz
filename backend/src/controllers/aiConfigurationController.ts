import { Request, Response } from 'express';
import AIConfiguration from '../models/AIConfiguration';
import User from '../models/User';

// Get all AI configurations
export const getAIConfigurations = async (req: Request, res: Response) => {
  try {
    const configurations = await AIConfiguration.findAll({
      include: [
        {
          model: User,
          as: 'updatedBy',
          attributes: ['id', 'name', 'email'],
        },
      ],
      order: [['page_key', 'ASC']],
    });

    res.json({
      success: true,
      data: { configurations },
    });
  } catch (error) {
    console.error('Error fetching AI configurations:', error);
    res.status(500).json({
      success: false,
      message: 'Erro interno do servidor',
    });
  }
};

// Get AI configuration by ID
export const getAIConfigurationById = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;

    const configuration = await AIConfiguration.findByPk(id, {
      include: [
        {
          model: User,
          as: 'updatedBy',
          attributes: ['id', 'name', 'email'],
        },
      ],
    });

    if (!configuration) {
      return res.status(404).json({
        success: false,
        message: 'Configuração não encontrada',
      });
    }

    res.json({
      success: true,
      data: { configuration },
    });
  } catch (error) {
    console.error('Error fetching AI configuration by ID:', error);
    res.status(500).json({
      success: false,
      message: 'Erro interno do servidor',
    });
  }
};

// Get AI configuration by page key
export const getAIConfigurationByPageKey = async (req: Request, res: Response) => {
  try {
    const { pageKey } = req.params;

    const configuration = await AIConfiguration.findOne({
      where: { page_key: pageKey },
      include: [
        {
          model: User,
          as: 'updatedBy',
          attributes: ['id', 'name', 'email'],
        },
      ],
    });

    if (!configuration) {
      return res.status(404).json({
        success: false,
        message: 'Configuração não encontrada',
      });
    }

    res.json({
      success: true,
      data: { configuration },
    });
  } catch (error) {
    console.error('Error fetching AI configuration:', error);
    res.status(500).json({
      success: false,
      message: 'Erro interno do servidor',
    });
  }
};

// Update AI configuration
export const updateAIConfiguration = async (req: Request, res: Response) => {
  try {
    const { pageKey } = req.params;
    const { model, prompt, temperature, max_tokens, is_active } = req.body;
    const userId = req.user?.id;

    // Validate temperature
    if (temperature !== undefined && (temperature < 0 || temperature > 2)) {
      return res.status(400).json({
        success: false,
        message: 'Temperatura deve estar entre 0.0 e 2.0',
      });
    }

    // Validate max_tokens
    if (max_tokens !== undefined && (max_tokens < 1 || max_tokens > 8000)) {
      return res.status(400).json({
        success: false,
        message: 'Max tokens deve estar entre 1 e 8000',
      });
    }

    const configuration = await AIConfiguration.findOne({
      where: { page_key: pageKey },
    });

    if (!configuration) {
      return res.status(404).json({
        success: false,
        message: 'Configuração não encontrada',
      });
    }

    // Update configuration
    await configuration.update({
      model: model || configuration.model,
      prompt: prompt || configuration.prompt,
      temperature: temperature !== undefined ? temperature : configuration.temperature,
      max_tokens: max_tokens !== undefined ? max_tokens : configuration.max_tokens,
      is_active: is_active !== undefined ? is_active : configuration.is_active,
      updated_by: userId,
      updated_at: new Date(),
    });

    // Fetch updated configuration with user info
    const updatedConfiguration = await AIConfiguration.findOne({
      where: { page_key: pageKey },
      include: [
        {
          model: User,
          as: 'updatedBy',
          attributes: ['id', 'name', 'email'],
        },
      ],
    });

    res.json({
      success: true,
      message: 'Configuração atualizada com sucesso',
      data: { configuration: updatedConfiguration },
    });
  } catch (error) {
    console.error('Error updating AI configuration:', error);
    res.status(500).json({
      success: false,
      message: 'Erro interno do servidor',
    });
  }
};

// Update AI configuration by ID
export const updateAIConfigurationById = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const { model, prompt, temperature, max_tokens, is_active } = req.body;
    const userId = req.user?.id;

    // Validate temperature
    if (temperature !== undefined && (temperature < 0 || temperature > 2)) {
      return res.status(400).json({
        success: false,
        message: 'Temperatura deve estar entre 0.0 e 2.0',
      });
    }

    // Validate max_tokens
    if (max_tokens !== undefined && (max_tokens < 1 || max_tokens > 8000)) {
      return res.status(400).json({
        success: false,
        message: 'Max tokens deve estar entre 1 e 8000',
      });
    }

    const configuration = await AIConfiguration.findByPk(id);

    if (!configuration) {
      return res.status(404).json({
        success: false,
        message: 'Configuração não encontrada',
      });
    }

    // Update configuration
    await configuration.update({
      model: model || configuration.model,
      prompt: prompt || configuration.prompt,
      temperature: temperature !== undefined ? temperature : configuration.temperature,
      max_tokens: max_tokens !== undefined ? max_tokens : configuration.max_tokens,
      is_active: is_active !== undefined ? is_active : configuration.is_active,
      updated_by: userId,
      updated_at: new Date(),
    });

    // Fetch updated configuration with user info
    const updatedConfiguration = await AIConfiguration.findByPk(id, {
      include: [
        {
          model: User,
          as: 'updatedBy',
          attributes: ['id', 'name', 'email'],
        },
      ],
    });

    res.json({
      success: true,
      message: 'Configuração atualizada com sucesso',
      data: { configuration: updatedConfiguration },
    });
  } catch (error) {
    console.error('Error updating AI configuration by ID:', error);
    res.status(500).json({
      success: false,
      message: 'Erro interno do servidor',
    });
  }
};

// Create default AI configurations
export const createDefaultAIConfigurations = async (req: Request, res: Response) => {
  try {
    const userId = req.user?.id;

    const defaultConfigurations = [
      {
        page_key: 'lab_analysis',
        model: 'gpt-4o-mini',
        prompt: `Você é Lyz, especialista em ciclicidade feminina.

Analise os resultados laboratoriais fornecidos como um médico integrativo funcional especializado em saúde feminina.

Para cada valor, indique:
1. Se está dentro das faixas de referência convencionais
2. Se está dentro das faixas ideais da medicina funcional
3. Possíveis implicações para a ciclicidade feminina
4. Correlações com os sintomas relatados`,
        temperature: 0.7,
        max_tokens: 2000,
        updated_by: userId,
      },
      {
        page_key: 'tcm_analysis',
        model: 'gpt-4o-mini',
        prompt: `Você é Lyz, especialista em ciclicidade feminina.

Com base nas observações fornecidas sobre a face e língua da paciente, realize uma análise segundo os princípios da medicina tradicional chinesa:

1. Identifique possíveis desequilíbrios energéticos
2. Relacione com o ciclo menstrual e hormonal
3. Conecte com as queixas principais
4. Sugira padrões de MTC relevantes para o caso`,
        temperature: 0.7,
        max_tokens: 1500,
        updated_by: userId,
      },
      {
        page_key: 'timeline_generation',
        model: 'gpt-4o-mini',
        prompt: `Você é Lyz, especialista em ciclicidade feminina.

Com base em todas as informações coletadas, crie uma timeline de tratamento personalizada considerando:

1. Fases do ciclo menstrual
2. Resultados laboratoriais
3. Observações de MTC
4. Objetivos da paciente
5. Cronologia de implementação das recomendações`,
        temperature: 0.8,
        max_tokens: 2500,
        updated_by: userId,
      },
      {
        page_key: 'ifm_matrix',
        model: 'gpt-4o-mini',
        prompt: `Você é Lyz, especialista em ciclicidade feminina.

Organize as informações da paciente seguindo a Matriz de Medicina Funcional:

1. Fatores desencadeantes (triggers)
2. Mediadores inflamatórios
3. Disfunções dos sistemas corporais
4. Sinais e sintomas
5. Intervenções terapêuticas recomendadas`,
        temperature: 0.7,
        max_tokens: 2000,
        updated_by: userId,
      },
      {
        page_key: 'final_plan',
        model: 'gpt-4o-mini',
        prompt: `Você é Lyz, especialista em ciclicidade feminina.

Compile todas as análises anteriores e crie um plano personalizado final incluindo:

1. Resumo executivo do caso
2. Protocolo nutricional específico
3. Suplementação direcionada
4. Recomendações de estilo de vida
5. Acompanhamento e reavaliações
6. Cronograma de implementação`,
        temperature: 0.8,
        max_tokens: 3000,
        updated_by: userId,
      },
    ];

    // Create configurations
    const createdConfigurations = await Promise.all(
      defaultConfigurations.map(async (config) => {
        const [configuration, created] = await AIConfiguration.findOrCreate({
          where: { page_key: config.page_key },
          defaults: config,
        });
        return { configuration, created };
      })
    );

    const newConfigurations = createdConfigurations.filter(item => item.created);
    const existingConfigurations = createdConfigurations.filter(item => !item.created);

    res.json({
      success: true,
      message: `${newConfigurations.length} configurações criadas, ${existingConfigurations.length} já existiam`,
      data: {
        created: newConfigurations.length,
        existing: existingConfigurations.length,
      },
    });
  } catch (error) {
    console.error('Error creating default AI configurations:', error);
    res.status(500).json({
      success: false,
      message: 'Erro interno do servidor',
    });
  }
};

// Get available AI models
export const getAvailableModels = async (req: Request, res: Response) => {
  try {
    const models = [
      { value: 'gpt-4o-mini', label: 'GPT-4O Mini', provider: 'OpenAI' },
      { value: 'gpt-4.5', label: 'GPT-4.5', provider: 'OpenAI' },
      { value: 'gpt-4.1-mini', label: 'GPT-4.1 Mini', provider: 'OpenAI' },
      { value: 'claude-sonnet-3.7', label: 'Claude Sonnet 3.7', provider: 'Anthropic' },
      { value: 'claude-sonnet-4', label: 'Claude Sonnet 4', provider: 'Anthropic' },
      { value: 'gemini-2.5-pro', label: 'Gemini 2.5 Pro', provider: 'Google' },
    ];

    res.json({
      success: true,
      data: { models },
    });
  } catch (error) {
    console.error('Error fetching available models:', error);
    res.status(500).json({
      success: false,
      message: 'Erro interno do servidor',
    });
  }
}; 