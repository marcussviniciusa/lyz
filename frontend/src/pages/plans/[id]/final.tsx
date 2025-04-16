import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/router';
import Link from 'next/link';
import Layout from '../../../components/Layout';
import { useAuth } from '../../../contexts/AuthContext';
import { planAPI } from '../../../lib/api';
import FinalPlanDisplay, { FinalPlanType } from '../../../components/plans/FinalPlanDisplay';
import { FiTrash2 } from 'react-icons/fi';

type FinalPlan = {
  diagnosis: string;
  treatment_plan: string;
  nutritional_recommendations: {
    foods_to_include: string;
    foods_to_avoid: string;
    meal_timing: string;
    supplements: string;
  };
  lifestyle_recommendations: {
    exercise: string;
    sleep: string;
    stress_management: string;
    other: string;
  };
  follow_up: string;
  additional_notes: string;
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
  ifm_matrix?: any;
  final_plan?: FinalPlan;
  professional_type: string;
};

const FinalPlanPage: React.FC = () => {
  const { user, loading: authLoading } = useAuth();
  const router = useRouter();
  const { id } = router.query;
  
  const [plan, setPlan] = useState<PlanData | null>(null);
  const [editMode, setEditMode] = useState(false);
  const [finalPlan, setFinalPlan] = useState<FinalPlan>({
    diagnosis: '',
    treatment_plan: '',
    nutritional_recommendations: {
      foods_to_include: '',
      foods_to_avoid: '',
      meal_timing: '',
      supplements: '',
    },
    lifestyle_recommendations: {
      exercise: '',
      sleep: '',
      stress_management: '',
      other: '',
    },
    follow_up: '',
    additional_notes: '',
  });
  
  const [loading, setLoading] = useState(true);
  const [generating, setGenerating] = useState(false);
  const [saving, setSaving] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  // Busca os dados do plano quando o componente é montado
  useEffect(() => {
    if (!user && !authLoading) {
      router.push('/auth/login');
    }
  }, [user, authLoading, router]);

  // Função para lidar com a exclusão do plano
  const handleDeletePlan = async () => {
    if (!window.confirm('Tem certeza que deseja excluir este plano? Esta ação não pode ser desfeita.')) {
      return;
    }
    
    setDeleting(true);
    setError(null);
    
    try {
      await planAPI.deletePlan(id as string);
      setSuccessMessage('Plano excluído com sucesso');
      // Redirecionar para a página de planos após a exclusão
      setTimeout(() => {
        router.push('/plans');
      }, 1500);
    } catch (err: any) {
      console.error('Erro ao excluir plano:', err);
      setError('Ocorreu um erro ao excluir o plano. Por favor, tente novamente.');
    } finally {
      setDeleting(false);
    }
  };

  useEffect(() => {
    const fetchPlanDetails = async () => {
      if (!id) return;
      
      try {
        setLoading(true);
        const response = await planAPI.getPlanById(id as string);
        const planData = response.data.plan || null;
        
        setPlan(planData);
        
        // Se já existe um plano final, preenche o formulário com validação robusta
        if (planData?.final_plan) {
          // Criar um objeto validado com todos os campos necessários
          const validatedPlan: FinalPlan = {
            diagnosis: planData.final_plan.diagnosis || '',
            treatment_plan: planData.final_plan.treatment_plan || '',
            nutritional_recommendations: {
              foods_to_include: planData.final_plan.nutritional_recommendations?.foods_to_include || '',
              foods_to_avoid: planData.final_plan.nutritional_recommendations?.foods_to_avoid || '',
              meal_timing: planData.final_plan.nutritional_recommendations?.meal_timing || '',
              supplements: planData.final_plan.nutritional_recommendations?.supplements || ''
            },
            lifestyle_recommendations: {
              exercise: planData.final_plan.lifestyle_recommendations?.exercise || '',
              sleep: planData.final_plan.lifestyle_recommendations?.sleep || '',
              stress_management: planData.final_plan.lifestyle_recommendations?.stress_management || '',
              other: planData.final_plan.lifestyle_recommendations?.other || ''
            },
            follow_up: planData.final_plan.follow_up || '',
            additional_notes: planData.final_plan.additional_notes || ''
          };
          
          setFinalPlan(validatedPlan);
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
      const missingSteps = [];
      
      // Questionário removido
      if (!plan.lab_results) missingSteps.push('resultados laboratoriais');
      if (!plan.tcm_observations) missingSteps.push('observações TCM');
      if (!plan.timeline_data) missingSteps.push('timeline');
      if (!plan.ifm_matrix) missingSteps.push('matriz IFM');
      
      if (missingSteps.length > 0) {
        setError(`É necessário preencher: ${missingSteps.join(', ')} antes de gerar o plano final.`);
      }
    }
  }, [plan]);

  // Handlers para atualizar o estado do plano
  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target;
    
    if (name.includes('.')) {
      const [section, subsection] = name.split('.');
      
      // Garantir que o objeto base esteja inicializado
      setFinalPlan(prev => {
        // Criar uma cópia segura do objeto atual
        const safePlan = {
          ...prev,
          nutritional_recommendations: prev.nutritional_recommendations || {
            foods_to_include: '',
            foods_to_avoid: '',
            meal_timing: '',
            supplements: ''
          },
          lifestyle_recommendations: prev.lifestyle_recommendations || {
            exercise: '',
            sleep: '',
            stress_management: '',
            other: ''
          }
        };
        
        // Agora podemos modificar o objeto com segurança
        return {
          ...safePlan,
          [section]: {
            ...safePlan[section as keyof FinalPlan] as any,
            [subsection]: value
          }
        };
      });
    } else {
      setFinalPlan(prev => ({
        ...prev,
        [name]: value
      }));
    }
  };

  const handleGeneratePlan = async () => {
    if (!id) return;
    
    try {
      setGenerating(true);
      setError(null);
      
      const response = await planAPI.generatePlan(id as string);
      setEditMode(false);
      
      // Verificar se temos uma resposta válida
      if (response.data && (response.data.plan?.final_plan || response.data.final_plan)) {
        // Obter o plano final da resposta (pode estar em response.data.plan.final_plan ou response.data.final_plan)
        const generatedPlan = response.data.plan?.final_plan || response.data.final_plan;
        
        // Atualizar o plan também para que apareça na visualização estruturada
        if (plan) {
          setPlan({
            ...plan,
            final_plan: generatedPlan
          });  
        }
        
        // Garantir que o plano tem a estrutura correta
        const validPlan: FinalPlan = {
          diagnosis: generatedPlan.diagnosis || '',
          treatment_plan: generatedPlan.treatment_plan || '',
          nutritional_recommendations: {
            foods_to_include: generatedPlan.nutritional_recommendations?.foods_to_include || '',
            foods_to_avoid: generatedPlan.nutritional_recommendations?.foods_to_avoid || '',
            meal_timing: generatedPlan.nutritional_recommendations?.meal_timing || '',
            supplements: generatedPlan.nutritional_recommendations?.supplements || ''
          },
          lifestyle_recommendations: {
            exercise: generatedPlan.lifestyle_recommendations?.exercise || '',
            sleep: generatedPlan.lifestyle_recommendations?.sleep || '',
            stress_management: generatedPlan.lifestyle_recommendations?.stress_management || '',
            other: generatedPlan.lifestyle_recommendations?.other || ''
          },
          follow_up: generatedPlan.follow_up || '',
          additional_notes: generatedPlan.additional_notes || ''
        };
        
        setFinalPlan(validPlan);
        setSuccessMessage('Plano gerado com sucesso!');
      } else {
        setError('Não foi possível gerar o plano. Tente novamente mais tarde.');
        console.error('Resposta inválida da API:', response.data);
      }
    } catch (err: any) {
      setError('Erro ao gerar plano: ' + (err.message || 'Tente novamente mais tarde'));
      console.error('Error generating plan:', err);
    } finally {
      setGenerating(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!id) return;
    
    try {
      setSaving(true);
      setSuccessMessage(null);
      setError(null);
      
      // Validar o objeto finalPlan para garantir que tem todos os campos necessários
      const validPlan: FinalPlan = {
        diagnosis: finalPlan.diagnosis || '',
        treatment_plan: finalPlan.treatment_plan || '',
        nutritional_recommendations: {
          foods_to_include: finalPlan.nutritional_recommendations?.foods_to_include || '',
          foods_to_avoid: finalPlan.nutritional_recommendations?.foods_to_avoid || '',
          meal_timing: finalPlan.nutritional_recommendations?.meal_timing || '',
          supplements: finalPlan.nutritional_recommendations?.supplements || ''
        },
        lifestyle_recommendations: {
          exercise: finalPlan.lifestyle_recommendations?.exercise || '',
          sleep: finalPlan.lifestyle_recommendations?.sleep || '',
          stress_management: finalPlan.lifestyle_recommendations?.stress_management || '',
          other: finalPlan.lifestyle_recommendations?.other || ''
        },
        follow_up: finalPlan.follow_up || '',
        additional_notes: finalPlan.additional_notes || ''
      };
      
      // O endpoint já está configurado no api.ts para encapsular os dados em { final_plan: data }
      await planAPI.updateFinalPlan(id as string, validPlan);
      
      setSuccessMessage('Plano final salvo com sucesso!');
      
      // Após o salvamento bem-sucedido, redirecionamos para a visualização do plano
      setTimeout(() => {
        router.push(`/plans/${id}`);
      }, 1500);
      
    } catch (err: any) {
      setError('Erro ao salvar plano final: ' + (err.message || 'Tente novamente mais tarde'));
      console.error('Error saving final plan:', err);
    } finally {
      setSaving(false);
    }
  };

  if (authLoading || loading) {
    return (
      <Layout title="Carregando Plano Final - Lyz">
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

  // Verifica se todas as etapas anteriores foram preenchidas
  const missingPreviousSteps = !plan || (!plan.lab_results || !plan.tcm_observations || !plan.timeline_data || !plan.ifm_matrix);

  if (error && missingPreviousSteps) {
    return (
      <Layout title="Etapa Anterior Pendente - Lyz">
        <div className="max-w-3xl mx-auto px-4 py-10">
          <div className="bg-yellow-50 p-6 rounded-lg">
            <h2 className="text-lg font-medium text-yellow-700 mb-2">Etapas anteriores pendentes</h2>
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
              {plan?.lab_results && plan?.tcm_observations && plan?.timeline_data && !plan?.ifm_matrix && (
                <Link href={`/plans/${id}/ifm`} className="btn-primary">
                  Ir para Matriz IFM
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
    <Layout title="Plano Final - Lyz">
      <div className="max-w-5xl mx-auto px-4 py-10">
        <div className="mb-6 flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-primary" data-component-name="FinalPlanPage">Plano Final</h1>
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

        {error && !missingPreviousSteps && (
          <div className="mb-6 bg-red-50 p-4 rounded-md">
            <p className="text-red-700">{error}</p>
          </div>
        )}

        <div className="bg-white shadow-sm rounded-lg overflow-hidden">
          <div className="p-6 border-b border-gray-200">
            <div className="flex justify-between items-center">
              <h2 className="text-xl font-semibold text-gray-900">Geração do Plano</h2>
              
              <div className="flex items-center space-x-2">
                {plan?.final_plan && !editMode && (
                  <button
                    type="button"
                    onClick={() => setEditMode(true)}
                    className="btn-outline"
                  >
                    Editar Plano
                  </button>
                )}
                
                <button
                  type="button"
                  onClick={handleGeneratePlan}
                  disabled={generating || missingPreviousSteps}
                  className={`btn-primary ${(generating || missingPreviousSteps) ? 'opacity-50 cursor-not-allowed' : ''}`}
                >
                  {generating ? 'Gerando...' : 'Gerar Plano com IA'}
                </button>
                
                <button
                  type="button"
                  onClick={handleDeletePlan}
                  disabled={deleting}
                  className="px-4 py-2 bg-red-600 text-white rounded flex items-center hover:bg-red-700 transition-colors"
                  title="Excluir Plano"
                >
                  <FiTrash2 className="mr-1" />
                  {deleting ? 'Excluindo...' : 'Excluir'}
                </button>
              </div>
            </div>
            
            <p className="mt-2 text-sm text-gray-500">
              Clique no botão para gerar automaticamente um plano baseado em todas as informações fornecidas anteriormente. Você poderá editar o plano gerado conforme necessário.
            </p>
          </div>
          
          {!editMode && plan?.final_plan ? (
            // Modo de visualização estruturada
            <div className="p-6">
              <FinalPlanDisplay 
                plan={plan.final_plan}
                patientName={plan.patient_data?.name || 'Paciente'}
                showEditButton={true}
                onEdit={() => setEditMode(true)}
              />
            </div>
          ) : (
            // Modo de edição
            <form onSubmit={handleSubmit} className="p-6">
            <div className="space-y-8">
              <div>
                <h3 className="text-lg font-medium text-gray-900 mb-4">Diagnóstico</h3>
                <textarea
                  name="diagnosis"
                  value={finalPlan.diagnosis}
                  onChange={handleInputChange}
                  rows={4}
                  className="w-full border border-gray-300 rounded-md px-3 py-2 focus:outline-none focus:ring-2 focus:ring-primary-500"
                  placeholder="Diagnóstico funcional integrado baseado em todas as análises"
                />
              </div>
              
              <div>
                <h3 className="text-lg font-medium text-gray-900 mb-4">Plano de Tratamento</h3>
                <textarea
                  name="treatment_plan"
                  value={finalPlan.treatment_plan}
                  onChange={handleInputChange}
                  rows={6}
                  className="w-full border border-gray-300 rounded-md px-3 py-2 focus:outline-none focus:ring-2 focus:ring-primary-500"
                  placeholder="Visão geral da abordagem terapêutica e intervenções principais"
                />
              </div>
              
              <div>
                <h3 className="text-lg font-medium text-gray-900 mb-4">Recomendações Nutricionais</h3>
                
                <div className="space-y-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Alimentos a Incluir
                    </label>
                    <textarea
                      name="nutritional_recommendations.foods_to_include"
                      value={finalPlan.nutritional_recommendations?.foods_to_include || ''}
                      onChange={handleInputChange}
                      rows={3}
                      className="w-full border border-gray-300 rounded-md px-3 py-2 focus:outline-none focus:ring-2 focus:ring-primary-500"
                      placeholder="Alimentos recomendados e seus benefícios"
                    />
                  </div>
                  
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Alimentos a Evitar
                    </label>
                    <textarea
                      name="nutritional_recommendations.foods_to_avoid"
                      value={finalPlan.nutritional_recommendations?.foods_to_avoid || ''}
                      onChange={handleInputChange}
                      rows={3}
                      className="w-full border border-gray-300 rounded-md px-3 py-2 focus:outline-none focus:ring-2 focus:ring-primary-500"
                      placeholder="Alimentos a serem limitados ou evitados"
                    />
                  </div>
                  
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Frequência e Horário das Refeições
                    </label>
                    <textarea
                      name="nutritional_recommendations.meal_timing"
                      value={finalPlan.nutritional_recommendations?.meal_timing || ''}
                      onChange={handleInputChange}
                      rows={2}
                      className="w-full border border-gray-300 rounded-md px-3 py-2 focus:outline-none focus:ring-2 focus:ring-primary-500"
                      placeholder="Orientações sobre frequência, horário e estrutura das refeições"
                    />
                  </div>
                  
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Suplementos
                    </label>
                    <textarea
                      name="nutritional_recommendations.supplements"
                      value={finalPlan.nutritional_recommendations?.supplements || ''}
                      onChange={handleInputChange}
                      rows={3}
                      className="w-full border border-gray-300 rounded-md px-3 py-2 focus:outline-none focus:ring-2 focus:ring-primary-500"
                      placeholder="Suplementos recomendados, dosagens e justificativas"
                    />
                  </div>
                </div>
              </div>
              
              <div>
                <h3 className="text-lg font-medium text-gray-900 mb-4">Recomendações de Estilo de Vida</h3>
                
                <div className="space-y-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Exercícios
                    </label>
                    <textarea
                      name="lifestyle_recommendations.exercise"
                      value={finalPlan.lifestyle_recommendations?.exercise || ''}
                      onChange={handleInputChange}
                      rows={2}
                      className="w-full border border-gray-300 rounded-md px-3 py-2 focus:outline-none focus:ring-2 focus:ring-primary-500"
                      placeholder="Recomendações sobre atividade física e movimento"
                    />
                  </div>
                  
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Sono
                    </label>
                    <textarea
                      name="lifestyle_recommendations.sleep"
                      value={finalPlan.lifestyle_recommendations?.sleep || ''}
                      onChange={handleInputChange}
                      rows={2}
                      className="w-full border border-gray-300 rounded-md px-3 py-2 focus:outline-none focus:ring-2 focus:ring-primary-500"
                      placeholder="Recomendações para melhorar a qualidade do sono"
                    />
                  </div>
                  
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Gerenciamento de Estresse
                    </label>
                    <textarea
                      name="lifestyle_recommendations.stress_management"
                      value={finalPlan.lifestyle_recommendations?.stress_management || ''}
                      onChange={handleInputChange}
                      rows={2}
                      className="w-full border border-gray-300 rounded-md px-3 py-2 focus:outline-none focus:ring-2 focus:ring-primary-500"
                      placeholder="Técnicas de redução de estresse e práticas de consciência plena"
                    />
                  </div>
                  
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Outras Recomendações
                    </label>
                    <textarea
                      name="lifestyle_recommendations.other"
                      value={finalPlan.lifestyle_recommendations?.other || ''}
                      onChange={handleInputChange}
                      rows={2}
                      className="w-full border border-gray-300 rounded-md px-3 py-2 focus:outline-none focus:ring-2 focus:ring-primary-500"
                      placeholder="Outras sugestões para melhorar a qualidade de vida"
                    />
                  </div>
                </div>
              </div>
              
              <div>
                <h3 className="text-lg font-medium text-gray-900 mb-4">Acompanhamento</h3>
                <textarea
                  name="follow_up"
                  value={finalPlan.follow_up}
                  onChange={handleInputChange}
                  rows={3}
                  className="w-full border border-gray-300 rounded-md px-3 py-2 focus:outline-none focus:ring-2 focus:ring-primary-500"
                  placeholder="Plano de acompanhamento, frequência de consultas e exames recomendados"
                />
              </div>
              
              <div>
                <h3 className="text-lg font-medium text-gray-900 mb-4">Observações Adicionais</h3>
                <textarea
                  name="additional_notes"
                  value={finalPlan.additional_notes}
                  onChange={handleInputChange}
                  rows={3}
                  className="w-full border border-gray-300 rounded-md px-3 py-2 focus:outline-none focus:ring-2 focus:ring-primary-500"
                  placeholder="Quaisquer outras informações ou recomendações relevantes"
                />
              </div>
            </div>

            <div className="mt-8 flex justify-end space-x-4">
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
                {saving ? 'Salvando...' : 'Salvar Plano'}
              </button>
            </div>
          </form>
          )}
        </div>
      </div>
    </Layout>
  );
};

export default FinalPlanPage;
