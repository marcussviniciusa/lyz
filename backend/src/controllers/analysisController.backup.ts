import { Request, Response } from 'express';
import { PatientPlan } from '../models';
import { generateAIResponse, analyzeImage } from '../services/ai/openaiService';
import { extractTextFromPDF, extractTextFromBase64PDF } from '../services/pdf/pdfService';

// Estender a interface Request para incluir a propriedade user
declare global {
  namespace Express {
    export interface Request {
      user: {
        id: string;
        role?: string;
        company_id?: string;
      };
    }
  }
}

// Interface para tipar corretamente as respostas da API
interface AIResponse {
  success: boolean;
  data?: any;
  message?: string;
  tokensUsed?: number;
}

// Analyze lab results
export const analyzeLabResults = async (req: Request, res: Response) => {
  const { id } = req.params;
  const { lab_results } = req.body;
  const userId = req.user.id;
  
  try {
    // Find plan
    const plan = await PatientPlan.findByPk(id);
    
    if (!plan) {
      return res.status(404).json({ message: 'Plan not found' });
    }
    
    // Check ownership
    if (plan.user_id !== userId && req.user.role !== 'superadmin') {
      return res.status(403).json({ message: 'Not authorized to analyze this plan' });
    }
    
    // Use provided lab results or get from plan
    let labData = lab_results || plan.lab_results;
    
    if (!labData) {
      return res.status(400).json({ message: 'No lab results available for analysis' });
    }
    
    // Verificar se temos URL de imagem nos dados laboratoriais
    const imageUrl = labData.image_url || labData.file_url || labData.url;
    let extractedText = '';
    
    // Se temos uma imagem, processar de acordo com o tipo
    if (imageUrl) {
      console.log('Detectada imagem de resultado laboratorial...');
      
      // Verificar se é um PDF
      const isPdf = labData.document_type === 'pdf' || 
                    (typeof imageUrl === 'string' && imageUrl.includes('application/pdf'));
      
      // Se for um PDF e tivermos o buffer armazenado, primeiro tentar extrair texto diretamente
      if (isPdf && labData.file_buffer) {
        try {
          console.log('Tentando extrair texto diretamente do buffer PDF armazenado...');
          
          // Usar o serviço de PDF para extrair texto do PDF em formato base64
          const pdfResult = await extractTextFromBase64PDF(labData.file_buffer);
          
          if (pdfResult.success && pdfResult.text && pdfResult.text.length > 100) {
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
            const analysisTextPrompt = `Analise os seguintes resultados laboratoriais e forneça uma interpretação clínica detalhada.

Texto extraído do documento: ${extractedText}

Identifique valores fora do intervalo de referência, explique seus significados clínicos e forneça recomendações.

Format sua resposta em um objeto JSON com as seguintes propriedades:
- summary: Um resumo em português da interpretação geral dos resultados (máximo 300 palavras)
- outOfRange: Um array de objetos, cada um representando um valor fora do intervalo normal, incluindo nome do teste, valor medido, intervalo de referência e significado clínico
- recommendations: Um array de recomendações específicas baseadas nos resultados`;
            
            // Gerar análise pelo texto usando GPT
            const textAnalysisResult = await generateAIResponse(
              userId,
              plan.company_id,
              'lab_results_analysis',
              { 
                extractedText: extractedText,
                patientData: plan.patient_data
              },
              analysisTextPrompt,
              'gpt-4o'
            );
            
            if (textAnalysisResult.success && textAnalysisResult.data) {
              // Processar resultado da análise
              let structuredData: any;
              
              try {
                if (typeof textAnalysisResult.data === 'string') {
                  structuredData = JSON.parse(textAnalysisResult.data);
                } else {
                  structuredData = textAnalysisResult.data;
                }
                
                // Atualizar o plano com os resultados analisados
                const updatedLabData = {
                  ...labData,
                  analysis: structuredData,
                  last_analyzed_at: new Date().toISOString()
                };
                
                await plan.update({ lab_results: updatedLabData });
                
                return res.status(200).json({
                  message: 'Lab results analyzed successfully using direct text extraction',
                  analyzed_data: structuredData
                });
              } catch (parseError) {
                console.error('Erro ao processar resultado da análise de texto:', parseError);
                // Continuar com o fluxo normal se falhar o processamento de texto
              }
            }
          } else {
            console.log('Texto extraído do PDF muito curto ou vazio:', pdfResult.error || 'Possivelmente um PDF escaneado.');
          }
        } catch (pdfError) {
          console.error('Erro ao extrair texto do buffer do PDF:', pdfError);
          // Continuar com o fluxo normal se a extração direta falhar
        }
      }
      
      // Se chegamos até aqui, significa que precisamos usar a API Vision para análise visual
      console.log('Usando API Vision para análise do documento...');
      
      const visionPrompt = "Extraia e analise todos os resultados laboratoriais desta imagem. " +
                       "Identifique os testes feitos, valores medidos, intervalos de referência e se estão normais ou alterados. " +
                       "Inclua análises específicas de glícides, lipídios, função renal, função hepática e outros grupos relevantes. " +
                       "Forneça orientações clínicas baseadas nos resultados. " +
                       "Formato como um objeto JSON com as propriedades: summary, outOfRange, e recommendations.";
      
      const visionResult = await analyzeImage(userId, plan.company_id, imageUrl, visionPrompt, true, isPdf);
      
      if (visionResult.success && visionResult.data) {
        try {
          // Verificar se a resposta já é um objeto estruturado
          let structuredData: any;
          const responseData = visionResult.data;
          
          if (typeof responseData === 'string') {
            try {
              structuredData = JSON.parse(responseData);
            } catch {
              // Se não for um JSON válido, usar o texto como está
              structuredData = {
                summary: responseData.substring(0, 500),
                outOfRange: [],
                recommendations: ["Consulte um profissional para interpretação detalhada dos resultados."]
              };
            }
          } else {
            structuredData = responseData;
          }
          
          // Verificar se a estrutura está correta
          if (!structuredData.summary) {
            structuredData = {
              summary: typeof responseData === 'string' ? responseData.substring(0, 500) : 'Análise de resultados laboratoriais',
              outOfRange: [],
              recommendations: ["Consulte um profissional para interpretação detalhada dos resultados."]
            };
          }
          
          // Atualizar o plano com os resultados analisados
          const updatedLabData = {
            ...labData,
            analysis: structuredData,
            vision_result: true,
            last_analyzed_at: new Date().toISOString()
          };
          
          await plan.update({ lab_results: updatedLabData });
          
          return res.status(200).json({
            message: 'Lab results analyzed successfully using AI Vision',
            analyzed_data: structuredData
          });
        } catch (parseError) {
          console.error('Erro ao processar resposta da API Vision:', parseError);
        }
      } else {
        console.warn('Falha ao analisar imagem:', visionResult.message);
      }
    }
    
    // Se chegamos até aqui, tentar uma análise genérica com o que temos
    const aiResponse = await generateAIResponse(
      userId,
      plan.company_id,
      'lab_results_analysis',
      { 
        patientData: plan.patient_data, 
        labResults: labData 
      }
    );
    
    // Verificar se a análise foi bem-sucedida
    if (aiResponse.success && aiResponse.data) {
      let analysisData: any;
      
      try {
        if (typeof aiResponse.data === 'string') {
          analysisData = JSON.parse(aiResponse.data);
        } else {
          analysisData = aiResponse.data;
        }
        
        // Garantir que os dados estão no formato esperado
        if (!analysisData.summary) {
          analysisData = {
            summary: typeof aiResponse.data === 'string' ? aiResponse.data.substring(0, 500) : 'Análise de resultados laboratoriais',
            outOfRange: [],
            recommendations: ["Consulte um profissional para interpretação detalhada dos resultados."]
          };
        }
        
        // Atualizar o plano com os resultados analisados
        const updatedLabData = {
          ...labData,
          analysis: analysisData,
          last_analyzed_at: new Date().toISOString()
        };
        
        await plan.update({ lab_results: updatedLabData });
        
        return res.status(200).json({
          message: 'Lab results analyzed successfully',
          analyzed_data: analysisData
        });
      } catch (parseError) {
        console.error('Erro ao processar análise:', parseError);
        return res.status(200).json({
          message: 'Lab results analyzed, but data processing failed',
          analyzed_data: {
            summary: typeof aiResponse.data === 'string' ? aiResponse.data.substring(0, 500) : 'Análise de resultados laboratoriais',
            outOfRange: [],
            recommendations: ["Consulte um profissional para interpretação detalhada dos resultados."]
          }
        });
      }
    } else {
      return res.status(200).json({
        message: 'Lab results analysis failed',
        analyzed_data: {
          summary: 'Não foi possível analisar os resultados automaticamente.',
          outOfRange: [],
          recommendations: [
            "Verifique se a imagem está nítida e contrastada.", 
            "Tente novamente ou envie um arquivo diferente com os resultados.", 
            "Se o problema persistir, considere inserir os valores manualmente."
          ]
        }
      });
    }
  } catch (error) {
    console.error('Error analyzing lab results:', error);
    return res.status(500).json({ message: 'Internal server error' });
  }
};

// Analyze TCM observations
export const analyzeTCMObservations = async (req: Request, res: Response) => {
  const { id } = req.params;
  const { tcm_observations } = req.body;
  const userId = req.user.id;
  
  try {
    // Find plan
    const plan = await PatientPlan.findByPk(id);
    
    if (!plan) {
      return res.status(404).json({ message: 'Plan not found' });
    }
    
    // Check ownership
    if (plan.user_id !== userId && req.user.role !== 'superadmin') {
      return res.status(403).json({ message: 'Not authorized to analyze this plan' });
    }
    
    if (!tcm_observations) {
      return res.status(400).json({ message: 'TCM observations data is required' });
    }
    
    // Extract TCM observation data
    const { tongueObservations, pulseObservations, patternDiagnosis, treatmentPrinciples, additionalNotes } = tcm_observations;
    
    // Prepare data for analysis
    const analysisResult = analyzeTCMData(
      patternDiagnosis || '', 
      treatmentPrinciples || '', 
      tongueObservations || {}, 
      pulseObservations || {}, 
      additionalNotes || '',
      plan.patient_data
    );
    
    return res.status(200).json({
      message: 'TCM observations analyzed successfully',
      analysis: analysisResult
    });
  } catch (error) {
    console.error('Error analyzing TCM observations:', error);
    return res.status(500).json({ message: 'Internal server error' });
  }
};

// Helper function to analyze TCM data
const analyzeTCMData = (
  patternDiagnosis: string, 
  treatmentPrinciples: string, 
  tongueData: any, 
  pulseData: any, 
  additionalNotes: string,
  patientData: any
) => {
  console.log('Analyzing TCM data');
  
  // Extrair padrões a partir do diagnóstico de padrões informado manualmente
  const patternNames = patternDiagnosis
    .split(/[,.;\n]/) // Separar por pontos, vírgulas, ponto-e-vírgulas ou quebras de linha
    .filter(p => p.trim().length > 5) // Filtrar partes muito curtas
    .slice(0, 3); // Pegar até 3 padrões
  
  // Detectar órgãos afetados baseado em palavras-chave
  const orgaosKeywords = {
    'Fígado': ['fígado', 'gan', 'madeira', 'estagnação', 'irrita'],
    'Coração': ['coração', 'xin', 'fogo', 'calor', 'insônia'],
    'Baço': ['baço', 'pi', 'terra', 'umidade', 'digest'],
    'Pulmão': ['pulmão', 'fei', 'metal', 'respira', 'pele'],
    'Rim': ['rim', 'shen', 'água', 'medos', 'ossos', 'vitalidade']
  };
  
  // Detectar substâncias afetadas baseado em palavras-chave
  const substanciasKeywords = {
    'Qi': ['qi', 'energia', 'vitalidade', 'estagna', 'deficiência de qi'],
    'Sangue': ['sangue', 'xue', 'anemia', 'nutri', 'palidez'],
    'Yin': ['yin', 'secura', 'calor vazio', 'noite', 'substância'],
    'Yang': ['yang', 'frio', 'inchaço', 'lentidão', 'falta de calor']
  };
  
  // Detectar órgãos e substâncias afetados
  const allText = `${patternDiagnosis} ${treatmentPrinciples} ${additionalNotes}`;
  const textLowerCase = allText.toLowerCase();
  
  const orgaosDetectados = Object.keys(orgaosKeywords).filter(orgao => 
    orgaosKeywords[orgao as keyof typeof orgaosKeywords].some(keyword => 
      textLowerCase.includes(keyword.toLowerCase())
    )
  );
  
  const substanciasDetectadas = Object.keys(substanciasKeywords).filter(substancia => 
    substanciasKeywords[substancia as keyof typeof substanciasKeywords].some(keyword => 
      textLowerCase.includes(keyword.toLowerCase())
    )
  );
  
  // Criar padrões estruturados
  const padroes = patternNames.map((nome, index) => ({
    nome: nome.trim(),
    descricao: index === 0 ? patternDiagnosis : `Parte do diagnóstico de padrões: ${nome.trim()}`,
    sinaisSintomas: [],
    relevancia: index === 0 ? 'Alta' : 'Média'
  }));
  
  // Se não há padrões detectados, criar um genérico
  if (padroes.length === 0 && patternDiagnosis) {
    padroes.push({
      nome: 'Diagnóstico de Padrão TCM',
      descricao: patternDiagnosis,
      sinaisSintomas: [],
      relevancia: 'Média'
    });
  }
  
  // Criação de recomendações baseadas nos princípios de tratamento
  const tratamentos = [];
  if (treatmentPrinciples) {
    tratamentos.push({
      tipo: 'Princípio de Tratamento TCM',
      descricao: treatmentPrinciples,
      pontos: [],
      formulas: [],
      alimentos: []
    });
  }
  
  // Detectar mudanças de estilo de vida a partir das notas adicionais
  const mudancasEstiloVida = [];
  if (additionalNotes) {
    mudancasEstiloVida.push(additionalNotes);
  }
  
  // Criar resumo com informações disponíveis
  const nomePaciente = patientData?.name || 'paciente';
  let resumo = `Análise de Medicina Tradicional Chinesa para ${nomePaciente}.`;
  
  if (patternDiagnosis) {
    resumo += `\n\nDiagnóstico de Padrões: ${patternDiagnosis}`;
  }
  
  if (treatmentPrinciples) {
    resumo += `\n\nPrincípios de Tratamento: ${treatmentPrinciples}`;
  }
  
  if (tongueData.color || tongueData.coating || tongueData.shape || tongueData.moisture) {
    resumo += `\n\nObservações da Língua: ${[tongueData.color, tongueData.coating, tongueData.shape, tongueData.moisture].filter(Boolean).join(', ')}`;
  }
  
  if (pulseData.rate || pulseData.strength || pulseData.rhythm || pulseData.quality) {
    resumo += `\n\nObservações do Pulso: ${[pulseData.rate, pulseData.strength, pulseData.rhythm, pulseData.quality].filter(Boolean).join(', ')}`;
  }
  
  if (additionalNotes) {
    resumo += `\n\nObservações Adicionais: ${additionalNotes}`;
  }
  
  return {
    diagnosticoMTC: {
      padroes,
      orgaosAfetados: orgaosDetectados,
      substanciasAfetadas: substanciasDetectadas
    },
    recomendacoes: {
      tratamentos,
      mudancasEstiloVida
    },
    resumo
  };
};

// Analyze IFM matrix
export const analyzeIFMMatrix = async (req: Request, res: Response) => {
  const { id } = req.params;
  const { ifm_matrix } = req.body;
  const userId = req.user.id;
  
  try {
    // Find plan
    const plan = await PatientPlan.findByPk(id);
    
    if (!plan) {
      return res.status(404).json({ message: 'Plan not found' });
    }
    
    // Check ownership
    if (plan.user_id !== userId && req.user.role !== 'superadmin') {
      return res.status(403).json({ message: 'Not authorized to analyze this plan' });
    }
    
    if (!ifm_matrix) {
      return res.status(400).json({ message: 'IFM matrix data is required' });
    }
    
    // Simplified example implementation
    // In a real scenario, this would analyze the matrix data more thoroughly
    const analysis = {
      summary: "Análise da Matriz IFM",
      keyFindings: [],
      recommendations: []
    };
    
    // Extract key findings based on severity
    Object.entries(ifm_matrix).forEach(([system, data]) => {
      if (data && (data.severity === 'high' || data.severity === 'medium')) {
        analysis.keyFindings.push({
          system,
          severity: data.severity,
          notes: data.notes || ''
        });
      }
    });
    
    // Add generic recommendations
    if (analysis.keyFindings.length > 0) {
      analysis.recommendations = [
        "Considere fazer exames funcionais mais específicos para os sistemas com alterações",
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
    return res.status(500).json({ message: 'Internal server error' });
  }
};

// Analyze timeline
export const analyzeTimeline = async (req: Request, res: Response) => {
  const { id } = req.params;
  const { timeline_data } = req.body;
  const userId = req.user.id;
  
  try {
    // Find plan
    const plan = await PatientPlan.findByPk(id);
    
    if (!plan) {
      return res.status(404).json({ message: 'Plan not found' });
    }
    
    // Check ownership
    if (plan.user_id !== userId && req.user.role !== 'superadmin') {
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
    const symptomEvents = sortedEvents.filter(e => e.type === 'symptom' || e.type === 'health_issue');
    const medicationEvents = sortedEvents.filter(e => e.type === 'medication' || e.type === 'treatment');
    const dietaryEvents = sortedEvents.filter(e => e.type === 'diet' || e.type === 'food');
    
    if (symptomEvents.length > 0) {
      analysis.keyPatterns.push({
        type: 'symptoms',
        count: symptomEvents.length,
        summary: `${symptomEvents.length} eventos relacionados a sintomas ou problemas de saúde identificados`
      });
    }
    
    if (medicationEvents.length > 0) {
      analysis.keyPatterns.push({
        type: 'treatments',
        count: medicationEvents.length,
        summary: `${medicationEvents.length} eventos relacionados a medicamentos ou tratamentos identificados`
      });
    }
    
    if (dietaryEvents.length > 0) {
      analysis.keyPatterns.push({
        type: 'dietary',
        count: dietaryEvents.length,
        summary: `${dietaryEvents.length} eventos relacionados a dieta ou alimentação identificados`
      });
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
    return res.status(500).json({ message: 'Internal server error' });
  }
};
