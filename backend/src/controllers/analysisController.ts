import { Request, Response } from 'express';
import { PatientPlan, Setting, Prompt, TokenUsage } from '../models';
import { generateAIResponse, analyzeImage, getOpenAI } from '../services/ai/openaiService';
import { extractTextFromPDF, extractTextFromBase64PDF } from '../services/pdf/pdfService';
import { calculateCost } from '../utils/tokenCalculator';

// Mapa para controlar análises em andamento, usando o ID do plano como chave
// Interface para armazenar informações detalhadas sobre o progresso da análise
interface AnalysisProgress {
  status: 'pending' | 'in_progress' | 'completed' | 'failed';
  progress: number; // Porcentagem de 0 a 100
  totalPages?: number;
  processedPages?: number;
  message?: string;
  startTime: Date;
  lastUpdateTime: Date;
  result?: any; // Resultado final da análise quando concluída
  error?: string;
}

// Map para rastrear análises em andamento com informações detalhadas
export const analysisProgressMap = new Map<string, AnalysisProgress>();

// Manter compatibilidade com o código existente
const ongoingAnalyses = new Map<string, boolean>();

// A interface Request foi estendida no arquivo types/express.d.ts

// Interface para tipar corretamente as respostas da API
interface AIResponse {
  success: boolean;
  data?: any;
  message?: string;
  tokensUsed?: number;
  tokenLimitReached?: boolean;
}

// Interfaces para os tipos de dados
interface LabData {
  image_url?: string;
  file_url?: string;
  url?: string;
  document_type?: string;
  file_buffer?: string;
  text?: string;
  extraction_method?: string;
  pdf_metadata?: any;
  pdf_info?: any;
  [key: string]: any;
}

interface SystemIssue {
  system: string;
  severity: string;
  notes: string;
}

interface TimelineEvent {
  type: string;
  date: string;
  description?: string;
  [key: string]: any;
}

interface PatternData {
  type: string;
  count: number;
  summary: string;
}

// Get analysis status for a plan
export const getAnalysisStatus = async (req: Request, res: Response) => {
  const { id } = req.params;
  
  try {
    // Verificar se existe uma análise em andamento para este plano
    const progressInfo = analysisProgressMap.get(id);
    const isAnalysisOngoing = ongoingAnalyses.get(id);
    
    // Se não temos informações de progresso ou a análise já não está mais em andamento
    if (!progressInfo) {
      // Verificar se existe um plano com este ID e tem resultados de análise
      try {
        const plan = await PatientPlan.findByPk(id);
        if (plan && plan.lab_results) {
          // Se temos resultados salvos no banco, retornamos eles
          return res.status(200).json({
            message: 'Análise concluída com sucesso',
            isProcessing: false,
            status: 'completed',
            progress: 100,
            data: plan.lab_results
          });
        }
      } catch (err) {
        console.error('Erro ao buscar plano:', err);
      }

      // Se não encontramos resultados no banco ou ocorreu erro
      return res.status(200).json({
        message: 'Nenhuma análise em andamento encontrada para este plano',
        isProcessing: false,
        status: 'completed',
        progress: 100
      });
    }
    
    // Se temos informações de progresso mas a análise já não está mais no mapa de análises em andamento
    // então foi concluída e podemos retornar isso para o frontend
    if (progressInfo && !isAnalysisOngoing) {
      // Buscar os resultados mais recentes do banco de dados
      try {
        const plan = await PatientPlan.findByPk(id);
        if (plan && plan.lab_results) {
          // Se temos dados no banco, usamos eles
          return res.status(200).json({
            message: 'Análise concluída com sucesso',
            isProcessing: false,
            status: 'completed',
            progress: 100,
            totalPages: progressInfo.totalPages,
            processedPages: progressInfo.processedPages,
            data: plan.lab_results,
            elapsedTime: new Date().getTime() - progressInfo.startTime.getTime()
          });
        }
      } catch (err) {
        console.error('Erro ao buscar plano após conclusão:', err);
      }

      // Fallback para usar os dados do progressInfo se não conseguirmos buscar do banco
      return res.status(200).json({
        message: 'Análise concluída com sucesso',
        isProcessing: false,
        status: 'completed',
        progress: 100,
        totalPages: progressInfo.totalPages,
        processedPages: progressInfo.processedPages,
        data: progressInfo.result || {},
        elapsedTime: new Date().getTime() - progressInfo.startTime.getTime()
      });
    }
    
    // Verificar se a análise já foi concluída
    if (progressInfo.status === 'completed') {
      // Buscar os resultados mais recentes do banco de dados
      try {
        const plan = await PatientPlan.findByPk(id);
        if (plan && plan.lab_results) {
          // Se temos dados no banco, usamos eles
          return res.status(200).json({
            message: 'Análise concluída com sucesso',
            isProcessing: false,
            status: 'completed',
            progress: 100,
            totalPages: progressInfo.totalPages,
            processedPages: progressInfo.processedPages,
            data: plan.lab_results,
            elapsedTime: new Date().getTime() - progressInfo.startTime.getTime()
          });
        }
      } catch (err) {
        console.error('Erro ao buscar plano quando análise marcada como concluída:', err);
      }

      // Fallback para usar dados de progressInfo
      return res.status(200).json({
        message: 'Análise concluída com sucesso',
        isProcessing: false,
        data: progressInfo.result || {},
        status: 'completed',
        progress: 100,
        totalPages: progressInfo.totalPages,
        processedPages: progressInfo.processedPages,
        elapsedTime: new Date().getTime() - progressInfo.startTime.getTime()
      });
    }
    
    // Verificar se a análise falhou
    if (progressInfo.status === 'failed') {
      return res.status(200).json({
        message: 'Análise falhou',
        isProcessing: false,
        error: progressInfo.error,
        progress: progressInfo.progress
      });
    }
    
    // Análise em andamento - retornar o progresso atual
    return res.status(200).json({
      message: progressInfo.message || 'Análise em andamento',
      isProcessing: true,
      progress: progressInfo.progress,
      totalPages: progressInfo.totalPages,
      processedPages: progressInfo.processedPages,
      status: progressInfo.status,
      elapsedTime: new Date().getTime() - progressInfo.startTime.getTime(),
      data: {
        summary: `Análise em andamento: ${progressInfo.progress}% concluído`,
        outOfRange: [],
        recommendations: ['Aguarde enquanto processamos seu arquivo. Esta operação pode levar alguns minutos para arquivos com múltiplas páginas.'],
        processingStatus: 'in_progress'
      }
    });
  } catch (error) {
    console.error('Erro ao verificar status da análise:', error);
    return res.status(500).json({
      message: 'Erro ao verificar status da análise',
      error: String(error)
    });
  }
};

// Analyze lab results
export const analyzeLabResults = async (req: Request, res: Response) => {
  const { id } = req.params;
  const { lab_results } = req.body;
  const userId = req.user.id;
  const companyId = req.user.company_id;
  const userRole = req.user.role;
  
  // Verificar se já existe uma análise em andamento para este plano
  if (ongoingAnalyses.get(id)) {
    console.log(`Análise para o plano ${id} já está em andamento. Ignorando solicitação duplicada.`);
    
    // Recuperar informações de progresso se disponíveis
    const progressInfo = analysisProgressMap.get(id) || {
      status: 'in_progress',
      progress: 0,
      message: 'Processando análise de laboratório...',
      startTime: new Date(),
      lastUpdateTime: new Date()
    };
    
    return res.status(200).json({
      message: 'Uma análise para este plano já está em andamento. Por favor, aguarde.',
      isProcessing: true,
      progress: progressInfo.progress,
      totalPages: progressInfo.totalPages,
      processedPages: progressInfo.processedPages,
      data: {
        summary: 'Processando análise de laboratório...',
        outOfRange: [],
        recommendations: ['Aguarde enquanto processamos seu arquivo. Esta operação pode levar alguns minutos para arquivos com múltiplas páginas.'],
        processingStatus: 'in_progress'
      }
    });
  }
  
  try {
    // Marcar esta análise como em andamento
    ongoingAnalyses.set(id, true);
    
    // Inicializar o progresso da análise
    analysisProgressMap.set(id, {
      status: 'pending',
      progress: 0,
      message: 'Inicializando análise...',
      startTime: new Date(),
      lastUpdateTime: new Date()
    });
    
    // Find plan
    const plan = await PatientPlan.findByPk(id);
    
    if (!plan) {
      ongoingAnalyses.delete(id); // Limpar flag em caso de erro
      return res.status(404).json({ message: 'Plan not found' });
    }
    
    // Check permission (same company or superadmin)
    if (String(plan.company_id) !== String(companyId) && userRole !== 'superadmin') {
      ongoingAnalyses.delete(id); // Limpar flag em caso de erro
      return res.status(403).json({ message: 'Not authorized to analyze this plan' });
    }
    
    // Use provided lab results or get from plan
    let labData: LabData = lab_results || plan.lab_results;
    
    if (!labData) {
      return res.status(400).json({ message: 'No lab results available for analysis' });
    }
    
    // Verificar se é uma análise baseada apenas em texto
    const isTextOnlyAnalysis = labData.text_only_analysis === true;
    
    // Verificar se temos URL de imagem nos dados laboratoriais
    const imageUrl = labData.image_url || labData.file_url || labData.url;
    let extractedText = '';
        // Se é uma análise apenas de texto, usar o texto fornecido
    if (isTextOnlyAnalysis && labData.notes) {
      console.log('Realizando análise baseada apenas no texto fornecido (sem arquivo)...');
      extractedText = labData.notes;
      
      // Preparar uma resposta imediata baseada no texto fornecido
      try {
        // Limitar o tamanho do texto para evitar exceder o limite de tokens
        const MAX_TEXT_LENGTH = 4000; // Aproximadamente 3000 tokens para texto
        const truncatedText = extractedText.length > MAX_TEXT_LENGTH ? 
          extractedText.substring(0, MAX_TEXT_LENGTH) + "... (texto truncado para análise)" : 
          extractedText;
        
        const promptTemplate = `Você é um especialista em análise de exames laboratoriais. Analise detalhadamente os seguintes resultados laboratoriais e forneça:

1. SUMMARY: Um resumo detalhado e específico da saúde do paciente com base nos resultados, destacando anormalidades importantes, possíveis padrões ou condições sugeridas pelos exames. Não use texto genérico. Seja específico e detalhado sobre os achados.

2. OUTOFRANGE: Uma lista completa de TODOS os valores que estão fora da faixa de referência normal, incluindo:
   - name: Nome completo do marcador ou exame
   - value: Valor numérico do resultado
   - unit: Unidade de medida (mg/dL, U/L, etc.)
   - reference: Faixa de referência normal para o marcador
   - interpretation: Significado clínico detalhado do valor anormal (explicação médica do que esse valor pode indicar)

3. RECOMMENDATIONS: Pelo menos 3-5 recomendações específicas e personalizadas baseadas exclusivamente nos resultados anormais encontrados. Inclua sugestões nutricionais, de estilo de vida, ou de acompanhamento médico quando relevante.

IMPORTANTE: 
- Sua resposta DEVE ser um objeto JSON válido com as chaves "summary", "outOfRange" e "recommendations"
- O campo "outOfRange" deve ser um array de objetos, cada um com as propriedades exatas: name, value, unit, reference e interpretation
- Se não encontrar valores anormais, inclua um array vazio em "outOfRange"
- Seja específico, detalhado e relevante. Não use respostas genéricas.
- Inclua todos os valores anormais que você conseguir identificar no texto.

Texto dos resultados laboratoriais:
${truncatedText}`;
        
        // Identificar token usage
        const prompt = await Prompt.findOne({ where: { step_key: 'lab_results_analysis' } });
        
        // Obter instância do OpenAI já configurada
        const openai = await getOpenAI();
        
        // Reduzir max_tokens para garantir que estamos dentro do limite
        const MAX_TOKENS = 1000;
        
        // Chamar OpenAI para análise de texto
        const chatCompletion = await openai.chat.completions.create({
          model: "gpt-4",
          messages: [{
            role: "system", 
            content: "Você é um médico especializado em análise de exames laboratoriais. Sua tarefa é extrair e interpretar informações clínicas importantes de resultados de laboratório, identificando todos os valores anormais e fornecendo recomendações personalizadas baseadas nesses resultados."
          }, {
            role: "user",
            content: promptTemplate
          }],
          temperature: prompt ? prompt.temperature || 0.7 : 0.7,
          max_tokens: MAX_TOKENS
          // Removendo o parâmetro response_format que não é suportado pelo modelo
        });
        
        // Extrair conteúdo
        const responseContent = chatCompletion.choices[0].message.content;
        
        // Registrar uso de tokens
        if (prompt) {
          await TokenUsage.create({
            user_id: userId,
            company_id: companyId,
            prompt_id: prompt.id,
            tokens_used: chatCompletion.usage?.total_tokens || 0,
            cost: calculateCost(chatCompletion.usage?.total_tokens || 0, 'gpt-4'),
            timestamp: new Date()
          });
        }
        
        // Processar e salvar resultado
        let analysisResult;
        try {
          // Tentar fazer o parse da resposta como JSON
          let parsedResponse;
          try {
            parsedResponse = JSON.parse(responseContent || '{}');
            console.log('Resposta da OpenAI parseada com sucesso:', JSON.stringify(parsedResponse, null, 2));
          } catch (jsonError) {
            console.error('Erro ao fazer parse da resposta como JSON, tentando extrair JSON do texto:', jsonError);
            // Tenta encontrar um objeto JSON na resposta, caso esteja misturado com texto
            const jsonMatch = responseContent.match(/(\{[\s\S]*\})/);
            if (jsonMatch && jsonMatch[0]) {
              parsedResponse = JSON.parse(jsonMatch[0]);
              console.log('JSON extraído do texto:', JSON.stringify(parsedResponse, null, 2));
            } else {
              throw new Error('Não foi possível extrair JSON da resposta');
            }
          }
          
          // Validar e garantir que todos os campos necessários existam
          analysisResult = {
            summary: typeof parsedResponse.summary === 'string' && parsedResponse.summary.length > 30 
              ? parsedResponse.summary 
              : 'Análise de resultados laboratoriais concluída. Verifique os marcadores e recomendações para detalhes.',
            outOfRange: Array.isArray(parsedResponse.outOfRange) 
              ? parsedResponse.outOfRange.map(item => {
                  if (typeof item === 'object' && item !== null) {
                    return {
                      name: item.marker || item.name || 'Marcador',
                      value: item.value || '?',
                      unit: item.unit || '',
                      reference: item.reference || 'Valor de referência não especificado',
                      interpretation: item.significance || item.interpretation || 'Significado clínico não especificado'
                    };
                  }
                  return null;
                }).filter(item => item !== null) 
              : [],
            recommendations: Array.isArray(parsedResponse.recommendations) && parsedResponse.recommendations.length > 0
              ? parsedResponse.recommendations.filter(rec => typeof rec === 'string' && rec.length > 10)
              : ['Mantenha hábitos saudáveis como alimentação equilibrada e atividade física regular.',
                 'Faça exames de rotina periodicamente conforme recomendação médica.',
                 'Consulte um especialista para interpretação detalhada dos resultados.']
          };

          // Log completo do resultado para depuração
          console.log('Resultado final da análise que será enviado:', JSON.stringify(analysisResult, null, 2));
          
          // Garantir que temos pelo menos uma recomendação com conteúdo significativo
          if (analysisResult.recommendations.length === 0 || 
              analysisResult.recommendations.every(rec => !rec || rec.trim().length < 10)) {
            analysisResult.recommendations = [
              'Mantenha hábitos saudáveis como alimentação equilibrada e atividade física regular.', 
              'Faça exames de rotina periodicamente conforme recomendação médica.'
            ];
          }
          
          // Garantir que o resumo não seja genérico ou muito curto
          if (!analysisResult.summary || 
              analysisResult.summary.length < 50 || 
              analysisResult.summary.includes('concluída. Verifique os marcadores')) {
            
            // Se tivermos valores fora da faixa, use-os para criar um resumo mais informativo
            if (analysisResult.outOfRange && analysisResult.outOfRange.length > 0) {
              analysisResult.summary = `Análise identificou ${analysisResult.outOfRange.length} valores laboratoriais fora da faixa de referência, incluindo: ` + 
                analysisResult.outOfRange.slice(0, 3).map(item => `${item.name} (${item.value})`).join(', ') +
                (analysisResult.outOfRange.length > 3 ? ' e outros.' : '.');
            }
          }
        } catch (parseError) {
          console.error('Erro ao processar resposta da OpenAI como JSON:', parseError);
          console.log('Resposta recebida:', responseContent);
          
          // Criar uma estrutura padrão caso o parse falhe
          analysisResult = {
            summary: 'Os resultados foram analisados, mas ocorreu um erro na formatação. Por favor, consulte um profissional de saúde.',
            outOfRange: [],
            recommendations: [
              'Consulte um profissional de saúde para interpretação completa dos resultados.',
              'Se necessário, solicite uma nova análise através do sistema.'
            ]
          };
        }
        
        // Atualizar o plano com os resultados da análise
        await plan.update({
          lab_results: {
            ...labData,
            analyzed_data: analysisResult,
            analysis_method: "text-only-analysis"
          }
        });
        
        // Definir o tempo de início se ainda não existir
        const startTime = new Date();

        // Atualizar progresso
        analysisProgressMap.set(id, {
          status: 'completed',
          progress: 100,
          message: 'Análise concluída com sucesso',
          startTime: startTime,
          lastUpdateTime: new Date(),
          result: analysisResult
        });

        // Retornar resposta
        return res.status(200).json({
          message: 'Análise concluída com sucesso',
          isProcessing: false,
          status: 'completed',
          progress: 100,
          data: {
            analyzed_data: analysisResult,
            notes: labData.notes,
            analysis_method: "text-only-analysis",
            patient_data: labData.patient_data || {}
          },
          analysis: analysisResult, // Adicionar para compatibilidade com outros endpoints
          elapsedTime: Date.now() - startTime.getTime()
        });
      } catch (error) {
        console.error('Erro ao processar análise baseada em texto:', error);
        ongoingAnalyses.delete(id);
        return res.status(500).json({ 
          message: 'Erro ao processar análise de texto', 
          error: error.message || 'Erro interno' 
        });
      }
    }
    // Se temos uma imagem, processar de acordo com o tipo
    else if (imageUrl) {
      console.log('Detectada imagem de resultado laboratorial...');
      
      // Verificar se é um PDF
      const isPdf = labData.document_type === 'pdf' || 
                    (typeof imageUrl === 'string' && imageUrl.includes('application/pdf'));
      
      // Se for um PDF e tivermos o buffer armazenado, primeiro tentar extrair texto diretamente
      // Verificar se o PDF já foi identificado como legível e de boa qualidade
      const isHighQualityPDF = labData.documentMetadata && labData.documentMetadata.isHighQualityPDF;
      
      if (isPdf && labData.file_buffer) {
        try {
          console.log('Tentando extrair texto diretamente do buffer PDF armazenado...');
          console.log('PDF de alta qualidade:', isHighQualityPDF ? 'Sim' : 'Não');
          
          // Usar o serviço de PDF para extrair texto do PDF em formato base64
          const pdfResult = await extractTextFromBase64PDF(labData.file_buffer);
          
          // Se o PDF foi marcado como de alta qualidade, vamos confiar mais no texto extraído
          // Para PDFs comuns, exigimos mais texto para garantir uma análise adequada
          const minTextLength = isHighQualityPDF ? 30 : 100;
          
          // Verificar resultados do PDF com mensagens mais detalhadas de diagnóstico
          console.log(`Resultado da extração de texto do PDF - Sucesso: ${pdfResult.success}, Comprimento do texto: ${pdfResult.text?.length || 0} caracteres`);
          
          if (pdfResult.success && pdfResult.text && pdfResult.text.length > minTextLength) {
            extractedText = pdfResult.text;
            console.log(`Texto extraído com sucesso do buffer do PDF: ${extractedText.length} caracteres`);
            
            // Adicionar o texto extraído aos dados laboratoriais
            labData = {
              ...labData,
              text: extractedText,
              extraction_method: "pdf-parse-direct",
              pdf_metadata: pdfResult.metadata,
              pdf_info: pdfResult.info
            };
            
            // Preparar prompt para análise de texto
            const analysisTextPrompt = `Você é um especialista em análise de exames laboratoriais. Analise os seguintes resultados laboratoriais e forneça:

1. SUMMARY: Um resumo claro e específico da saúde geral do paciente com base nos resultados, destacando os pontos principais.
2. OUTOFRANGE: Uma lista de todos os valores que estão fora da faixa de referência normal, no formato [{"marker": "nome do marcador", "value": "valor numérico", "reference": "faixa de referência", "significance": "significado clínico"}]
3. RECOMMENDATIONS: Recomendações específicas e personalizadas baseadas nos resultados anormais encontrados.

Formate sua resposta como um objeto JSON válido com as três chaves acima (summary, outOfRange, recommendations).

Texto extraído do documento PDF:

${extractedText}

Este PDF foi identificado como ${isHighQualityPDF ? 'de alta qualidade e legível' : 'de qualidade regular'}.

Identifique todos os valores laboratoriais mencionados, incluindo nome do exame, valor encontrado e intervalo de referência.
Explique os significados clínicos dos valores que estiverem fora do intervalo de referência.
Forneça recomendações nutricionais e de suplementação baseadas nesses resultados.

Format sua resposta em um objeto JSON com as seguintes propriedades:
- summary: Um resumo em português da interpretação geral dos resultados (máximo 300 palavras)
- outOfRange: Um array de objetos, cada um representando um valor fora do intervalo normal, incluindo nome do teste, valor medido, intervalo de referência e significado clínico
- recommendations: Um array de recomendações específicas baseadas nos resultados`;
            
            // Usar a API de análise de texto para analisar o texto extraído
            try {
              console.log('Iniciando análise direta de texto do PDF...');
              const textAnalysisResult = await generateAIResponse(
                Number(userId),
                Number(plan.company_id), 
                'lab_results_text_analysis',
                {
                  text: analysisTextPrompt,
                  patient_data: plan.patient_data,  // Adicionar dados do paciente para contextualizar análise
                  isHighQualityPDF: Boolean(isHighQualityPDF),  // Converter para boolean
                  analysis_method: 'direct-pdf-text',
                  pdf_info: pdfResult.info,        // Incluir informações do PDF para melhor contexto
                  text_length: extractedText.length // Incluir tamanho do texto extraído
                }
              );
              
              if (textAnalysisResult.success) {
                console.log('Análise de texto bem-sucedida usando buffer do PDF');
                
                // Atualizar os resultados laboratoriais com a análise
                await plan.update({
                  lab_results: {
                    ...labData,
                    analysis: textAnalysisResult.data,
                    analysis_method: isHighQualityPDF ? 'high-quality-pdf-text' : 'standard-pdf-text'
                  }
                });
                
                return res.status(200).json({
                  message: 'Lab results analyzed successfully',
                  data: textAnalysisResult.data,
                  tokensUsed: textAnalysisResult.tokensUsed,
                  extractionMethod: isHighQualityPDF ? 'high-quality-pdf-text' : 'standard-pdf-text'
                });
              } else {
                console.log('Falha na análise de texto do PDF, tentando outras abordagens...');
              }
            } catch (analysisError) {
              console.error('Erro ao analisar texto do PDF:', analysisError);
              console.log('Tentando processar como imagem alternativa...');
            }
          } else {
            // Registrar motivo detalhado da falha
            if (!pdfResult.success) {
              console.warn('Falha na extração de texto do PDF:', pdfResult.error || 'Motivo desconhecido');
            } else if (!pdfResult.text) {
              console.warn('Texto extraído do PDF está vazio');
            } else {
              console.warn(`Texto extraído do PDF é muito curto: ${pdfResult.text.length} caracteres (mínimo: ${minTextLength})`);
            }
            
            console.log('Texto extraído do PDF foi muito curto ou falhou. Tentando outras abordagens...');
            
            // Adicionar diagnóstico aos dados para uso posterior
            labData = {
              ...labData,
              documentMetadata: {
                ...labData.documentMetadata,
                textExtractionFailed: true,
                textExtractionError: pdfResult.error || 'Texto insuficiente',
                extractedTextLength: pdfResult.text?.length || 0
              }
            };
          }
        } catch (error) {
          console.error('Erro ao extrair texto do PDF:', error);
          console.log('Tentando processar PDF como imagem...');
          
          // Adicionar diagnóstico aos dados para uso posterior
          labData = {
            ...labData,
            documentMetadata: {
              ...labData.documentMetadata,
              textExtractionFailed: true,
              textExtractionError: error.message || 'Erro ao processar PDF',
              processingFallback: 'image-processing'
            }
          };
        }
      }
      
      // Se chegamos aqui, não conseguimos extrair texto diretamente do PDF ou não é um PDF
      // Tentar processar como imagem
      try {
        // Verificar se a URL da imagem é válida
        if (!imageUrl || typeof imageUrl !== 'string' || imageUrl.length < 10) {
          console.warn('URL de imagem inválida ou muito curta:', imageUrl);
          ongoingAnalyses.delete(id); // Limpar flag em caso de erro
          return res.status(400).json({ 
            message: 'URL de imagem inválida ou arquivo corrompido', 
            error: 'Não foi possível processar o arquivo enviado. Verifique se o arquivo é válido e tente novamente.'
          });
        }
        
        // Verificar tamanho máximo (para evitar processamento de arquivos muito grandes)
        if (typeof imageUrl === 'string' && imageUrl.length > 5000000) { // ~5MB em base64
          console.warn('Arquivo muito grande para processamento:', imageUrl.length, 'caracteres');
          ongoingAnalyses.delete(id); // Limpar flag em caso de erro
          return res.status(400).json({ 
            message: 'Arquivo muito grande', 
            error: 'O arquivo enviado excede o tamanho máximo permitido. Por favor, reduza o tamanho ou divida em múltiplos arquivos.'
          });
        }
        
        console.log('Enviando imagem para análise via Vision...');
        console.log('Tipo de documento:', labData.document_type || 'desconhecido');
        console.log('Tamanho da URL:', imageUrl.length, 'caracteres');
        
        // Verificar se parece ser uma URL ou um base64 válido
        const isValidUrl = imageUrl.startsWith('http') || 
                           imageUrl.startsWith('https') || 
                           imageUrl.startsWith('data:') ||
                           imageUrl.includes('amazonaws.com');
        
        if (!isValidUrl) {
          console.warn('URL de imagem não parece ser válida. Formato incorreto.');
          ongoingAnalyses.delete(id); // Limpar flag em caso de erro
          return res.status(400).json({ 
            message: 'Formato de URL inválido', 
            error: 'O formato do arquivo enviado não é suportado. Por favor, verifique se está enviando um PDF válido ou uma imagem em formato suportado.'
          });
        }
        
        // Construir um prompt específico para análise de imagem de resultados laboratoriais
        const systemPrompt = isPdf ? 
          "Você está analisando um PDF de resultado de exames laboratoriais. Extraia com atenção todos os valores dos exames, seus intervalos de referência e identifique claramente valores alterados. Estruture sua resposta em formato JSON com: summary (resumo geral dos resultados), outOfRange (array de objetos representando valores fora da faixa normal) e recommendations (array de sugestões)." :
          "Você está analisando uma imagem de resultado de exames laboratoriais. Extraia com atenção todos os valores dos exames, seus intervalos de referência e identifique claramente valores alterados. Estruture sua resposta em formato JSON com: summary (resumo geral dos resultados), outOfRange (array de objetos representando valores fora da faixa normal) e recommendations (array de sugestões).";
        
        // Tentar analisar a imagem com tratamento adequado de erros
        let imageAnalysisResult;
        try {
          imageAnalysisResult = await analyzeImage(
            Number(userId),
            Number(plan.company_id), 
            imageUrl,
            systemPrompt,
            true, // Solicitar resposta estruturada em JSON
            isPdf, // Indica se o arquivo original é um PDF
            id // Passar o ID do plano para acompanhamento de progresso
          );
          
          // Verificar explicitamente o resultado para token limit
          if (!imageAnalysisResult.success && imageAnalysisResult.message && 
              imageAnalysisResult.message.includes('Company token limit')) {
            console.log('Limite de tokens atingido para a empresa:', plan.company_id);
            ongoingAnalyses.delete(id); // Limpar flag em caso de erro
            
            return res.status(403).json({
              message: 'Limite de tokens atingido',
              error: 'Sua empresa atingiu o limite de tokens disponíveis. Entre em contato com o administrador para aumentar seu limite.',
              tokenLimit: true,
              suggestion: 'Aguarde o próximo ciclo de faturamento ou solicite um aumento no limite de tokens'
            });
          }
        } catch (aiError) {
          console.error('Erro na chamada analyzeImage:', aiError);
          ongoingAnalyses.delete(id); // Limpar flag em caso de erro
          
          // Verificar especificamente erro de limite de tokens
          if (aiError.message && aiError.message.toLowerCase().includes('token limit')) {
            return res.status(403).json({
              message: 'Limite de tokens atingido',
              error: 'Sua empresa atingiu o limite de tokens disponíveis. Entre em contato com o administrador para aumentar seu limite.',
              tokenLimit: true,
              suggestion: 'Aguarde o próximo ciclo de faturamento ou solicite um aumento no limite de tokens'
            });
          }
          
          return res.status(500).json({ 
            message: 'Falha ao processar imagem', 
            error: `Não foi possível analisar o documento: ${aiError.message || 'Erro desconhecido ao processar o arquivo. Verifique o formato e tente novamente.'}` 
          });
        }
        
        if (imageAnalysisResult.success) {
          console.log('Análise de imagem bem-sucedida');
          
          // Verificar se o resultado contém informação de processamento de múltiplas páginas
          const isMultiPageProcessing = imageAnalysisResult.data && imageAnalysisResult.data.processingStatus === 'in_progress';
          
          if (isMultiPageProcessing) {
            console.log('Análise de PDF com múltiplas páginas em andamento...');
            return res.status(200).json({
              message: 'Lab results analysis in progress',
              data: {
                ...imageAnalysisResult.data,
                processingStatus: 'in_progress'
              },
              isProcessing: true,
              tokensUsed: imageAnalysisResult.tokensUsed
            });
          }
          
          // Atualizar os resultados laboratoriais com a análise
          await plan.update({
            lab_results: {
              ...labData,
              analysis: imageAnalysisResult.data,
              analysis_method: 'image-analysis'
            }
          });
          
          return res.status(200).json({
            message: 'Lab results analyzed successfully',
            data: {
              analyzed_data: imageAnalysisResult.data,
              notes: labData.notes,
              analysis_method: 'image-analysis',
              patient_data: labData.patient_data || {}
            },
            analysis: imageAnalysisResult.data, // Adicionar para compatibilidade com outros endpoints
            tokensUsed: imageAnalysisResult.tokensUsed
          });
        } else {
          // Adicionar detalhes mais específicos sobre o erro
          console.log('Falha na análise de imagem:', imageAnalysisResult.message);
          ongoingAnalyses.delete(id); // Limpar flag em caso de erro
          return res.status(500).json({
            message: 'Falha ao analisar imagem de resultado laboratorial',
            error: imageAnalysisResult.message || 'Erro no processamento da imagem. O arquivo pode estar corrompido ou ilegível.',
            suggestion: 'Tente enviar um arquivo em melhor qualidade ou em formato diferente.'
          });
        }
      } catch (error) {
        console.error('Error analyzing lab image:', error);
        // Limpar flag de análise em andamento
        ongoingAnalyses.delete(id);
        
        // Fornecer uma mensagem de erro mais informativa com base no tipo de erro
        let errorMessage = 'Erro ao analisar imagem de resultado laboratorial';
        let detailedError = String(error);
        let statusCode = 500;
        
        // Identificar tipos específicos de erro
        if (detailedError.includes('inválid') || detailedError.includes('corrompido') || 
            detailedError.includes('format') || detailedError.toLowerCase().includes('invalid')) {
          errorMessage = 'Formato de arquivo inválido ou corrompido';
          statusCode = 400;  // Bad request for invalid file format
        } else if (detailedError.includes('tamanho') || detailedError.includes('grande') || 
                  detailedError.toLowerCase().includes('size') || detailedError.toLowerCase().includes('large')) {
          errorMessage = 'Arquivo muito grande para processamento';
          statusCode = 413;  // Payload too large
        } else if (detailedError.includes('token') || detailedError.includes('API')) {
          errorMessage = 'Erro no serviço de análise';
          detailedError = 'Problema temporário no serviço de análise. Por favor, tente novamente mais tarde.';
        }
        
        // Enviar resposta com dados de fallback para evitar quebra da interface
        return res.status(statusCode).json({ 
          message: errorMessage,
          success: false, 
          error: detailedError,
          data: { 
            summary: 'Não foi possível analisar este documento. ' + errorMessage,
            outOfRange: [],
            recommendations: [
              'Tente novamente com um arquivo de exame válido',
              'Verifique se o arquivo está em um formato suportado (PDF ou imagem)',
              'Certifique-se que o documento contém resultados de exames laboratoriais'
            ],
            processingStatus: 'failed'
          },
          isProcessing: false
        });
      }
    } else if (labData.text) {
      // Se já temos texto extraído, usá-lo diretamente
      try {
        console.log('Usando texto extraído previamente para análise');
        
        const analysisTextPrompt = `Você é um especialista em análise de exames laboratoriais. Analise os seguintes resultados laboratoriais e forneça:

1. SUMMARY: Um resumo claro e específico da saúde geral do paciente com base nos resultados, destacando os pontos principais.
2. OUTOFRANGE: Uma lista de todos os valores que estão fora da faixa de referência normal, no formato [{"marker": "nome do marcador", "value": "valor numérico", "reference": "faixa de referência", "significance": "significado clínico"}]
3. RECOMMENDATIONS: Recomendações específicas e personalizadas baseadas nos resultados anormais encontrados.

Formate sua resposta como um objeto JSON válido com as três chaves acima (summary, outOfRange, recommendations).

Texto extraído do documento: ${labData.text}

Identifique todos os valores laboratoriais mencionados, incluindo nome do exame, valor encontrado e intervalo de referência.
Explique os significados clínicos dos valores que estiverem fora do intervalo de referência.
Forneça recomendações nutricionais e de suplementação baseadas nesses resultados.

Format sua resposta em um objeto JSON com as seguintes propriedades:
- summary: Um resumo em português da interpretação geral dos resultados (máximo 300 palavras)
- outOfRange: Um array de objetos, cada um representando um valor fora do intervalo normal, incluindo nome do teste, valor medido, intervalo de referência e significado clínico
- recommendations: Um array de recomendações específicas baseadas nos resultados`;
        
        const textAnalysisResult = await generateAIResponse(
          Number(userId),
          Number(plan.company_id),
          'lab_results_analysis',
          { 
            extractedText: labData.text,
            patientData: plan.patient_data
          },
          analysisTextPrompt
        );
        
        if (textAnalysisResult.success) {
          console.log('Análise de texto extraído bem-sucedida');
          
          // Atualizar os resultados laboratoriais com a análise
          await plan.update({
            lab_results: {
              ...labData,
              analysis: textAnalysisResult.data,
              analysis_method: 'text-analysis'
            }
          });
          
          return res.status(200).json({
            message: 'Lab results analyzed successfully',
            data: {
              analyzed_data: textAnalysisResult.data,
              notes: labData.notes,
              analysis_method: 'text-analysis',
              patient_data: labData.patient_data || {}
            },
            analysis: textAnalysisResult.data, // Adicionar para compatibilidade com outros endpoints
            tokensUsed: textAnalysisResult.tokensUsed
          });
        } else {
          return res.status(500).json({
            message: 'Failed to analyze lab results text',
            error: textAnalysisResult.message
          });
        }
      } catch (error) {
        console.error('Error analyzing lab text:', error);
        return res.status(500).json({ message: 'Error analyzing lab text', error: String(error) });
      }
    } else {
      // Sem imagem ou texto para análise
      return res.status(400).json({ message: 'No image or text available for analysis' });
    }
  } catch (error) {
    ongoingAnalyses.delete(id); // Limpar flag em caso de erro
    console.error('Error analyzing lab results:', error);
    
    // Não podemos usar labData aqui porque pode estar fora de escopo
    // se o erro ocorreu antes da definição dessa variável
    
    // Fornecer uma resposta de erro mais detalhada e útil
    let errorMessage = 'Erro interno do servidor';
    let errorDetail = String(error);
    
    // Tentar identificar o tipo específico de erro para fornecer mensagem mais útil
    if (errorDetail.includes('invalid') && errorDetail.includes('PDF')) {
      errorMessage = 'O PDF fornecido parece ser inválido ou corrompido';
    } else if (errorDetail.includes('URL')) {
      errorMessage = 'A URL da imagem ou documento é inválida';
    } else if (errorDetail.includes('base64')) {
      errorMessage = 'O formato do arquivo enviado é inválido';
    }
    
    // Enviar resposta com dados de fallback para evitar quebra da interface
    return res.status(200).json({ 
      message: errorMessage,
      success: false, 
      error: errorDetail,
      data: { 
        summary: 'Não foi possível analisar este documento. ' + errorMessage,
        outOfRange: [],
        recommendations: [
          'Tente novamente com um arquivo de exame válido',
          'Verifique se o arquivo está em um formato suportado (PDF ou imagem)',
          'Certifique-se que o documento contém resultados de exames laboratoriais'
        ],
        processingStatus: 'failed'
      },
      isProcessing: false
    });
  } finally {
    // Remover a marcação de análise em andamento para permitir futuras análises
    ongoingAnalyses.delete(id);
    console.log(`Análise para o plano ${id} concluída ou cancelada. Flag de controle removida.`);
  }
};

// Analyze TCM observations
export const analyzeTCMObservations = async (req: Request, res: Response) => {
  const { id } = req.params;
  const { tcm_observations } = req.body;
  const userId = req.user.id;
  const companyId = req.user.company_id;
  const userRole = req.user.role;
  
  try {
    // Find plan
    const plan = await PatientPlan.findByPk(id);
    
    if (!plan) {
      return res.status(404).json({ message: 'Plan not found' });
    }
    
    // Check ownership
    if (String(plan.company_id) !== String(companyId) && userRole !== 'superadmin') {
      return res.status(403).json({ message: 'Not authorized to analyze this plan' });
    }
    
    if (!tcm_observations) {
      return res.status(400).json({ message: 'TCM observations are required' });
    }
    
    const { 
      pattern_diagnosis, 
      treatment_principles, 
      tongue_data, 
      pulse_data, 
      additional_notes 
    } = tcm_observations;
    
    const analysisResult = await analyzeTCMData(
      pattern_diagnosis,
      treatment_principles,
      tongue_data,
      pulse_data,
      additional_notes,
      plan.patient_data,
      userId,
      companyId
    );
    
    if (analysisResult.success) {
      // Update TCM observations with analysis
      await plan.update({
        tcm_observations: {
          ...tcm_observations,
          analysis: analysisResult.data
        }
      });
      
      return res.status(200).json({
        message: 'TCM observations analyzed successfully',
        data: analysisResult.data,
        tokensUsed: analysisResult.tokensUsed
      });
    } else {
      return res.status(500).json({
        message: 'Failed to analyze TCM observations',
        error: analysisResult.message
      });
    }
  } catch (error) {
    console.error('Error analyzing TCM observations:', error);
    return res.status(500).json({ message: 'Internal server error', error: String(error) });
  }
};

// Helper function to analyze TCM data
export const analyzeTCMData = async (
  patternDiagnosis: string, 
  treatmentPrinciples: string, 
  tongueData: any, 
  pulseData: any, 
  additionalNotes: string,
  patientData: any,
  userId: number = 1,
  companyId: number = 1
): Promise<AIResponse> => {
  try {
    // Preparar os dados para análise com IA
    const userData = {
      patternDiagnosis: patternDiagnosis || '',
      treatmentPrinciples: treatmentPrinciples || '',
      tongueData: tongueData || {},
      pulseData: pulseData || {},
      additionalNotes: additionalNotes || '',
      patientInfo: patientData || {}
    };
    
    console.log('Preparando dados para análise TCM com IA:', { dataLength: JSON.stringify(userData).length });
    
    // Obter a instância do OpenAI pré-configurada
    const openai = await getOpenAI();
    
    // Identificar token usage
    const prompt = await Prompt.findOne({ where: { step_key: 'tcm_analysis' } });
    const startTime = new Date();

    // Criar prompt para envio ao OpenAI
    const systemPrompt = `Você é um especialista em Medicina Tradicional Chinesa (MTC) com amplo conhecimento em diagnóstico e tratamento.
      Analise os dados fornecidos pelo usuário e gere uma análise completa incluindo:
      1. Um resumo da condição do paciente
      2. Identificação dos padrões de desequilíbrio
      3. Recomendações específicas de tratamento
      
      Formate o resultado em JSON com as seguintes propriedades:
      - summary: resumo geral da condição
      - patterns: array de objetos contendo os padrões identificados, cada um com name e description
      - recommendations: array de strings com recomendações específicas`;
      
    // Preparar os dados do usuário em formato adequado para o prompt
    const userPrompt = `Por favor, analise os seguintes dados de Medicina Tradicional Chinesa:\n\n` +
        `Diagnóstico de Padrão: ${userData.patternDiagnosis}\n` +
        `Princípios de Tratamento: ${userData.treatmentPrinciples}\n` +
        `Dados da Língua: ${JSON.stringify(userData.tongueData, null, 2)}\n` +
        `Dados do Pulso: ${JSON.stringify(userData.pulseData, null, 2)}\n` +
        `Observações Adicionais: ${userData.additionalNotes}\n` +
        `Informações do Paciente: ${JSON.stringify(userData.patientInfo, null, 2)}`;
    
    // Chamar OpenAI para análise
    const chatCompletion = await openai.chat.completions.create({
      model: "gpt-3.5-turbo", // Usando modelo que tem melhor compatibilidade
      messages: [{
        role: "system", 
        content: systemPrompt + '\n\nIMPORTANTE: Responda em formato JSON válido, incluindo os campos "summary", "patterns" (array de objetos) e "recommendations" (array de strings).'
      }, {
        role: "user",
        content: userPrompt
      }],
      temperature: prompt ? prompt.temperature || 0.7 : 0.7,
      max_tokens: prompt ? prompt.max_tokens || 1000 : 1000
      // Removido o response_format para compatibilidade
    });
    
    // Extrair conteúdo da resposta
    const responseContent = chatCompletion.choices[0].message.content;
    console.log('Resposta bruta da API OpenAI:', responseContent?.substring(0, 200) + '...');
    
    // Registrar uso de tokens, se a configuração de prompt existir
    if (prompt) {
      try {
        await TokenUsage.create({
          user_id: userId, // ID do usuário passado como parâmetro
          company_id: companyId, // ID da empresa passado como parâmetro
          prompt_id: prompt.id,
          tokens_used: chatCompletion.usage?.total_tokens || 0,
          cost: calculateCost(chatCompletion.usage?.total_tokens || 0, 'gpt-3.5-turbo'),
          timestamp: new Date()
        });
      } catch (tokenError) {
        console.error('Erro ao registrar uso de tokens:', tokenError);
        // Não bloquear o fluxo por erro no registro de tokens
      }
    }
    
    // Processar resposta da API
    let analysisResult;
    try {
      // Tentar extrair JSON da resposta
      const jsonMatch = responseContent?.match(/\{[\s\S]*\}/); // Encontra qualquer conteúdo entre chaves
      const jsonString = jsonMatch ? jsonMatch[0] : responseContent;
      analysisResult = JSON.parse(jsonString || '{}');
      
      // Validar resultado
      if (!analysisResult.summary) {
        // Se não tiver um resumo, tentar criar uma estrutura de dados a partir do texto
        console.log('Resposta sem resumo estruturado, tentando formatar manualmente');
        analysisResult = {
          summary: responseContent || 'Análise TCM concluída',
          patterns: [],
          recommendations: []
        };
      }
    } catch (jsonError) {
      console.error('Erro ao processar JSON da resposta:', jsonError);
      // Criar uma estrutura de resultado simplificada a partir do texto bruto
      analysisResult = {
        summary: responseContent || 'Análise TCM concluída',
        patterns: [],
        recommendations: []
      };
    }
    
    return {
      success: true,
      data: analysisResult,
      message: "TCM analysis completed successfully",
      tokensUsed: chatCompletion.usage?.total_tokens || 0
    };
  } catch (error) {
    console.error('Error in TCM data analysis:', error);
    
    // Verificar especificamente erro de limite de tokens
    if (error.message && error.message.includes('token limit')) {
      return {
        success: false,
        message: 'Limite de tokens atingido',
        tokenLimitReached: true
      };
    }
    
    return {
      success: false,
      message: `Error analyzing TCM data: ${error}`
    };
  }
};

// Analyze IFM matrix
export const analyzeIFMMatrix = async (req: Request, res: Response) => {
  const { id } = req.params;
  const { ifm_matrix } = req.body;
  const userId = req.user.id;
  const companyId = req.user.company_id;
  const userRole = req.user.role;
  
  try {
    // Find plan
    const plan = await PatientPlan.findByPk(id);
    
    if (!plan) {
      return res.status(404).json({ message: 'Plan not found' });
    }
    
    // Check ownership
    if (String(plan.company_id) !== String(companyId) && userRole !== 'superadmin') {
      return res.status(403).json({ message: 'Not authorized to analyze this plan' });
    }
    
    if (!ifm_matrix || !ifm_matrix.systems) {
      return res.status(400).json({ message: 'IFM matrix with systems is required' });
    }
    
    // Simple example of analysis - in a real app this would use AI for deeper analysis
    const systems = ifm_matrix.systems || [];
    const analysis = {
      summary: "Análise da Matriz IFM",
      systemsAnalysis: [],
      criticalSystems: [],
      criticalFunctions: [],
      recommendations: []
    };
    
    // Analyze systems
    for (const systemData of systems) {
      if (systemData && typeof systemData === 'object') {
        const systemIssue: SystemIssue = {
          system: systemData.name || '',
          severity: systemData.severity || 'none',
          notes: systemData.notes || ''
        };
        
        analysis.systemsAnalysis.push(systemIssue);
        
        // Add to critical systems if severity is high
        if (systemIssue.severity === 'severe' || systemIssue.severity === 'high') {
          analysis.criticalSystems.push(systemIssue.system);
        }
      }
    }
    
    // Add critical functions based on affected systems
    if (analysis.criticalSystems.includes('Digestive')) {
      analysis.criticalFunctions.push("Digestão e Absorção");
    }
    if (analysis.criticalSystems.includes('Immune')) {
      analysis.criticalFunctions.push("Imunidade e Inflamação");
    }
    if (analysis.criticalSystems.includes('Cardiometabolic')) {
      analysis.criticalFunctions.push("Metabolismo Energético");
    }
    if (analysis.criticalSystems.includes('Detoxification')) {
      analysis.criticalFunctions.push("Biotransformação e Eliminação");
    }
    if (analysis.criticalSystems.includes('Structural')) {
      analysis.criticalFunctions.push("Integridade Estrutural");
    }
    
    // Add recommendations
    if (analysis.criticalSystems.length > 0) {
      analysis.recommendations = [
        "Focar a intervenção nos sistemas mais comprometidos",
        "Considerar a interconexão entre os sistemas críticos",
        "Adapte o plano de tratamento para focar nos sistemas mais comprometidos",
        "Reavalie periodicamente os sistemas com maior comprometimento"
      ];
    } else {
      analysis.recommendations = [
        "Mantenha o foco em medidas preventivas",
        "Considere reavaliação periódica da matriz"
      ];
    }
    
    return res.status(200).json({
      message: 'IFM matrix analyzed successfully',
      analysis
    });
  } catch (error) {
    console.error('Error analyzing IFM matrix:', error);
    return res.status(500).json({ message: 'Internal server error', error: String(error) });
  }
};

// Analyze timeline
export const analyzeTimeline = async (req: Request, res: Response) => {
  const { id } = req.params;
  const { timeline_data } = req.body;
  const userId = req.user.id;
  const companyId = req.user.company_id;
  const userRole = req.user.role;
  
  try {
    // Find plan
    const plan = await PatientPlan.findByPk(id);
    
    if (!plan) {
      return res.status(404).json({ message: 'Plan not found' });
    }
    
    // Check ownership
    if (String(plan.company_id) !== String(companyId) && userRole !== 'superadmin') {
      return res.status(403).json({ message: 'Not authorized to analyze this plan' });
    }
    
    if (!timeline_data || !timeline_data.events || !Array.isArray(timeline_data.events)) {
      return res.status(400).json({ message: 'Timeline data with events is required' });
    }
    
    // Sort events by date
    const sortedEvents = [...timeline_data.events].sort((a, b) => {
      const dateA = new Date(a.date || 0);
      const dateB = new Date(b.date || 0);
      return dateA.getTime() - dateB.getTime();
    });
    
    // Simplified analysis example
    const analysis = {
      summary: "Análise da Linha do Tempo",
      keyPatterns: [],
      chronologicalSummary: "",
      recommendations: []
    };
    
    // Find patterns and correlations
    // This is a simplified example, in a real scenario the analysis would be more sophisticated
    const symptomEvents = sortedEvents.filter((e: TimelineEvent) => e.type === 'symptom' || e.type === 'health_issue');
    const medicationEvents = sortedEvents.filter((e: TimelineEvent) => e.type === 'medication' || e.type === 'treatment');
    const dietaryEvents = sortedEvents.filter((e: TimelineEvent) => e.type === 'diet' || e.type === 'food');
    
    if (symptomEvents.length > 0) {
      const pattern: PatternData = {
        type: 'symptoms',
        count: symptomEvents.length,
        summary: `${symptomEvents.length} eventos relacionados a sintomas ou problemas de saúde identificados`
      };
      analysis.keyPatterns.push(pattern);
    }
    
    if (medicationEvents.length > 0) {
      const pattern: PatternData = {
        type: 'treatments',
        count: medicationEvents.length,
        summary: `${medicationEvents.length} eventos relacionados a medicamentos ou tratamentos identificados`
      };
      analysis.keyPatterns.push(pattern);
    }
    
    if (dietaryEvents.length > 0) {
      const pattern: PatternData = {
        type: 'dietary',
        count: dietaryEvents.length,
        summary: `${dietaryEvents.length} eventos relacionados a dieta ou alimentação identificados`
      };
      analysis.keyPatterns.push(pattern);
    }
    
    // Create chronological summary
    if (sortedEvents.length > 0) {
      analysis.chronologicalSummary = `A linha do tempo contém ${sortedEvents.length} eventos, iniciando em ${new Date(sortedEvents[0].date).toLocaleDateString('pt-BR')} e terminando em ${new Date(sortedEvents[sortedEvents.length - 1].date).toLocaleDateString('pt-BR')}.`;
    } else {
      analysis.chronologicalSummary = "A linha do tempo não contém eventos para análise.";
    }
    
    // Add recommendations
    analysis.recommendations = [
      "Observe padrões de recorrência de sintomas",
      "Considere como intervenções anteriores afetaram os sintomas",
      "Use esta linha do tempo como base para monitorar a evolução do tratamento"
    ];
    
    return res.status(200).json({
      message: 'Timeline analyzed successfully',
      analysis
    });
  } catch (error) {
    console.error('Error analyzing timeline:', error);
    return res.status(500).json({ message: 'Internal server error', error: String(error) });
  }
};
