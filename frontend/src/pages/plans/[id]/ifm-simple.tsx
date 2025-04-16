import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/router';
import Link from 'next/link';
import Layout from '../../../components/Layout';
import { useAuth } from '../../../contexts/AuthContext';
import { planAPI } from '../../../lib/api';
import IFMMatrixCard from '../../../components/ifm/IFMMatrixCard';

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
  lab_results?: any;
  tcm_observations?: any;
  timeline_data?: any;
  ifm_matrix?: IFMMatrix;
  professional_type: string;
};

// Matriz padrão com categorias completas
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

// Descrições das categorias
const categoryDescriptions = {
  assimilation: 'Digestão, absorção de nutrientes e função do microbioma intestinal.',
  defense_repair: 'Imunidade, inflamação, cicatrização e mecanismos de reparo celular.',
  energy: 'Produção de energia celular, função mitocondrial e metabolismo.',
  biotransformation_elimination: 'Detoxificação, metabolismo de hormônios e eliminação de toxinas.',
  transport: 'Circulação, transporte de nutrientes e oxigênio para as células.',
  communication: 'Equilíbrio hormonal, neurotransmissores e sinalização celular.',
  structural_integrity: 'Integridade de membranas celulares, tecidos e estruturas corporais.'
};

const IFMMatrixSimplePage: React.FC = () => {
  const { user, loading: authLoading } = useAuth();
  const router = useRouter();
  const { id } = router.query;
  
  const [plan, setPlan] = useState<PlanData | null>(null);
  const [matrix, setMatrix] = useState<IFMMatrix>(defaultMatrix);
  
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  // Busca os dados do plano quando o componente é montado
  useEffect(() => {
    if (!user && !authLoading) {
      router.push('/login');
      return;
    }
    
    if (id && !loading) {
      fetchPlanDetails();
    }
  }, [id, user, authLoading]);

  // Busca os detalhes do plano
  const fetchPlanDetails = async () => {
    try {
      setLoading(true);
      
      const response = await planAPI.getPlanById(id as string);
      const planData = response.data;
      
      setPlan(planData);
      
      // Se o plano já tem dados da matriz IFM, carregamos eles
      if (planData.ifm_matrix) {
        // Verifica se todos os itens existem na matriz IFM do plano
        // Se não existirem (por exemplo, se a matriz foi criada com uma versão antiga),
        // preenchemos com os itens padrão
        const updatedMatrix = { ...defaultMatrix };
        
        // Para cada categoria na matriz do plano
        Object.keys(planData.ifm_matrix).forEach(key => {
          if (key !== 'notes') {
            const category = key as keyof Omit<IFMMatrix, 'notes'>;
            
            if (planData.ifm_matrix && planData.ifm_matrix[category]) {
              updatedMatrix[category].notes = planData.ifm_matrix[category].notes || '';
              
              // Para cada item na categoria padrão
              updatedMatrix[category].items = updatedMatrix[category].items.map(defaultItem => {
                // Procuramos o item correspondente na matriz do plano
                const existingItem = planData.ifm_matrix && 
                                     planData.ifm_matrix[category] && 
                                     planData.ifm_matrix[category].items.find((i: any) => i.name === defaultItem.name);
                
                // Se encontrarmos, usamos o valor dele, senão mantemos o padrão
                return existingItem ? { ...defaultItem, value: existingItem.value } : defaultItem;
              });
            }
          }
        });
        
        // Atualiza as notas gerais
        updatedMatrix.notes = planData.ifm_matrix.notes || '';
        
        setMatrix(updatedMatrix);
      }
      
    } catch (err: any) {
      console.error('Error fetching plan details:', err);
      setError('Erro ao carregar detalhes do plano: ' + (err.message || 'Tente novamente mais tarde'));
    } finally {
      setLoading(false);
    }
  };
  
  // Manipuladores de alteração de valor
  const handleItemValueChange = (category: keyof Omit<IFMMatrix, 'notes'>, index: number, value: 0 | 1 | 2 | 3) => {
    setMatrix(prev => {
      const updated = { ...prev };
      updated[category] = {
        ...updated[category],
        items: updated[category].items.map((item, i) => 
          i === index ? { ...item, value } : item
        )
      };
      return updated;
    });
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
  
  // Calcula o impacto total de uma categoria
  const getCategoryImpact = (category: keyof Omit<IFMMatrix, 'notes'>) => {
    if (!matrix[category]) return 0;
    return matrix[category].items.reduce((sum, item) => sum + item.value, 0);
  };
  
  // Submit
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!id) return;
    
    try {
      setSaving(true);
      setSuccessMessage(null);
      setError(null);
      
      // Importante: seguindo o padrão da API do sistema Lyz,
      // enviamos os dados da matriz IFM dentro do objeto { ifm_matrix: data }
      await planAPI.updateIFMMatrix(id as string, matrix);
      
      setSuccessMessage('Matriz IFM salva com sucesso!');
      
      // Redirecionamos para a próxima etapa após o salvamento
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
  
  // Renderiza a aplicação completa
  return (
    <Layout>
      <div className="flex flex-col min-h-screen bg-gray-50">
        <div className="container mx-auto px-4 py-8 max-w-5xl">
          <div className="flex justify-between items-center mb-6">
            <h1 className="text-2xl font-bold text-gray-900">Matriz IFM - Modelo Simplificado</h1>
            {plan && (
              <p className="text-gray-600">
                Paciente: <span className="font-medium">{plan.patient_data.name}</span>
              </p>
            )}
          </div>
          
          {loading ? (
            <div className="flex justify-center items-center h-64">
              <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-primary-600"></div>
            </div>
          ) : error ? (
            <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-md mb-6">
              {error}
            </div>
          ) : (
            <>
              {successMessage && (
                <div className="bg-green-50 border border-green-200 text-green-700 px-4 py-3 rounded-md mb-6">
                  {successMessage}
                </div>
              )}
              
              <p className="text-gray-600 mb-6">
                Complete a Matriz de Medicina Funcional abaixo, classificando o nível de impacto de cada fator na saúde do paciente. 
                O foco é na ciclicidade feminina.
              </p>
              
              <div className="mb-6">
                <div className="bg-white border border-gray-200 rounded-lg p-4 shadow-sm mb-4">
                  <h3 className="text-lg font-medium text-gray-900 mb-2">Guia de Níveis de Impacto</h3>
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                    <div className="flex items-center">
                      <div className="w-6 h-6 rounded-full bg-gray-100 flex items-center justify-center text-xs font-medium mr-2">0</div>
                      <span>Sem impacto</span>
                    </div>
                    <div className="flex items-center">
                      <div className="w-6 h-6 rounded-full bg-yellow-100 flex items-center justify-center text-xs font-medium mr-2">1</div>
                      <span>Impacto leve</span>
                    </div>
                    <div className="flex items-center">
                      <div className="w-6 h-6 rounded-full bg-orange-100 flex items-center justify-center text-xs font-medium mr-2">2</div>
                      <span>Impacto moderado</span>
                    </div>
                    <div className="flex items-center">
                      <div className="w-6 h-6 rounded-full bg-red-100 flex items-center justify-center text-xs font-medium mr-2">3</div>
                      <span>Impacto severo</span>
                    </div>
                  </div>
                </div>
              </div>
              
              <form onSubmit={handleSubmit}>
                {/* Renderizamos cada categoria como um card separado */}
                {(Object.keys(matrix) as Array<keyof IFMMatrix>)
                  .filter(category => category !== 'notes')
                  .map((category) => (
                    <IFMMatrixCard 
                      key={category} 
                      category={matrix[category]} 
                      description={categoryDescriptions[category]}
                      onValueChange={(index, value) => handleItemValueChange(category, index, value)}
                      onNotesChange={(notes) => handleCategoryNotesChange(category, notes)}
                    />
                  ))}
                
                {/* Observações gerais */}
                <div className="mb-8">
                  <h3 className="text-lg font-medium text-gray-900 mb-4">Observações Gerais</h3>
                  <textarea
                    value={matrix.notes}
                    onChange={handleGeneralNotesChange}
                    rows={4}
                    className="w-full border border-gray-300 rounded-md px-3 py-2 focus:outline-none focus:ring-2 focus:ring-primary-500"
                    placeholder="Observações gerais sobre a matriz IFM e suas implicações para o plano de tratamento"
                  />
                </div>
                
                {/* Resumo visual da matriz */}
                <div className="mt-8 mb-4 p-4 bg-white rounded-lg border border-gray-200 shadow-sm">
                  <h3 className="text-lg font-medium text-gray-900 mb-3">Resumo Visual da Matriz IFM</h3>
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-3 mb-4">
                    {(Object.keys(matrix) as Array<keyof Omit<IFMMatrix, 'notes'>>).map(category => {
                      const totalImpact = getCategoryImpact(category);
                      const maxPossibleImpact = matrix[category].items.length * 3;
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
            </>
          )}
        </div>
      </div>
    </Layout>
  );
};

export default IFMMatrixSimplePage;
