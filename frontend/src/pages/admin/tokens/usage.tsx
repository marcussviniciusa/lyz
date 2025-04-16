import React, { useEffect, useState } from 'react';
import Layout from '../../../components/Layout';
import { useAuth } from '../../../contexts/AuthContext';
import { useRouter } from 'next/router';
import { adminAPI } from '../../../lib/api';
import Link from 'next/link';

interface TokenUsage {
  id: string;
  company_id: string;
  company_name: string;
  user_id: string;
  user_email: string;
  prompt_id: string;
  prompt_name: string;
  token_count: number;
  created_at: string;
}

interface Company {
  id: string;
  name: string;
}

const TokenUsagePage: React.FC = () => {
  const { user, isAuthenticated, isSuperadmin, loading } = useAuth();
  const router = useRouter();
  
  const [usage, setUsage] = useState<TokenUsage[]>([]);
  const [companies, setCompanies] = useState<Company[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  
  // Filters
  const [selectedCompany, setSelectedCompany] = useState<string>('');
  const [dateFrom, setDateFrom] = useState<string>('');
  const [dateTo, setDateTo] = useState<string>('');

  // Stats
  const [totalTokens, setTotalTokens] = useState(0);

  // Redirect if not authenticated or not superadmin
  useEffect(() => {
    if (!loading && (!isAuthenticated || !isSuperadmin)) {
      router.push('/auth/login');
    }
  }, [isAuthenticated, isSuperadmin, loading, router]);

  // Fetch companies for dropdown
  const fetchCompanies = async () => {
    try {
      const response = await adminAPI.getCompanies();
      setCompanies(response.data.companies || []);
    } catch (err: any) {
      console.error('Error fetching companies:', err);
    }
  };

  // Fetch token usage data
  const fetchTokenUsage = async () => {
    try {
      setIsLoading(true);
      setError(null);
      
      const params: any = {};
      if (selectedCompany) params.company_id = selectedCompany;
      if (dateFrom) params.from = dateFrom;
      if (dateTo) params.to = dateTo;
      
      const response = await adminAPI.getTokenUsage(params);
      setUsage(response.data.usage || []);
      
      // Calculate total tokens
      const total = (response.data.usage || []).reduce(
        (sum: number, item: TokenUsage) => sum + item.token_count, 
        0
      );
      setTotalTokens(total);
    } catch (err: any) {
      console.error('Error fetching token usage:', err);
      setError('Erro ao carregar dados de uso de tokens: ' + (err.message || 'Tente novamente'));
    } finally {
      setIsLoading(false);
    }
  };

  // Load data on mount
  useEffect(() => {
    if (isAuthenticated && isSuperadmin) {
      fetchCompanies();
      fetchTokenUsage();
    }
  }, [isAuthenticated, isSuperadmin]);

  // Handle filter apply
  const handleApplyFilters = () => {
    fetchTokenUsage();
  };

  // Handle filter reset
  const handleResetFilters = () => {
    setSelectedCompany('');
    setDateFrom('');
    setDateTo('');
    setTimeout(() => {
      fetchTokenUsage();
    }, 0);
  };
  
  // Format date for display
  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleString('pt-BR');
  };

  if (loading || !isAuthenticated || !isSuperadmin) {
    return <div className="flex justify-center items-center h-screen">Carregando...</div>;
  }

  return (
    <Layout title="Uso de Tokens - Lyz">
      <div className="bg-gray-50 min-h-[calc(100vh-136px)] py-10">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center mb-8">
            <div>
              <h1 className="text-3xl font-bold text-gray-900">
                Relatório de Uso de Tokens
              </h1>
              <p className="mt-2 text-gray-600">
                Acompanhe o uso de tokens das empresas e usuários
              </p>
            </div>
          </div>

          {/* Filters */}
          <div className="bg-white shadow-md rounded-lg p-6 mb-6">
            <h3 className="text-lg font-medium mb-4">Filtros</h3>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-4">
              <div>
                <label htmlFor="company-filter" className="block text-sm font-medium text-gray-700 mb-1">
                  Empresa
                </label>
                <select
                  id="company-filter"
                  value={selectedCompany}
                  onChange={(e) => setSelectedCompany(e.target.value)}
                  className="w-full border border-gray-300 rounded-md py-2 px-3 focus:outline-none focus:ring-2 focus:ring-primary-500"
                >
                  <option value="">Todas as empresas</option>
                  {companies.map(company => (
                    <option key={company.id} value={company.id}>{company.name}</option>
                  ))}
                </select>
              </div>
              <div>
                <label htmlFor="date-from" className="block text-sm font-medium text-gray-700 mb-1">
                  Data inicial
                </label>
                <input
                  type="date"
                  id="date-from"
                  value={dateFrom}
                  onChange={(e) => setDateFrom(e.target.value)}
                  className="w-full border border-gray-300 rounded-md py-2 px-3 focus:outline-none focus:ring-2 focus:ring-primary-500"
                />
              </div>
              <div>
                <label htmlFor="date-to" className="block text-sm font-medium text-gray-700 mb-1">
                  Data final
                </label>
                <input
                  type="date"
                  id="date-to"
                  value={dateTo}
                  onChange={(e) => setDateTo(e.target.value)}
                  className="w-full border border-gray-300 rounded-md py-2 px-3 focus:outline-none focus:ring-2 focus:ring-primary-500"
                />
              </div>
            </div>
            <div className="flex justify-end gap-2">
              <button
                onClick={handleResetFilters}
                className="bg-white border border-gray-300 text-gray-700 py-2 px-4 rounded-md hover:bg-gray-50"
              >
                Limpar Filtros
              </button>
              <button
                onClick={handleApplyFilters}
                className="bg-primary-600 hover:bg-primary-700 text-white py-2 px-4 rounded-md"
              >
                Aplicar Filtros
              </button>
            </div>
          </div>

          {/* Stats */}
          <div className="bg-white shadow-md rounded-lg p-6 mb-6">
            <div className="flex items-center justify-center">
              <div className="text-center">
                <p className="text-sm font-medium text-gray-500">Total de Tokens Usados</p>
                <p className="text-3xl font-bold text-primary-700">{totalTokens.toLocaleString()}</p>
              </div>
            </div>
          </div>

          {/* Token Usage List */}
          <div className="bg-white shadow-md rounded-lg overflow-hidden">
            <div className="px-6 py-4 border-b border-gray-200">
              <h2 className="text-xl font-semibold text-gray-800">Histórico de Uso</h2>
            </div>

            {isLoading ? (
              <div className="text-center py-8">
                <p className="text-gray-500">Carregando dados de uso...</p>
              </div>
            ) : error ? (
              <div className="text-center py-8 text-red-500">
                <p>{error}</p>
                <button
                  className="mt-2 text-primary-600 hover:underline"
                  onClick={fetchTokenUsage}
                >
                  Tentar novamente
                </button>
              </div>
            ) : usage.length === 0 ? (
              <div className="text-center py-8">
                <p className="text-gray-500">Nenhum registro de uso encontrado com os filtros atuais.</p>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="min-w-full divide-y divide-gray-200">
                  <thead className="bg-gray-50">
                    <tr>
                      <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Data/Hora
                      </th>
                      <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Empresa
                      </th>
                      <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Usuário
                      </th>
                      <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Prompt
                      </th>
                      <th scope="col" className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Tokens
                      </th>
                    </tr>
                  </thead>
                  <tbody className="bg-white divide-y divide-gray-200">
                    {usage.map((item) => (
                      <tr key={item.id}>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <div className="text-sm text-gray-900">
                            {formatDate(item.created_at)}
                          </div>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <div className="text-sm text-gray-900">
                            {item.company_name}
                          </div>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <div className="text-sm text-gray-900">
                            {item.user_email}
                          </div>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <div className="text-sm text-gray-900">
                            {item.prompt_name}
                          </div>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-right">
                          <div className="text-sm font-medium text-gray-900">
                            {item.token_count.toLocaleString()}
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>

          {/* Back to dashboard */}
          <div className="mt-8">
            <Link href="/admin/dashboard" className="text-primary-600 hover:text-primary-800 font-medium">
              &larr; Voltar ao Dashboard
            </Link>
          </div>
        </div>
      </div>
    </Layout>
  );
};

export default TokenUsagePage;
