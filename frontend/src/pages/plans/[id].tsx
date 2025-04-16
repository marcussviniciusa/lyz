import React, { useEffect, useState } from 'react';
import { useRouter } from 'next/router';
import Link from 'next/link';
import Layout from '../../components/Layout';
import { useAuth } from '../../contexts/AuthContext';
import { planAPI } from '../../lib/api';

type PlanDetails = {
  id: string;
  user_id: number;
  company_id: number | null;
  patient_data: {
    name: string;
    age?: number;
    gender?: string;
    [key: string]: any;
  };
  // Removed questionnaire_data field
  lab_results?: any;
  tcm_observations?: any;
  timeline_data?: any;
  ifm_matrix?: any;
  final_plan?: any;
  professional_type: string;
  created_at: string;
  updated_at: string;
};

const getPlanStepStatus = (plan: PlanDetails, step: string) => {
  switch (step) {
    case 'patient':
      return { complete: true, current: false };
    // Questionário foi removido
    // case 'questionnaire':
    //   return { 
    //     complete: false, 
    //     current: false
    //   };
    case 'lab':
      return { 
        complete: !!plan.lab_results, 
        current: !plan.lab_results && !plan.tcm_observations
      };
    case 'tcm':
      return { 
        complete: !!plan.tcm_observations, 
        current: !!plan.lab_results && !plan.tcm_observations && !plan.timeline_data
      };
    case 'timeline':
      return { 
        complete: !!plan.timeline_data, 
        current: !!plan.tcm_observations && !plan.timeline_data && !plan.ifm_matrix
      };
    case 'ifm':
      return { 
        complete: !!plan.ifm_matrix, 
        current: !!plan.timeline_data && !plan.ifm_matrix && !plan.final_plan
      };
    case 'final':
      return { 
        complete: !!plan.final_plan, 
        current: !!plan.ifm_matrix && !plan.final_plan
      };
    default:
      return { complete: false, current: false };
  }
};

const PlanDetailsPage: React.FC = () => {
  const { user, loading: authLoading } = useAuth();
  const router = useRouter();
  const { id } = router.query;
  const [plan, setPlan] = useState<PlanDetails | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

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
        setPlan(response.data.plan || null);
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

  if (authLoading || loading) {
    return (
      <Layout title="Carregando Plano - Lyz">
        <div className="flex justify-center py-20">
          <div className="text-center">
            <div className="spinner-border h-10 w-10 text-primary-600 animate-spin"></div>
            <p className="mt-4 text-lg text-gray-600">Carregando detalhes do plano...</p>
          </div>
        </div>
      </Layout>
    );
  }

  if (!user) {
    return null; // Will redirect to login
  }

  if (error) {
    return (
      <Layout title="Erro - Lyz">
        <div className="max-w-3xl mx-auto px-4 py-10">
          <div className="bg-red-50 p-6 rounded-lg">
            <h2 className="text-lg font-medium text-red-700 mb-2">Ocorreu um erro</h2>
            <p className="text-red-600">{error}</p>
            <div className="mt-4">
              <Link href="/plans" className="text-primary-600 font-medium hover:text-primary-500">
                ← Voltar para a lista de planos
              </Link>
            </div>
          </div>
        </div>
      </Layout>
    );
  }

  if (!plan) {
    return (
      <Layout title="Plano não encontrado - Lyz">
        <div className="max-w-3xl mx-auto px-4 py-10">
          <div className="bg-yellow-50 p-6 rounded-lg">
            <h2 className="text-lg font-medium text-yellow-700 mb-2">Plano não encontrado</h2>
            <p className="text-yellow-600">O plano solicitado não foi encontrado ou você não tem permissão para acessá-lo.</p>
            <div className="mt-4">
              <Link href="/plans" className="text-primary-600 font-medium hover:text-primary-500">
                ← Voltar para a lista de planos
              </Link>
            </div>
          </div>
        </div>
      </Layout>
    );
  }

  const patientStatus = getPlanStepStatus(plan, 'patient');
  // Questionário foi removido
  // const questionnaireStatus = getPlanStepStatus(plan, 'questionnaire');
  const labStatus = getPlanStepStatus(plan, 'lab');
  const tcmStatus = getPlanStepStatus(plan, 'tcm');
  const timelineStatus = getPlanStepStatus(plan, 'timeline');
  const ifmStatus = getPlanStepStatus(plan, 'ifm');
  const finalStatus = getPlanStepStatus(plan, 'final');

  return (
    <Layout title={`Plano para ${plan.patient_data.name} - Lyz`}>
      <div className="py-6">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center mb-6">
            <div>
              <Link href="/plans" className="text-primary-600 hover:text-primary-700">
                ← Voltar para a lista de planos
              </Link>
              <div className="space-y-2">
                <h1 className="mt-2 text-2xl font-semibold text-gray-900 dark:text-white bg-transparent">
                  Plano para {plan.patient_data.name}
                </h1>
                <p className="text-base text-gray-800 dark:text-gray-200">
                  {plan.professional_type === 'nutritionist' ? 'Nutricionista' : 
                   plan.professional_type === 'doctor' ? 'Médico' : 
                   plan.professional_type}
                </p>
              </div>
            </div>
            {finalStatus.complete && (
              <button 
                onClick={() => planAPI.exportPlan(plan.id)}
                className="btn-secondary"
              >
                Exportar Plano
              </button>
            )}
          </div>

          <div className="bg-white shadow overflow-hidden rounded-lg">
            <div className="px-4 py-5 sm:px-6 bg-gray-50">
              <h3 className="text-lg leading-6 font-medium text-gray-900">
                Progresso do Plano
              </h3>
              <p className="mt-1 max-w-2xl text-sm text-gray-500">
                Complete todas as etapas para gerar o plano final.
              </p>
            </div>

            <div className="px-4 py-5 sm:p-6">
              <nav aria-label="Progress">
                <ol className="space-y-4 md:flex md:space-y-0 md:space-x-8">
                  <li className="md:flex-1">
                    <Link 
                      href={`/plans/${plan.id}`}
                      className={`flex flex-col border-l-4 ${patientStatus.complete 
                        ? 'border-green-500' 
                        : patientStatus.current 
                          ? 'border-primary-500' 
                          : 'border-gray-200'} py-2 pl-4`}
                    >
                      <span className={`text-xs font-semibold uppercase ${patientStatus.complete ? 'text-green-600' : 'text-gray-500'}`}>
                        Etapa 1
                      </span>
                      <span className="text-sm font-medium">Dados do Paciente</span>
                    </Link>
                  </li>

                  {/* O questionário foi removido */}

                  <li className="md:flex-1">
                    <Link 
                      href={`/plans/${plan.id}/lab`}
                      className={`flex flex-col border-l-4 ${labStatus.complete 
                        ? 'border-green-500' 
                        : labStatus.current 
                          ? 'border-primary-500' 
                          : 'border-gray-200'} py-2 pl-4`}
                    >
                      <span className={`text-xs font-semibold uppercase ${labStatus.complete ? 'text-green-600' : 'text-gray-500'}`}>
                        Etapa 2
                      </span>
                      <span className="text-sm font-medium">Resultados Lab</span>
                    </Link>
                  </li>

                  <li className="md:flex-1">
                    <Link 
                      href={`/plans/${plan.id}/tcm`}
                      className={`flex flex-col border-l-4 ${tcmStatus.complete 
                        ? 'border-green-500' 
                        : tcmStatus.current 
                          ? 'border-primary-500' 
                          : 'border-gray-200'} py-2 pl-4`}
                    >
                      <span className={`text-xs font-semibold uppercase ${tcmStatus.complete ? 'text-green-600' : 'text-gray-500'}`}>
                        Etapa 3
                      </span>
                      <span className="text-sm font-medium">Observações TCM</span>
                    </Link>
                  </li>
                </ol>

                <ol className="mt-4 space-y-4 md:flex md:space-y-0 md:space-x-8">
                  <li className="md:flex-1">
                    <Link 
                      href={`/plans/${plan.id}/timeline`}
                      className={`flex flex-col border-l-4 ${timelineStatus.complete 
                        ? 'border-green-500' 
                        : timelineStatus.current 
                          ? 'border-primary-500' 
                          : 'border-gray-200'} py-2 pl-4`}
                    >
                      <span className={`text-xs font-semibold uppercase ${timelineStatus.complete ? 'text-green-600' : 'text-gray-500'}`}>
                        Etapa 4
                      </span>
                      <span className="text-sm font-medium">Linha do Tempo</span>
                    </Link>
                  </li>

                  <li className="md:flex-1">
                    <Link 
                      href={`/plans/${plan.id}/ifm`}
                      className={`flex flex-col border-l-4 ${ifmStatus.complete 
                        ? 'border-green-500' 
                        : ifmStatus.current 
                          ? 'border-primary-500' 
                          : 'border-gray-200'} py-2 pl-4`}
                    >
                      <span className={`text-xs font-semibold uppercase ${ifmStatus.complete ? 'text-green-600' : 'text-gray-500'}`}>
                        Etapa 5
                      </span>
                      <span className="text-sm font-medium">Matriz IFM</span>
                    </Link>
                  </li>

                  <li className="md:flex-1">
                    <Link 
                      href={`/plans/${plan.id}/final`}
                      className={`flex flex-col border-l-4 ${finalStatus.complete 
                        ? 'border-green-500' 
                        : finalStatus.current 
                          ? 'border-primary-500' 
                          : 'border-gray-200'} py-2 pl-4`}
                    >
                      <span className={`text-xs font-semibold uppercase ${finalStatus.complete ? 'text-green-600' : 'text-gray-500'}`}>
                        Etapa 6
                      </span>
                      <span className="text-sm font-medium">Plano Final</span>
                    </Link>
                  </li>

                  <li className="md:flex-1">
                    {/* Empty space for layout balance */}
                  </li>
                </ol>
              </nav>

              <div className="mt-8 bg-gray-50 dark:bg-gray-800 p-4 rounded-lg">
                <h4 className="text-lg font-medium text-gray-900 dark:text-white mb-2">
                  Detalhes do Paciente
                </h4>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <p className="text-sm text-gray-500 dark:text-gray-400">Nome</p>
                    <p className="text-base text-gray-800 dark:text-gray-200">{plan.patient_data.name}</p>
                  </div>
                  
                  {plan.patient_data.age && (
                    <div>
                      <p className="text-sm text-gray-500 dark:text-gray-400">Idade</p>
                      <p className="text-base text-gray-800 dark:text-gray-200">{plan.patient_data.age} anos</p>
                    </div>
                  )}
                  
                  {plan.patient_data.gender && (
                    <div>
                      <p className="text-sm text-gray-500 dark:text-gray-400">Gênero</p>
                      <p className="text-base text-gray-800 dark:text-gray-200">
                        {plan.patient_data.gender === 'female' ? 'Feminino' : 'Masculino'}
                      </p>
                    </div>
                  )}
                  
                  <div>
                    <p className="text-sm text-gray-500 dark:text-gray-400">Criado em</p>
                    <p className="text-base text-gray-800 dark:text-gray-200">
                      {new Date(plan.created_at).toLocaleDateString('pt-BR', {
                        day: '2-digit',
                        month: '2-digit',
                        year: 'numeric',
                        hour: '2-digit',
                        minute: '2-digit'
                      })}
                    </p>
                  </div>
                </div>
              </div>
              
              {!finalStatus.complete && (
                <div className="mt-6 flex justify-end">
                  <Link 
                    href={labStatus.current ? `/plans/${plan.id}/lab` :
                          tcmStatus.current ? `/plans/${plan.id}/tcm` :
                          timelineStatus.current ? `/plans/${plan.id}/timeline` :
                          ifmStatus.current ? `/plans/${plan.id}/ifm` :
                          finalStatus.current ? `/plans/${plan.id}/final` : '#'}
                    className={`btn-primary ${!labStatus.current && 
                      !tcmStatus.current && !timelineStatus.current && 
                      !ifmStatus.current && !finalStatus.current ? 'opacity-50 cursor-not-allowed' : ''}`}
                  >
                    Continuar preenchendo
                  </Link>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </Layout>
  );
};

export default PlanDetailsPage;
