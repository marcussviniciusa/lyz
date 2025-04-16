import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/router';
import Link from 'next/link';
import Layout from '../../../components/Layout';
import { useAuth } from '../../../contexts/AuthContext';
import { planAPI } from '../../../lib/api';
import IFMMatrixSimpleAnalysis from '../../../components/analysis/IFMMatrixSimpleAnalysis';
import { motion, AnimatePresence } from 'framer-motion';

type MatrixCategory = {
  name: string;
  items: Array<{
    name: string;
    value: 0 | 1 | 2 | 3;
    notes?: string;
  }>;
  notes?: string;
};

type IFMMatrix = {
  assimilation: MatrixCategory;
  defense_repair: MatrixCategory;
  energy: MatrixCategory;
  biotransformation_elimination: MatrixCategory;
  transport: MatrixCategory;
  communication: MatrixCategory;
  structural_integrity: MatrixCategory;
  notes: string;
};

type PlanData = {
  id: string;
  user_id: number;
  patient_data: {
    name: string;
    age?: number;
    gender?: string;
  };
  // Removed questionnaire_data
  lab_results?: any;
  tcm_observations?: any;
  timeline_data?: any;
  ifm_matrix?: IFMMatrix;
  professional_type: string;
};

const defaultCategoryItems = [
  { name: 'Item 1', value: 0 },
  { name: 'Item 2', value: 0 },
  { name: 'Item 3', value: 0 },
  { name: 'Item 4', value: 0 },
  { name: 'Item 5', value: 0 },
];

const defaultMatrix: IFMMatrix = {
  assimilation: {
    name: 'Assimilação',
    items: [
      { name: 'Digestão', value: 0 },
      { name: 'Absorção', value: 0 },
      { name: 'Microbioma/Disbiose', value: 0 },
      { name: 'Permeabilidade Intestinal', value: 0 },
      { name: 'SIBO/SIFO', value: 0 },
      { name: 'Alergia/Intolerância Alimentar', value: 0 },
      { name: 'Função Enzimática', value: 0 },
      { name: 'Rejeição Alimentar', value: 0 },
    ],
    notes: '',
  },
  defense_repair: {
    name: 'Defesa e Reparação',
    items: [
      { name: 'Imunidade Adaptativa', value: 0 },
      { name: 'Imunidade Inata', value: 0 },
      { name: 'Inflamação', value: 0 },
      { name: 'Infecção', value: 0 },
      { name: 'Estresse Oxidativo', value: 0 },
      { name: 'Cicatrização de Tecidos', value: 0 },
      { name: 'Autoimunidade', value: 0 },
      { name: 'Histórico de Trauma', value: 0 },
    ],
    notes: '',
  },
  energy: {
    name: 'Energia',
    items: [
      { name: 'Produção Energética Celular', value: 0 },
      { name: 'Função Mitocondrial', value: 0 },
      { name: 'Metabolismo Tiroidiano', value: 0 },
      { name: 'Regulação da Glicose', value: 0 },
      { name: 'Reserva Adrénica', value: 0 },
      { name: 'Ciclo Cardiolípina', value: 0 },
      { name: 'Metabolismo Básico', value: 0 },
      { name: 'Condicionamento Aeróbico', value: 0 },
    ],
    notes: '',
  },
  biotransformation_elimination: {
    name: 'Biotransformação e Eliminação',
    items: [
      { name: 'Detoxificação Fase I', value: 0 },
      { name: 'Detoxificação Fase II', value: 0 },
      { name: 'Detoxificação Fase III', value: 0 },
      { name: 'Função Hepática', value: 0 },
      { name: 'Metabolismo de Estrógenos', value: 0 },
      { name: 'Eliminação Renal', value: 0 },
      { name: 'Eliminação Intestinal', value: 0 },
      { name: 'Carga Tóxica Ambiental', value: 0 },
    ],
    notes: '',
  },
  transport: {
    name: 'Transporte',
    items: [
      { name: 'Função Cardiovascular', value: 0 },
      { name: 'Função Linfática', value: 0 },
      { name: 'Circulação Periférica', value: 0 },
      { name: 'Função Respiratória', value: 0 },
      { name: 'Permeabilidade da Membrana Celular', value: 0 },
      { name: 'Transporte de Nutrientes', value: 0 },
      { name: 'Pressão Arterial', value: 0 },
      { name: 'Congestão/Edema', value: 0 },
    ],
    notes: '',
  },
  communication: {
    name: 'Comunicação',
    items: [
      { name: 'Balanço Hormonal', value: 0 },
      { name: 'Regulação Neurotransmissora', value: 0 },
      { name: 'Sinalização Imunológica', value: 0 },
      { name: 'Sinais Cel-a-cel', value: 0 },
      { name: 'Ritmo Circadiano', value: 0 },
      { name: 'Resposta ao Estresse', value: 0 },
      { name: 'Regulação Menstrual/Ciclícidade', value: 0 },
      { name: 'Cognição/Humor', value: 0 },
    ],
    notes: '',
  },
  structural_integrity: {
    name: 'Integridade Estrutural',
    items: [
      { name: 'Integridade de Membranas', value: 0 },
      { name: 'Sistema Esquelético/Ósseo', value: 0 },
      { name: 'Postura/Alinhamento', value: 0 },
      { name: 'Tegumento (Pele/Cabelo/Unhas)', value: 0 },
      { name: 'Sistema Muscular', value: 0 },
      { name: 'Função Articular', value: 0 },
      { name: 'Barreira Hematoencefálica', value: 0 },
      { name: 'Suporte Estrutural', value: 0 },
    ],
    notes: '',
  },
  notes: '',
};

const IFMMatrixPage: React.FC = () => {
  const { user, loading: authLoading } = useAuth();
  const router = useRouter();
  const { id } = router.query;
  
  const [plan, setPlan] = useState<PlanData | null>(null);
  const [matrix, setMatrix] = useState<IFMMatrix>(defaultMatrix);
  
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  
  // Estados para controle da análise de IA
  const [showAnalysis, setShowAnalysis] = useState(false);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [analysisComplete, setAnalysisComplete] = useState(false);
  const [analysisFocus, setAnalysisFocus] = useState('ciclicidade feminina');

  // Inicia a análise da matriz IFM
  const startMatrixAnalysis = () => {
    setShowAnalysis(true);
    setIsAnalyzing(true);
  };
  
  // Função para processar os resultados da análise
  const handleAnalysisComplete = (analysisData: IFMMatrix) => {
    setMatrix(analysisData);
    setIsAnalyzing(false);
    setAnalysisComplete(true);
    
    // Mostrar mensagem de sucesso
    setSuccessMessage('Análise concluída! Você pode editar os valores antes de salvar.');
    
    // Esconder mensagem após 5 segundos
    setTimeout(() => {
      setSuccessMessage(null);
    }, 5000);
  };
  
  // Função para realizar a análise da matriz IFM
  const analyzeMatrix = async () => {
    if (!id) return Promise.reject('ID do plano não encontrado');
    
    try {
      const response = await planAPI.analyzeIFMMatrix(id.toString(), {
        focus: analysisFocus,
        contextData: {
          lab_results: plan?.lab_results,
          tcm_observations: plan?.tcm_observations,
          timeline_data: plan?.timeline_data,
          patient_data: plan?.patient_data
        }
      });
      
      return response;
    } catch (error) {
      console.error('Erro ao analisar matriz IFM:', error);
      return Promise.reject(error);
    }
  };
  
  // Busca os dados do plano quando o componente é montado
  useEffect(() => {
    if (!user && !authLoading) {
      router.push('/auth/login');
    }
  }, [user, authLoading, router]);

  useEffect(() => {
    const fetchPlanDetails = async () => {
      if (!id) return;
      
      try {
        setLoading(true);
        const response = await planAPI.getPlanById(id as string);
        const planData = response.data.plan || null;
        
        setPlan(planData);
        
        // Se já existem dados da matriz IFM, preenche o formulário
        if (planData?.ifm_matrix) {
          setMatrix(planData.ifm_matrix);
        }
        
        setError(null);
      } catch (err: any) {
        setError('Erro ao carregar detalhes do plano: ' + (err.message || 'Tente novamente mais tarde'));
        console.error('Error fetching plan details:', err);
      } finally {
        setLoading(false);
      }
    };

    if (user && id) {
      fetchPlanDetails();
    }
  }, [user, id]);

  // Verifica se as etapas anteriores foram preenchidas
  useEffect(() => {
    if (plan) {
      if (!plan.lab_results) {
        setError('É necessário enviar os resultados laboratoriais antes da matriz IFM');
      } else if (!plan.tcm_observations) {
        setError('É necessário preencher as observações TCM antes da matriz IFM');
      } else if (!plan.timeline_data) {
        setError('É necessário preencher a timeline antes da matriz IFM');
      }
    }
  }, [plan]);

  // Handlers para atualizar o estado da matriz
  const handleItemValueChange = (category: keyof Omit<IFMMatrix, 'notes'>, index: number, value: 0 | 1 | 2 | 3) => {
    setMatrix(prev => ({
      ...prev,
      [category]: {
        ...prev[category],
        items: prev[category].items.map((item, i) => 
          i === index ? { ...item, value } : item
        )
      }
    }));
  };

  const handleCategoryNotesChange = (category: keyof Omit<IFMMatrix, 'notes'>, notes: string) => {
    setMatrix(prev => ({
      ...prev,
      [category]: {
        ...prev[category],
        notes
      }
    }));
  };

  const handleGeneralNotesChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    setMatrix(prev => ({
      ...prev,
      notes: e.target.value
    }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!id) return;
    
    try {
      setSaving(true);
      setSuccessMessage(null);
      setError(null);
      
      await planAPI.updateIFMMatrix(id as string, matrix);
      
      setSuccessMessage('Matriz IFM salva com sucesso!');
      
      // Após o salvamento bem-sucedido, redirecionamos para a próxima etapa
      setTimeout(() => {
        router.push(`/plans/${id}/final`);
      }, 1500);
      
    } catch (err: any) {
      setError('Erro ao salvar matriz IFM: ' + (err.message || 'Tente novamente mais tarde'));
      console.error('Error saving IFM matrix:', err);
    } finally {
      setSaving(false);
    }
  };

  // Retorna a descrição de cada nó da matriz IFM
  const getNodeDescription = (category: keyof Omit<IFMMatrix, 'notes'>) => {
    const descriptions: Record<keyof Omit<IFMMatrix, 'notes'>, string> = {
      assimilation: 'Digestão, absorção de nutrientes e função do microbioma intestinal.',
      defense_repair: 'Imunidade, inflamação, cicatrização e mecanismos de reparo celular.',
      energy: 'Produção de energia celular, função mitocondrial e metabolismo.',
      biotransformation_elimination: 'Detoxificação, metabolismo de hormônios e eliminação de toxinas.',
      transport: 'Circulação, transporte de nutrientes e oxigênio para as células.',
      communication: 'Equilíbrio hormonal, neurotransmissores e sinalização celular.',
      structural_integrity: 'Integridade de membranas celulares, tecidos e estruturas corporais.'
    };
    
    return descriptions[category];
  };
  
  // Retorna o impacto total de uma categoria
  const getCategoryImpact = (category: keyof Omit<IFMMatrix, 'notes'>) => {
    if (!matrix[category] || !matrix[category].items) return 0;
    return matrix[category].items.reduce((sum, item) => sum + (item?.value || 0), 0);
  };
  
  const renderValueSelector = (category: keyof Omit<IFMMatrix, 'notes'>, index: number, value: 0 | 1 | 2 | 3) => {
    return (
      <div className="flex space-x-1">
        {[0, 1, 2, 3].map((val) => (
          <button
            key={val}
            type="button"
            onClick={() => handleItemValueChange(category, index, val as 0 | 1 | 2 | 3)}
            className={`w-8 h-8 rounded-full flex items-center justify-center text-xs font-medium
              ${value === val 
                ? 'bg-primary-600 text-white' 
                : 'bg-gray-100 text-gray-700 hover:bg-gray-200'}`}
          >
            {val}
          </button>
        ))}
      </div>
    );
  };

  if (authLoading || loading) {
    return (
      <Layout title="Carregando Matriz IFM - Lyz">
        <div className="flex justify-center py-20">
          <div className="text-center">
            <div className="spinner-border h-10 w-10 text-primary-600 animate-spin"></div>
            <p className="mt-4 text-lg text-gray-600">Carregando dados...</p>
          </div>
        </div>
      </Layout>
    );
  }

  if (!user) {
    return null; // Will redirect to login
  }

  if (error && (!plan || (!plan.lab_results || !plan.tcm_observations || !plan.timeline_data))) {
    return (
      <Layout title="Etapa Anterior Pendente - Lyz">
        <div className="max-w-3xl mx-auto px-4 py-10">
          <div className="bg-yellow-50 p-6 rounded-lg">
            <h2 className="text-lg font-medium text-yellow-700 mb-2">Etapa anterior pendente</h2>
            <p className="text-yellow-600 mb-4">{error}</p>
            <div className="mt-4 flex flex-wrap gap-3">
              {/* Questionário removido */}
              {!plan?.lab_results && (
                <Link href={`/plans/${id}/lab`} className="btn-primary">
                  Ir para Resultados Laboratoriais
                </Link>
              )}
              {plan?.lab_results && !plan?.tcm_observations && (
                <Link href={`/plans/${id}/tcm`} className="btn-primary">
                  Ir para Observações TCM
                </Link>
              )}
              {plan?.lab_results && plan?.tcm_observations && !plan?.timeline_data && (
                <Link href={`/plans/${id}/timeline`} className="btn-primary">
                  Ir para Timeline
                </Link>
              )}
              <Link href={`/plans/${id}`} className="btn-outline">
                Voltar ao Plano
              </Link>
            </div>
          </div>
        </div>
      </Layout>
    );
  }

  return (
    <Layout title="Matriz IFM - Lyz">
      <div className="max-w-6xl mx-auto px-4 py-10">
        <div className="mb-6 flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-primary" data-component-name="IFMMatrixPage">Matriz IFM</h1>
            <p className="text-sm text-gray-500 mt-1">
              Paciente: {plan?.patient_data?.name || ''}
            </p>
          </div>
          <Link href={`/plans/${id}`} className="btn-outline">
            Voltar ao Plano
          </Link>
        </div>

        {successMessage && (
          <div className="mb-6 bg-green-50 p-4 rounded-md">
            <p className="text-green-700">{successMessage}</p>
          </div>
        )}

        {error && plan?.lab_results && plan?.tcm_observations && plan?.timeline_data && (
          <div className="mb-6 bg-red-50 p-4 rounded-md">
            <p className="text-red-700">{error}</p>
          </div>
        )}

        <div className="bg-white shadow-sm rounded-lg p-6">
          <div className="mb-6">
            <h2 className="text-lg font-medium text-gray-900 mb-2">Legenda</h2>
            <div className="flex flex-wrap gap-4 text-sm">
              <div className="flex items-center">
                <div className="w-6 h-6 rounded-full bg-gray-100 flex items-center justify-center text-xs font-medium mr-2">0</div>
                <span>Sem impacto</span>
              </div>
              <div className="flex items-center">
                <div className="w-6 h-6 rounded-full bg-green-100 flex items-center justify-center text-xs font-medium mr-2">1</div>
                <span>Impacto leve</span>
              </div>
              <div className="flex items-center">
                <div className="w-6 h-6 rounded-full bg-yellow-100 flex items-center justify-center text-xs font-medium mr-2">2</div>
                <span>Impacto moderado</span>
              </div>
              <div className="flex items-center">
                <div className="w-6 h-6 rounded-full bg-red-100 flex items-center justify-center text-xs font-medium mr-2">3</div>
                <span>Impacto severo</span>
              </div>
            </div>
          </div>

          {/* Botão para iniciar análise da matriz */}
          {!showAnalysis && (
            <div className="mb-6 bg-white p-4 rounded-lg border border-gray-200 shadow-sm">
              <div className="flex justify-between items-center mb-2">
                <h3 className="text-lg font-medium text-gray-900">Análise Inteligente da Matriz IFM</h3>
              </div>
              <p className="text-sm text-gray-600 mb-4">
                Utilize a IA para analisar os dados coletados até agora e preencher a matriz IFM automaticamente, com foco em ciclicidade feminina.
              </p>
              <div className="flex space-x-3">
                <button
                  type="button"
                  onClick={startMatrixAnalysis}
                  className="btn-primary flex items-center space-x-2"
                >
                  <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
                    <path fillRule="evenodd" d="M11.3 1.046A1 1 0 0112 2v5h4a1 1 0 01.82 1.573l-7 10A1 1 0 018 18v-5H4a1 1 0 01-.82-1.573l7-10a1 1 0 011.12-.38z" clipRule="evenodd" />
                  </svg>
                  <span>Iniciar Análise Automática</span>
                </button>
                <button
                  type="button"
                  onClick={() => setShowAnalysis(false)}
                  className="btn-outline"
                >
                  Preencher Manualmente
                </button>
              </div>
            </div>
          )}
          
          {/* Componente de análise */}
          <AnimatePresence>
            {showAnalysis && (
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -20 }}
                transition={{ duration: 0.3 }}
                className="mb-6"
              >
                <IFMMatrixSimpleAnalysis
                  analyzeMatrix={analyzeMatrix}
                  patientData={plan?.patient_data}
                  labResults={plan?.lab_results}
                  tcmObservations={plan?.tcm_observations}
                  timelineData={plan?.timeline_data}
                  currentMatrix={matrix}
                  focus={analysisFocus}
                  isAnalyzing={isAnalyzing}
                  onAnalysisComplete={handleAnalysisComplete}
                />
              </motion.div>
            )}
          </AnimatePresence>
          
          <form onSubmit={handleSubmit}>
            <div className="space-y-8">
              {(Object.keys(matrix) as Array<keyof IFMMatrix>).filter(key => key !== 'notes').map((category) => (
                <div key={category} className="border border-gray-200 rounded-md p-4 bg-white shadow-sm">
                  <h3 className="text-lg font-medium text-gray-900 mb-2 flex items-center">
                    <span className="mr-2">{matrix[category].name}</span>
                    <span className="bg-blue-100 text-blue-800 text-xs px-2 py-1 rounded-full">
                      {matrix[category].items.filter(i => i.value > 0).length} de {matrix[category].items.length} fatores
                    </span>
                  </h3>
                  <p className="text-sm text-gray-500 mb-4">{getNodeDescription(category)}</p>
                  
                  <div className="overflow-x-auto">
                    <table className="min-w-full divide-y divide-gray-200">
                      <thead className="bg-gray-50">
                        <tr>
                          <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                            Fator Funcional
                          </th>
                          <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                            Nível de Impacto
                          </th>
                        </tr>
                      </thead>
                      <tbody className="bg-white divide-y divide-gray-100">
                        {matrix[category].items.map((item, index) => (
                          <tr key={index} className={item.value > 0 ? 'bg-yellow-50' : ''}>
                            <td className="px-6 py-3 text-sm font-medium text-gray-900">
                              {item.name}
                            </td>
                            <td className="px-6 py-3">
                              {renderValueSelector(category, index, item.value)}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                  
                  <div className="mt-4">
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Observações sobre {matrix[category].name}
                    </label>
                    <textarea
                      value={matrix[category].notes}
                      onChange={(e) => handleCategoryNotesChange(category, e.target.value)}
                      rows={2}
                      className="w-full border border-gray-300 rounded-md px-3 py-2 focus:outline-none focus:ring-2 focus:ring-primary-500"
                      placeholder={`Observações sobre ${matrix[category].name.toLowerCase()}`}
                    />
                  </div>
                </div>
              ))}

              <div>
                <h3 className="text-lg font-medium text-gray-900 mb-4">Observações Gerais</h3>
                <textarea
                  value={matrix.notes}
                  onChange={handleGeneralNotesChange}
                  rows={4}
                  className="w-full border border-gray-300 rounded-md px-3 py-2 focus:outline-none focus:ring-2 focus:ring-primary-500"
                  placeholder="Observações gerais sobre a matriz IFM e suas implicações para o plano de tratamento"
                />
              </div>
            </div>

            {/* Resumo visual da matriz */}
            <div className="mt-8 mb-4 p-4 bg-white rounded-lg border border-gray-200 shadow-sm">
              <h3 className="text-lg font-medium text-gray-900 mb-3">Resumo Visual da Matriz IFM</h3>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-3 mb-4">
                {(Object.keys(matrix) as Array<keyof Omit<IFMMatrix, 'notes'>>)
                  .filter(category => matrix[category] && matrix[category].items)
                  .map(category => {
                  const totalImpact = getCategoryImpact(category);
                  const maxPossibleImpact = (matrix[category]?.items?.length || 1) * 3;
                  const impactPercentage = Math.round((totalImpact / maxPossibleImpact) * 100);
                  
                  let barColor = 'bg-gray-300';
                  if (impactPercentage > 70) barColor = 'bg-red-500';
                  else if (impactPercentage > 50) barColor = 'bg-orange-500';
                  else if (impactPercentage > 30) barColor = 'bg-yellow-500';
                  else if (impactPercentage > 0) barColor = 'bg-green-500';
                  
                  return (
                    <div key={category} className="bg-gray-50 rounded-lg p-3 border border-gray-200">
                      <div className="flex justify-between items-center mb-1">
                        <div className="text-sm font-medium text-gray-700">{matrix[category].name}</div>
                        <div className="text-xs text-gray-500">{impactPercentage}%</div>
                      </div>
                      <div className="w-full bg-gray-200 rounded-full h-2.5">
                        <div 
                          className={`h-2.5 rounded-full ${barColor}`}
                          style={{ width: `${impactPercentage}%` }}
                        ></div>
                      </div>
                      <div className="mt-1 text-xs text-right text-gray-500">
                        {totalImpact}/{maxPossibleImpact} pontos
                      </div>
                    </div>
                  );
                })}
              </div>
              <div className="text-xs text-gray-500 italic">
                Visualização do impacto em cada nó da matriz IFM com base nas seleções feitas acima.
              </div>
            </div>
            
            <div className="mt-4 flex justify-end space-x-4">
              <Link 
                href={`/plans/${id}`}
                className="btn-outline"
              >
                Cancelar
              </Link>
              <button
                type="submit"
                disabled={saving}
                className="btn-primary"
              >
                {saving ? 'Salvando...' : 'Salvar e Continuar'}
              </button>
            </div>
          </form>
        </div>
      </div>
    </Layout>
  );
};

export default IFMMatrixPage;
