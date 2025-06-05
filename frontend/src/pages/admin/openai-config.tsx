import React, { useEffect, useState } from 'react';
import Layout from '../../components/Layout';
import { useAuth } from '../../contexts/AuthContext';
import { useRouter } from 'next/router';
import { adminAPI } from '../../lib/api';
import Link from 'next/link';

interface ApiKeys {
  openai: string | null;
  google: string | null;
  anthropic: string | null;
}

interface ApiProvider {
  key: keyof ApiKeys;
  name: string;
  placeholder: string;
  prefix: string;
  description: string;
  docsUrl: string;
  color: string;
}

const API_PROVIDERS: ApiProvider[] = [
  {
    key: 'openai',
    name: 'OpenAI',
    placeholder: 'sk-proj-...',
    prefix: 'sk-',
    description: 'API para GPT-4, GPT-3.5, DALL-E e Whisper',
    docsUrl: 'https://platform.openai.com/api-keys',
    color: 'blue'
  },
  {
    key: 'google',
    name: 'Google AI',
    placeholder: 'AIza...',
    prefix: 'AIza',
    description: 'API para Gemini, PaLM e outros modelos do Google',
    docsUrl: 'https://aistudio.google.com/app/apikey',
    color: 'green'
  },
  {
    key: 'anthropic',
    name: 'Anthropic',
    placeholder: 'sk-ant-...',
    prefix: 'sk-ant-',
    description: 'API para Claude (Sonnet, Opus, Haiku)',
    docsUrl: 'https://console.anthropic.com/account/keys',
    color: 'purple'
  }
];

const APIConfig: React.FC = () => {
  const { user, isAuthenticated, isSuperadmin, loading } = useAuth();
  const router = useRouter();
  
  const [apiKeys, setApiKeys] = useState<ApiKeys>({
    openai: null,
    google: null,
    anthropic: null
  });
  const [tempKeys, setTempKeys] = useState<ApiKeys>({
    openai: '',
    google: '',
    anthropic: ''
  });
  const [isLoading, setIsLoading] = useState(true);
  const [savingProvider, setSavingProvider] = useState<string | null>(null);
  const [saveSuccess, setSaveSuccess] = useState<string | null>(null);
  const [saveError, setSaveError] = useState<string | null>(null);
  const [validationErrors, setValidationErrors] = useState<Partial<ApiKeys>>({});

  // Redirect if not authenticated or not superadmin
  useEffect(() => {
    if (!loading && (!isAuthenticated || !isSuperadmin)) {
      router.push('/auth/login');
    }
  }, [isAuthenticated, isSuperadmin, loading, router]);

  // Fetch all API keys
  const fetchApiKeys = async () => {
    try {
      setIsLoading(true);
      const response = await adminAPI.getAllApiKeys();
             const keys = response.data.data?.apiKeys || { openai: null, google: null, anthropic: null };
       setApiKeys(keys);
       
       // Initialize temp keys with current values or empty strings
       setTempKeys({
         openai: keys.openai || '',
         google: keys.google || '',
         anthropic: keys.anthropic || ''
       });
      
      setSaveSuccess(null);
      setSaveError(null);
    } catch (err: any) {
      console.error('Erro ao carregar chaves de API:', err);
      setSaveError('Erro ao carregar chaves de API: ' + (err.message || 'Tente novamente'));
    } finally {
      setIsLoading(false);
    }
  };

  // Load API keys on mount
  useEffect(() => {
    if (isAuthenticated && isSuperadmin) {
      fetchApiKeys();
    }
  }, [isAuthenticated, isSuperadmin]);

  // Validate API key format
  const validateApiKey = (provider: ApiProvider, value: string): boolean => {
    if (!value.trim()) return true; // Empty is valid (means remove)
    return value.trim().startsWith(provider.prefix);
  };

  // Update validation errors when temp keys change
  useEffect(() => {
    const errors: Partial<ApiKeys> = {};
    
         API_PROVIDERS.forEach(provider => {
       const value = tempKeys[provider.key];
       if (value && !validateApiKey(provider, value)) {
         errors[provider.key] = `Deve começar com "${provider.prefix}"`;
       }
     });
    
    setValidationErrors(errors);
  }, [tempKeys]);

  // Handle input change
  const handleInputChange = (provider: keyof ApiKeys, value: string) => {
    setTempKeys(prev => ({ ...prev, [provider]: value }));
    setSaveSuccess(null);
    setSaveError(null);
  };

  // Handle save API key
  const handleSaveApiKey = async (provider: ApiProvider) => {
    const value = tempKeys[provider.key].trim();
    
    if (value && !validateApiKey(provider, value)) {
      setSaveError(`Chave do ${provider.name} inválida. Deve começar com "${provider.prefix}".`);
      return;
    }
    
    try {
      setSavingProvider(provider.key);
      setSaveSuccess(null);
      setSaveError(null);
      
      if (value) {
        // Save the key
        await adminAPI.updateApiKey(provider.key, { apiKey: value });
        setApiKeys(prev => ({ ...prev, [provider.key]: value }));
        setSaveSuccess(`Chave do ${provider.name} salva com sucesso!`);
      } else {
        // Remove the key
        await adminAPI.removeApiKey(provider.key);
        setApiKeys(prev => ({ ...prev, [provider.key]: null }));
        setSaveSuccess(`Chave do ${provider.name} removida com sucesso!`);
      }
      
      // Clear success message after 3 seconds
      setTimeout(() => {
        setSaveSuccess(null);
      }, 3000);
      
    } catch (err: any) {
      console.error(`Erro ao salvar chave do ${provider.name}:`, err);
      setSaveError(`Erro ao salvar chave do ${provider.name}: ` + (err.response?.data?.message || err.message || 'Tente novamente'));
    } finally {
      setSavingProvider(null);
    }
  };

  // Handle reset to original value
  const handleReset = (provider: keyof ApiKeys) => {
    setTempKeys(prev => ({ 
      ...prev, 
      [provider]: apiKeys[provider] || '' 
    }));
    setSaveSuccess(null);
    setSaveError(null);
  };

  // Check if value changed
  const hasChanged = (provider: keyof ApiKeys): boolean => {
    return tempKeys[provider] !== (apiKeys[provider] || '');
  };

  if (loading || !isAuthenticated || !isSuperadmin) {
    return <div className="flex justify-center items-center h-screen">Carregando...</div>;
  }

  return (
    <Layout title="Configuração de APIs - Lyz">
      <div className="bg-gray-50 min-h-[calc(100vh-136px)] py-10">
        <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="mb-8">
            <div className="flex justify-between items-center">
              <div>
                <h1 className="text-3xl font-bold text-gray-900">Configuração de APIs</h1>
                <p className="mt-2 text-gray-600">
                  Configure as chaves de API para os diferentes provedores de IA
                </p>
              </div>
              <Link 
                href="/admin/dashboard" 
                className="text-primary-600 hover:text-primary-800 text-sm font-medium"
              >
                Voltar ao Painel
              </Link>
            </div>
          </div>
          
          {isLoading ? (
            <div className="flex justify-center items-center h-40">
              <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-primary-600"></div>
            </div>
          ) : (
            <div className="space-y-6">
              {/* Global Messages */}
              {saveSuccess && (
                <div className="bg-green-50 border border-green-200 rounded-md p-4">
                  <p className="text-green-800">{saveSuccess}</p>
                </div>
              )}
              
              {saveError && (
                <div className="bg-red-50 border border-red-200 rounded-md p-4">
                  <p className="text-red-800">{saveError}</p>
                </div>
              )}

              {/* API Providers */}
              {API_PROVIDERS.map((provider) => (
                <div key={provider.key} className="bg-white shadow-md rounded-lg overflow-hidden">
                  <div className="p-6">
                    <div className="flex items-center justify-between mb-4">
                      <div className="flex items-center space-x-3">
                        <div className={`w-4 h-4 rounded-full bg-${provider.color}-500`}></div>
                        <h2 className="text-xl font-semibold text-gray-900">{provider.name}</h2>
                        <span className={`px-2 py-1 text-xs rounded-full ${
                          apiKeys[provider.key] 
                            ? 'bg-green-100 text-green-800' 
                            : 'bg-gray-100 text-gray-800'
                        }`}>
                          {apiKeys[provider.key] ? 'Configurada' : 'Não configurada'}
                        </span>
                      </div>
                      <a
                        href={provider.docsUrl}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-primary-600 hover:text-primary-800 text-sm font-medium"
                      >
                        Obter Chave →
                      </a>
                    </div>
                    
                    <p className="text-gray-600 mb-4">{provider.description}</p>
                    
                    <div className="space-y-4">
                      <div>
                        <label htmlFor={`${provider.key}-key`} className="block text-sm font-medium text-gray-700 mb-2">
                          Chave de API
                        </label>
                        <input
                          id={`${provider.key}-key`}
                          type="text"
                          className={`w-full px-3 py-2 border ${
                            validationErrors[provider.key] ? 'border-red-500' : 'border-gray-300'
                          } rounded-md shadow-sm focus:outline-none focus:ring-primary-500 focus:border-primary-500 font-mono text-sm`}
                                                     value={tempKeys[provider.key] || ''}
                          onChange={(e) => handleInputChange(provider.key, e.target.value)}
                          placeholder={provider.placeholder}
                        />
                        {validationErrors[provider.key] && (
                          <p className="mt-1 text-sm text-red-600">
                            {validationErrors[provider.key]}
                          </p>
                        )}
                      </div>

                      <div className="flex items-center justify-between">
                                                 <div className="text-sm text-gray-500">
                           {apiKeys[provider.key] && (
                             <span>
                               Última atualização: {new Date().toLocaleDateString('pt-BR')}
                             </span>
                           )}
                         </div>
                        <div className="flex space-x-3">
                          {hasChanged(provider.key) && (
                            <button
                              type="button"
                              className="text-gray-600 hover:text-gray-800 text-sm font-medium"
                              onClick={() => handleReset(provider.key)}
                              disabled={savingProvider === provider.key}
                            >
                              Cancelar
                            </button>
                          )}
                          <button
                            type="button"
                            className={`px-4 py-2 rounded-md text-sm font-medium transition-colors ${
                              (savingProvider === provider.key || validationErrors[provider.key] || !hasChanged(provider.key))
                                ? 'bg-gray-200 text-gray-500 cursor-not-allowed'
                                : 'bg-primary-600 hover:bg-primary-700 text-white'
                            }`}
                            onClick={() => handleSaveApiKey(provider)}
                            disabled={savingProvider === provider.key || !!validationErrors[provider.key] || !hasChanged(provider.key)}
                          >
                            {savingProvider === provider.key ? 'Salvando...' : 
                             tempKeys[provider.key].trim() ? 'Salvar Chave' : 'Remover Chave'}
                          </button>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              ))}

              {/* Instructions */}
              <div className="bg-white shadow-md rounded-lg overflow-hidden p-6">
                <h2 className="text-xl font-semibold text-gray-800 mb-4">
                  Como usar múltiplas APIs
                </h2>
                <div className="prose max-w-none">
                  <p>O sistema Lyz pode utilizar diferentes provedores de IA para otimizar custos e performance:</p>
                  <ul className="list-disc list-inside space-y-2 ml-4">
                    <li><strong>OpenAI:</strong> Principal para GPT-4, geração de texto e análises complexas</li>
                    <li><strong>Google AI:</strong> Alternativa com Gemini para algumas análises específicas</li>
                    <li><strong>Anthropic:</strong> Claude para análises que requerem alta precisão ética</li>
                  </ul>
                  <p className="mt-4">
                    <strong>Dica:</strong> Configure pelo menos a OpenAI para garantir o funcionamento completo do sistema. 
                    As outras APIs são opcionais e serão usadas quando disponíveis.
                  </p>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </Layout>
  );
};

export default APIConfig; 