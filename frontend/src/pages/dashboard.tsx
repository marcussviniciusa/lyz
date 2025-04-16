import React, { useEffect, useState } from 'react';
import Layout from '../components/Layout';
import { useAuth } from '../contexts/AuthContext';
import { useRouter } from 'next/router';
import { planAPI } from '../lib/api';
import Link from 'next/link';

const DashboardPage: React.FC = () => {
  const { user, isAuthenticated, loading } = useAuth();
  const router = useRouter();
  const [plans, setPlans] = useState<any[]>([]);
  const [loadingPlans, setLoadingPlans] = useState(true);

  // Redirect if not authenticated
  useEffect(() => {
    if (!loading && !isAuthenticated) {
      router.push('/auth/login');
    }
  }, [isAuthenticated, loading, router]);

  // Fetch user plans
  useEffect(() => {
    const fetchPlans = async () => {
      try {
        const response = await planAPI.getUserPlans();
        setPlans(response.data.plans);
      } catch (error) {
        console.error('Error fetching plans:', error);
      } finally {
        setLoadingPlans(false);
      }
    };

    if (isAuthenticated) {
      fetchPlans();
    }
  }, [isAuthenticated]);

  if (loading || !isAuthenticated) {
    return <div className="flex justify-center items-center h-screen">Carregando...</div>;
  }

  return (
    <Layout title="Dashboard - Lyz">
      <div className="bg-gray-50 min-h-[calc(100vh-136px)] py-10">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="mb-8">
            <h1 className="text-3xl font-bold text-gray-900">
              Bem-vindo(a), {user?.name.split(' ')[0]}
            </h1>
            <p className="mt-2 text-gray-600">
              Gerenciamento de planos personalizados baseados em ciclicidade feminina
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
            <div className="card bg-white rounded-lg shadow p-6">
              <h2 className="text-xl font-semibold text-gray-800 mb-2">Planos Criados</h2>
              <p className="text-3xl font-bold text-primary-600">{plans.length}</p>
              <p className="text-sm text-gray-500 mt-1">Total de planos personalizados</p>
            </div>

            <div className="card bg-white rounded-lg shadow p-6">
              <h2 className="text-xl font-semibold text-gray-800 mb-2">Planos Finalizados</h2>
              <p className="text-3xl font-bold text-primary-600">
                {plans.filter(plan => plan.final_plan).length}
              </p>
              <p className="text-sm text-gray-500 mt-1">Planos com geração completa</p>
            </div>

            <div className="card bg-white rounded-lg shadow p-6">
              <h2 className="text-xl font-semibold text-gray-800 mb-2">Último Acesso</h2>
              <p className="text-lg font-medium text-gray-700">
                {user && 'last_login' in user 
                  ? new Date(user['last_login'] as string).toLocaleDateString('pt-BR', {
                      day: '2-digit', 
                      month: '2-digit', 
                      year: 'numeric',
                      hour: '2-digit',
                      minute: '2-digit'
                    })
                  : 'Primeiro acesso'}
              </p>
              <p className="text-sm text-gray-500 mt-1">Data e hora</p>
            </div>
          </div>

          <div className="bg-white shadow-md rounded-lg overflow-hidden">
            <div className="px-6 py-4 border-b border-gray-200 flex justify-between items-center">
              <h2 className="text-xl font-semibold text-gray-800">Planos Recentes</h2>
              <Link href="/plans/new" className="btn-primary">
                Novo Plano
              </Link>
            </div>
            <div className="px-6 py-4">
              {loadingPlans ? (
                <p className="text-center py-4 text-gray-500">Carregando planos...</p>
              ) : plans.length > 0 ? (
                <div className="overflow-x-auto">
                  <table className="min-w-full divide-y divide-gray-200">
                    <thead className="bg-gray-50">
                      <tr>
                        <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                          Paciente
                        </th>
                        <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                          Tipo
                        </th>
                        <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                          Status
                        </th>
                        <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                          Data de Criação
                        </th>
                        <th scope="col" className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                          Ações
                        </th>
                      </tr>
                    </thead>
                    <tbody className="bg-white divide-y divide-gray-200">
                      {plans.slice(0, 5).map((plan) => (
                        <tr key={plan.id}>
                          <td className="px-6 py-4 whitespace-nowrap">
                            <div className="text-sm font-medium text-gray-900">
                              {plan.patient_data?.name || 'Sem nome'}
                            </div>
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap">
                            <span className="px-2 inline-flex text-xs leading-5 font-semibold rounded-full bg-green-100 text-green-800">
                              {plan.professional_type === 'medical_nutritionist' 
                                ? 'Médico/Nutricionista' 
                                : 'Outro Profissional'}
                            </span>
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap">
                            <span className={`px-2 inline-flex text-xs leading-5 font-semibold rounded-full ${
                              plan.final_plan 
                                ? 'bg-green-100 text-green-800' 
                                : 'bg-yellow-100 text-yellow-800'
                            }`}>
                              {plan.final_plan ? 'Completo' : 'Em Progresso'}
                            </span>
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                            {new Date(plan.created_at).toLocaleDateString('pt-BR')}
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                            <Link 
                              href={`/plans/${plan.id}`} 
                              className="text-primary-600 hover:text-primary-900 mr-4"
                            >
                              Visualizar
                            </Link>
                            {plan.final_plan && (
                              <Link 
                                href={`/plans/${plan.id}/export`} 
                                className="text-primary-600 hover:text-primary-900"
                              >
                                Exportar
                              </Link>
                            )}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                  {plans.length > 5 && (
                    <div className="px-6 py-3 flex justify-center">
                      <Link href="/plans" className="text-primary-600 font-medium hover:text-primary-700">
                        Ver todos os planos
                      </Link>
                    </div>
                  )}
                </div>
              ) : (
                <div className="text-center py-6">
                  <p className="text-gray-500 mb-4">Você ainda não possui planos criados.</p>
                  <Link href="/plans/new" className="btn-primary">
                    Criar Primeiro Plano
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

export default DashboardPage;
