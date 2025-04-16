import React, { useEffect, useState } from 'react';
import Layout from '../../components/Layout';
import { useAuth } from '../../contexts/AuthContext';
import { useRouter } from 'next/router';
import { adminAPI } from '../../lib/api';
import Link from 'next/link';

const OpenAIConfig: React.FC = () => {
  const { user, isAuthenticated, isSuperadmin, loading } = useAuth();
  const router = useRouter();
  
  const [apiKey, setApiKey] = useState('');
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [saveSuccess, setSaveSuccess] = useState(false);
  const [saveError, setSaveError] = useState<string | null>(null);
  const [isValid, setIsValid] = useState(true);

  // Redirect if not authenticated or not superadmin
  useEffect(() => {
    if (!loading && (!isAuthenticated || !isSuperadmin)) {
      router.push('/auth/login');
    }
  }, [isAuthenticated, isSuperadmin, loading, router]);

  // Fetch current OpenAI API key
  const fetchOpenAIApiKey = async () => {
    try {
      setIsLoading(true);
      const response = await adminAPI.getOpenAIApiKey();
      if (response.data.config) {
        setApiKey(response.data.config);
      } else {
        setApiKey('');
      }
      setSaveSuccess(false);
      setSaveError(null);
    } catch (err: any) {
      console.error('Erro ao carregar chave da API da OpenAI:', err);
      setSaveError('Erro ao carregar chave da API: ' + (err.message || 'Tente novamente'));
      setApiKey('');
    } finally {
      setIsLoading(false);
    }
  };

  // Load API key on mount
  useEffect(() => {
    if (isAuthenticated && isSuperadmin) {
      fetchOpenAIApiKey();
    }
  }, [isAuthenticated, isSuperadmin]);

  // Validate API key format when it changes
  useEffect(() => {
    // OpenAI API keys typically start with "sk-"
    setIsValid(apiKey.trim() === '' || apiKey.trim().startsWith('sk-'));
  }, [apiKey]);

  // Handle save API key
  const handleSaveApiKey = async () => {
    if (!isValid) {
      setSaveError('A chave da API fornecida é inválida. Deve começar com "sk-".');
      return;
    }
    
    try {
      setIsSaving(true);
      setSaveSuccess(false);
      setSaveError(null);
      
      await adminAPI.updateOpenAIApiKey({ 
        apiKey: apiKey.trim()
      });
      
      setSaveSuccess(true);
      
      // Clear success message after 3 seconds
      setTimeout(() => {
        setSaveSuccess(false);
      }, 3000);
      
    } catch (err: any) {
      console.error('Erro ao salvar chave da API:', err);
      setSaveError('Erro ao salvar chave da API: ' + (err.message || 'Tente novamente'));
    } finally {
      setIsSaving(false);
    }
  };

  if (loading || !isAuthenticated || !isSuperadmin) {
    return <div className="flex justify-center items-center h-screen">Carregando...</div>;
  }

  return (
    <Layout title="Configuração da OpenAI - Lyz">
      <div className="bg-gray-50 min-h-[calc(100vh-136px)] py-10">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="bg-white shadow-md rounded-lg overflow-hidden mb-8">
            <div className="p-6">
              <div className="flex justify-between items-center mb-6">
                <h1 className="text-2xl font-bold text-gray-900">Configuração da API da OpenAI</h1>
                <Link 
                  href="/admin/dashboard" 
                  className="text-primary-600 hover:text-primary-800 text-sm font-medium"
                >
                  Voltar ao Painel
                </Link>
              </div>
              
              <p className="text-gray-600 mb-6">
                Configure a chave da API da OpenAI para permitir a geração de planos no sistema Lyz.
              </p>
              
              {isLoading ? (
                <div className="flex justify-center items-center h-40">
                  <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-primary-600"></div>
                </div>
              ) : (
                <>
                  <div className="mb-6">
                    <label htmlFor="api-key" className="block text-sm font-medium text-gray-700 mb-2">
                      Chave da API da OpenAI
                    </label>
                    <input
                      id="api-key"
                      type="text"
                      className={`w-full px-3 py-2 border ${
                        !isValid ? 'border-red-500' : 'border-gray-300'
                      } rounded-md shadow-sm focus:outline-none focus:ring-primary-500 focus:border-primary-500 font-mono text-sm`}
                      value={apiKey}
                      onChange={(e) => setApiKey(e.target.value)}
                      placeholder="sk-..."
                    />
                    {!isValid && (
                      <p className="mt-1 text-sm text-red-600">
                        A chave da API deve começar com "sk-".
                      </p>
                    )}
                  </div>

                  <div className="flex items-center justify-between">
                    <div>
                      {saveSuccess && (
                        <p className="text-sm text-green-600">
                          Chave da API salva com sucesso!
                        </p>
                      )}
                      {saveError && (
                        <p className="text-sm text-red-600">
                          {saveError}
                        </p>
                      )}
                    </div>
                    <div className="flex space-x-4">
                      <button
                        type="button"
                        className="bg-gray-200 hover:bg-gray-300 text-gray-800 font-medium py-2 px-4 rounded-md transition-colors"
                        onClick={fetchOpenAIApiKey}
                        disabled={isLoading || isSaving}
                      >
                        Cancelar
                      </button>
                      <button
                        type="button"
                        className={`bg-primary-600 hover:bg-primary-700 text-white font-medium py-2 px-4 rounded-md transition-colors ${
                          (isSaving || !isValid) ? 'opacity-50 cursor-not-allowed' : ''
                        }`}
                        onClick={handleSaveApiKey}
                        disabled={isSaving || !isValid}
                      >
                        {isSaving ? 'Salvando...' : 'Salvar Chave'}
                      </button>
                    </div>
                  </div>
                </>
              )}
            </div>
          </div>

          <div className="bg-white shadow-md rounded-lg overflow-hidden p-6">
            <h2 className="text-xl font-semibold text-gray-800 mb-4">
              Instruções
            </h2>
            <div className="prose max-w-none">
              <p>Para obter uma chave de API da OpenAI, siga os passos abaixo:</p>
              <ol className="list-decimal list-inside space-y-2 ml-4">
                <li>Acesse o <a href="https://platform.openai.com/api-keys" target="_blank" rel="noopener noreferrer" className="text-primary-600 hover:underline">Portal da OpenAI</a></li>
                <li>Faça login em sua conta ou crie uma nova</li>
                <li>Navegue até a seção "API Keys"</li>
                <li>Clique em "Create new secret key"</li>
                <li>Dê um nome para sua chave (opcional)</li>
                <li>Copie a chave gerada (começa com "sk-")</li>
                <li>Cole a chave no campo acima</li>
              </ol>
              <p className="mt-4">
                <strong>Importante:</strong> A chave da API será armazenada de forma segura e utilizada
                para gerar os planos através do sistema Lyz. Certifique-se de que sua conta da OpenAI
                tenha créditos suficientes ou um método de pagamento válido.
              </p>
              <p className="mt-2">
                <strong>Nota:</strong> Se você já tem uma chave de API configurada nas variáveis
                de ambiente, esta configuração terá prioridade sobre ela.
              </p>
            </div>
          </div>
        </div>
      </div>
    </Layout>
  );
};

export default OpenAIConfig;
