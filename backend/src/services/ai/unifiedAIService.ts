import { GeminiService } from './geminiService';
import Setting from '../../models/Setting';

interface AIConfiguration {
  model: string;
  temperature?: number;
  max_tokens?: number;
  prompt: string;
}

interface UnifiedAIResponse {
  summary: string;
  outOfRange: Array<{
    name: string;
    value: string;
    unit: string;
    reference: string;
    interpretation: string;
  }>;
  recommendations: string[];
}

export class UnifiedAIService {
  private geminiService: GeminiService | null = null;
  private openaiApiKey: string | null = null;
  private geminiApiKey: string | null = null;

  constructor() {
    this.initializeServices();
  }

  private async initializeServices() {
    try {
      // Buscar chaves de API
      const openaiSetting = await Setting.findOne({ where: { key: 'openai_api_key' } });
      const geminiSetting = await Setting.findOne({ where: { key: 'gemini_api_key' } });

      this.openaiApiKey = openaiSetting?.value || null;
      this.geminiApiKey = geminiSetting?.value || null;

      // Inicializar serviço Gemini se a chave estiver disponível
      if (this.geminiApiKey) {
        this.geminiService = new GeminiService(this.geminiApiKey);
      }
    } catch (error) {
      console.error('Erro ao inicializar serviços de IA:', error);
    }
  }

  async analyzeText(
    text: string,
    prompt: string,
    aiConfig: AIConfiguration,
    structured: boolean = true
  ): Promise<UnifiedAIResponse> {
    // Verificar qual API usar baseado no modelo
    if (GeminiService.isGeminiModel(aiConfig.model)) {
      return this.analyzeWithGemini(text, prompt, aiConfig, structured, 'text');
    } else {
      return this.analyzeWithOpenAI(text, prompt, aiConfig, structured, 'text');
    }
  }

  async analyzeImage(
    imageBase64: string,
    prompt: string,
    aiConfig: AIConfiguration,
    structured: boolean = true
  ): Promise<UnifiedAIResponse> {
    // Verificar qual API usar baseado no modelo
    if (GeminiService.isGeminiModel(aiConfig.model)) {
      return this.analyzeWithGemini(imageBase64, prompt, aiConfig, structured, 'image');
    } else {
      return this.analyzeWithOpenAI(imageBase64, prompt, aiConfig, structured, 'image');
    }
  }

  private async analyzeWithGemini(
    content: string,
    prompt: string,
    aiConfig: AIConfiguration,
    structured: boolean,
    type: 'text' | 'image'
  ): Promise<UnifiedAIResponse> {
    if (!this.geminiService) {
      throw new Error('Serviço Gemini não está disponível. Verifique se a chave de API está configurada.');
    }

    try {
      if (type === 'text') {
        return await this.geminiService.analyzeText(content, prompt, aiConfig, structured);
      } else {
        return await this.geminiService.analyzeImage(content, prompt, aiConfig, structured);
      }
    } catch (error) {
      console.error('Erro na análise com Gemini:', error);
      throw new Error(`Erro na API Gemini: ${error.message}`);
    }
  }

  private async analyzeWithOpenAI(
    content: string,
    prompt: string,
    aiConfig: AIConfiguration,
    structured: boolean,
    type: 'text' | 'image'
  ): Promise<UnifiedAIResponse> {
    if (!this.openaiApiKey) {
      throw new Error('API Key da OpenAI não configurada');
    }

    try {
      // Importar dinamicamente o serviço OpenAI
      const openaiService = await import('./openaiService');

      if (type === 'text') {
        // Para análise de texto, usar generateAIResponse
        const response = await openaiService.generateAIResponse(
          1, // userId temporário
          1, // companyId temporário
          'lab_analysis',
          { text: content, prompt: prompt },
          prompt,
          aiConfig.model
        );
        return this.normalizeOpenAIResponse(response);
      } else {
        // Para análise de imagem
        const response = await openaiService.analyzeImage(
          1, // userId temporário
          1, // companyId temporário
          content,
          prompt,
          structured
        );
        return this.normalizeOpenAIResponse(response);
      }
    } catch (error) {
      console.error('Erro na análise com OpenAI:', error);
      throw new Error(`Erro na API OpenAI: ${error.message}`);
    }
  }

  private normalizeOpenAIResponse(response: any): UnifiedAIResponse {
    // Normalizar resposta da OpenAI para o formato unificado
    if (typeof response === 'string') {
      try {
        const parsed = JSON.parse(response);
        return {
          summary: parsed.summary || 'Análise concluída',
          outOfRange: parsed.outOfRange || [],
          recommendations: parsed.recommendations || []
        };
      } catch {
        return {
          summary: response,
          outOfRange: [],
          recommendations: []
        };
      }
    }

    return {
      summary: response.summary || 'Análise concluída',
      outOfRange: response.outOfRange || [],
      recommendations: response.recommendations || []
    };
  }

  async countTokens(text: string, model: string): Promise<number> {
    if (GeminiService.isGeminiModel(model)) {
      if (!this.geminiService) {
        // Fallback para estimativa
        return Math.ceil(text.length / 4);
      }
      return await this.geminiService.countTokens(text, model);
    } else {
      // Para modelos OpenAI, usar estimativa baseada em caracteres
      return Math.ceil(text.length / 4);
    }
  }

  // Método para listar modelos disponíveis
  getAvailableModels(): { openai: string[], gemini: string[] } {
    return {
      openai: [
        'gpt-4o',
        'gpt-4o-mini',
        'gpt-4-turbo',
        'gpt-4',
        'gpt-3.5-turbo'
      ],
      gemini: GeminiService.getSupportedModels()
    };
  }

  // Verificar se um modelo é suportado
  isModelSupported(model: string): boolean {
    const models = this.getAvailableModels();
    return models.openai.includes(model) || models.gemini.includes(model);
  }

  // Obter provedor do modelo
  getModelProvider(model: string): 'openai' | 'gemini' | 'unknown' {
    if (GeminiService.isGeminiModel(model)) {
      return 'gemini';
    } else if (this.getAvailableModels().openai.includes(model)) {
      return 'openai';
    } else {
      return 'unknown';
    }
  }
} 