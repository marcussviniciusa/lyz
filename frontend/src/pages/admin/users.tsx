import React, { useEffect, useState } from 'react';
import Layout from '../../components/Layout';
import { useAuth } from '../../contexts/AuthContext';
import { useRouter } from 'next/router';
import { adminAPI } from '../../lib/api';
import Link from 'next/link';

interface User {
  id: string;
  name: string;
  email: string;
  role: string;
  company_id: number;
  company_name?: string;
  created_at: string;
  last_login: string;
}

interface Company {
  id: string;
  name: string;
}

interface UserFormData {
  name: string;
  email: string;
  password: string;
  role: string;
  company_id: string;
}

const UsersPage: React.FC = () => {
  const { user, isAuthenticated, isSuperadmin, loading } = useAuth();
  const router = useRouter();
  
  const [users, setUsers] = useState<User[]>([]);
  const [companies, setCompanies] = useState<Company[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  
  // Estado para controle do formulário
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [formData, setFormData] = useState<UserFormData>({
    name: '',
    email: '',
    password: '',
    role: 'user',
    company_id: '',
  });
  const [isEditing, setIsEditing] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [formLoading, setFormLoading] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);
  
  // Filtro por empresa
  const [selectedCompany, setSelectedCompany] = useState<string>('');

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

  // Fetch users data
  const fetchUsers = async () => {
    try {
      setIsLoading(true);
      setError(null);
      const response = await adminAPI.getUsers(selectedCompany);
      setUsers(response.data.users || []);
    } catch (err: any) {
      console.error('Error fetching users:', err);
      setError('Erro ao carregar usuários: ' + (err.message || 'Tente novamente'));
    } finally {
      setIsLoading(false);
    }
  };

  // Load users and companies on mount
  useEffect(() => {
    if (isAuthenticated && isSuperadmin) {
      fetchCompanies();
      fetchUsers();
    }
  }, [isAuthenticated, isSuperadmin]);

  // Refresh users when company filter changes
  useEffect(() => {
    if (isAuthenticated && isSuperadmin) {
      fetchUsers();
    }
  }, [selectedCompany]);

  // Handle form change
  const handleFormChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    const { name, value } = e.target;
    setFormData((prev) => ({
      ...prev,
      [name]: value,
    }));
  };

  // Handle form submit
  const handleFormSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setFormLoading(true);
    setFormError(null);
    
    try {
      if (isEditing && editingId) {
        // Para edição, não enviar senha se estiver vazia
        // Desestruturação para extrair os campos de forma tipada
        const { password, ...otherFields } = formData;
        
        // Cria um novo objeto apenas com os campos desejados
        const dataToSend = {
          ...otherFields,
          // Inclui a senha apenas se ela não estiver vazia
          ...(password ? { password } : {})
        };
        await adminAPI.updateUser(editingId, dataToSend);
      } else {
        // Para criação, validar que a senha foi fornecida
        if (!formData.password) {
          setFormError('A senha é obrigatória para novos usuários');
          setFormLoading(false);
          return;
        }
        await adminAPI.createUser(formData);
      }
      
      fetchUsers();
      resetForm();
    } catch (err: any) {
      console.error('Form submission error:', err);
      setFormError('Erro ao salvar usuário: ' + (err.message || 'Tente novamente'));
    } finally {
      setFormLoading(false);
    }
  };

  // Reset form
  const resetForm = () => {
    setFormData({
      name: '',
      email: '',
      password: '',
      role: 'user',
      company_id: '',
    });
    setIsFormOpen(false);
    setIsEditing(false);
    setEditingId(null);
  };

  // Handle edit
  const handleEdit = (user: User) => {
    setFormData({
      name: user.name,
      email: user.email,
      password: '', // Não preenchemos a senha na edição
      role: user.role,
      company_id: user.company_id.toString(),
    });
    setIsEditing(true);
    setEditingId(user.id);
    setIsFormOpen(true);
  };

  // Handle delete
  const handleDelete = async (id: string) => {
    if (!window.confirm('Tem certeza que deseja excluir este usuário?')) {
      return;
    }
    
    try {
      await adminAPI.deleteUser(id);
      fetchUsers();
    } catch (err: any) {
      console.error('Error deleting user:', err);
      alert('Erro ao excluir usuário: ' + (err.message || 'Tente novamente'));
    }
  };

  // Get company name by ID
  const getCompanyName = (companyId: number | string | null | undefined) => {
    // Se o ID for nulo ou indefinido, retorna 'N/A'
    if (companyId === null || companyId === undefined) {
      return 'N/A';
    }
    
    // Garantir que companies é um array
    if (!Array.isArray(companies)) {
      return 'N/A';
    }
    
    // Comparar como string para evitar problemas de tipo
    const companyIdStr = companyId.toString();
    const company = companies.find(c => c && c.id && c.id.toString() === companyIdStr);
    
    // Verificar se a empresa foi encontrada e tem um nome válido
    return (company && company.name) ? company.name : 'N/A';
  };

  if (loading || !isAuthenticated || !isSuperadmin) {
    return <div className="flex justify-center items-center h-screen">Carregando...</div>;
  }

  return (
    <Layout title="Gerenciar Usuários - Lyz">
      <div className="bg-gray-50 min-h-[calc(100vh-136px)] py-10">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center mb-8">
            <div>
              <h1 className="text-3xl font-bold text-gray-900">
                Gerenciamento de Usuários
              </h1>
              <p className="mt-2 text-gray-600">
                Administre os usuários do sistema Lyz
              </p>
            </div>
            <div>
              <button
                onClick={() => setIsFormOpen(!isFormOpen)}
                className="bg-primary-600 hover:bg-primary-700 text-white font-medium py-2 px-4 rounded-lg"
              >
                {isFormOpen ? 'Cancelar' : 'Novo Usuário'}
              </button>
            </div>
          </div>

          {/* Form */}
          {isFormOpen && (
            <div className="bg-white shadow-md rounded-lg p-6 mb-8">
              <h2 className="text-xl font-semibold mb-4">
                {isEditing ? 'Editar Usuário' : 'Novo Usuário'}
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
                      Nome Completo *
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
                    <label htmlFor="email" className="block text-sm font-medium text-gray-700 mb-1">
                      Email *
                    </label>
                    <input
                      type="email"
                      id="email"
                      name="email"
                      value={formData.email}
                      onChange={handleFormChange}
                      className="w-full border border-gray-300 rounded-md py-2 px-3 focus:outline-none focus:ring-2 focus:ring-primary-500"
                      required
                    />
                  </div>
                  <div>
                    <label htmlFor="password" className="block text-sm font-medium text-gray-700 mb-1">
                      {isEditing ? 'Senha (deixe vazio para manter a atual)' : 'Senha *'}
                    </label>
                    <input
                      type="password"
                      id="password"
                      name="password"
                      value={formData.password}
                      onChange={handleFormChange}
                      className="w-full border border-gray-300 rounded-md py-2 px-3 focus:outline-none focus:ring-2 focus:ring-primary-500"
                      required={!isEditing}
                    />
                  </div>
                  <div>
                    <label htmlFor="role" className="block text-sm font-medium text-gray-700 mb-1">
                      Perfil *
                    </label>
                    <select
                      id="role"
                      name="role"
                      value={formData.role}
                      onChange={handleFormChange}
                      className="w-full border border-gray-300 rounded-md py-2 px-3 focus:outline-none focus:ring-2 focus:ring-primary-500"
                      required
                    >
                      <option value="user">Usuário</option>
                      <option value="superadmin">Administrador</option>
                    </select>
                  </div>
                  <div>
                    <label htmlFor="company_id" className="block text-sm font-medium text-gray-700 mb-1">
                      Empresa *
                    </label>
                    <select
                      id="company_id"
                      name="company_id"
                      value={formData.company_id}
                      onChange={handleFormChange}
                      className="w-full border border-gray-300 rounded-md py-2 px-3 focus:outline-none focus:ring-2 focus:ring-primary-500"
                      required
                    >
                      <option value="">Selecione uma empresa</option>
                      {companies.map(company => (
                        <option key={company.id} value={company.id}>{company.name}</option>
                      ))}
                    </select>
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

          {/* Filters */}
          <div className="bg-white shadow-md rounded-lg p-6 mb-6">
            <h3 className="text-lg font-medium mb-3">Filtros</h3>
            <div className="flex items-center">
              <div className="w-1/3">
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
            </div>
          </div>

          {/* Users List */}
          <div className="bg-white shadow-md rounded-lg overflow-hidden">
            <div className="px-6 py-4 border-b border-gray-200">
              <h2 className="text-xl font-semibold text-gray-800">Usuários</h2>
            </div>

            {isLoading ? (
              <div className="text-center py-8">
                <p className="text-gray-500">Carregando usuários...</p>
              </div>
            ) : error ? (
              <div className="text-center py-8 text-red-500">
                <p>{error}</p>
                <button
                  className="mt-2 text-primary-600 hover:underline"
                  onClick={fetchUsers}
                >
                  Tentar novamente
                </button>
              </div>
            ) : users.length === 0 ? (
              <div className="text-center py-8">
                <p className="text-gray-500">Nenhum usuário encontrado.</p>
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
                        Email
                      </th>
                      <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Perfil
                      </th>
                      <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Empresa
                      </th>
                      <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Último Login
                      </th>
                      <th scope="col" className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Ações
                      </th>
                    </tr>
                  </thead>
                  <tbody className="bg-white divide-y divide-gray-200">
                    {users.map((user) => (
                      <tr key={user.id}>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <div className="text-sm font-medium text-gray-900">
                            {user.name}
                          </div>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <div className="text-sm text-gray-500">
                            {user.email}
                          </div>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <span className={`px-2 py-1 text-xs font-medium rounded-full ${
                            user.role === 'superadmin' 
                              ? 'bg-purple-100 text-purple-800' 
                              : 'bg-blue-100 text-blue-800'
                          }`}>
                            {user.role === 'superadmin' ? 'Admin' : 'Usuário'}
                          </span>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <div className="text-sm text-gray-500">
                            {getCompanyName(user.company_id)}
                          </div>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <div className="text-sm text-gray-500">
                            {user.last_login 
                              ? new Date(user.last_login).toLocaleString('pt-BR')
                              : 'Nunca'}
                          </div>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                          <button 
                            onClick={() => handleEdit(user)}
                            className="text-primary-600 hover:text-primary-900 mr-4"
                          >
                            Editar
                          </button>
                          <button 
                            onClick={() => handleDelete(user.id)}
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

export default UsersPage;
