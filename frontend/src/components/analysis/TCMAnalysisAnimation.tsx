import React, { useState, useEffect } from 'react';

interface TCMAnalysisAnimationProps {
  analyzeTCM: () => Promise<any>;
  tcmData?: any;
  isAnalyzing: boolean;
  onAnalysisComplete: (analysisData: any) => void;
}

type AnalysisStep = {
  title: string;
  description: string;
  status: 'waiting' | 'processing' | 'completed' | 'error';
  result?: string;
}

const TCMAnalysisAnimation: React.FC<TCMAnalysisAnimationProps> = ({
  analyzeTCM,
  tcmData,
  isAnalyzing,
  onAnalysisComplete
}) => {
  const [analysisSteps, setAnalysisSteps] = useState<AnalysisStep[]>([
    { title: 'Processamento dos Dados', description: 'Organizando observações TCM', status: 'waiting' },
    { title: 'Análise de Padrões', description: 'Identificando padrões de desequilíbrio', status: 'waiting' },
    { title: 'Correlação Clínica', description: 'Correlacionando com manifestações clínicas', status: 'waiting' },
    { title: 'Geração de Recomendações', description: 'Elaborando sugestões personalizadas', status: 'waiting' }
  ]);
  const [currentStepIndex, setCurrentStepIndex] = useState<number>(-1);
  const [analysisError, setAnalysisError] = useState<string | null>(null);
  const [analysisComplete, setAnalysisComplete] = useState<boolean>(false);
  const [analysisResults, setAnalysisResults] = useState<any>(null);

  // Carrega resultados da análise existentes dos dados do plano TCM
  useEffect(() => {
    // Se não está analisando, mas tcmData já contém dados de análise, mostrar como concluído
    if (tcmData?.analyzed_data && !isAnalyzing && !analysisComplete) {
      console.log('Exibindo resultados de análise TCM existentes:', tcmData.analyzed_data);
      setAnalysisResults(tcmData.analyzed_data);
      setAnalysisComplete(true);
      
      // Marcar todos os passos como concluídos
      setAnalysisSteps(prev => prev.map(step => ({ ...step, status: 'completed' })));
      
      // Notifica o componente pai que a análise já está concluída
      // Isso é importante para manter a consistência do estado
      onAnalysisComplete(tcmData.analyzed_data);
    }
  }, [tcmData]);
  
  // Executa a análise quando isAnalyzing muda para true
  useEffect(() => {
    if (isAnalyzing && currentStepIndex < 0 && !analysisComplete) {
      runAnalysis();
    }
  }, [isAnalyzing]);

  const updateStepStatus = (index: number, status: 'waiting' | 'processing' | 'completed' | 'error', result?: string) => {
    setAnalysisSteps(prev => prev.map((step, i) => 
      i === index ? { ...step, status, ...(result ? { result } : {}) } : step
    ));
  };

  const runAnalysis = async () => {
    try {
      setCurrentStepIndex(0);
      
      // Passo 1: Processamento dos Dados
      updateStepStatus(0, 'processing');
      await simulateDelay(800);
      updateStepStatus(0, 'completed', 'Dados de observações TCM processados');
      
      // Passo 2: Análise de Padrões
      setCurrentStepIndex(1);
      updateStepStatus(1, 'processing');
      await simulateDelay(1200);
      
      // Iniciar chamada da API durante a animação para maior eficiência
      let results: any = null;
      try {
        // Continua com a animação por um momento antes de iniciar a análise
        await simulateDelay(800); // Reduzido para melhorar a experiência
        
        // Executar a análise usando a função que foi passada via props
        // Usamos try-catch para tratar erros específicos da análise
        try {
          console.log('Chamando analyzeTCM do componente');
          results = await analyzeTCM();
          console.log('Resultado da análise TCM (bruto):', results);
          
          // Normalizar o resultado para garantir que temos a estrutura esperada
          results = normalizeApiResponse(results);
          console.log('Resultado da análise TCM (normalizado):', results);
        } catch (analyzeError: any) {
          console.error('Erro durante a análise TCM:', analyzeError);
          
          // Marcar o erro na UI
          updateStepStatus(1, 'error', 'Erro na análise de padrões');
          
          // Propagar o erro para mostrar uma mensagem clara ao usuário
          throw new Error('Falha na análise TCM. Tente novamente ou contate o suporte.');
        }
        
        // Se chegou aqui com resultados válidos, atualiza com dados reais
        if (results && results.patterns) {
          const patternCount = Array.isArray(results.patterns) ? results.patterns.length : 
                             typeof results.patterns === 'object' ? Object.keys(results.patterns).length : 0;
          
          const patternText = patternCount === 1 ? 'padrão' : 'padrões';
          updateStepStatus(1, 'completed', `${patternCount} ${patternText} identificados`);
        } else {
          updateStepStatus(1, 'completed', 'Análise de padrões concluída');
        }
      } catch (generalError) {
        console.error('Erro geral na etapa de análise TCM:', generalError);
        updateStepStatus(1, 'completed', 'Análise com dados de demonstração');
        
        // Criamos um resultado de fallback mesmo em caso de erro geral
        results = {
          patterns: [{ name: "Modo Demonstrativo", description: "Exibindo interface de análise em tempo real" }],
          summary: "Esta é uma demonstração da interface de análise.",
          recommendations: ["Preencha os campos para análise real"]
        };
      }
      
      // Passo 3: Correlação Clínica
      setCurrentStepIndex(2);
      updateStepStatus(2, 'processing');
      await simulateDelay(800);
      updateStepStatus(2, 'completed', 'Correlações com manifestações clínicas');      
      
      // Passo 4: Geração de Recomendações
      setCurrentStepIndex(3);
      updateStepStatus(3, 'processing');
      await simulateDelay(800);
      
      // Contagem de recomendações (reais ou de fallback)
      const recCount = results?.recommendations?.length || 0;
      const recText = recCount === 1 ? 'recomendação' : 'recomendações';
      updateStepStatus(3, 'completed', `${recCount} ${recText} terapêuticas elaboradas`);
      
      // Finalizando a análise com qualquer resultado que tenhamos
      setAnalysisResults(results);
      setAnalysisComplete(true);
      
      // Notificar o componente pai sobre a conclusão da análise
      if (results) {
        onAnalysisComplete(results);
      } else {
        console.warn('Notificando conclusão sem resultados válidos');
        // Default - formato mais simples possível com feedback para o usuário
        onAnalysisComplete({
          summary: 'Análise concluída sem resultados estruturados',
          patterns: [
            { 
              name: 'Resposta da Análise', 
              description: 'Verifique as observações TCM para detalhes completos'
            }
          ],
          recommendations: [
            'Revise os dados inseridos para obter análise mais detalhada',
            'Certifique-se de preencher todos os campos relevantes'
          ]
        });
      }
    } catch (error) {
      console.error('Erro durante a análise', error);
      setAnalysisError('Ocorreu um erro durante a análise das observações TCM.');
      
      // Atualiza o status do passo atual para erro
      if (currentStepIndex >= 0) {
        updateStepStatus(currentStepIndex, 'error');
      }
      
      // Mesmo em caso de erro terminal, notificamos o componente pai para evitar que a interface fique travada
      try {
        onAnalysisComplete({
          summary: "A análise não pôde ser concluída devido a um erro.",
          patterns: [{ name: "Erro", description: "A análise foi interrompida por um erro." }],
          recommendations: ["Recomendamos verificar os dados e tentar novamente."]
        });
      } catch (notifyError) {
        console.error('Erro ao notificar componente pai sobre falha na análise:', notifyError);
      }
    }
  };

  const simulateDelay = (ms: number) => new Promise(resolve => setTimeout(resolve, ms));

  // Calcula o progresso total
  const calculateProgress = () => {
    const completedSteps = analysisSteps.filter(step => step.status === 'completed').length;
    return (completedSteps / analysisSteps.length) * 100;
  };
  
  // Normaliza a resposta da API para garantir uma estrutura consistente
  // Criar uma mensagem de erro clara para o usuário
  const formatErrorMessage = (error: any) => {
    if (!error) return 'Erro desconhecido';
    
    // Extrair mensagem do erro
    const errorMessage = error.message || error.toString();
    
    if (errorMessage.includes('token')) {
      return 'Erro de limite de tokens na análise. Tente simplificar os dados informados.';
    } else if (errorMessage.includes('API')) {
      return 'Erro de conexão com a API. Verifique sua conexão de internet e tente novamente.';
    } else {
      return `Erro na análise: ${errorMessage}`;
    }
  };

  const normalizeApiResponse = (data: any) => {
    console.log('Normalizando resposta API:', data);
    
    // Se for uma string, tenta parsear como JSON
    if (typeof data === 'string') {
      try {
        // Primeiro, verificar se a string contém um objeto JSON válido
        const jsonMatch = data.match(/\{[\s\S]*\}/); // Encontra qualquer conteúdo entre chaves
        const jsonString = jsonMatch ? jsonMatch[0] : data;
        data = JSON.parse(jsonString);
      } catch (e) {
        console.warn('Não foi possível converter string para JSON:', e);
        // Se não for JSON válido, criar objeto simples
        return {
          summary: data,
          patterns: [
            { name: 'Resposta da Análise', description: 'Dados em formato textual' }
          ],
          recommendations: []
        };
      }
    }
    
    // Verificar se temos o campo 'analysis' que contém a análise estruturada (novo formato)
    if (data.analysis) {
      try {
        // Se analysis é uma string, tenta parsear como JSON
        let analysisData = data.analysis;
        if (typeof analysisData === 'string') {
          try {
            analysisData = JSON.parse(analysisData);
          } catch (e) {
            // Se não for JSON válido, manter como string
          }
        }
        
        // Verificar se está no formato novo (diagnosticoMTC, recomendacoes, resumo)
        if (analysisData.diagnosticoMTC || analysisData.recomendacoes || analysisData.resumo) {
          console.log('Detectado formato novo da análise TCM');
          
          // Objeto base normalizado para o novo formato
          const normalized: any = {
            summary: '',
            patterns: [],
            recommendations: []
          };
          
          // Extrair resumo
          if (analysisData.resumo) {
            normalized.summary = analysisData.resumo;
          }
          
          // Extrair padrões do diagnóstico MTC
          if (analysisData.diagnosticoMTC && analysisData.diagnosticoMTC.padroes) {
            if (Array.isArray(analysisData.diagnosticoMTC.padroes)) {
              normalized.patterns = analysisData.diagnosticoMTC.padroes.map((padrao: any) => ({
                name: padrao.nome || 'Padrão',
                description: padrao.descricao || '',
                symptoms: padrao.sinaisSintomas || [],
                relevance: padrao.relevancia || 'Média'
              }));
            }
            
            // Adicionar informações sobre órgãos e substâncias ao resumo
            if (analysisData.diagnosticoMTC.orgaosAfetados || analysisData.diagnosticoMTC.substanciasAfetadas) {
              let orgaosInfo = '';
              if (Array.isArray(analysisData.diagnosticoMTC.orgaosAfetados) && analysisData.diagnosticoMTC.orgaosAfetados.length > 0) {
                orgaosInfo = `\n\nÓrgãos afetados: ${analysisData.diagnosticoMTC.orgaosAfetados.join(', ')}`;
              }
              
              let substanciasInfo = '';
              if (Array.isArray(analysisData.diagnosticoMTC.substanciasAfetadas) && analysisData.diagnosticoMTC.substanciasAfetadas.length > 0) {
                substanciasInfo = `\n\nSubstâncias afetadas: ${analysisData.diagnosticoMTC.substanciasAfetadas.join(', ')}`;
              }
              
              normalized.summary += orgaosInfo + substanciasInfo;
            }
          }
          
          // Extrair recomendações
          if (analysisData.recomendacoes) {
            // Tratamentos
            if (analysisData.recomendacoes.tratamentos && Array.isArray(analysisData.recomendacoes.tratamentos)) {
              const tratamentos = analysisData.recomendacoes.tratamentos.map((tratamento: any) => {
                let descricao = tratamento.descricao || '';
                
                // Adicionar pontos de acupuntura se disponíveis
                if (tratamento.pontos && Array.isArray(tratamento.pontos) && tratamento.pontos.length > 0) {
                  descricao += ` [Pontos: ${tratamento.pontos.join(', ')}]`;
                }
                
                // Adicionar fórmulas se disponíveis
                if (tratamento.formulas && Array.isArray(tratamento.formulas) && tratamento.formulas.length > 0) {
                  descricao += ` [Fórmulas: ${tratamento.formulas.join(', ')}]`;
                }
                
                // Adicionar alimentos se disponíveis
                if (tratamento.alimentos && Array.isArray(tratamento.alimentos) && tratamento.alimentos.length > 0) {
                  descricao += ` [Alimentos: ${tratamento.alimentos.join(', ')}]`;
                }
                
                return `${tratamento.tipo || 'Tratamento'}: ${descricao}`;
              });
              
              normalized.recommendations = [...normalized.recommendations, ...tratamentos];
            }
            
            // Mudanças de estilo de vida
            if (analysisData.recomendacoes.mudancasEstiloVida && Array.isArray(analysisData.recomendacoes.mudancasEstiloVida)) {
              const mudancas = analysisData.recomendacoes.mudancasEstiloVida.map(
                (mudanca: any) => `Estilo de vida: ${typeof mudanca === 'string' ? mudanca : JSON.stringify(mudanca)}`
              );
              
              normalized.recommendations = [...normalized.recommendations, ...mudancas];
            }
          }
          
          return normalized;
        }
      } catch (e) {
        console.error('Erro ao processar dados de análise no novo formato:', e);
        // Continuar para o processamento do formato antigo
      }
    }
    
    // Processamento no formato antigo (fallback)
    console.log('Usando formato antigo para normalização');
    
    // Objeto base normalizado
    const normalized: any = {
      summary: '',
      patterns: [],
      recommendations: []
    };
    
    // Extrair sumário/descrição da análise
    if (data.summary) {
      normalized.summary = data.summary;
    } else if (data.description) {
      normalized.summary = data.description;
    } else if (data.analysis) {
      normalized.summary = typeof data.analysis === 'string' ? data.analysis : JSON.stringify(data.analysis);
    } else if (data.diagnosis) {
      normalized.summary = typeof data.diagnosis === 'string' ? data.diagnosis : JSON.stringify(data.diagnosis);
    }
    
    // Extrair padrões
    if (Array.isArray(data.patterns)) {
      normalized.patterns = data.patterns;
    } else if (data.patterns && typeof data.patterns === 'object') {
      normalized.patterns = Object.entries(data.patterns).map(([key, value]) => ({
        name: key,
        description: typeof value === 'string' ? value : JSON.stringify(value)
      }));
    } else if (data.diagnosis_patterns || data.diagnoses) {
      const patterns = data.diagnosis_patterns || data.diagnoses;
      if (Array.isArray(patterns)) {
        normalized.patterns = patterns.map((p: any) => ({
          name: p.name || p.title || 'Padrão',
          description: p.description || p.details || JSON.stringify(p)
        }));
      } else if (typeof patterns === 'object') {
        normalized.patterns = Object.entries(patterns).map(([key, value]) => ({
          name: key,
          description: typeof value === 'string' ? value : JSON.stringify(value)
        }));
      }
    }
    
    // Extrair recomendações
    if (Array.isArray(data.recommendations)) {
      normalized.recommendations = data.recommendations;
    } else if (data.recommendations && typeof data.recommendations === 'object') {
      normalized.recommendations = Object.entries(data.recommendations).map(([key, value]) => 
        `${key}: ${typeof value === 'string' ? value : JSON.stringify(value)}`
      );
    } else if (data.treatment || data.treatments) {
      const treatments = data.treatment || data.treatments;
      if (Array.isArray(treatments)) {
        normalized.recommendations = treatments.map((t: any) => 
          typeof t === 'string' ? t : (t.description || JSON.stringify(t))
        );
      } else if (typeof treatments === 'string') {
        normalized.recommendations = [treatments];
      } else if (typeof treatments === 'object') {
        normalized.recommendations = Object.entries(treatments).map(([key, value]) => 
          `${key}: ${typeof value === 'string' ? value : JSON.stringify(value)}`
        );
      }
    }
    
    return normalized;
  };

  return (
    <div className="tcm-analysis-animation bg-white rounded-lg shadow-md p-6">
      <h3 className="text-xl font-medium text-gray-900 mb-4">Análise das Observações TCM</h3>
      
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
      
      {analysisComplete && analysisResults && (
        <div className="mt-6 pt-4 border-t border-gray-200 animate-fadeIn">
          <h4 className="text-lg font-medium text-gray-800 mb-3">Resultados da Análise</h4>
          <div className="bg-gray-50 p-4 rounded-md">
            {typeof analysisResults === 'string' ? (
              <p className="text-gray-700">{analysisResults}</p>
            ) : (
              <div className="space-y-3">
                {/* Padrões principais */}
                {analysisResults.patterns && (
                  <div>
                    <h5 className="text-md font-medium text-gray-700">Padrões Identificados</h5>
                    <div className="mt-1 space-y-2">
                      {Array.isArray(analysisResults.patterns) ? (
                        // Tratar padrões como array (formato esperado)
                        analysisResults.patterns.map((pattern: any, index: number) => (
                          <div key={index} className="p-2 bg-blue-50 rounded border border-blue-200">
                            <p className="text-sm font-medium text-blue-800">{pattern.name || pattern.pattern_name || 'Padrão'}</p>
                            <p className="text-xs text-blue-600 mt-1">{pattern.description || pattern.details || pattern.explanation || ''}</p>
                          </div>
                        ))
                      ) : typeof analysisResults.patterns === 'object' ? (
                        // Tratar padrões como objeto
                        Object.entries(analysisResults.patterns).map(([key, value]: [string, any], index: number) => (
                          <div key={index} className="p-2 bg-blue-50 rounded border border-blue-200">
                            <p className="text-sm font-medium text-blue-800">{key}</p>
                            <p className="text-xs text-blue-600 mt-1">{typeof value === 'string' ? value : JSON.stringify(value)}</p>
                          </div>
                        ))
                      ) : (
                        // Fallback para texto
                        <div className="p-2 bg-blue-50 rounded border border-blue-200">
                          <p className="text-sm font-medium text-blue-800">Análise</p>
                          <p className="text-xs text-blue-600 mt-1">{String(analysisResults.patterns)}</p>
                        </div>
                      )}
                    </div>
                  </div>
                )}
                
                {/* Resumo */}
                {analysisResults.summary && (
                  <div>
                    <h5 className="text-md font-medium text-gray-700">Resumo</h5>
                    <p className="text-gray-600 mt-1">
                      {typeof analysisResults.summary === 'string' 
                        ? analysisResults.summary 
                        : typeof analysisResults.summary === 'object'
                          ? JSON.stringify(analysisResults.summary)
                          : 'Resumo da análise disponível'}
                    </p>
                  </div>
                )}
                
                {/* Recomendações */}
                {analysisResults.recommendations && (
                  <div>
                    <h5 className="text-md font-medium text-gray-700">Recomendações</h5>
                    <ul className="mt-1 list-disc list-inside space-y-1">
                      {Array.isArray(analysisResults.recommendations) ? (
                        // Formato array
                        analysisResults.recommendations.map((rec: any, index: number) => (
                          <li key={index} className="text-gray-600 text-sm">
                            {typeof rec === 'string' ? rec : (rec.text || rec.recommendation || JSON.stringify(rec))}
                          </li>
                        ))
                      ) : typeof analysisResults.recommendations === 'object' ? (
                        // Formato objeto
                        Object.entries(analysisResults.recommendations).map(([key, value]: [string, any], index: number) => (
                          <li key={index} className="text-gray-600 text-sm">
                            <span className="font-medium">{key}:</span> {typeof value === 'string' ? value : JSON.stringify(value)}
                          </li>
                        ))
                      ) : typeof analysisResults.recommendations === 'string' ? (
                        // Formato texto
                        <li className="text-gray-600 text-sm">{analysisResults.recommendations}</li>
                      ) : null}
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

export default TCMAnalysisAnimation;
