import React, { useEffect, useState } from 'react';
import Layout from '../../components/Layout';
import { useAuth } from '../../contexts/AuthContext';
import { useRouter } from 'next/router';
import { adminAPI } from '../../lib/api';
import Link from 'next/link';

const AdminDashboardPage: React.FC = () => {
  const { user, isAuthenticated, isSuperadmin, loading } = useAuth();
  const router = useRouter();
  const [dashboardData, setDashboardData] = useState<any>(null);
  const [loadingData, setLoadingData] = useState(true);

  // Redirect if not authenticated or not superadmin
  useEffect(() => {
    if (!loading && (!isAuthenticated || !isSuperadmin)) {
      router.push('/auth/login');
    }
  }, [isAuthenticated, isSuperadmin, loading, router]);

  // Fetch dashboard data
  useEffect(() => {
    const fetchDashboardData = async () => {
      try {
        const response = await adminAPI.getDashboard();
        setDashboardData(response.data);
      } catch (error) {
        console.error('Error fetching dashboard data:', error);
      } finally {
        setLoadingData(false);
      }
    };

    if (isAuthenticated && isSuperadmin) {
      fetchDashboardData();
    }
  }, [isAuthenticated, isSuperadmin]);

  if (loading || !isAuthenticated || !isSuperadmin) {
    return <div className="flex justify-center items-center h-screen">Carregando...</div>;
  }

  return (
    <Layout title="Dashboard Administrativo - Lyz">
      <div className="bg-gray-50 min-h-[calc(100vh-136px)] py-10">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="mb-8">
            <h1 className="text-3xl font-bold text-gray-900">
              Dashboard Administrativo
            </h1>
            <p className="mt-2 text-gray-600">
              Visão geral do sistema Lyz e métricas importantes
            </p>
          </div>

          {loadingData ? (
            <div className="text-center py-10">
              <p className="text-gray-500">Carregando dados do dashboard...</p>
            </div>
          ) : (
            <>
              {/* Summary Cards */}
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
                <div className="card bg-white rounded-lg shadow p-6">
                  <h2 className="text-lg font-semibold text-gray-800 mb-2">Tokens Utilizados</h2>
                  <p className="text-3xl font-bold text-primary-600">
                    {dashboardData?.totalTokensUsed?.toLocaleString()}
                  </p>
                  <p className="text-sm text-gray-500 mt-1">Total de tokens consumidos</p>
                </div>

                <div className="card bg-white rounded-lg shadow p-6">
                  <h2 className="text-lg font-semibold text-gray-800 mb-2">Custo Total</h2>
                  <p className="text-3xl font-bold text-primary-600">
                    ${Number(dashboardData?.totalCost).toFixed(2)}
                  </p>
                  <p className="text-sm text-gray-500 mt-1">Custo dos tokens em USD</p>
                </div>

                <div className="card bg-white rounded-lg shadow p-6">
                  <h2 className="text-lg font-semibold text-gray-800 mb-2">Empresas</h2>
                  <p className="text-3xl font-bold text-primary-600">{dashboardData?.companyCount}</p>
                  <p className="text-sm text-gray-500 mt-1">Empresas cadastradas</p>
                </div>

                <div className="card bg-white rounded-lg shadow p-6">
                  <h2 className="text-lg font-semibold text-gray-800 mb-2">Usuários</h2>
                  <p className="text-3xl font-bold text-primary-600">{dashboardData?.userCount}</p>
                  <p className="text-sm text-gray-500 mt-1">Usuários registrados</p>
                </div>
              </div>

              {/* Recent Token Usage Chart */}
              <div className="bg-white shadow-md rounded-lg overflow-hidden mb-8">
                <div className="px-6 py-4 border-b border-gray-200">
                  <h2 className="text-xl font-semibold text-gray-800">Uso de Tokens (Últimos 30 dias)</h2>
                </div>
                <div className="p-6">
                  {/* This would be a chart component in a real implementation */}
                  <div className="h-64 bg-gray-50 rounded flex items-center justify-center">
                    <p className="text-gray-500">Gráfico de uso de tokens seria exibido aqui</p>
                  </div>
                </div>
              </div>

              <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                {/* Token Usage by Company */}
                <div className="bg-white shadow-md rounded-lg overflow-hidden">
                  <div className="px-6 py-4 border-b border-gray-200 flex justify-between items-center">
                    <h2 className="text-xl font-semibold text-gray-800">Uso por Empresa</h2>
                    <Link href="/admin/tokens/usage" className="text-primary-600 hover:text-primary-800 text-sm font-medium">
                      Ver Detalhes
                    </Link>
                  </div>
                  <div className="px-6 py-4">
                    {dashboardData?.tokenUsageByCompany?.length > 0 ? (
                      <div className="overflow-x-auto">
                        <table className="min-w-full divide-y divide-gray-200">
                          <thead className="bg-gray-50">
                            <tr>
                              <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                                Empresa
                              </th>
                              <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                                Tokens
                              </th>
                              <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                                Custo
                              </th>
                            </tr>
                          </thead>
                          <tbody className="bg-white divide-y divide-gray-200">
                            {dashboardData.tokenUsageByCompany.map((item: any) => (
                              <tr key={item.company_id}>
                                <td className="px-6 py-4 whitespace-nowrap">
                                  <div className="text-sm font-medium text-gray-900">
                                    {item.Company.name}
                                  </div>
                                </td>
                                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                                  {Number(item.tokens).toLocaleString()}
                                </td>
                                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                                  ${Number(item.cost).toFixed(2)}
                                </td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                    ) : (
                      <p className="text-center py-4 text-gray-500">Nenhum dado de uso disponível</p>
                    )}
                  </div>
                </div>

                {/* Quick Links */}
                <div className="bg-white shadow-md rounded-lg overflow-hidden">
                  <div className="px-6 py-4 border-b border-gray-200">
                    <h2 className="text-xl font-semibold text-gray-800">Ações Rápidas</h2>
                  </div>
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 mb-6">
                    <Link href="/admin/companies" className="block p-6 bg-white rounded-lg shadow hover:shadow-md transition-shadow">
                      <h3 className="text-lg font-semibold text-gray-800 mb-2">Gerenciar Empresas</h3>
                      <p className="text-gray-600">Adicionar, editar ou remover empresas do sistema</p>
                    </Link>
                    
                    <Link href="/admin/users" className="block p-6 bg-white rounded-lg shadow hover:shadow-md transition-shadow">
                      <h3 className="text-lg font-semibold text-gray-800 mb-2">Gerenciar Usuários</h3>
                      <p className="text-gray-600">Administrar contas de usuários e permissões</p>
                    </Link>
                    
                    <Link href="/admin/prompts" className="block p-6 bg-white rounded-lg shadow hover:shadow-md transition-shadow">
                      <h3 className="text-lg font-semibold text-gray-800 mb-2">Gerenciar Prompts</h3>
                      <p className="text-gray-600">Editar prompts usados na geração de planos</p>
                    </Link>
                    
                    <Link href="/admin/ai-configurations" className="block p-6 bg-white rounded-lg shadow hover:shadow-md transition-shadow">
                      <h3 className="text-lg font-semibold text-gray-800 mb-2">Configurações de IA</h3>
                      <p className="text-gray-600">Gerenciar modelos, prompts e temperatura para cada página</p>
                    </Link>
                  </div>
                  
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-2 gap-6 mb-6">
                    <Link href="/admin/transcription" className="block p-6 bg-white rounded-lg shadow hover:shadow-md transition-shadow">
                      <h3 className="text-lg font-semibold text-gray-800 mb-2">Configurar Transcrição</h3>
                      <p className="text-gray-600">Configurar credenciais do Google Speech para transcrição</p>
                    </Link>
                    
                    <Link href="/admin/openai-config" className="block p-6 bg-white rounded-lg shadow hover:shadow-md transition-shadow">
                      <h3 className="text-lg font-semibold text-gray-800 mb-2">Configurar APIs</h3>
                      <p className="text-gray-600">Configurar chaves das APIs (OpenAI, Google, Anthropic)</p>
                    </Link>
                  </div>
                  <Link href="/admin/tokens/usage" className="block p-4 bg-gray-50 rounded-lg hover:bg-gray-100 transition">
                    <h3 className="text-lg font-medium text-gray-800">Relatórios de Tokens</h3>
                    <p className="text-sm text-gray-600 mt-1">Visualizar relatórios detalhados de uso de tokens</p>
                  </Link>
                </div>
              </div>
            </>
          )}
        </div>
      </div>
    </Layout>
  );
};

export default AdminDashboardPage;
