import OpenAI from 'openai';
import dotenv from 'dotenv';
import { Prompt, TokenUsage, User, Company, Setting, AIConfiguration } from '../../models';
import fs from 'fs';
import sharp from 'sharp';
import { PDFDocument } from 'pdf-lib';
import pdfParse from 'pdf-parse';
import { fromBuffer } from 'pdf2pic'; // Reimportamos para a função de referência
import path from 'path';
import os from 'os';

dotenv.config();

// Chave de configuração
const OPENAI_API_KEY = 'openai_api_key';

// Função para obter a chave do banco de dados ou usar a do .env como fallback
export const getOpenAIApiKey = async () => {
  try {
    const setting = await Setting.findOne({ where: { key: OPENAI_API_KEY } });
    if (setting && setting.value) {
      return setting.value;
    }
  } catch (error) {
    console.warn('Erro ao obter chave de API da OpenAI do banco de dados:', error);
  }
  
  // Fallback para a chave no .env
  return process.env.OPENAI_API_KEY;
};

// Inicializar OpenAI com função getter
let openaiInstance: OpenAI | null = null;

// Função para obter a instância do OpenAI com a chave atualizada
export const getOpenAI = async () => {
  const apiKey = await getOpenAIApiKey();
  
  if (!apiKey) {
    throw new Error('Chave de API da OpenAI não encontrada');
  }
  
  // Se já tivermos uma instância, atualize a chave se necessário
  if (openaiInstance && openaiInstance.apiKey !== apiKey) {
    openaiInstance = null;
  }
  
  // Criar nova instância se necessário
  if (!openaiInstance) {
    openaiInstance = new OpenAI({ apiKey });
  }
  
  return openaiInstance;
};

// Model pricing (per 1000 tokens, in USD)
const modelPricing = {
  'gpt-4': { input: 0.03, output: 0.06 },
  'gpt-4-32k': { input: 0.06, output: 0.12 },
  'gpt-3.5-turbo': { input: 0.0015, output: 0.002 },
  'gpt-3.5-turbo-16k': { input: 0.003, output: 0.004 },
  'gpt-4-turbo': { input: 0.01, output: 0.03 },    // Este modelo suporta vião também
  'gpt-4o': { input: 0.005, output: 0.015 }         // Modelo mais recente que tambem suporta visão
};

// Get AI configuration by page key  
export const getAIConfigByPageKey = async (pageKey: string) => {
  try {
    const aiConfig = await AIConfiguration.findOne({ where: { page_key: pageKey } });
    
    if (!aiConfig) {
      throw new Error(`AI Configuration not found for page: ${pageKey}`);
    }
    
    return aiConfig;
  } catch (error) {
    console.error('Error fetching AI configuration:', error);
    throw error;
  }
};

// Get prompt by step key (deprecated - use getAIConfigByPageKey instead)
export const getPromptByStepKey = async (stepKey: string) => {
  try {
    const prompt = await Prompt.findOne({ where: { step_key: stepKey } });
    
    if (!prompt) {
      throw new Error(`Prompt not found for step: ${stepKey}`);
    }
    
    return prompt;
  } catch (error) {
    console.error('Error fetching prompt:', error);
    throw error;
  }
};

// Check if user/company has enough tokens
export const checkTokenLimit = async (userId: number, companyId: number) => {
  try {
    // Get company token limit
    const company = await Company.findByPk(companyId);
    
    if (!company) {
      throw new Error('Company not found');
    }
    
    // Calculate used tokens for the company
    const usedTokens = await TokenUsage.sum('tokens_used', {
      where: { company_id: companyId }
    }) || 0;
    
    // Check if company has enough tokens left
    if (usedTokens >= company.token_limit) {
      return {
        hasEnoughTokens: false,
        message: 'Company token limit reached'
      };
    }
    
    return {
      hasEnoughTokens: true,
      tokensLeft: company.token_limit - usedTokens
    };
  } catch (error) {
    console.error('Error checking token limit:', error);
    throw error;
  }
};

// Record token usage
export const recordTokenUsage = async (
  userId: number,
  companyId: number,
  promptId: number,
  tokensUsed: number,
  model: string
) => {
  try {
    // Calculate cost based on model
    const modelPrice = modelPricing[model as keyof typeof modelPricing] || modelPricing['gpt-3.5-turbo'];
    const cost = (tokensUsed / 1000) * modelPrice.output;
    
    // Record token usage
    await TokenUsage.create({
      user_id: userId,
      company_id: companyId,
      prompt_id: promptId,
      tokens_used: tokensUsed,
      cost
    });
  } catch (error) {
    console.error('Error recording token usage:', error);
    throw error;
  }
};

// Função para truncar dados de entrada para evitar problemas de limite de contexto
export const truncateInputData = (inputData: any, maxTokens = 12000): any => {
  // Converter para string para estimar tokens (uma aproximação grosseira: ~4 caracteres = 1 token)
  const jsonString = JSON.stringify(inputData);
  const estTokens = jsonString.length / 4;
  
  console.log(`Tamanho estimado dos dados: ${estTokens} tokens (${jsonString.length} caracteres)`);
  
  // Se os dados já estiverem abaixo do limite, retorná-los sem modificação
  if (estTokens <= maxTokens) {
    return inputData;
  }
  
  console.log(`Truncando dados para ficar abaixo de ${maxTokens} tokens`);
  
  // Deep copy para não modificar o original
  let truncatedData: any = {};
  
  // Função para processamento recursivo de objetos grandes
  const truncateObject = (obj: any, depth = 0, maxDepth = 3): any => {
    // Se for nulo ou não for um objeto, retornar como está
    if (obj === null || typeof obj !== 'object') {
      // Se for string e for muito grande, truncar
      if (typeof obj === 'string' && obj.length > 1000) {
        return obj.substring(0, 1000) + '... (truncated)';
      }
      return obj;
    }
    
    // Se for um array
    if (Array.isArray(obj)) {
      // Limite o número máximo de elementos
      const maxItems = Math.min(20, obj.length);
      console.log(`Truncando array de ${obj.length} para ${maxItems} itens`);
      
      const result = [];
      // Pegar alguns do início, meio e fim para ter uma amostra representativa
      if (maxItems < obj.length) {
        // Adicionar alguns itens do início
        const startItems = Math.ceil(maxItems * 0.5);
        for (let i = 0; i < startItems && i < obj.length; i++) {
          result.push(truncateObject(obj[i], depth + 1, maxDepth));
        }
        
        // Adicionar nota sobre truncamento
        if (obj.length > maxItems) {
          result.push(`... ${obj.length - maxItems} more items truncated ...`);
        }
        
        // Adicionar alguns itens do final
        const endItems = Math.floor(maxItems * 0.5);
        for (let i = Math.max(startItems, obj.length - endItems); i < obj.length; i++) {
          result.push(truncateObject(obj[i], depth + 1, maxDepth));
        }
        
        return result;
      } else {
        // Retornar todos os itens se o array for pequeno o suficiente
        return obj.map(item => truncateObject(item, depth + 1, maxDepth));
      }
    }
    
    // Se for um objeto regular
    // Se atingiu a profundidade máxima, retornar apenas um resumo
    if (depth >= maxDepth) {
      return `[Object with ${Object.keys(obj).length} keys]`;
    }
    
    const result: any = {};
    const keys = Object.keys(obj);
    // Manter apenas as primeiras N chaves se houver muitas
    const maxKeys = 20;
    
    if (keys.length > maxKeys) {
      console.log(`Truncando objeto de ${keys.length} para ${maxKeys} chaves`);
      // Pegar as primeiras chaves
      const importantKeys = keys.slice(0, maxKeys);
      importantKeys.forEach(key => {
        result[key] = truncateObject(obj[key], depth + 1, maxDepth);
      });
      
      // Adicionar nota sobre truncamento
      result[`_truncated_info`] = `Original object had ${keys.length} keys, truncated to ${maxKeys}`;
    } else {
      // Se o objeto não for muito grande, processar todas as chaves
      keys.forEach(key => {
        result[key] = truncateObject(obj[key], depth + 1, maxDepth);
      });
    }
    
    return result;
  };
  
  // Processar e preservar campos essenciais
  const essentialFields = ['patientData'];
  for (const field of essentialFields) {
    if (inputData[field]) {
      truncatedData[field] = inputData[field];
    }
  }
  
  // Identificar e processar campos de tamanho grande com prioridade
  const largeFields = ['labResults', 'currentMatrix', 'tcmObservations', 'timelineData', 'questionnaireData'];
  for (const field of largeFields) {
    if (inputData[field]) {
      truncatedData[field] = truncateObject(inputData[field]);
    }
  }
  
  // Processar todos os outros campos não mencionados explicitamente
  Object.keys(inputData).forEach(key => {
    if (!truncatedData[key] && !largeFields.includes(key) && !essentialFields.includes(key)) {
      truncatedData[key] = truncateObject(inputData[key]);
    }
  });
  
  // Verificar novamente o tamanho após truncamento
  const newJsonString = JSON.stringify(truncatedData);
  const newEstTokens = newJsonString.length / 4;
  
  console.log(`Novo tamanho estimado: ${newEstTokens} tokens (${newJsonString.length} caracteres)`);
  
  // Se ainda estiver acima do limite, fazer um truncamento mais agressivo
  if (newEstTokens > maxTokens) {
    console.log(`Tamanho ainda excede o limite, fazendo truncamento agressivo...`);
    
    // Manter apenas dados essenciais do paciente e um resumo mínimo
    const minimalData = {
      patientData: truncatedData.patientData || {},
      summary: `Dados completos excederam o limite de tokens (${newEstTokens} > ${maxTokens}). Apenas informações essenciais do paciente foram preservadas.`
    };
    
    // Manter apenas cabeçalhos de dados muito grandes
    for (const field of largeFields) {
      if (truncatedData[field]) {
        if (Array.isArray(truncatedData[field])) {
          minimalData[`${field}_summary`] = `Array com ${truncatedData[field].length} itens`;
        } else if (typeof truncatedData[field] === 'object') {
          minimalData[`${field}_summary`] = `Objeto com ${Object.keys(truncatedData[field]).length} chaves`;
        } else {
          minimalData[`${field}_summary`] = `Dados de ${field} indisponíveis devido ao limite de tokens`;
        }
      }
    }
    
    const finalJsonString = JSON.stringify(minimalData);
    console.log(`Tamanho final após truncamento agressivo: ${finalJsonString.length / 4} tokens`);
    return minimalData;
  }
  
  return truncatedData;
};

// Selecionar automaticamente o modelo mais adequado baseado no tamanho dos dados
export const selectAppropriateModel = (dataSize: number, preferredModel = 'gpt-3.5-turbo'): string => {
  if (dataSize > 12000) {
    return 'gpt-3.5-turbo-16k';
  }
  
  return preferredModel;
};

// Generate AI response
export const generateAIResponse = async (
  userId: number,
  companyId: number,
  stepKey: string,
  inputData: any,
  systemInstruction?: string,
  model = 'gpt-3.5-turbo'
) => {
  try {
    // Check token limit
    const tokenLimitCheck = await checkTokenLimit(userId, companyId);
    
    if (!tokenLimitCheck.hasEnoughTokens) {
      return {
        success: false,
        message: tokenLimitCheck.message
      };
    }
    
    // Get AI configuration for the step - try new system first, fallback to old
    let aiConfig: any = null;
    let promptContent: string = '';
    let temperature: number = 0.7;
    let maxTokens: number = 2000;
    let configId: number = 0;
    let selectedModel: string = model;
    
    try {
      // Map stepKey to pageKey for new AI Configuration system
      const pageKeyMap: { [key: string]: string } = {
        'lab_results_analysis': 'lab_analysis',
        'tcm_analysis': 'tcm_analysis',
        'timeline_generation': 'timeline_generation',
        'ifm_matrix_generation': 'ifm_matrix',
        'final_plan': 'final_plan'
      };
      
      const pageKey = pageKeyMap[stepKey] || stepKey;
      aiConfig = await getAIConfigByPageKey(pageKey);
      
      if (aiConfig) {
        promptContent = aiConfig.prompt;
        temperature = aiConfig.temperature;
        maxTokens = aiConfig.max_tokens;
        configId = aiConfig.id;
        selectedModel = aiConfig.model || model;
        console.log(`Using AI Configuration for ${pageKey}`);
      }
    } catch (configError) {
      console.log(`AI Configuration not found for ${stepKey}, falling back to legacy prompt system`);
      
      // Fallback to legacy prompt system
      try {
        const promptTemplate = await getPromptByStepKey(stepKey);
        promptContent = promptTemplate.content;
        temperature = promptTemplate.temperature;
        maxTokens = promptTemplate.max_tokens;
        configId = promptTemplate.id;
        console.log(`Using legacy prompt for ${stepKey}`);
      } catch (promptError) {
        throw new Error(`No AI configuration or prompt found for step: ${stepKey}`);
      }
    }
    
    // Truncar dados se necessário para evitar exceder limites de contexto
    const truncatedData = truncateInputData(inputData);
    
    // Estimar o tamanho do prompt + dados truncados (aproximação)
    const promptSize = promptContent.length / 4;
    const dataSize = JSON.stringify(truncatedData).length / 4;
    const totalSize = promptSize + dataSize;
    
    // Selecionar modelo apropriado baseado no tamanho dos dados
    const finalModel = selectAppropriateModel(totalSize, selectedModel);
    if (finalModel !== selectedModel) {
      console.log(`Switched model from ${selectedModel} to ${finalModel} due to context size`);
    }
    
    // Prepare messages
    const messages = [
      { role: 'system' as const, content: systemInstruction || promptContent },
      { role: 'user' as const, content: JSON.stringify(truncatedData) }
    ];
    
    // Registrar qual sistema está sendo usado para debug
    console.log(`Utilizando ${systemInstruction ? 'instrução personalizada' : (aiConfig ? 'AI Configuration' : 'prompt legado')} para ${stepKey}`);
    
    // Obter instância atualizada do OpenAI
    const openai = await getOpenAI();
    
    // Make API call to OpenAI
    const response = await openai.chat.completions.create({
      model: finalModel,
      messages,
      temperature,
      max_tokens: maxTokens,
    });
    
    // Record token usage
    const tokensUsed = response.usage?.total_tokens || 0;
    await recordTokenUsage(userId, companyId, configId, tokensUsed, finalModel);
    
    return {
      success: true,
      data: response.choices[0].message?.content,
      tokensUsed
    };
  } catch (error: any) {
    console.error('Error generating AI response:', error);
    return {
      success: false,
      message: error.message || 'Error generating AI response'
    };
  }
};

// Verificar se o buffer é um PDF válido
async function isValidPdf(pdfBuffer: Buffer): Promise<boolean> {
  try {
    const pdfDoc = await PDFDocument.load(pdfBuffer, { ignoreEncryption: true });
    return pdfDoc.getPageCount() > 0;
  } catch (error) {
    console.error('Erro ao validar PDF:', error);
    return false;
  }
}

// Converter PDF para texto em vez de imagem
async function convertPdfToText(pdfBuffer: Buffer): Promise<string> {
  try {
    // Verificar se é um PDF válido
    const valid = await isValidPdf(pdfBuffer);
    if (!valid) {
      throw new Error('PDF inválido ou corrompido');
    }

    // Usar pdf-parse para extrair o texto do PDF
    const data = await pdfParse(pdfBuffer);
    
    console.log(`Extração de texto completa: ${data.text.length} caracteres extraídos do PDF`);
    return data.text;
  } catch (error) {
    console.error('Erro ao extrair texto do PDF:', error);
    throw new Error('Falha ao extrair texto do PDF');
  }
}

// Função antiga, mantida como referência mas não usada
async function _convertPdfToImage(pdfBuffer: Buffer): Promise<string[]> {
  try {
    // Verificar se é um PDF válido
    const valid = await isValidPdf(pdfBuffer);
    if (!valid) {
      throw new Error('PDF inválido ou corrompido');
    }

    // Criar diretório temporário para armazenar as imagens
    const tmpDir = os.tmpdir();
    const tempFilePath = path.join(tmpDir, `pdf-${Date.now()}.pdf`);
    
    // Salvar o buffer como arquivo PDF
    fs.writeFileSync(tempFilePath, pdfBuffer);
    
    // Configurar o conversor
    const options = {
      density: 300,
      saveFilename: `pdf-img-${Date.now()}`,
      savePath: tmpDir,
      format: 'png',
      width: 1200,
      height: 1600
    };
    
    // Criar o conversor a partir do buffer
    const convert = fromBuffer(pdfBuffer, options);
    
    // Determinar o número de páginas no PDF
    let pageCount = 1;
    try {
      // Usar PDFDocument para obter o número de páginas
      const pdfDoc = await PDFDocument.load(pdfBuffer);
      pageCount = pdfDoc.getPageCount();
      console.log(`PDF tem ${pageCount} páginas, processando todas...`);
    } catch (err) {
      console.warn('Não foi possível determinar o número de páginas do PDF, assumindo 1:', err);
    }
    
    // Converter todas as páginas do PDF
    const base64Images: string[] = [];
    const filesToCleanup: string[] = [];
    
    for (let pageNum = 1; pageNum <= pageCount; pageNum++) {
      try {
        console.log(`Convertendo página ${pageNum} de ${pageCount}...`);
        const result = await convert(pageNum);
        const outputFilePath = result.path;
        filesToCleanup.push(outputFilePath);
        
        // Ler o arquivo de imagem e converter para base64
        const imageBuffer = fs.readFileSync(outputFilePath);
        const base64Image = `data:image/png;base64,${imageBuffer.toString('base64')}`;
        base64Images.push(base64Image);
      } catch (pageError) {
        console.error(`Erro ao converter página ${pageNum} do PDF:`, pageError);
      }
    }
    
    // Limpar arquivos temporários
    try {
      fs.unlinkSync(tempFilePath);
      for (const file of filesToCleanup) {
        fs.unlinkSync(file);
      }
    } catch (cleanupError) {
      console.warn('Erro ao limpar arquivos temporários:', cleanupError);
    }
    
    if (base64Images.length === 0) {
      throw new Error('Nenhuma página foi convertida com sucesso');
    }
    
    console.log(`Conversão completa: ${base64Images.length} páginas extraídas do PDF`);
    return base64Images;
  } catch (error) {
    console.error('Erro ao converter PDF para imagem:', error);
    throw new Error('Falha ao converter PDF para formato de imagem suportado');
  }
}

// Analisar imagem usando GPT-4 Vision
export const analyzeImage = async (
  userId: number,
  companyId: number,
  imageData: string | Buffer,
  prompt: string = "Descreva detalhadamente esta imagem. Se houver texto na imagem, inclua-o na descrição.",
  structured: boolean = false, // Indica se a resposta deve ser estruturada em JSON
  isPdf: boolean = false, // Indica se o arquivo original é um PDF
  planId?: string // ID do plano para atualização de progresso
) => {
  try {
    // Check token limit
    const tokenLimitCheck = await checkTokenLimit(userId, companyId);
    
    if (!tokenLimitCheck.hasEnoughTokens) {
      return {
        success: false,
        message: tokenLimitCheck.message
      };
    }

    // Obter instância atualizada do OpenAI
    const openai = await getOpenAI();
    
    // Preparar os dados da imagem
    let base64Image: string;
    let imageUrl: string;
    
    // Verificar se imageData é um Buffer ou uma string (URL/Base64)
    if (Buffer.isBuffer(imageData)) {
      // Se for um PDF, converter para texto
      if (isPdf) {
        try {
          console.log('Convertendo PDF para texto...');
          const pdfText = await convertPdfToText(imageData);
          console.log(`PDF convertido com sucesso: ${pdfText.length} caracteres processados`);
          
          // Processar o texto do PDF
          return await analyzePdfText(userId, companyId, pdfText, prompt, structured, planId);
        } catch (convError) {
          console.error('Erro na conversão do PDF:', convError);
          throw new Error('Não foi possível converter o PDF para um formato de texto suportado.');
        }
      } else {
        // Converter buffer para base64
        base64Image = imageData.toString('base64');
        // Usar formato PNG para maior compatibilidade com a API OpenAI
        imageUrl = `data:image/png;base64,${base64Image}`;
      }
    } else if (typeof imageData === 'string') {
      if (imageData.startsWith('data:')) {
        // É uma string base64 com data URI
        // Verificar se o formato é suportado pela OpenAI
        const mimeMatch = imageData.match(/^data:([\w\/+]+);base64,/);
        const mime = mimeMatch ? mimeMatch[1].toLowerCase() : null;
        
        if (!mime || !['image/png', 'image/jpeg', 'image/gif', 'image/webp'].includes(mime)) {
          // Formato não suportado, tentar converter para PNG
          console.log(`Formato de imagem não suportado: ${mime}. Tentando converter para PNG.`);
          try {
            // Se for um PDF em formato base64, tentar converter
            if (mime === 'application/pdf') {
              console.log('Detectado PDF em formato base64, convertendo para texto...');
              // Decodificar o base64 para buffer
              const base64Data = imageData.split(',')[1];
              const pdfBuffer = Buffer.from(base64Data, 'base64');
              
              // Converter para texto
              const pdfText = await convertPdfToText(pdfBuffer);
              console.log(`PDF base64 convertido com sucesso: ${pdfText.length} caracteres processados`);
              
              // Processar o texto do PDF
              return await analyzePdfText(userId, companyId, pdfText, prompt, structured, planId);
            } else {
              // Para outros formatos não suportados, apenas tentar mudar o MIME type
              const base64Data = imageData.split(',')[1];
              imageUrl = `data:image/png;base64,${base64Data}`;
            }
          } catch (e) {
            console.error('Erro ao processar formato não suportado:', e);
            throw new Error(`Formato de imagem não suportado pela OpenAI: ${mime}. Use PNG, JPEG, GIF ou WebP.`);
          }
        } else {
          // Formato já suportado
          imageUrl = imageData;
        }
      } else if (imageData.startsWith('/')) {
        // É um caminho de arquivo no sistema de arquivos
        const fileData = fs.readFileSync(imageData);
        base64Image = fileData.toString('base64');
        // Usar formato PNG para maior compatibilidade
        imageUrl = `data:image/png;base64,${base64Image}`;
      } else if (imageData.startsWith('http')) {
        // É uma URL da web - verificar se termina com extensão suportada
        const urlLower = imageData.toLowerCase();
        const hasValidExtension = ['.png', '.jpg', '.jpeg', '.gif', '.webp'].some(ext => urlLower.endsWith(ext));
        
        if (!hasValidExtension) {
          console.warn('A URL da imagem não tem uma extensão reconhecida. Isso pode causar problemas com a API OpenAI.');
        }
        
        imageUrl = imageData;
        console.log('Processando imagem a partir de URL:', imageUrl);
      } else {
        // Assumir que é uma string base64 sem data URI
        // Usar formato PNG para maior compatibilidade
        imageUrl = `data:image/png;base64,${imageData}`;
      }
    } else {
      throw new Error('Formato de imagem inválido. Deve ser um Buffer ou uma string.');
    }
    
      // Prompt melhorado para resultados laboratoriais
  let adjustedPrompt = prompt;
  if (structured) {
    // Para resultados de laboratório, usar um prompt mais específico e detalhado
    if (prompt.includes('laboratoriais') || prompt.includes('exames')) {
      adjustedPrompt = `Você é um especialista em interpretação de exames laboratoriais. Analise cuidadosamente esta imagem de resultado de exame laboratorial. 

Sua tarefa é:
1. Identificar cada um dos testes presentes na imagem
2. Extrair com precisão os valores numéricos de cada teste
3. Capturar as unidades de medida (mg/dL, g/L, etc.)
4. Identificar os valores de referência para cada teste
5. Determinar quais valores estão fora da referência normal
6. Fornecer uma interpretação clínica breve para cada resultado anormal

IMPORTANTE: Retorne sua resposta APENAS como um objeto JSON válido com a seguinte estrutura:
{
  "summary": "Resumo geral dos resultados laboratoriais",
  "outOfRange": [
    {
      "name": "Nome do teste",
      "value": "Valor encontrado",
      "unit": "Unidade",
      "reference": "Valor de referência",
      "interpretation": "Interpretação clínica"
    }
  ],
  "recommendations": ["Recomendação 1", "Recomendação 2"]
}

Se não conseguir identificar os valores específicos, indique isso claramente no summary.
${prompt}`;
    }
  }

  // Verificar se deve usar Gemini ou OpenAI baseado na configuração
  let aiConfig;
  let visionModel = 'gpt-4o'; // Modelo padrão OpenAI que suporta visão
  let temperature = 0.3;
  let maxTokens = 2000;
  let useGemini = false;
  
  try {
    aiConfig = await getAIConfigByPageKey('lab_analysis');
    if (aiConfig && aiConfig.is_active) {
      const configModel = aiConfig.model;
      
      // Verificar se é um modelo Gemini
      if (configModel.toLowerCase().includes('gemini')) {
        useGemini = true;
        console.log(`Modelo Gemini detectado: ${configModel}. Usando API Gemini.`);
        
        // Importar e usar o GeminiService
        const { GeminiService } = await import('./geminiService');
        const Setting = (await import('../../models/Setting')).default;
        
        // Buscar chave da API do Gemini
        const geminiSetting = await Setting.findOne({ where: { key: 'gemini_api_key' } });
        const geminiApiKey = geminiSetting?.value;
        
        if (!geminiApiKey) {
          throw new Error('Chave da API do Gemini não configurada. Configure em /admin/settings.');
        }
        
        // Criar instância do GeminiService
        const geminiService = new GeminiService(geminiApiKey);
        
        // Usar o Gemini para analisar a imagem
        const geminiResponse = await geminiService.analyzeImage(
          imageUrl, 
          aiConfig.prompt || adjustedPrompt, 
          aiConfig, 
          structured
        );
        
        console.log('Análise de imagem bem-sucedida com Gemini');
        
        // Registrar uso de tokens (estimativa para Gemini)
        const estimatedTokens = await geminiService.countTokens(
          `${aiConfig.prompt || adjustedPrompt} [imagem analisada]`, 
          configModel
        );
        
        await recordTokenUsage(userId, companyId, 1, estimatedTokens, configModel);
        
        // Retornar no formato JSON esperado
        return JSON.stringify(geminiResponse);
      } else {
        // Lista de modelos OpenAI que suportam visão
        const visionModels = ['gpt-4o', 'gpt-4o-mini', 'gpt-4-turbo', 'gpt-4-vision-preview'];
        
        if (visionModels.includes(configModel)) {
          visionModel = configModel;
        } else {
          console.log(`Modelo configurado (${configModel}) não suporta visão. Usando ${visionModel}.`);
        }
      }
      
      temperature = aiConfig.temperature || 0.3;
      maxTokens = aiConfig.max_tokens || 2000;
      console.log(`Usando AI Configuration para lab_analysis: modelo=${visionModel}, temperatura=${temperature}, max_tokens=${maxTokens}`);
    } else {
      console.log('AI Configuration não encontrada ou inativa para lab_analysis. Usando configurações padrão.');
    }
  } catch (configError) {
    console.error('Erro ao carregar AI Configuration:', configError);
    console.log('Usando configurações padrão para análise de imagem.');
  }
  
  // Se chegou até aqui, usar OpenAI (fallback)
    
    // Se temos AI Config com prompt personalizado, usar ele
    if (aiConfig && aiConfig.prompt && structured && 
        (prompt.includes('laboratoriais') || prompt.includes('exames'))) {
      adjustedPrompt = aiConfig.prompt;
      console.log('Usando prompt personalizado da AI Configuration');
    } else if (structured) {
      // Para resultados de laboratório, usar um prompt mais específico e detalhado
      if (prompt.includes('laboratoriais') || prompt.includes('exames')) {
        adjustedPrompt = `Você é um especialista em interpretação de exames laboratoriais. Analise cuidadosamente esta imagem de resultado de exame laboratorial. 

Sua tarefa é:
1. Identificar cada um dos testes presentes na imagem
2. Extrair com precisão os valores numéricos de cada teste
3. Capturar as unidades de medida (mg/dL, g/L, etc.)
4. Identificar os valores de referência para cada teste
5. Determinar quais valores estão fora da referência normal
6. Fornecer uma interpretação clínica breve para cada resultado anormal

Importante: Preste muita atenção ao formato dos números (vírgulas decimais, etc) e garanta que estão sendo interpretados corretamente. Se um valor não estiver claramente legível, indique isso na sua análise.

Para exames com resultados qualitativos (Positivo/Negativo/Reagente), capture esses resultados também.

Esta é uma análise do Dr. Marcus, muito importante. O sumário deve começar com: 'Análise do Dr. Marcus: ' seguido do resultado.

Importante: Retorne os resultados em formato JSON com a seguinte estrutura:
{
  "summary": "Análise do Dr. Marcus: [resumo geral dos resultados]",
  "outOfRange": [
    {
      "name": "Nome do teste",
      "value": "Valor encontrado",
      "unit": "Unidade de medida",
      "reference": "Valores de referência",
      "interpretation": "Interpretação clínica"
    }
  ],
  "recommendations": ["Recomendação 1", "Recomendação 2"]
}`;
      } else {
        // Para outros tipos de imagens, formato genérico
        adjustedPrompt = `${prompt}\n\nFormate sua resposta como um objeto JSON válido.`;
      }
    }
    
    console.log('Enviando imagem para análise com o modelo:', visionModel);
    console.log(`Configurações: temperatura=${temperature}, max_tokens=${maxTokens}`);
    console.log('Tipo de imagem processada:', imageUrl.startsWith('data:') ? imageUrl.substring(0, 30) + '...' : imageUrl);
    
    // Criar a requisição para o modelo de visão
    const response = await openai.chat.completions.create({
      model: visionModel,
      messages: [
        {
          role: 'user',
          content: [
            { type: 'text', text: adjustedPrompt },
            {
              type: 'image_url',
              image_url: {
                url: imageUrl,
                detail: 'high' // Solicitar alta resolução para melhor OCR do texto
              }
            }
          ]
        }
      ],
      max_tokens: maxTokens,
      temperature: temperature,
      response_format: structured ? { type: "json_object" } : undefined
    });
    
    // Obter a resposta de descrição da imagem
    const description = response.choices[0]?.message?.content || 'Não foi possível analisar a imagem';
    
    // Log da resposta para fins de depuração
    console.log('Resposta recebida da API de visão:', 
                description.length > 100 ? description.substring(0, 100) + '...' : description);
    
    // Registrar uso de tokens
    const tokensUsed = response.usage?.total_tokens || 0;
    
    // Usar um ID de prompt padrão para análise de imagem (criar um no banco de dados)
    // ou obter dinamicamente baseado em algum identificador para análise de imagem
    const defaultPromptId = 1; // Substitua por um valor apropriado
    
    await recordTokenUsage(userId, companyId, defaultPromptId, tokensUsed, visionModel);
    
    // Verificar se a resposta é válida
    if (structured) {
      try {
        // Verificar se a resposta é um JSON válido quando esperamos uma resposta estruturada
        if (typeof description === 'string') {
          // Verificar se a string parece um JSON antes de tentar fazer o parse
          const trimmed = description.trim();
          if (trimmed.startsWith('{') && trimmed.endsWith('}')) {
            JSON.parse(description);
          } else {
            // Se não parecer um JSON, lançar erro para cair no catch
            throw new Error('A resposta não está no formato JSON esperado');
          }
        }
      } catch (jsonError) {
        console.error('Erro ao parsear resposta JSON da análise de imagem:', jsonError);
        // Se a resposta não for um JSON válido, retornar uma resposta estruturada de erro
        return {
          success: true, // Ainda retornamos true para não quebrar o fluxo
          data: JSON.stringify({
            summary: "A análise da imagem não gerou resultados estruturados válidos. Por favor, verifique a qualidade da imagem fornecida.",
            outOfRange: [],
            recommendations: ["Tente enviar a imagem novamente com melhor qualidade", "Certifique-se que o texto na imagem está legível", "Considere enviar os dados em formato textual se possível"]
          }),
          tokensUsed
        };
      }
    }
    
    return {
      success: true,
      data: description,
      tokensUsed
    };
  } catch (error: any) {
    console.error('Erro ao analisar imagem:', error);
    
    // Tratar erros específicos de formato de imagem
    let errorMessage = error.message || 'Erro desconhecido';
    let recommendations = [
      "Verifique se a imagem está nítida e bem enquadrada", 
      "Tente novamente ou envie uma imagem com melhor qualidade"
    ];
    
    if (error.code === 'invalid_image_format' || errorMessage.includes('unsupported image')) {
      errorMessage = 'Formato de imagem não suportado pela API OpenAI. Use PNG, JPEG, GIF ou WebP.';
      recommendations = [
        "Converta a imagem para um dos formatos suportados: PNG, JPEG, GIF ou WebP",
        "Tente enviar um PDF em vez de uma imagem para melhor extração de texto",
        "Se você está enviando um PDF, verifique se ele não está protegido ou danificado"
      ];
    }
    
    // Garantir que retornamos uma estrutura compatível mesmo em caso de erro
    if (structured && prompt.includes('laboratoriais')) {
      return {
        success: true, // Para não quebrar o fluxo do frontend
        data: JSON.stringify({
          summary: `Erro ao processar a imagem: ${errorMessage}`,
          outOfRange: [],
          recommendations: recommendations
        }),
        message: errorMessage
      };
    }
    return {
      success: false,
      message: errorMessage
    };
  }
};

/**
 * Analisa texto de um PDF, processando-o como se fosse uma imagem
 * @param userId ID do usuário
 * @param companyId ID da empresa
 * @param pdfText Texto extraído do PDF
 * @param prompt Prompt para análise
 * @param structured Se a resposta deve ser estruturada em JSON
 * @returns Resultado da análise do texto do PDF
 */
async function analyzePdfText(
  userId: number,
  companyId: number,
  pdfText: string,
  prompt: string,
  structured: boolean,
  planId?: string // Adicionar opção para receber o ID do plano para atualização de progresso
): Promise<any> {
  // Verificar se é um PDF grande (mais de 3 páginas pode demorar mais)
  const isLargePdf = pdfText.length > 10000;
  
  // Acessar o serviço de análise para atualizar o progresso se o planId estiver disponível
  const analysisController = await import('../../controllers/analysisController');
  const updateProgress = (processedPages: number, totalPages: number, message?: string) => {
    if (planId) {
      const progress = Math.round((processedPages / totalPages) * 100);
      const progressMap = analysisController.analysisProgressMap;
      
      if (progressMap && progressMap.has(planId)) {
        const currentProgress = progressMap.get(planId);
        if (currentProgress) {
          progressMap.set(planId, {
            ...currentProgress,
            status: 'in_progress',
            progress: progress,
            processedPages,
            totalPages,
            message: message || `Processando página ${processedPages} de ${totalPages}`,
            lastUpdateTime: new Date()
          });
        }
      }
    }
  };
  
  // Para PDFs grandes, criar resposta inicial para manter o frontend informado
  if (isLargePdf) {
    console.log(`PDF grande detectado com ${pdfText.length} caracteres. Iniciando processamento detalhado...`);
    // Atualizar o progresso inicial
    updateProgress(0, 1, 'Iniciando análise de documento com texto extenso');
  }
  
  // Obter configurações da AI Configuration para lab_analysis
  let aiConfig;
  let visionModel = 'gpt-4o'; // Modelo padrão que suporta visão
  let temperature = 0.3;
  let maxTokens = 2000;
  
  try {
    aiConfig = await getAIConfigByPageKey('lab_analysis');
    if (aiConfig && aiConfig.is_active) {
      // Usar configurações da AI Configuration, mas garantir que o modelo suporte visão
      const configModel = aiConfig.model;
      // Lista de modelos que suportam visão
      const visionModels = ['gpt-4o', 'gpt-4o-mini', 'gpt-4-turbo', 'gpt-4-vision-preview'];
      
      if (visionModels.includes(configModel)) {
        visionModel = configModel;
      } else {
        console.log(`Modelo configurado (${configModel}) não suporta visão. Usando ${visionModel}.`);
      }
      
      temperature = aiConfig.temperature || 0.3;
      maxTokens = aiConfig.max_tokens || 2000;
      console.log(`Usando AI Configuration para lab_analysis (PDF): modelo=${visionModel}, temperatura=${temperature}, max_tokens=${maxTokens}`);
    } else {
      console.log('AI Configuration não encontrada ou inativa para lab_analysis. Usando configurações padrão.');
    }
  } catch (configError) {
    console.error('Erro ao carregar AI Configuration:', configError);
    console.log('Usando configurações padrão para análise de PDF.');
  }
  
  // Prompt melhorado para resultados laboratoriais
  let adjustedPrompt = prompt;
  
  // Se temos AI Config com prompt personalizado, usar ele
  if (aiConfig && aiConfig.prompt && structured && 
      (prompt.includes('laboratoriais') || prompt.includes('exames'))) {
    adjustedPrompt = aiConfig.prompt;
    console.log('Usando prompt personalizado da AI Configuration para PDF');
  } else if (structured) {
    // Para resultados de laboratório, usar um prompt mais específico e detalhado
    if (prompt.includes('laboratoriais') || prompt.includes('exames')) {
      adjustedPrompt = `Você é um especialista em interpretação de exames laboratoriais. Analise cuidadosamente este texto de resultado de exame laboratorial. 

Sua tarefa é:
1. Identificar cada um dos testes presentes no texto
2. Extrair com precisão os valores numéricos de cada teste
3. Capturar as unidades de medida (mg/dL, g/L, etc.)
4. Identificar os valores de referência para cada teste
5. Determinar quais valores estão fora da referência normal
6. Fornecer uma interpretação clínica breve para cada resultado anormal

Importante: Preste muita atenção ao formato dos números (vírgulas decimais, etc) e garanta que estão sendo interpretados corretamente. Se um valor não estiver claramente legível, indique isso na sua análise.

Para exames com resultados qualitativos (Positivo/Negativo/Reagente), capture esses resultados também.

Esta é uma análise do Dr. Marcus, muito importante. O sumário deve começar com: 'Análise do Dr. Marcus: ' seguido do resultado.

Importante: Retorne os resultados em formato JSON com a seguinte estrutura:
{
  "summary": "Análise do Dr. Marcus: [resumo geral dos resultados]",
  "outOfRange": [
    {
      "name": "Nome do teste",
      "value": "Valor encontrado",
      "unit": "Unidade de medida",
      "reference": "Valores de referência",
      "interpretation": "Interpretação clínica"
    }
  ],
  "recommendations": ["Recomendação 1", "Recomendação 2"]
}`;
    } else {
      // Para outros tipos de documentos
      adjustedPrompt = `${prompt}\n\nFormate sua resposta como um objeto JSON válido.`;
    }
  }
  
  // Obter instância atualizada do OpenAI
  const openai = await getOpenAI();
  
  console.log(`Analisando texto PDF com modelo: ${visionModel}, temperatura: ${temperature}, max_tokens: ${maxTokens}`);
  
  // Criar a requisição para o modelo de visão
  const response = await openai.chat.completions.create({
    model: visionModel,
    messages: [
      {
        role: 'user',
        content: [
          { type: 'text', text: adjustedPrompt },
          {
            type: 'text',
            text: pdfText
          }
        ]
      }
    ],
    max_tokens: maxTokens,
    temperature: temperature,
    response_format: structured ? { type: "json_object" } : undefined
  });
  
  // Obter a resposta de descrição do texto
  const description = response.choices[0]?.message?.content || 'Não foi possível analisar o texto';
  
  // Log da resposta para fins de depuração
  console.log('Resposta recebida da API de visão:', 
              description.length > 100 ? description.substring(0, 100) + '...' : description);
  
  // Registrar uso de tokens
  const tokensUsed = response.usage?.total_tokens || 0;
  
  // Usar um ID de prompt padrão para análise de imagem (criar um no banco de dados)
  // ou obter dinamicamente baseado em algum identificador para análise de imagem
  const defaultPromptId = 1; // Substitua por um valor apropriado
  
  await recordTokenUsage(userId, companyId, defaultPromptId, tokensUsed, visionModel);
  
  // Verificar se a resposta é válida
  if (structured) {
    try {
      // Verificar se a resposta é um JSON válido quando esperamos uma resposta estruturada
      if (typeof description === 'string') {
        // Verificar se a string parece um JSON antes de tentar fazer o parse
        const trimmed = description.trim();
        if (trimmed.startsWith('{') && trimmed.endsWith('}')) {
          JSON.parse(description);
        } else {
          // Se não parecer um JSON, lançar erro para cair no catch
          throw new Error('A resposta não está no formato JSON esperado');
        }
      }
    } catch (jsonError) {
      console.error('Erro ao parsear resposta JSON da análise de texto:', jsonError);
      // Se a resposta não for um JSON válido, retornar uma resposta estruturada de erro
      return {
        success: true, // Ainda retornamos true para não quebrar o fluxo
        data: JSON.stringify({
          summary: "A análise do texto não gerou resultados estruturados válidos. Por favor, verifique a qualidade do texto fornecido.",
          outOfRange: [],
          recommendations: ["Tente enviar o texto novamente com melhor qualidade", "Certifique-se que o texto está legível", "Considere enviar os dados em formato de imagem se possível"]
        }),
        tokensUsed
      };
    }
  }
  
  return {
    success: true,
    data: description,
    tokensUsed
  };
}

/**
 * Analisa múltiplas páginas de um PDF, processando cada imagem separadamente e combinando os resultados
 * @param userId ID do usuário
 * @param companyId ID da empresa
 * @param images Array de imagens em base64 das páginas do PDF
 * @param prompt Prompt para análise
 * @param structured Se a resposta deve ser estruturada em JSON
 * @returns Resultado combinado da análise de todas as páginas
 */
async function analyzeMultiPagePdf(
  userId: number,
  companyId: number,
  images: string[],
  prompt: string,
  structured: boolean,
  planId?: string // Adicionar opção para receber o ID do plano para atualização de progresso
): Promise<any> {
  // Se houver apenas uma página, analisar normalmente sem recursão
  if (images.length === 1) {
    return await analyzeImage(userId, companyId, images[0], prompt, structured, false);
  }
  
  console.log(`Analisando ${images.length} páginas do PDF...`);
  
  // Verificar se é um PDF grande (mais de 3 páginas pode demorar mais)
  const isLargePdf = images.length > 3;
  
  // Acessar o serviço de análise para atualizar o progresso se o planId estiver disponível
  const analysisController = await import('../../controllers/analysisController');
  const updateProgress = (processedPages: number, totalPages: number, message?: string) => {
    if (planId) {
      const progress = Math.round((processedPages / totalPages) * 100);
      const progressMap = analysisController.analysisProgressMap;
      
      if (progressMap && progressMap.has(planId)) {
        const currentProgress = progressMap.get(planId);
        if (currentProgress) {
          progressMap.set(planId, {
            ...currentProgress,
            status: 'in_progress',
            progress: progress,
            processedPages,
            totalPages,
            message: message || `Processando página ${processedPages} de ${totalPages}`,
            lastUpdateTime: new Date()
          });
        }
      }
    }
  };
  
  // Para PDFs grandes, criar resposta inicial para manter o frontend informado
  if (isLargePdf) {
    console.log(`PDF grande detectado com ${images.length} páginas. Iniciando processamento detalhado...`);
    // Atualizar o progresso inicial
    updateProgress(0, images.length, 'Iniciando análise de documento com múltiplas páginas');
  }
  
  // Array para armazenar análises parciais
  const pageAnalyses: any[] = [];
  let totalTokensUsed = 0;
  
  // Processar cada página
  for (let i = 0; i < images.length; i++) {
    try {
      console.log(`Analisando página ${i + 1} de ${images.length}...`);
      
      // Registrar progresso percentual para monitoramento
      const progressPercent = Math.round(((i + 1) / images.length) * 100);
      console.log(`Progresso: ${progressPercent}% completo`);
      
      // Atualizar o progresso no sistema de rastreamento
      updateProgress(i + 1, images.length, `Analisando página ${i + 1} de ${images.length}...`);
      
      // Modificar o prompt para informar qual página está sendo analisada
      const pagePrompt = `${prompt}\n\nEsta é a página ${i + 1} de ${images.length} de um documento PDF. Extraia todas as informações visíveis e inclua na análise.`;
      
      // Analisar a página atual
      const pageResult = await analyzeImage(userId, companyId, images[i], pagePrompt, structured, false);
      
      if (pageResult.success) {
        pageAnalyses.push(pageResult);
        totalTokensUsed += pageResult.tokensUsed || 0;
        console.log(`Página ${i + 1} processada com sucesso: ${(pageResult.data?.summary || '').substring(0, 50)}...`);
      } else {
        console.warn(`Falha ao analisar página ${i + 1}: ${pageResult.message}`);
      }
    } catch (pageError) {
      console.error(`Erro ao processar página ${i + 1}:`, pageError);
    }
  }
  
  // Se nenhuma página for analisada com sucesso
  if (pageAnalyses.length === 0) {
    return {
      success: false,
      message: 'Não foi possível analisar nenhuma página do PDF.',
      tokensUsed: 0
    };
  }
  
  // Combinar os resultados de todas as páginas
  let combinedData: any = {};
  
  if (structured) {
    // Para respostas estruturadas, precisamos combinar os JSONs
    try {
      // Processar cada resultado para garantir que está em formato JSON
      const processedResults = pageAnalyses.map((result, index) => {
        if (typeof result.data === 'string') {
          try {
            // Tentar parsear o JSON
            return {
              page: index + 1,
              ...JSON.parse(result.data)
            };
          } catch (e) {
            // Se falhar, retornar um objeto com o texto
            return {
              page: index + 1,
              text: result.data
            };
          }
        } else {
          // Se já for um objeto, usar diretamente
          return {
            page: index + 1,
            ...result.data
          };
        }
      });
      
      // Verificar se os dados são resultados de exames laboratoriais
      const hasLabFields = processedResults.some(r => r.summary && (r.outOfRange || r.recommendations));
      
      if (hasLabFields) {
        // Extrair apenas sumários significativos (evitar texto vazio ou default)
        const relevantSummaries = processedResults
          .map(r => r.summary || '')
          .filter(s => s && !s.includes('não retornou resultados') && s.length > 20);
        
        // Criar um sumário principal significativo
        let mainSummary;
        if (relevantSummaries.length > 0) {
          // Usar o primeiro sumário relevante como base, limitado a 500 caracteres
          mainSummary = relevantSummaries[0].substring(0, 500);
          if (relevantSummaries.length > 1) {
            mainSummary += ` (+ ${relevantSummaries.length - 1} outros exames analisados)`;
          }
        } else {
          mainSummary = `Análise completa do exame com ${images.length} páginas.`;
        }
        
        // Combinar itens fora da faixa, garantindo que são objetos válidos
        const allOutOfRange = processedResults
          .flatMap(r => Array.isArray(r.outOfRange) ? r.outOfRange : [])
          .filter(item => item && typeof item === 'object' && item.name) // Garantir que são objetos válidos
          // Remover duplicatas baseado no nome do teste
          .filter((item, index, self) => 
            index === self.findIndex(t => t.name === item.name)
          );
        
        // Combinar recomendações (remover duplicatas e itens vazios)
        const allRecommendations = Array.from(new Set(
          processedResults
            .flatMap(r => Array.isArray(r.recommendations) ? r.recommendations : [])
            .filter(rec => rec && rec.length > 5) // Filtrar strings vazias ou muito curtas
        ));
        
        // Montar objeto consolidado no formato esperado pelo frontend
        combinedData = {
          summary: mainSummary,
          outOfRange: allOutOfRange,
          recommendations: allRecommendations,
          pages: processedResults.map(r => ({
            page: r.page,
            summary: r.summary || ''
          }))
        };
        
        // Se não há valores fora da faixa e recomendações, adicionar uma recomendação padrão
        if (allOutOfRange.length === 0 && allRecommendations.length === 0) {
          combinedData.recommendations = ['Consulte um profissional de saúde para interpretar estes resultados em detalhes.'];
        }
      } else {
        // Para outros tipos de documentos
        combinedData = {
          summary: `Análise completa do documento com ${images.length} páginas.`,
          outOfRange: [],
          recommendations: ['Consulte um profissional de saúde para interpretar estes resultados em detalhes.'],
          pages: processedResults
        };
      }
    } catch (combineError) {
      console.error('Erro ao combinar dados estruturados das páginas:', combineError);
      // Fallback para formato estruturado simples quando há erro
      combinedData = {
        summary: 'Houve um problema ao combinar as análises de páginas múltiplas.',
        outOfRange: [],
        recommendations: [
          "Tente novamente com um arquivo PDF de melhor qualidade",
          "Consulte um profissional de saúde para interpretar seus resultados."
        ]
      };
    }
  } else {
    // Para respostas em texto, formatar como um objeto JSON
    // para manter consistência na interface
    const combinedText = pageAnalyses
      .map((pa, idx) => `--- PÁGINA ${idx + 1} ---\n${pa.data || pa.message || 'Sem dados'}\n`)
      .join('\n');
    
    combinedData = {
      summary: `Análise de ${images.length} páginas do documento.`,
      text: combinedText,
      outOfRange: [],
      recommendations: ['Consulte um profissional de saúde para interpretar estes resultados em detalhes.']
    };
  }
  
  return {
    success: true,
    data: {
      ...combinedData,
      processingStatus: 'completed',
      totalPages: images.length,
      processedPages: pageAnalyses.length
    },
    tokensUsed: totalTokensUsed,
    message: `Análise concluída para ${pageAnalyses.length} de ${images.length} páginas.`
  };
}
