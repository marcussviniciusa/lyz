import React, { useEffect, useState } from 'react';
import Layout from '../../components/Layout';
import { useAuth } from '../../contexts/AuthContext';
import { useRouter } from 'next/router';
import { adminAPI } from '../../lib/api';
import Link from 'next/link';

interface Company {
  id: string;
  name: string;
  token_limit: number;
  created_at: string;
}

interface CompanyFormData {
  name: string;
  token_limit: number;
}

const CompaniesPage: React.FC = () => {
  const { user, isAuthenticated, isSuperadmin, loading } = useAuth();
  const router = useRouter();
  
  const [companies, setCompanies] = useState<Company[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  
  // Estado para controle do formulário
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [formData, setFormData] = useState<CompanyFormData>({
    name: '',
    token_limit: 10000,
  });
  const [isEditing, setIsEditing] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [formLoading, setFormLoading] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);

  // Redirect if not authenticated or not superadmin
  useEffect(() => {
    if (!loading && (!isAuthenticated || !isSuperadmin)) {
      router.push('/auth/login');
    }
  }, [isAuthenticated, isSuperadmin, loading, router]);

  // Fetch companies data
  const fetchCompanies = async () => {
    try {
      setIsLoading(true);
      setError(null);
      const response = await adminAPI.getCompanies();
      setCompanies(response.data.companies || []);
    } catch (err: any) {
      console.error('Error fetching companies:', err);
      setError('Erro ao carregar empresas: ' + (err.message || 'Tente novamente'));
    } finally {
      setIsLoading(false);
    }
  };

  // Load companies on mount
  useEffect(() => {
    if (isAuthenticated && isSuperadmin) {
      fetchCompanies();
    }
  }, [isAuthenticated, isSuperadmin]);

  // Handle form change
  const handleFormChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setFormData((prev) => ({
      ...prev,
      [name]: name === 'token_limit' ? parseInt(value) || 0 : value,
    }));
  };

  // Handle form submit
  const handleFormSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setFormLoading(true);
    setFormError(null);
    
    try {
      if (isEditing && editingId) {
        await adminAPI.updateCompany(editingId, formData);
      } else {
        await adminAPI.createCompany(formData);
      }
      
      fetchCompanies();
      resetForm();
    } catch (err: any) {
      console.error('Form submission error:', err);
      setFormError('Erro ao salvar empresa: ' + (err.message || 'Tente novamente'));
    } finally {
      setFormLoading(false);
    }
  };

  // Reset form
  const resetForm = () => {
    setFormData({ name: '', token_limit: 10000 });
    setIsFormOpen(false);
    setIsEditing(false);
    setEditingId(null);
  };

  // Handle edit
  const handleEdit = (company: Company) => {
    setFormData({
      name: company.name,
      token_limit: company.token_limit,
    });
    setIsEditing(true);
    setEditingId(company.id);
    setIsFormOpen(true);
  };

  // Handle delete
  const handleDelete = async (id: string) => {
    if (!window.confirm('Tem certeza que deseja excluir esta empresa?')) {
      return;
    }
    
    try {
      await adminAPI.deleteCompany(id);
      fetchCompanies();
    } catch (err: any) {
      console.error('Error deleting company:', err);
      alert('Erro ao excluir empresa: ' + (err.message || 'Tente novamente'));
    }
  };

  if (loading || !isAuthenticated || !isSuperadmin) {
    return <div className="flex justify-center items-center h-screen">Carregando...</div>;
  }

  return (
    <Layout title="Gerenciar Empresas - Lyz">
      <div className="bg-gray-50 min-h-[calc(100vh-136px)] py-10">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center mb-8">
            <div>
              <h1 className="text-3xl font-bold text-gray-900">
                Gerenciamento de Empresas
              </h1>
              <p className="mt-2 text-gray-600">
                Adicione, edite ou remova empresas do sistema Lyz
              </p>
            </div>
            <div>
              <button
                onClick={() => setIsFormOpen(!isFormOpen)}
                className="bg-primary-600 hover:bg-primary-700 text-white font-medium py-2 px-4 rounded-lg"
              >
                {isFormOpen ? 'Cancelar' : 'Nova Empresa'}
              </button>
            </div>
          </div>

          {/* Form */}
          {isFormOpen && (
            <div className="bg-white shadow-md rounded-lg p-6 mb-8">
              <h2 className="text-xl font-semibold mb-4">
                {isEditing ? 'Editar Empresa' : 'Nova Empresa'}
              </h2>
              
              {formError && (
                <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded mb-4">
                  {formError}
                </div>
              )}
              
              <form onSubmit={handleFormSubmit}>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div>
                    <label htmlFor="name" className="block text-sm font-medium text-gray-700 mb-1">
                      Nome da Empresa *
                    </label>
                    <input
                      type="text"
                      id="name"
                      name="name"
                      value={formData.name}
                      onChange={handleFormChange}
                      className="w-full border border-gray-300 rounded-md py-2 px-3 focus:outline-none focus:ring-2 focus:ring-primary-500"
                      required
                    />
                  </div>
                  <div>
                    <label htmlFor="token_limit" className="block text-sm font-medium text-gray-700 mb-1">
                      Limite de Tokens
                    </label>
                    <input
                      type="number"
                      id="token_limit"
                      name="token_limit"
                      value={formData.token_limit}
                      onChange={handleFormChange}
                      className="w-full border border-gray-300 rounded-md py-2 px-3 focus:outline-none focus:ring-2 focus:ring-primary-500"
                      min="1000"
                    />
                  </div>
                </div>
                
                <div className="flex justify-end mt-6">
                  <button
                    type="button"
                    onClick={resetForm}
                    className="mr-2 bg-white border border-gray-300 text-gray-700 py-2 px-4 rounded-md hover:bg-gray-50"
                  >
                    Cancelar
                  </button>
                  <button
                    type="submit"
                    className="bg-primary-600 hover:bg-primary-700 text-white py-2 px-4 rounded-md"
                    disabled={formLoading}
                  >
                    {formLoading ? 'Salvando...' : isEditing ? 'Atualizar' : 'Salvar'}
                  </button>
                </div>
              </form>
            </div>
          )}

          {/* Companies List */}
          <div className="bg-white shadow-md rounded-lg overflow-hidden">
            <div className="px-6 py-4 border-b border-gray-200">
              <h2 className="text-xl font-semibold text-gray-800">Empresas</h2>
            </div>

            {isLoading ? (
              <div className="text-center py-8">
                <p className="text-gray-500">Carregando empresas...</p>
              </div>
            ) : error ? (
              <div className="text-center py-8 text-red-500">
                <p>{error}</p>
                <button
                  className="mt-2 text-primary-600 hover:underline"
                  onClick={fetchCompanies}
                >
                  Tentar novamente
                </button>
              </div>
            ) : companies.length === 0 ? (
              <div className="text-center py-8">
                <p className="text-gray-500">Nenhuma empresa encontrada.</p>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="min-w-full divide-y divide-gray-200">
                  <thead className="bg-gray-50">
                    <tr>
                      <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Nome
                      </th>
                      <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Limite de Tokens
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
                    {companies.map((company) => (
                      <tr key={company.id}>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <div className="text-sm font-medium text-gray-900">
                            {company.name}
                          </div>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <div className="text-sm text-gray-500">
                            {company.token_limit.toLocaleString()}
                          </div>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <div className="text-sm text-gray-500">
                            {new Date(company.created_at).toLocaleDateString('pt-BR')}
                          </div>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                          <button 
                            onClick={() => handleEdit(company)}
                            className="text-primary-600 hover:text-primary-900 mr-4"
                          >
                            Editar
                          </button>
                          <button 
                            onClick={() => handleDelete(company.id)}
                            className="text-red-600 hover:text-red-900"
                          >
                            Excluir
                          </button>
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

export default CompaniesPage;
