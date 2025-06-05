import { GoogleGenAI } from '@google/genai';

interface AIConfiguration {
  model: string;
  temperature?: number;
  max_tokens?: number;
  prompt: string;
}

interface GeminiResponse {
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

export class GeminiService {
  private ai: GoogleGenAI;
  private defaultModel = 'gemini-2.0-flash';

  constructor(apiKey: string) {
    this.ai = new GoogleGenAI({ apiKey });
  }

  async analyzeText(
    text: string,
    prompt: string,
    aiConfig: AIConfiguration,
    structured: boolean = true
  ): Promise<GeminiResponse> {
    try {
      // Garantir que o prompt contenha "JSON" quando structured for true
      let finalPrompt = prompt;
      if (structured && !prompt.toLowerCase().includes('json')) {
        finalPrompt = `${prompt} Retorne a resposta como um objeto JSON válido.`;
      }

      const model = aiConfig.model || this.defaultModel;
      
      const response = await this.ai.models.generateContent({
        model: model,
        contents: `${finalPrompt}\n\nTexto para análise:\n${text}`,
        config: {
          temperature: aiConfig.temperature || 0.7,
          maxOutputTokens: aiConfig.max_tokens || 2000,
          responseMimeType: structured ? 'application/json' : 'text/plain'
        }
      });

      if (structured) {
        try {
          const jsonResponse = JSON.parse(response.text);
          return this.normalizeResponse(jsonResponse);
        } catch (parseError) {
          console.error('Erro ao parsear resposta JSON do Gemini:', parseError);
          return this.createFallbackResponse(response.text);
        }
      } else {
        return this.createFallbackResponse(response.text);
      }
    } catch (error) {
      console.error('Erro na análise de texto com Gemini:', error);
      throw new Error(`Erro na API Gemini: ${error.message}`);
    }
  }

  async analyzeImage(
    imageBase64: string,
    prompt: string,
    aiConfig: AIConfiguration,
    structured: boolean = true
  ): Promise<GeminiResponse> {
    try {
      // Garantir que o prompt contenha "JSON" quando structured for true
      let finalPrompt = prompt;
      if (structured && !prompt.toLowerCase().includes('json')) {
        finalPrompt = `${prompt} Retorne a resposta como um objeto JSON válido.`;
      }

      const model = aiConfig.model || this.defaultModel;
      
      // Remover o prefixo data:image/...;base64, se existir
      const base64Data = imageBase64.replace(/^data:image\/[^;]+;base64,/, '');

      const response = await this.ai.models.generateContent({
        model: model,
        contents: [
          {
            role: 'user',
            parts: [
              { text: finalPrompt },
              {
                inlineData: {
                  mimeType: 'image/jpeg', // Assumir JPEG por padrão
                  data: base64Data
                }
              }
            ]
          }
        ],
        config: {
          temperature: aiConfig.temperature || 0.7,
          maxOutputTokens: aiConfig.max_tokens || 2000,
          responseMimeType: structured ? 'application/json' : 'text/plain'
        }
      });

      if (structured) {
        try {
          const jsonResponse = JSON.parse(response.text);
          return this.normalizeResponse(jsonResponse);
        } catch (parseError) {
          console.error('Erro ao parsear resposta JSON do Gemini:', parseError);
          return this.createFallbackResponse(response.text);
        }
      } else {
        return this.createFallbackResponse(response.text);
      }
    } catch (error) {
      console.error('Erro na análise de imagem com Gemini:', error);
      throw new Error(`Erro na API Gemini: ${error.message}`);
    }
  }

  async countTokens(text: string, model?: string): Promise<number> {
    try {
      const response = await this.ai.models.countTokens({
        model: model || this.defaultModel,
        contents: text
      });
      return response.totalTokens || 0;
    } catch (error) {
      console.error('Erro ao contar tokens com Gemini:', error);
      // Retorna estimativa baseada em caracteres
      return Math.ceil(text.length / 4);
    }
  }

  private normalizeResponse(response: any): GeminiResponse {
    // Normalizar a resposta para o formato esperado pelo sistema
    return {
      summary: response.summary || response.análise?.resumo || 'Análise concluída.',
      outOfRange: response.outOfRange || response.valoresForaReferencia || response.análise?.valoresAlterados || [],
      recommendations: response.recommendations || response.recomendações || response.análise?.recomendações || []
    };
  }

  private createFallbackResponse(text: string): GeminiResponse {
    return {
      summary: text.substring(0, 500) + (text.length > 500 ? '...' : ''),
      outOfRange: [],
      recommendations: ['Revisar a análise com um profissional de saúde.']
    };
  }

  // Método para verificar se o modelo é do Gemini
  static isGeminiModel(model: string): boolean {
    return model.toLowerCase().includes('gemini') || 
           model.toLowerCase().includes('bison') ||
           model.toLowerCase().includes('codechat') ||
           model.toLowerCase().includes('textembedding') ||
           model.toLowerCase().includes('palm');
  }

  // Lista de modelos Gemini suportados
  static getSupportedModels(): string[] {
    return [
      'gemini-2.0-flash',
      'gemini-2.0-flash-001',
      'gemini-1.5-pro',
      'gemini-1.5-pro-001',
      'gemini-1.5-flash',
      'gemini-1.5-flash-001',
      'gemini-1.0-pro',
      'gemini-1.0-pro-001',
      'gemini-pro',
      'gemini-pro-vision'
    ];
  }
} 