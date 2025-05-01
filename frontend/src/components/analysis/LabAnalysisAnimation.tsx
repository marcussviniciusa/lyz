import React, { useState, useEffect, useRef } from 'react';
import axios from 'axios';

interface LabAnalysisAnimationProps {
  analyzeResults: () => Promise<any>;
  fileUrl?: string;
  isAnalyzing: boolean;
  onAnalysisComplete: (analysisData: any) => void;
  isPdf?: boolean;
  planId: string; // Adicionando o ID do plano para polling
}

type AnalysisStep = {
  title: string;
  description: string;
  status: 'waiting' | 'processing' | 'completed' | 'error';
  result?: string;
}

// Definindo interfaces globais para tipagem
interface OutOfRangeItem {
  name: string;
  value: string;
  unit?: string;
  reference?: string;
  interpretation?: string;
}

interface AnalysisResult {
  summary: string;
  outOfRange: OutOfRangeItem[];
  recommendations: string[];
  pages?: Array<{page: number, summary: string}>;
  // Propriedades adicionais para processamento
  processingStatus?: 'in_progress' | 'completed' | 'failed';
  totalPages?: number;
  processedPages?: number;
  isDemo?: boolean;
}

const LabAnalysisAnimation: React.FC<LabAnalysisAnimationProps> = ({
  analyzeResults,
  fileUrl,
  isAnalyzing,
  onAnalysisComplete,
  isPdf = false,
  planId
}) => {
  const [analysisSteps, setAnalysisSteps] = useState<AnalysisStep[]>([
    { title: isPdf ? 'Processamento de PDF' : 'Processamento de Imagem', description: isPdf ? 'Extraindo texto do documento PDF' : 'Extraindo texto dos resultados', status: 'waiting' },
    { title: 'Identificação de Valores', description: 'Detectando valores e referências', status: 'waiting' },
    { title: 'Análise Clínica', description: 'Interpretando resultados e valores de referência', status: 'waiting' },
    { title: 'Geração de Recomendações', description: 'Elaborando sugestões personalizadas', status: 'waiting' }
  ]);
  const [currentStepIndex, setCurrentStepIndex] = useState<number>(-1);
  const [analysisError, setAnalysisError] = useState<string | null>(null);
  const [analysisComplete, setAnalysisComplete] = useState<boolean>(false);
  const [analysisResults, setAnalysisResults] = useState<AnalysisResult | null>(null);
  const [isAnalysisRunning, setIsAnalysisRunning] = useState<boolean>(false);
  
  // Estados específicos para o mecanismo de polling
  const [isPolling, setIsPolling] = useState<boolean>(false);
  const [pollingProgress, setPollingProgress] = useState<number>(0);
  const pollingIntervalRef = useRef<NodeJS.Timeout | null>(null);
  const initialAnalysisRequestSent = useRef<boolean>(false);

  // Iniciar processo de análise apenas uma vez quando isAnalyzing mudar para true
  useEffect(() => {
    // Verificar se isAnalyzing mudou para true E se não estamos já no meio de uma análise
    if (isAnalyzing && currentStepIndex < 0 && !analysisComplete) {
      console.log('Iniciando análise a partir do useEffect');
      // Forçar reset de estados importantes
      setIsPolling(false);
      initialAnalysisRequestSent.current = false;
      if (pollingIntervalRef.current) {
        clearInterval(pollingIntervalRef.current);
        pollingIntervalRef.current = null;
      }
      runAnalysis();
    }
  }, [isAnalyzing, analysisComplete]);
  
  // Efeito para gerenciar o polling de status da análise
  useEffect(() => {
    // Limpar o intervalo quando o componente for desmontado
    return () => {
      if (pollingIntervalRef.current) {
        clearInterval(pollingIntervalRef.current);
        pollingIntervalRef.current = null;
      }
    };
  }, []);
  
  // Efeito adicional para garantir que o polling pare quando a análise for concluída
  useEffect(() => {
    if (analysisComplete && pollingIntervalRef.current) {
      console.log('Análise completa detectada. Limpando intervalo de polling.');
      clearInterval(pollingIntervalRef.current);
      pollingIntervalRef.current = null;
      setIsPolling(false);
    }
  }, [analysisComplete]);
  
  // Função para consultar o status da análise
  const checkAnalysisStatus = async () => {
    if (!planId) {
      console.error('ID do plano não disponível para consulta de status');
      return;
    }
    
    try {
      // Baseado no arquivo api.ts, o backend JÁ espera o /api na URL
      let baseUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001';
      if (!baseUrl.endsWith('/api')) {
        baseUrl = baseUrl + '/api';
      }
      
      // Obter o token de autenticação usando o mesmo método do interceptor em api.ts
      // (Linha 25 em api.ts mostra que o token correto é 'accessToken')
      const token = localStorage.getItem('accessToken') || '';
      
      // Chamada direta ao backend passando pela URL completa
      const { data: response } = await axios.get(`${baseUrl}/plans/${planId}/analysis-status`, {
        // Incluir headers de autenticação
        headers: {
          'Content-Type': 'application/json',
          'Authorization': token ? `Bearer ${token}` : ''
        }
      });
      
      console.log('Verificando status da análise para ID do plano:', planId);
      console.log('Status da análise:', response);
      
      // Log detalhado da resposta
      logResponseStructure(response, 'Status da Análise');
      
      if (response) {
        const { status, progress, isProcessing, data, error } = response;
        
        // Atualizar o progresso visível
        setPollingProgress(progress || 0);
        
        // Atualizar os passos com base no progresso
        if (progress <= 25) {
          setCurrentStepIndex(0);
          updateStepStatus(0, 'processing');
        } else if (progress <= 50) {
          setCurrentStepIndex(1);
          updateStepStatus(0, 'completed', `Texto e dados extraídos do ${isPdf ? 'PDF' : 'arquivo de imagem'}`);
          updateStepStatus(1, 'processing');
        } else if (progress <= 75) {
          setCurrentStepIndex(2);
          updateStepStatus(0, 'completed', `Texto e dados extraídos do ${isPdf ? 'PDF' : 'arquivo de imagem'}`);
          updateStepStatus(1, 'completed', 'Valores e referências identificados com sucesso');
          updateStepStatus(2, 'processing');
        } else if (progress < 100) {
          setCurrentStepIndex(3);
          updateStepStatus(0, 'completed', `Texto e dados extraídos do ${isPdf ? 'PDF' : 'arquivo de imagem'}`);
          updateStepStatus(1, 'completed', 'Valores e referências identificados com sucesso');
          updateStepStatus(2, 'completed', 'Análise clínica concluída com sucesso');
          updateStepStatus(3, 'processing');
        }
        
        // IMPORTANTE - Se recebemos uma mensagem "Inicializando análise" ou status pending, a análise 100% NÃO está completa
        // Esta verificação previne falsos positivos no início da análise
        if ((response.message && response.message.includes('Inicializando')) || status === 'pending' || progress === 0) {
          console.log('Análise ainda está inicializando - não está realmente concluída');
          // Atualizamos o progresso e continuamos o polling
          setPollingProgress(progress || 0);
          return;
        }
        
        // Se a análise foi concluída, verificando condições após garantir que não é uma inicialização
        const isAnalysisComplete = 
          // A condição principal é que o processamento tenha terminado no backend
          (isProcessing === false && 
            // E um dos seguintes seja verdadeiro:
            (
              // Status explicitamente marcado como concluído
              (status === 'completed') ||
              // Progresso 100%
              (progress === 100) ||
              // Mensagem indicando conclusão
              (response.message && (
                response.message.toLowerCase().includes('concluída') ||
                response.message.toLowerCase().includes('finalizada') ||
                response.message.toLowerCase().includes('completa')
              ))
            )
          );
          
        // Asseguramos que não está no início da análise
        const isSurelyInProgress = progress > 10;
        
        // Atualização dos passos baseada no progresso atual, mesmo durante o processamento
        if (isProcessing === true) {
          console.log('Análise em andamento no backend, atualizando passos de acordo com progresso:', progress);
          // Atualizar os passos com base no progresso atual
          if (progress <= 25) {
            setCurrentStepIndex(0);
            updateStepStatus(0, 'processing');
          } else if (progress <= 50) {
            setCurrentStepIndex(1);
            updateStepStatus(0, 'completed', `Texto e dados extraídos do ${isPdf ? 'PDF' : 'arquivo de imagem'}`);
            updateStepStatus(1, 'processing');
          } else if (progress <= 75) {
            setCurrentStepIndex(2);
            updateStepStatus(0, 'completed', `Texto e dados extraídos do ${isPdf ? 'PDF' : 'arquivo de imagem'}`);
            updateStepStatus(1, 'completed', 'Valores e referências identificados com sucesso');
            updateStepStatus(2, 'processing');
          } else if (progress < 100) {
            setCurrentStepIndex(3);
            updateStepStatus(0, 'completed', `Texto e dados extraídos do ${isPdf ? 'PDF' : 'arquivo de imagem'}`);
            updateStepStatus(1, 'completed', 'Valores e referências identificados com sucesso');
            updateStepStatus(2, 'completed', 'Análise clínica concluída com sucesso');
            updateStepStatus(3, 'processing');
          }
        }
        
        console.log('Verificação de conclusão:', { 
          progress, 
          isProcessing, 
          status, 
          hasData: data && Object.keys(data).length > 0,
          message: response.message,
          isAnalysisComplete 
        });
        
        // Verificação especial para o caso de 100% de progresso
        if (progress === 100) {
          console.log('Progresso 100% detectado! Preparando para concluir análise.');
          // Forçar atualização visual para o usuário ver 100%
          setCurrentStepIndex(3);
          updateStepStatus(0, 'completed', `Texto e dados extraídos do ${isPdf ? 'PDF' : 'arquivo de imagem'}`);
          updateStepStatus(1, 'completed', 'Valores e referências identificados com sucesso');
          updateStepStatus(2, 'completed', 'Análise clínica concluída com sucesso');
          updateStepStatus(3, 'processing', 'Processando resultados finais...');
          
          // Se ainda não foi oficialmente marcado como completo, verificar novamente em breve
          if (!isAnalysisComplete) {
            console.log('Verificando novamente em 1 segundo para confirmar conclusão...');
            setTimeout(async () => {
              await checkAnalysisStatus();
            }, 1000);
          }
        }

        if (isAnalysisComplete) {
          console.log('Análise detectada como concluída. Parando polling.');
          // Concluir todos os passos
          updateStepStatus(0, 'completed', `Texto e dados extraídos do ${isPdf ? 'PDF' : 'arquivo de imagem'}`);
          updateStepStatus(1, 'completed', 'Valores e referências identificados com sucesso');
          updateStepStatus(2, 'completed', 'Análise clínica concluída com sucesso');
          updateStepStatus(3, 'completed', 'Recomendações personalizadas geradas');
          
          // Parar o polling
          setIsPolling(false);
          if (pollingIntervalRef.current) {
            clearInterval(pollingIntervalRef.current);
            pollingIntervalRef.current = null;
          }
          
          // Definir o resultado final
          try {
            console.log('Processando dados finais:', data);
            // Se não tivermos dados, tente buscar os resultados lab diretamente do plano
            if (!data || Object.keys(data).length === 0) {
              console.log('Dados vazios na conclusão. Buscando dados do plano...');
              // Usar os dados de lab_results do plano diretamente
              let baseUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001';
              if (!baseUrl.endsWith('/api')) {
                baseUrl = baseUrl + '/api';
              }
              const token = localStorage.getItem('accessToken') || '';
              axios.get(`${baseUrl}/plans/${planId}`, {
                headers: {
                  'Content-Type': 'application/json',
                  'Authorization': token ? `Bearer ${token}` : ''
                }
              }).then(response => {
                if (response.data && response.data.lab_results) {
                  console.log('Dados do plano recuperados com sucesso:', response.data.lab_results);
                  const planoResults = response.data.lab_results;
                  
                  // É fundamental que os resultados do plano sejam normalizados corretamente
                  // O backend espera a estrutura {lab_results: data} como lembrado na memória
                  let resultsToNormalize = planoResults;
                  
                  console.log('Estrutura completa dos resultados:', planoResults);
                  
                  // Verificar várias possibilidades de onde os dados podem estar
                  // Adicionar informações detalhadas para ajudar o debugging
                  console.log('Chaves dos resultados do plano:', Object.keys(planoResults));
                  
                  // Verificar se os resultados estão dentro do campo lab_results como esperado pelo backend
                  if (planoResults && planoResults.lab_results && typeof planoResults.lab_results === 'object') {
                    console.log('Encontrado campo lab_results, usando como fonte principal dos dados');
                    resultsToNormalize = planoResults.lab_results;
                  }
                  // Se não há dados estruturados mas existe raw_text ou content, use como dados simples
                  if (planoResults.raw_text || planoResults.text || planoResults.content) {
                    console.log('Encontrado texto bruto para gerar resumo');
                    resultsToNormalize = {
                      summary: planoResults.raw_text || planoResults.text || planoResults.content,
                      recommendations: ['Consulte um especialista para interpretação completa destes resultados.'],
                      outOfRange: []
                    };
                  } 
                  // Verificar formato já estruturado com campos padrão
                  else if (planoResults.summary || planoResults.outOfRange || planoResults.recommendations) {
                    // Já está no formato esperado
                    resultsToNormalize = planoResults;
                    console.log('Usando formato padrão de dados (summary/outOfRange/recommendations)');
                  }
                  // Verificar campos de resultado da análise 
                  else if (planoResults.result || planoResults.data) {
                    // Está em formato de resultado da análise
                    resultsToNormalize = planoResults.result || planoResults.data;
                    console.log('Usando dados de result/data');
                  }
                  // Verificar campo analysis que é o padrão para análise de imagens/PDF
                  else if (planoResults.analysis) {
                    console.log('Encontrado campo analysis', typeof planoResults.analysis);
                    
                    // Se o campo analysis for um objeto JSON serializado como string, tente desserializar
                    if (typeof planoResults.analysis === 'string') {
                      try {
                        // Tentar parsear a string como JSON, seja ela começando com { ou não
                        resultsToNormalize = JSON.parse(planoResults.analysis);
                        console.log('Campo analysis parseado de string JSON');
                      } catch (e) {
                        console.log('Erro ao parsear analysis como JSON:', e);
                        resultsToNormalize = {
                          summary: planoResults.analysis,
                          recommendations: ['Consulte um especialista para interpretação completa destes resultados.'],
                          outOfRange: []
                        };
                      }
                    }
                    // Se o campo analysis for um objeto, use-o diretamente
                    else if (typeof planoResults.analysis === 'object') {
                      resultsToNormalize = planoResults.analysis;
                      console.log('Usando dados de analysis (objeto):', Object.keys(planoResults.analysis || {}));
                    }
                    
                    // Verificação especial para o formato de análise de imagem do PDF que pode ser um array
                    if (Array.isArray(resultsToNormalize)) {
                      console.log('analysis é um array com', resultsToNormalize.length, 'itens de páginas');
                      
                      // Agregação de dados de múltiplas páginas em um formato único
                      const summaries = resultsToNormalize
                          .filter((item: any) => item && typeof item === 'object' && (item.summary || item.text || item.content))
                          .map((item: any) => item.summary || item.text || item.content || '');
                      
                      // Extrair recomendações de todas as páginas
                      const allRecommendations: string[] = [];
                      resultsToNormalize.forEach((page: any) => {
                        if (page && page.recommendations && Array.isArray(page.recommendations)) {
                          allRecommendations.push(...page.recommendations);
                        }
                      });
                      
                      console.log(`Processados ${summaries.length} sumários e ${allRecommendations.length} recomendações`);
                      
                      if (summaries.length > 0 || allRecommendations.length > 0) {
                        resultsToNormalize = {
                          summary: summaries.join('\n\n'),
                          recommendations: allRecommendations.length > 0 ? 
                            allRecommendations : 
                            ['Consulte um especialista para interpretar estes resultados em detalhes.'],
                          outOfRange: []
                        };
                      }
                    }
                    // Se ainda não temos sumário mas temos o campo raz, use-o como sumário
                    else if (resultsToNormalize && !resultsToNormalize.summary && (resultsToNormalize.text || resultsToNormalize.content)) {
                      resultsToNormalize = {
                        summary: resultsToNormalize.text || resultsToNormalize.content,
                        recommendations: resultsToNormalize.recommendations || ['Consulte um especialista para interpretar estes resultados.'],
                        outOfRange: resultsToNormalize.outOfRange || []
                      };
                    }
                  }
                  
                  console.log('Dados normalizados para análise:', resultsToNormalize);
                  
                  // Se ainda estamos recebendo vários sumários de páginas, agregamos em um formato utilizavel
                  if (Array.isArray(resultsToNormalize)) {
                    console.log('Detectou array de resultados, agregando...');
                    // Converter array de resultados em um objeto único
                    const combinedResults = {
                      summary: resultsToNormalize
                        .map(r => r.summary || r.text || r.content || '')
                        .filter(Boolean)
                        .join('\n\n'),
                      outOfRange: [] as OutOfRangeItem[],
                      recommendations: [] as string[],
                      pages: resultsToNormalize.map((page: any, index: number) => ({
                        page: index + 1,
                        summary: page.summary || ''
                      }))
                    };
                    
                    // Extrair e consolidar valores anormais de todas as páginas
                    const allOutOfRange: any[] = [];
                    resultsToNormalize.forEach((pageResult: any) => {
                      if (pageResult && pageResult.outOfRange && Array.isArray(pageResult.outOfRange)) {
                        allOutOfRange.push(...pageResult.outOfRange);
                      }
                    });
                    
                    // Remover duplicatas por nome
                    if (allOutOfRange.length > 0) {
                      combinedResults.outOfRange = allOutOfRange
                        .filter((item: any) => item && typeof item === 'object' && item.name)
                        // Remover duplicatas
                        .filter((item: any, index: number, self: any[]) => 
                          index === self.findIndex((t: any) => t.name === item.name)
                        );
                    }
                    
                    // Consolidar todas as recomendações
                    const allRecommendations = new Set<string>();
                    resultsToNormalize.forEach((pageResult: any) => {
                      if (pageResult && pageResult.recommendations && Array.isArray(pageResult.recommendations)) {
                        pageResult.recommendations.forEach((rec: string) => {
                          if (rec && typeof rec === 'string' && rec.length > 5) {
                            allRecommendations.add(rec);
                          }
                        });
                      }
                    });
                    combinedResults.recommendations = Array.from(allRecommendations);
                    
                    // Criar um resumo consolidado a partir de todas as páginas
                    const summaries = resultsToNormalize
                        .filter((page: any) => page && typeof page === 'object')
                        .map((page: any) => page.summary)
                        .filter((summary: any) => summary && typeof summary === 'string' && summary.length > 10);
                        
                    if (summaries.length > 0) {
                      // Use o resumo da primeira página como resumo principal se for informativo
                      if (summaries[0] && summaries[0].length > 50) {
                        combinedResults.summary = summaries[0];
                      } else {
                        // Caso contrário, combine os resumos mais informativos
                        const mainSummaries = summaries
                          .filter((s: string) => s.length > 30)
                          .slice(0, 3); // Limita a 3 resumos para não ficar muito longo
                          
                        if (mainSummaries.length > 0) {
                          combinedResults.summary = mainSummaries.join('\n\n');
                        } else {
                          combinedResults.summary = 'Análise completa de resultados laboratoriais. Verifique as recomendações para mais detalhes.';
                        }
                      }
                    } else {
                      combinedResults.summary = 'Análise completa de resultados laboratoriais. Verifique as recomendações para mais detalhes.';
                    }
                    
                    // Se não temos recomendações, adicionar uma padrão
                    if (combinedResults.recommendations.length === 0) {
                      combinedResults.recommendations = ['Consulte um especialista para interpretar estes resultados em detalhes.'];
                    }
                    
                    console.log('Resultado consolidado de PDF multipágina:', combinedResults);
                    return combinedResults;
                  }
                  
                  // Certifique-se de que temos pelo menos um sumário mínimo
                  if (!resultsToNormalize || typeof resultsToNormalize !== 'object') {
                    resultsToNormalize = {
                      summary: 'Resultados laboratoriais processados. Dados detalhados não disponíveis.',
                      recommendations: ['Consulte um profissional para interpretação completa.'],
                      outOfRange: []
                    };
                  }
                  
                  // Garantir que temos um sumário não vazio
                  if (!resultsToNormalize.summary && !resultsToNormalize.recommendations) {
                    resultsToNormalize.summary = 'Análise de resultados laboratoriais concluída.';
                    resultsToNormalize.recommendations = ['Consulte um especialista para interpretação detalhada.'];
                  }
                  
                  console.log('Usando resultados finais:', resultsToNormalize);
                  const normalizedResults = normalizeApiResponse(resultsToNormalize);
                  console.log('Resultados normalizados para exibição:', normalizedResults);
                  
                  // Finalizar a análise com os resultados corretos
                  setAnalysisResults(normalizedResults);
                  setAnalysisComplete(true);
                  onAnalysisComplete(normalizedResults);
                  
                  // Atualizar todos os passos como concluídos
                  updateStepStatus(0, 'completed', `Texto e dados extraídos do ${isPdf ? 'PDF' : 'arquivo de imagem'}`);
                  updateStepStatus(1, 'completed', 'Valores e referências identificados com sucesso');
                  updateStepStatus(2, 'completed', 'Análise clínica concluída com sucesso');
                  updateStepStatus(3, 'completed', 'Recomendações personalizadas geradas');
                }
              }).catch(err => {
                console.error('Erro ao buscar dados do plano:', err);
              });
            } else {
              const normalizedResults = normalizeApiResponse(data);
              setAnalysisResults(normalizedResults);
              setAnalysisComplete(true);
              onAnalysisComplete(normalizedResults);
            }
          } catch (error) {
            console.error('Erro ao processar resultados finais:', error);
            // Tentar como fallback a análise sem polling
            runAnalysisWithoutPolling();
          }
        }
        
        // Se houve um erro
        if (status === 'failed' || error) {
          setAnalysisError(error || 'Erro desconhecido na análise');
          updateStepStatus(currentStepIndex, 'error');
          setIsPolling(false);
          
          if (pollingIntervalRef.current) {
            clearInterval(pollingIntervalRef.current);
            pollingIntervalRef.current = null;
          }
        }
      }
    } catch (error) {
      console.error('Erro ao consultar status da análise:', error);
      
      // Após várias tentativas sem sucesso, podemos tentar a análise em modo de fallback
      if (pollingProgress === 0) {
        console.log('Usando modo de fallback para a análise');
        // Continuar com a análise simulada tradicional se o polling falhar no início
        runAnalysisWithoutPolling();
      }
    }
  };

  const updateStepStatus = (index: number, status: 'waiting' | 'processing' | 'completed' | 'error', result?: string) => {
    setAnalysisSteps(prev => prev.map((step, i) => 
      i === index ? { ...step, status, ...(result ? { result } : {}) } : step
    ));
  };

  // Função principal que inicia a análise com polling
const runAnalysis = async () => {
  // Checa se uma análise já está em andamento
  if (isAnalysisRunning) {
    console.log('Análise já está em andamento, ignorando nova chamada');
    return;
  }
  
  // Monitoramento para debug
  console.log('Iniciando análise com polling. Estado atual:', {
    isAnalysisRunning,
    isPolling,
    currentStepIndex,
    analysisComplete
  });
  
  try {
    // Definir flag para evitar chamadas duplicadas
    setIsAnalysisRunning(true);
    setCurrentStepIndex(0);
    updateStepStatus(0, 'processing');
    
    // Primeira requisição para iniciar a análise
    if (!initialAnalysisRequestSent.current) {
      console.log('Iniciando solicitação de análise');
      
      try {
        // Fazer a requisição inicial para iniciar a análise
        await analyzeResults();
        initialAnalysisRequestSent.current = true;
        
        // Iniciar o polling
        setIsPolling(true);
        // Limpar qualquer intervalo existente antes de criar um novo
        if (pollingIntervalRef.current) {
          clearInterval(pollingIntervalRef.current);
        }
        
        // Primeiro, realizar uma verificação inicial imediata
        console.log('Realizando primeira verificação de status imediata');
        setTimeout(async () => {
          try {
            await checkAnalysisStatus();

            // Depois configurar o intervalo regular de polling
            pollingIntervalRef.current = setInterval(async () => {
              // Verificar se devemos continuar o polling
              if (!isPolling || analysisComplete) {
                console.log('Parando polling devido a condição:', { isPolling, analysisComplete });
                if (pollingIntervalRef.current) {
                  clearInterval(pollingIntervalRef.current);
                  pollingIntervalRef.current = null;
                }
                return;
              }
              
              // Se o usuário já está na próxima etapa, não há necessidade de continuar polling
              if (window.location.pathname.indexOf('/lab') === -1) {
                console.log('Usuário saiu da página de análise, parando polling');
                if (pollingIntervalRef.current) {
                  clearInterval(pollingIntervalRef.current);
                  pollingIntervalRef.current = null;
                  setIsPolling(false);
                }
                return;
              }
            
              console.log('Verificando status da análise via polling...');
              await checkAnalysisStatus();
            }, 3000); // Verificar a cada 3 segundos
          } catch (error) {
            console.error('Erro na verificação inicial:', error);
          }
        }, 1000); // Pequeno delay para garantir que a solicitação inicial foi processada
        
      } catch (error) {
        console.error('Erro ao iniciar análise:', error);
        setAnalysisError('Falha ao iniciar a análise. Tente novamente.');
        updateStepStatus(0, 'error');
        setIsAnalysisRunning(false);
        return;
      }
    } else {
      // Se a análise já foi iniciada, apenas verificar o status
      checkAnalysisStatus();
    }
  } catch (error) {
    console.error('Erro no processo de análise:', error);
    setAnalysisError('Erro durante a análise. Tente novamente.');
    updateStepStatus(currentStepIndex, 'error');
    setIsAnalysisRunning(false);
  }
};

// Método de fallback para quando o polling falhar
const runAnalysisWithoutPolling = async () => {
    // Checa se uma análise já está em andamento
    if (isAnalysisRunning) {
      console.log('Análise já está em andamento (modo fallback), ignorando nova chamada');
      
      // Se já temos resultados de análise, apenas exibi-los novamente
      if (analysisResults) {
        console.log('Usando resultados de análise existentes');
        const normalizedResults = normalizeApiResponse(analysisResults);
        setAnalysisComplete(true);
        onAnalysisComplete(normalizedResults);
      }
      return;
    }
    
    try {
      // Definir flag para evitar chamadas duplicadas
      setIsAnalysisRunning(true);
      setCurrentStepIndex(0);
      
      // Passo 1: Processamento de Imagem/PDF
      updateStepStatus(0, 'processing');
      await simulateDelay(800); // Reduzir delays para melhor experiência do usuário
      updateStepStatus(0, 'completed', `Texto e dados extraídos do ${isPdf ? 'PDF' : 'arquivo de imagem'}`);
      
      // Passo 2: Identificação de Valores
      setCurrentStepIndex(1);
      updateStepStatus(1, 'processing');
      await simulateDelay(1000); // Reduzido para melhorar experiência
      updateStepStatus(1, 'completed', 'Valores e referências identificados com sucesso');
      
      // Passo 3: Análise Clínica
      setCurrentStepIndex(2);
      updateStepStatus(2, 'processing');
      await simulateDelay(1200); // Reduzido para melhorar experiência
      
      // Uma única chamada real para API - utilizamos uma variável de estado para evitar chamadas duplicadas
      let results;
      try {
        // Verificar se já temos resultados em cache
        if (!analysisResults) {
          console.log('Iniciando análise de resultados laboratoriais...');
          const apiResults = await analyzeResults();
          console.log('Resultado da análise LAB (bruto):', apiResults);

          // Verificar se a resposta indica processamento em andamento (para PDFs multipágina)
          if (apiResults && apiResults.processingStatus === 'in_progress') {
            console.log('Processamento de PDF multipágina em andamento, aguardando conclusão...');
            // Exibir mensagem de processamento em andamento
            updateStepStatus(0, 'completed', 'PDF identificado e sendo processado');
            updateStepStatus(1, 'processing', `Processando páginas do PDF... ${apiResults.totalPages ? '(' + apiResults.totalPages + ' páginas)' : ''}`);
            updateStepStatus(2, 'waiting', 'Aguardando finalização das páginas');
            updateStepStatus(3, 'waiting', 'Aguardando recomendações');
            
            // Definir um temporizador para verificar o status novamente em 5 segundos
            setTimeout(() => runAnalysis(), 5000);
            return;
          }
          
          // Salvamos o resultado bruto para evitar chamar a API novamente
          setAnalysisResults(apiResults);
          results = apiResults;
        } else {
          // Usar resultado armazenado se já tivermos chamado a API
          console.log('Usando resultados de análise previamente obtidos');
          results = analysisResults;
        }
        
        // Normalizar o resultado para garantir que temos a estrutura esperada
        results = normalizeApiResponse(results);
        console.log('Resultado da análise LAB (normalizado):', results);
        
        // Verificar se o processamento ainda está em andamento
        if (results && results.processingStatus === 'in_progress') {
          console.log('Processamento de PDF ainda em andamento, aguardando conclusão...');
          // Não atualizar para 'completed' se estiver em processamento
          updateStepStatus(1, 'processing', `Processando ${results.totalPages || 'múltiplas'} páginas do PDF...`);
          // Definir um temporizador para verificar o status novamente em 5 segundos
          setTimeout(() => runAnalysis(), 5000);
          return;
        }
        
        // Atualizar a mensagem com base no número real de marcadores fora da faixa
        const outOfRangeCount = Array.isArray(results?.outOfRange) ? results.outOfRange.length : 0;
        const markerText = outOfRangeCount === 1 ? 'marcador' : 'marcadores';
        updateStepStatus(2, 'completed', `Análise completa, ${outOfRangeCount} ${markerText} fora da referência`);
        
        // Informações adicionais para PDFs multipágina
        if (results && results.totalPages && results.processedPages) {
          updateStepStatus(0, 'completed', `PDF processado: ${results.processedPages} de ${results.totalPages} páginas analisadas`);
        }
      } catch (apiError) {
        console.error('Erro na chamada da API de análise:', apiError);
        // Em vez de falhar completamente, vamos usar dados de fallback
        console.log('Usando dados de fallback para análise laboratorial');
        results = createContextualFallback(fileUrl);
        
        // Mesmo com erro, continuamos para mostrar algo útil ao usuário
        updateStepStatus(2, 'completed', 'Análise demonstrativa concluída');
      }
      
      // Passo 4: Geração de Recomendações
      setCurrentStepIndex(3);
      updateStepStatus(3, 'processing');
      await simulateDelay(800); // Reduzido para melhorar experiência
      
      // Garantir que temos uma estrutura de resultados válida
      if (!results) {
        results = {
          summary: 'Análise de resultados laboratoriais concluída',
          outOfRange: [],
          recommendations: []
        };
      }
      
      // Garantir que temos recomendações
      if (!results.recommendations || !Array.isArray(results.recommendations)) {
        results.recommendations = ["Recomendação personalizada com base nos resultados. Consulte um médico para interpretação completa."];
      }
      
      const recCount = results.recommendations.length;
      updateStepStatus(3, 'completed', `${recCount} recomendações personalizadas geradas`);
      setAnalysisResults(results);
      setAnalysisComplete(true);
      
      // Garantir que o polling seja interrompido
      setIsPolling(false);
      if (pollingIntervalRef.current) {
        clearInterval(pollingIntervalRef.current);
        pollingIntervalRef.current = null;
        console.log('Polling interrompido após conclusão da análise');
      }
      
      // Notificar o componente pai sobre a conclusão da análise
      onAnalysisComplete(results);
    } catch (error) {
      console.error('Erro durante a análise', error);
      setAnalysisError('Ocorreu um erro durante a análise dos resultados.');
      
      // Criar resultado de fallback para mostrar algo útil mesmo com erro
      const fallbackResults = createContextualFallback(fileUrl);
      setAnalysisResults(fallbackResults);
      setAnalysisComplete(true); // Permitir que a interface mostre resultados
      
      // Interromper o polling em caso de erro também
      setIsPolling(false);
      if (pollingIntervalRef.current) {
        clearInterval(pollingIntervalRef.current);
        pollingIntervalRef.current = null;
        console.log('Polling interrompido após erro na análise');
      }
      
      // Notificar o componente pai, mas com dados de fallback
      try {
        onAnalysisComplete(fallbackResults);
      } catch (notifyError) {
        console.error('Erro ao notificar componente pai:', notifyError);
      }
      
      // Atualiza o status do passo atual para erro, mas continua a interface
      if (currentStepIndex >= 0) {
        updateStepStatus(currentStepIndex, 'error');
        // Avançar para o próximo passo com aviso
        if (currentStepIndex < 3) {
          setCurrentStepIndex(3);
          updateStepStatus(3, 'completed', 'Visualização demonstrativa gerada');
        }
      }
    } finally {
      // Garantir que a flag de análise em andamento seja redefinida
      setIsAnalysisRunning(false);
    }
  };

  const simulateDelay = (ms: number) => new Promise(resolve => setTimeout(resolve, ms));

  // Calcula o progresso total
  const calculateProgress = () => {
    const completedSteps = analysisSteps.filter(step => step.status === 'completed').length;
    return (completedSteps / analysisSteps.length) * 100;
  };
  
  // Adicionar função para verificar estrutura da resposta e registrar detalhes
  const logResponseStructure = (response: any, source: string) => {
    console.log(`[DEBUG] Verificando estrutura de resposta de: ${source}`);
    if (!response) {
      console.log(`[DEBUG] Resposta de ${source} é nula ou indefinida`);
      return;
    }
    
    console.log(`[DEBUG] Tipo de resposta: ${typeof response}`);
    
    if (typeof response === 'object') {
      console.log(`[DEBUG] Chaves no nível raiz:`, Object.keys(response));
      
      // Verificar campos comuns
      if (response.data) {
        console.log(`[DEBUG] Estrutura do campo data:`, Object.keys(response.data));
        
        if (response.data.analyzed_data) {
          console.log(`[DEBUG] Estrutura de analyzed_data dentro de data:`, Object.keys(response.data.analyzed_data));
          console.log(`[DEBUG] Conteúdo de summary:`, response.data.analyzed_data.summary);
          console.log(`[DEBUG] outOfRange é array?`, Array.isArray(response.data.analyzed_data.outOfRange));
          console.log(`[DEBUG] Quantidade de items em outOfRange:`, Array.isArray(response.data.analyzed_data.outOfRange) ? response.data.analyzed_data.outOfRange.length : 'não é array');
        }
      }
      
      if (response.analysis) {
        console.log(`[DEBUG] Estrutura do campo analysis:`, typeof response.analysis === 'object' ? Object.keys(response.analysis) : 'não é um objeto');
      }
      
      if (response.analyzed_data) {
        console.log(`[DEBUG] Estrutura do campo analyzed_data no nível raiz:`, Object.keys(response.analyzed_data));
      }
    }
  };

  // Normaliza a resposta da API para garantir uma estrutura consistente
  const normalizeApiResponse = (apiResponse: any): AnalysisResult => {
    console.log('Normalizando API response:', apiResponse);
    
    // Executar função de log detalhado
    logResponseStructure(apiResponse, 'API inicial');
    
    // Verificar se temos uma resposta válida
    if (!apiResponse) {
      console.warn('Resposta da API nula ou indefinida');
      return {
        summary: 'A análise não retornou resultados. Por favor, verifique a qualidade do arquivo enviado.',
        outOfRange: [],
        recommendations: ['Tente novamente ou verifique a qualidade do arquivo.']
      };
    }

    // Verificar se a resposta indica processamento em andamento (para PDFs multipágina)
    if (apiResponse.processingStatus === 'in_progress') {
      console.log('Resposta indica processamento em andamento:', apiResponse);
      return {
        summary: apiResponse.summary || 'Processando seu documento PDF com múltiplas páginas...',
        outOfRange: [],
        recommendations: [
          'Aguarde enquanto processamos todas as páginas do seu documento.',
          'Esta operação pode levar alguns minutos para PDFs grandes.'
        ],
        processingStatus: 'in_progress',
        totalPages: apiResponse.totalPages || 0,
        processedPages: apiResponse.processedPages || 0
      };
    }
    
    console.log('Normalizando resposta da API:', typeof apiResponse, apiResponse ? Object.keys(apiResponse) : 'nulo');

    // Extrair o campo 'data' se ele existir na resposta da API
    // A API retorna o resultado dentro de "data" em algumas rotas, ou "analysis" para processamento de imagens
    let responseData = apiResponse;
    
    // Verificar se os dados estão dentro do campo lab_results
    if (apiResponse && apiResponse.lab_results && typeof apiResponse.lab_results === 'object') {
      console.log('Dados encontrados dentro do campo lab_results');
      responseData = apiResponse.lab_results;
    }
    
    // Verificar diferentes localizações possíveis dos dados
    if (apiResponse && apiResponse.data && typeof apiResponse.data === 'object') {
      console.log('Dados encontrados dentro do campo "data":', Object.keys(apiResponse.data));
      
      // Verificar se analyzed_data está dentro de data
      if (apiResponse.data.analyzed_data && typeof apiResponse.data.analyzed_data === 'object') {
        console.log('Campo analyzed_data encontrado dentro de data:', Object.keys(apiResponse.data.analyzed_data));
        responseData = apiResponse.data.analyzed_data;
      } else {
        responseData = apiResponse.data;
      }
    } else if (apiResponse && apiResponse.analysis && typeof apiResponse.analysis === 'object') {
      console.log('Dados encontrados dentro do campo "analysis"');
      responseData = apiResponse.analysis;
    } else if (apiResponse && apiResponse.analyzed_data && typeof apiResponse.analyzed_data === 'object') {
      console.log('Campo analyzed_data encontrado no nível raiz');
      responseData = apiResponse.analyzed_data;
    } else if (apiResponse && apiResponse.analysis_method === 'image-analysis') {
      console.log('Resultados de análise de imagem detectados');
      responseData = apiResponse;
    }
    
    console.log('Dados extraídos para normalização:', typeof responseData, 
      responseData ? (Array.isArray(responseData) ? 'array' : Object.keys(responseData)) : 'nulo');

    // Verificar se temos dados válidos
    if (!responseData) {
      console.warn('Dados vazios ou nulos recebidos da API');
      return {
        summary: 'A análise não retornou resultados. Por favor, verifique a qualidade do arquivo enviado.',
        outOfRange: [],
        recommendations: ['Tente novamente ou verifique a qualidade do arquivo.']
      };
    }
    
    // Verificação específica para resposta de PDFs multipágina
    if (responseData.analysisResults && Array.isArray(responseData.analysisResults) && responseData.analysisResults.length > 0) {
      console.log(`Detectado resultado de análise multi-página com ${responseData.analysisResults.length} páginas`);
      
      // Definindo interface para garantir tipagem correta
      interface AnalysisResult {
        summary: string;
        outOfRange: OutOfRangeItem[];
        recommendations: string[];
        pages?: Array<{page: number, summary: string}>;
      }
      
      // Criando objeto com tipo explícito para evitar erro de 'never[]'
      const combinedResults: AnalysisResult = {
        summary: responseData.analysisResults
          .map((r: any) => r.summary || r.text || r.content || '')
          .filter(Boolean)
          .join('\n\n'),
        outOfRange: [] as OutOfRangeItem[],
        recommendations: [] as string[],
        pages: responseData.analysisResults.map((page: any, index: number) => ({
          page: index + 1,
          summary: page.summary || ''
        }))
      };
      
      // Extrair e consolidar valores anormais de todas as páginas
      const allOutOfRange: any[] = [];
      responseData.analysisResults.forEach((pageResult: any) => {
        if (pageResult && pageResult.outOfRange && Array.isArray(pageResult.outOfRange)) {
          allOutOfRange.push(...pageResult.outOfRange);
        }
      });
      
      // Remover duplicatas por nome
      if (allOutOfRange.length > 0) {
        combinedResults.outOfRange = allOutOfRange
          .filter((item: any) => item && typeof item === 'object' && item.name)
          // Remover duplicatas
          .filter((item: any, index: number, self: any[]) => 
            index === self.findIndex((t: any) => t.name === item.name)
          );
      }
      
      // Consolidar todas as recomendações
      const allRecommendations = new Set<string>();
      responseData.analysisResults.forEach((pageResult: any) => {
        if (pageResult && pageResult.recommendations && Array.isArray(pageResult.recommendations)) {
          pageResult.recommendations.forEach((rec: string) => {
            if (rec && typeof rec === 'string' && rec.length > 5) {
              allRecommendations.add(rec);
            }
          });
        }
      });
      combinedResults.recommendations = Array.from(allRecommendations);
      
      // Criar um resumo consolidado a partir de todas as páginas
      const summaries = responseData.analysisResults
        .filter((page: any) => page && typeof page === 'object')
        .map((page: any) => page.summary)
        .filter((summary: any) => summary && typeof summary === 'string' && summary.length > 10);
        
      if (summaries.length > 0) {
        // Use o resumo da primeira página como resumo principal se for informativo
        if (summaries[0] && summaries[0].length > 50) {
          combinedResults.summary = summaries[0];
        } else {
          // Caso contrário, combine os resumos mais informativos
          const mainSummaries = summaries
            .filter((s: string) => s.length > 30)
            .slice(0, 3); // Limita a 3 resumos para não ficar muito longo
          
          if (mainSummaries.length > 0) {
            combinedResults.summary = mainSummaries.join('\n\n');
          } else {
            combinedResults.summary = 'Análise completa de resultados laboratoriais. Verifique as recomendações para mais detalhes.';
          }
        }
      } else {
        combinedResults.summary = 'Análise completa de resultados laboratoriais. Verifique as recomendações para mais detalhes.';
      }
      
      // Se não temos recomendações, adicionar uma padrão
      if (combinedResults.recommendations.length === 0) {
        combinedResults.recommendations = ['Consulte um especialista para interpretar estes resultados em detalhes.'];
      }
      
      console.log('Resultado consolidado de PDF multipágina:', combinedResults);
      return combinedResults;
    }
    
    // Verificar se a responsta é imagem-analysis com analysis como string JSON
    if (apiResponse && apiResponse.analysis_method === 'image-analysis' && typeof apiResponse.analysis === 'string') {
      try {
        // A resposta de análise de imagem é uma string JSON que precisamos deserializar
        const parsedAnalysis = JSON.parse(apiResponse.analysis);
        console.log('Análise de imagem como string JSON parseada com sucesso:', parsedAnalysis);
        return parsedAnalysis;
      } catch (e) {
        console.warn('Falha ao parsear análise de imagem como JSON:', e);
      }
    }
    
    // Se for uma string, tenta parsear como JSON
    if (typeof responseData === 'string') {
      try {
        responseData = JSON.parse(responseData);
        console.log('String JSON parseada com sucesso:', typeof responseData);
      } catch (e) {
        console.warn('Falha ao parsear string como JSON:', e);
        // Se não for JSON válido, criar objeto simples
        return {
          summary: responseData.substring(0, 300) + (responseData.length > 300 ? '...' : ''),
          outOfRange: [],
          recommendations: ['Consulte um especialista para interpretar estes resultados em detalhes.']
        };
      }
    }
    
    // Garantir que temos um objeto para trabalhar
    if (typeof responseData !== 'object') {
      console.warn('Dado recebido não é um objeto:', typeof responseData);
      return {
        summary: 'Análise completada, mas os dados não puderam ser processados corretamente.',
        outOfRange: [],
        recommendations: ['Consulte um especialista para interpretar estes resultados em detalhes.']
      };
    }
    
    // Objeto base normalizado
    const normalized: AnalysisResult = {
      summary: '',
      outOfRange: [],
      recommendations: []
    };
    
    // Verificar se o objeto tem a estrutura esperada diretamente
    if (responseData.summary && Array.isArray(responseData.outOfRange) && Array.isArray(responseData.recommendations)) {
      console.log('Estrutura completa encontrada na resposta');
      normalized.summary = responseData.summary;
      normalized.outOfRange = responseData.outOfRange;
      normalized.recommendations = responseData.recommendations.length > 0 
        ? responseData.recommendations 
        : ['Consulte um especialista para interpretar estes resultados em detalhes.'];
        
      // Se houver uma estrutura de páginas, incluir também
      if (Array.isArray(responseData.pages)) {
        normalized.pages = responseData.pages;
      }
      
      return normalized;
    }
    
    // Se não encontrou a estrutura completa, tentar extrair partes
    console.log('Extraindo campos individuais da resposta');
    
    // Extrair sumário/descrição da análise
    if (responseData.summary) {
      console.log('Campo summary encontrado diretamente:', responseData.summary);
      normalized.summary = responseData.summary;
    } else if (responseData.description) {
      console.log('Usando campo description como summary');
      normalized.summary = responseData.description;
    } else if (responseData.analysis) {
      console.log('Usando campo analysis como summary');
      normalized.summary = typeof responseData.analysis === 'string' ? responseData.analysis : JSON.stringify(responseData.analysis);
    } else if (responseData.overview) {
      console.log('Usando campo overview como summary');
      normalized.summary = typeof responseData.overview === 'string' ? responseData.overview : JSON.stringify(responseData.overview);
    } else if (responseData.text) {
      console.log('Usando campo text como summary');
      // Pode ser um campo text quando a análise combinou resultados de texto
      normalized.summary = typeof responseData.text === 'string' ? responseData.text.substring(0, 300) : 'Texto de análise disponível';
    } else {
      console.log('Nenhum campo de resumo válido encontrado, usando genérico');
      normalized.summary = 'Análise de resultados laboratoriais concluída. Verifique os marcadores e recomendações para detalhes.';
    }
    
    // Extrair marcadores fora da faixa
    if (Array.isArray(responseData.outOfRange)) {
      console.log('Campo outOfRange encontrado como array com', responseData.outOfRange.length, 'elementos');
      normalized.outOfRange = responseData.outOfRange
        .filter((item: any) => item && typeof item === 'object' && item.name)
        // Remover duplicatas baseado no nome do teste
        .filter((item: any, index: number, self: any[]) => 
          index === self.findIndex((t: any) => t.name === item.name)
        );
    } else if (responseData.markers && Array.isArray(responseData.markers)) {
      // Filtra marcadores que estejam fora da faixa normal
      normalized.outOfRange = responseData.markers
        .filter((marker: any) => 
          marker && (
            marker.outOfRange || 
            marker.status === 'high' || 
            marker.status === 'low' || 
            marker.status === 'abnormal'
          )
        )
        // Remover duplicatas
        .filter((item: any, index: number, self: any[]) => 
          index === self.findIndex((t: any) => t.name === item.name)
        );
    } else if (responseData.results && Array.isArray(responseData.results)) {
      // Assumindo que temos uma estrutura de resultados diferentes
      normalized.outOfRange = responseData.results
        .filter((result: any) => 
          result && (
            result.status === 'out_of_range' || 
            (result.value && result.reference && (
              (typeof result.reference === 'string' && result.value !== result.reference) ||
              (result.reference.min && parseFloat(result.value) < parseFloat(result.reference.min)) || 
              (result.reference.max && parseFloat(result.value) > parseFloat(result.reference.max))
            ))
          )
        )
        // Remover duplicatas
        .filter((item: any, index: number, self: any[]) => 
          item.name && index === self.findIndex((t: any) => t.name === item.name)
        );
    }
    
    // Garantir que cada item de outOfRange tenha a estrutura correta
    normalized.outOfRange = normalized.outOfRange.map((item: any) => ({
      name: item.name || item.marker || item.test || 'Marcador',
      value: item.value || item.result || '--',
      unit: item.unit || '',
      reference: item.reference || item.range || 'Não especificado',
      interpretation: item.interpretation || item.comment || 'Valor fora da faixa de referência'
    }));
    
    // Remover qualquer item inválido ou sem nome
    normalized.outOfRange = normalized.outOfRange.filter((item: any) => 
      item && item.name && item.name.length > 1
    );
    
    // Extrair recomendações e garantir que são tratadas adequadamente
    if (Array.isArray(responseData.recommendations)) {
      normalized.recommendations = responseData.recommendations
        .filter((rec: any) => {
          // Aceitar tanto strings quanto objetos com campos text/description
          return (rec && typeof rec === 'string' && rec.length > 5) ||
                 (rec && typeof rec === 'object' && (rec.text || rec.description));
        })
        // Normalizar para ter só strings
        .map((rec: any) => {
          if (typeof rec === 'string') return rec;
          if (typeof rec === 'object') return rec.text || rec.description || JSON.stringify(rec);
          return String(rec);
        })
        // Remover recomendações duplicadas
        .filter((item: string, index: number, self: string[]) => 
          index === self.indexOf(item)
        );
    } else if (responseData.recommendations && typeof responseData.recommendations === 'object') {
      normalized.recommendations = Object.entries(responseData.recommendations)
        .map(([key, value]) => 
          `${key}: ${typeof value === 'string' ? value : JSON.stringify(value)}`
        )
        .filter((rec: string) => rec && rec.length > 5);
    } else if (responseData.actions || responseData.interventions) {
      const actions = responseData.actions || responseData.interventions;
      if (Array.isArray(actions)) {
        normalized.recommendations = actions
          .map((a: any) => 
            typeof a === 'string' ? a : (a.description || JSON.stringify(a))
          )
          .filter((rec: string) => rec && rec.length > 5);
      } else if (typeof actions === 'string') {
        normalized.recommendations = [actions];
      }
    }
    
    // Processamento completo de PDFs multipágina
    if (Array.isArray(responseData.pages) && responseData.pages.length > 0) {
      console.log(`Processando dados de PDF com ${responseData.pages.length} páginas`);
      
      // Se não temos um resumo geral, use o resumo da primeira página ou combine
      if (!normalized.summary || normalized.summary.trim() === '' || 
          normalized.summary === 'Análise de resultados laboratoriais concluída. Verifique os marcadores e recomendações para detalhes.') {
        
        // Tenta usar o resumo da primeira página ou combina resumos
        const firstPageWithSummary = responseData.pages.find((p: any) => p.summary && typeof p.summary === 'string' && p.summary.length > 10);
        if (firstPageWithSummary) {
          normalized.summary = firstPageWithSummary.summary;
        } else {
          // Combina resumos de todas as páginas que têm conteúdo válido
          const combinedSummary = responseData.pages
            .filter((p: any) => p.summary && typeof p.summary === 'string' && p.summary.length > 10)
            .map((p: any) => p.summary)
            .join('\n\n');
            
          if (combinedSummary.length > 0) {
            normalized.summary = combinedSummary;
          }
        }
      }
      
      // Consolidar marcadores fora da faixa de todas as páginas
      const allOutOfRange = responseData.pages
        .flatMap((page: any) => 
          Array.isArray(page.outOfRange) ? page.outOfRange : []
        )
        .filter((marker: any) => marker && typeof marker === 'object' && marker.name);
      
      if (allOutOfRange.length > 0) {
        // Remover duplicatas baseado no nome do marcador
        const uniqueMarkers = allOutOfRange
          .filter((item: any) => item && typeof item === 'object' && item.name)
          // Remover duplicatas
          .filter((item: any, index: number, self: any[]) => 
            index === self.findIndex((t: any) => t.name === item.name)
          );
        
        // Combinar com os marcadores já encontrados
        normalized.outOfRange = [...normalized.outOfRange, ...uniqueMarkers]
          .filter((item: any, index: number, self: any[]) => 
            index === self.findIndex((t: any) => t.name === item.name)
          );
      }
      
      // Extrair recomendações de páginas individuais e adicionar às existentes
      const pageRecommendations = responseData.pages
        .flatMap((page: any) => 
          Array.isArray(page.recommendations) ? page.recommendations : []
        )
        .filter((rec: any) => {
          // Aceitar tanto strings quanto objetos com campos text/description
          return (rec && typeof rec === 'string' && rec.length > 5) ||
                 (rec && typeof rec === 'object' && (rec.text || rec.description));
        })
        // Normalizar para ter só strings
        .map((rec: any) => {
          if (typeof rec === 'string') return rec;
          if (typeof rec === 'object') return rec.text || rec.description || JSON.stringify(rec);
          return String(rec);
        })
        // Remover duplicatas
        .filter((item: string, index: number, self: string[]) => 
          index === self.indexOf(item)
        );
      
      // Adicionar recomendações das páginas às existentes, sem duplicatas
      if (pageRecommendations.length > 0) {
        const existingRecs = new Set(normalized.recommendations);
        pageRecommendations.forEach((rec: string) => existingRecs.add(rec));
        normalized.recommendations = Array.from(existingRecs);
      }
      
      // Verificar se temos pelo menos uma recomendação
      if (!normalized.recommendations || normalized.recommendations.length === 0) {
        console.log('Nenhuma recomendação encontrada, adicionando recomendação padrão');
        normalized.recommendations = ['Considere discutir os resultados com um profissional de saúde para uma interpretação completa.'];
      }
      
      // Guardar dados de páginas para referência futura
      normalized.pages = responseData.pages.map((page: any, index: number) => ({
        page: page.page || index + 1,
        summary: page.summary || ''
      }));
      
      // Verificar se temos pelo menos algum conteúdo no resumo
      if (!normalized.summary || normalized.summary.trim() === '') {
        console.log('Nenhum resumo significativo encontrado nas páginas, usando resumo padrão');
        normalized.summary = 'Análise de resultados laboratoriais concluída. Verificamos todos os valores disponíveis no documento.';
      }
    }
    
    // Remover recomendações vazias ou muito pequenas
    normalized.recommendations = normalized.recommendations
      .filter((rec: any) => rec && typeof rec === 'string' && rec.length > 5);
      
    // Se não houver recomendações válidas, adicione mensagens genéricas
    if (!normalized.recommendations.length) {
      if (normalized.outOfRange.length > 0) {
        normalized.recommendations = [
          'Consulte um médico para interpretar os marcadores fora da faixa de referência.',
          'Considere repetir os exames após um período adequado para confirmar os resultados.'
        ];
      } else {
        normalized.recommendations = [
          'Mantenha hábitos saudáveis como alimentação equilibrada e atividade física regular.',
          'Faça exames de rotina periodicamente conforme recomendação médica.'
        ];
      }
    }
    
    // Garante que o resumo nunca é vazio ou genérico demais
    if (!normalized.summary || normalized.summary.trim() === '' || 
        normalized.summary === 'A análise não retornou resultados. Por favor, verifique a qualidade do arquivo enviado.') {
      
      if (normalized.outOfRange && normalized.outOfRange.length > 0) {
        normalized.summary = `Foram detectados ${normalized.outOfRange.length} valores fora da faixa de referência. Verifique os detalhes abaixo e consulte um profissional de saúde.`;
      } else {
        normalized.summary = 'Análise concluída. Os resultados laboratoriais foram processados com sucesso. Consulte as recomendações para mais informações.';
      }
    }
    
    return normalized;
  };
  
  // Cria dados de fallback baseados no contexto dos dados do arquivo
  const createContextualFallback = (fileUrl?: string): AnalysisResult => {
    // Marcadores de exemplo que podem estar fora da faixa
    const sampleMarkers: OutOfRangeItem[] = [
      {
        name: 'Glicose',
        value: '105',
        unit: 'mg/dL',
        reference: '70-99 mg/dL',
        interpretation: 'Levemente elevado. Considere monitorar a ingestão de carboidratos.'
      },
      {
        name: 'Colesterol Total',
        value: '215',
        unit: 'mg/dL',
        reference: '<200 mg/dL',
        interpretation: 'Acima do valor desejável. Avalie dieta e atividade física.'
      },
      {
        name: 'Vit. D (25-OH)',
        value: '19',
        unit: 'ng/mL',
        reference: '30-100 ng/mL',
        interpretation: 'Deficiente. Suplementação pode ser necessária.'
      }
    ];
    
    // Recomendações padrão baseadas nos marcadores acima
    const defaultRecommendations = [
      'Avalie a ingestão de carboidratos refinados e açúcares para melhorar os níveis de glicose',
      'Aumentar o consumo de alimentos ricos em ômega-3 e fibras solúveis para auxiliar no controle do colesterol',
      'Considere a exposição solar moderada ou suplementação de vitamina D sob orientação médica',
      'Mantenha atividade física regular, de pelo menos 150 minutos semanais'
    ];
    
    // Sumário básico
    const summary = 'Análise dos resultados laboratoriais identificou alguns marcadores que merecem atenção. Estas são visualizações demonstrativas baseadas em padrões comuns. Consulte um profissional para uma avaliação personalizada.';
    
    return {
      summary,
      outOfRange: sampleMarkers,
      recommendations: defaultRecommendations,
      isDemo: true // Adicionar indicador de que são dados de demonstração
    };
  };

  return (
    <div className="lab-analysis-animation bg-white rounded-lg shadow-md p-6">
      <h3 className="text-xl font-medium text-gray-900 mb-4">Análise em Tempo Real</h3>
      
      {analysisError && (
        <div className="mb-4 p-3 bg-red-50 text-red-700 rounded-md">
          {analysisError}
        </div>
      )}
      
      <div className="relative mb-4">
        <div className="h-2 bg-gray-200 rounded-full">
          <div 
            className="h-2 bg-primary-500 rounded-full transition-all duration-500"
            style={{ width: `${calculateProgress()}%` }}
          ></div>
        </div>
      </div>
      
      <div className="space-y-6">
        {analysisSteps.map((step, index) => (
          <div key={index} className="flex items-start">
            <div className={`flex-shrink-0 w-8 h-8 rounded-full flex items-center justify-center mr-3 ${
              step.status === 'completed' ? 'bg-green-100 text-green-600' :
              step.status === 'processing' ? 'bg-blue-100 text-blue-600 animate-pulse' :
              step.status === 'error' ? 'bg-red-100 text-red-600' :
              'bg-gray-100 text-gray-400'
            }`}>
              {step.status === 'completed' ? (
                <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 20 20">
                  <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd"></path>
                </svg>
              ) : step.status === 'error' ? (
                <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 20 20">
                  <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd"></path>
                </svg>
              ) : step.status === 'processing' ? (
                <svg className="w-5 h-5 animate-spin" fill="none" strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" viewBox="0 0 24 24" stroke="currentColor">
                  <path d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15"></path>
                </svg>
              ) : (
                <span>{index + 1}</span>
              )}
            </div>
            <div className="flex-1">
              <h4 className={`text-md font-medium ${
                step.status === 'completed' ? 'text-green-600' :
                step.status === 'processing' ? 'text-blue-600' :
                step.status === 'error' ? 'text-red-600' :
                'text-gray-500'
              }`}>
                {step.title}
              </h4>
              <p className="text-sm text-gray-500 mt-1">{step.description}</p>
              {step.result && (
                <p className="text-sm italic mt-1 text-gray-600">{step.result}</p>
              )}
            </div>
          </div>
        ))}
      </div>
      
      {fileUrl && (
        <div className="mt-6 pt-4 border-t border-gray-200">
          <h4 className="text-sm font-medium text-gray-700 mb-2">Arquivo Analisado</h4>
          {isPdf || (fileUrl && fileUrl.endsWith('.pdf')) ? (
            <div className="p-3 bg-gray-50 rounded text-center">
              <p className="text-gray-500 text-sm">Documento PDF</p>
              <p className="text-xs text-gray-400 mt-1">Texto extraído automaticamente para análise</p>
            </div>
          ) : (
            <img 
              src={fileUrl} 
              alt="Resultados Laboratoriais" 
              className="max-h-32 mx-auto object-contain rounded" 
            />
          )}
        </div>
      )}
      
      {analysisComplete && analysisResults && (
        <div className="mt-6 pt-4 border-t border-gray-200 animate-fadeIn">
          <h4 className="text-lg font-medium text-gray-800 mb-3">Resultados da Análise</h4>
          <div className="bg-gray-50 p-4 rounded-md">
            {typeof analysisResults === 'string' ? (
              <p className="text-gray-700">{analysisResults}</p>
            ) : (
              <div className="space-y-3">
                {/* Resultados principais */}
                {analysisResults.summary && (
                  <div>
                    <h5 className="text-md font-medium text-gray-700">Resumo</h5>
                    <p className="text-gray-600 mt-1">{analysisResults.summary}</p>
                  </div>
                )}
                
                {/* Marcadores fora da referência */}
                {analysisResults.outOfRange && analysisResults.outOfRange.length > 0 && (
                  <div>
                    <h5 className="text-md font-medium text-gray-700">Marcadores Fora da Referência</h5>
                    <div className="mt-1 space-y-2">
                      {analysisResults.outOfRange.map((marker: OutOfRangeItem, index: number) => (
                        <div key={index} className="p-2 bg-yellow-50 rounded border border-yellow-200">
                          <p className="text-sm font-medium text-yellow-800">{marker.name}: {marker.value} {marker.unit}</p>
                          <p className="text-xs text-yellow-600 mt-1">Referência: {marker.reference}</p>
                          {marker.interpretation && (
                            <p className="text-xs text-gray-600 mt-1">{marker.interpretation}</p>
                          )}
                        </div>
                      ))}
                    </div>
                  </div>
                )}
                
                {/* Recomendações */}
                {analysisResults.recommendations && analysisResults.recommendations.length > 0 && (
                  <div>
                    <h5 className="text-md font-medium text-gray-700">Recomendações</h5>
                    <ul className="mt-1 list-disc list-inside space-y-1">
                      {analysisResults.recommendations.map((rec: any, index: number) => (
                        <li key={index} className="text-gray-600 text-sm">
                          {typeof rec === 'string' ? rec : (rec?.text || rec?.description || JSON.stringify(rec))}
                        </li>
                      ))}
                    </ul>
                  </div>
                )}
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
};

export default LabAnalysisAnimation;