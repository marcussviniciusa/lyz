import React, { useEffect, useState } from 'react';
import Layout from '../../components/Layout';
import { useAuth } from '../../contexts/AuthContext';
import { useRouter } from 'next/router';
import { adminAPI } from '../../lib/api';
import Link from 'next/link';

interface AIConfiguration {
  id: number;
  page_key: string;
  model: string;
  prompt: string;
  temperature: number;
  max_tokens: number;
  is_active: boolean;
  created_at: string;
  updated_at: string;
  updated_by?: number;
  updatedBy?: {
    id: number;
    name: string;
    email: string;
  };
}

const pageLabels: Record<string, string> = {
  lab_analysis: 'Análise Laboratorial',
  tcm_analysis: 'Análise TCM',
  timeline_generation: 'Geração de Timeline',
  ifm_matrix: 'Matriz IFM',
  final_plan: 'Plano Final'
};

const availableModels = [
  { value: 'gpt-4o-mini', label: 'GPT-4o Mini (Recomendado)', provider: 'OpenAI' },
  { value: 'gpt-4.5', label: 'GPT-4.5', provider: 'OpenAI' },
  { value: 'gpt-4.1-mini', label: 'GPT-4.1 Mini', provider: 'OpenAI' },
  { value: 'claude-sonnet-3.7', label: 'Claude Sonnet 3.7', provider: 'Anthropic' },
  { value: 'claude-sonnet-4', label: 'Claude Sonnet 4', provider: 'Anthropic' },
  { value: 'gemini-2.5-pro', label: 'Gemini 2.5 Pro', provider: 'Google' }
];

const AIConfigurationsPage: React.FC = () => {
  const { user, isAuthenticated, isSuperadmin, loading } = useAuth();
  const router = useRouter();
  
  const [configurations, setConfigurations] = useState<AIConfiguration[]>([]);
  const [selectedConfig, setSelectedConfig] = useState<AIConfiguration | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  
  // Form state
  const [editModel, setEditModel] = useState('');
  const [editPrompt, setEditPrompt] = useState('');
  const [editTemperature, setEditTemperature] = useState(0.7);
  const [editMaxTokens, setEditMaxTokens] = useState(2000);
  const [editIsActive, setEditIsActive] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [saveSuccess, setSaveSuccess] = useState(false);
  const [saveError, setSaveError] = useState<string | null>(null);

  // Redirect if not authenticated or not superadmin
  useEffect(() => {
    if (!loading && (!isAuthenticated || !isSuperadmin)) {
      router.push('/auth/login');
    }
  }, [isAuthenticated, isSuperadmin, loading, router]);

  // Fetch configurations
  const fetchConfigurations = async () => {
    try {
      setIsLoading(true);
      setError(null);
      const response = await adminAPI.getAIConfigurations();
      console.log('AI Configurations Response:', response.data);
      setConfigurations(response.data.data?.configurations || []);
    } catch (err: any) {
      console.error('Error fetching configurations:', err);
      setError('Erro ao carregar configurações: ' + (err.message || 'Tente novamente'));
    } finally {
      setIsLoading(false);
    }
  };

  // Load configurations on mount
  useEffect(() => {
    if (isAuthenticated && isSuperadmin) {
      fetchConfigurations();
    }
  }, [isAuthenticated, isSuperadmin]);

  // Handle configuration selection
  const handleSelectConfiguration = async (configId: number) => {
    try {
      setIsLoading(true);
      const response = await adminAPI.getAIConfigurationById(configId.toString());
      const config = response.data.data?.configuration;
      setSelectedConfig(config);
      setEditModel(config.model);
      setEditPrompt(config.prompt);
      setEditTemperature(config.temperature);
      setEditMaxTokens(config.max_tokens);
      setEditIsActive(config.is_active);
      setSaveSuccess(false);
      setSaveError(null);
    } catch (err: any) {
      console.error('Error loading configuration:', err);
      alert('Erro ao carregar configuração: ' + (err.message || 'Tente novamente'));
    } finally {
      setIsLoading(false);
    }
  };

  // Handle save configuration
  const handleSaveConfiguration = async () => {
    if (!selectedConfig) return;
    
    try {
      setIsSaving(true);
      setSaveSuccess(false);
      setSaveError(null);
      
      await adminAPI.updateAIConfiguration(selectedConfig.id.toString(), {
        model: editModel,
        prompt: editPrompt,
        temperature: editTemperature,
        max_tokens: editMaxTokens,
        is_active: editIsActive
      });
      
      // Update local state
      setConfigurations(configurations.map(config => 
        config.id === selectedConfig.id 
          ? { 
              ...config, 
              model: editModel,
              prompt: editPrompt,
              temperature: editTemperature,
              max_tokens: editMaxTokens,
              is_active: editIsActive,
              updated_at: new Date().toISOString()
            }
          : config
      ));
      
      setSelectedConfig({
        ...selectedConfig,
        model: editModel,
        prompt: editPrompt,
        temperature: editTemperature,
        max_tokens: editMaxTokens,
        is_active: editIsActive,
        updated_at: new Date().toISOString()
      });
      
      setSaveSuccess(true);
      
      // Clear success message after 3 seconds
      setTimeout(() => {
        setSaveSuccess(false);
      }, 3000);
      
    } catch (err: any) {
      console.error('Error saving configuration:', err);
      setSaveError('Erro ao salvar configuração: ' + (err.message || 'Tente novamente'));
    } finally {
      setIsSaving(false);
    }
  };

  if (loading || !isAuthenticated || !isSuperadmin) {
    return <div className="flex justify-center items-center h-screen">Carregando...</div>;
  }

  return (
    <Layout title="Configurações de IA - Lyz">
      <div className="bg-gray-50 min-h-[calc(100vh-136px)] py-10">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="mb-8">
            <h1 className="text-3xl font-bold text-gray-900">
              Configurações de IA
            </h1>
            <p className="mt-2 text-gray-600">
              Gerencie modelos, prompts e configurações de IA para cada página do sistema Lyz
            </p>
          </div>

          <div className="flex flex-col lg:flex-row gap-6">
            {/* Configurations List */}
            <div className="w-full lg:w-1/3">
              <div className="bg-white shadow-md rounded-lg overflow-hidden">
                <div className="px-6 py-4 border-b border-gray-200">
                  <h2 className="text-xl font-semibold text-gray-800">Configurações Disponíveis</h2>
                </div>

                {isLoading && !selectedConfig ? (
                  <div className="text-center py-8">
                    <p className="text-gray-500">Carregando configurações...</p>
                  </div>
                ) : error ? (
                  <div className="text-center py-8 text-red-500">
                    <p>{error}</p>
                    <button
                      className="mt-2 text-primary-600 hover:underline"
                      onClick={fetchConfigurations}
                    >
                      Tentar novamente
                    </button>
                  </div>
                ) : configurations.length === 0 ? (
                  <div className="text-center py-8">
                    <p className="text-gray-500">Nenhuma configuração encontrada.</p>
                  </div>
                ) : (
                  <div className="divide-y divide-gray-200">
                    {configurations.map((config) => (
                      <button
                        key={config.id}
                        onClick={() => handleSelectConfiguration(config.id)}
                        className={`w-full text-left px-6 py-4 hover:bg-gray-50 transition-colors ${
                          selectedConfig?.id === config.id ? 'bg-blue-50' : ''
                        }`}
                      >
                        <div className="flex justify-between items-start mb-2">
                          <p className="font-medium text-gray-900">
                            {pageLabels[config.page_key] || config.page_key}
                          </p>
                          <span className={`px-2 py-1 text-xs rounded-full ${
                            config.is_active 
                              ? 'bg-green-100 text-green-800' 
                              : 'bg-red-100 text-red-800'
                          }`}>
                            {config.is_active ? 'Ativo' : 'Inativo'}
                          </span>
                        </div>
                        <p className="text-sm text-gray-500 mb-1">
                          Modelo: {config.model}
                        </p>
                        <p className="text-sm text-gray-500 mb-1">
                          Temp: {config.temperature} | Tokens: {config.max_tokens}
                        </p>
                        <p className="text-xs text-gray-400">
                          Atualizado em: {new Date(config.updated_at).toLocaleString('pt-BR')}
                        </p>
                      </button>
                    ))}
                  </div>
                )}
              </div>
            </div>

            {/* Configuration Editor */}
            <div className="w-full lg:w-2/3">
              <div className="bg-white shadow-md rounded-lg overflow-hidden">
                <div className="px-6 py-4 border-b border-gray-200">
                  <h2 className="text-xl font-semibold text-gray-800">
                    {selectedConfig 
                      ? `Editando: ${pageLabels[selectedConfig.page_key] || selectedConfig.page_key}`
                      : 'Selecione uma configuração para editar'}
                  </h2>
                </div>

                {!selectedConfig ? (
                  <div className="text-center py-16">
                    <p className="text-gray-500">
                      Selecione uma configuração da lista para começar a editar
                    </p>
                  </div>
                ) : isLoading ? (
                  <div className="text-center py-16">
                    <p className="text-gray-500">Carregando configuração...</p>
                  </div>
                ) : (
                  <div className="p-6">
                    {saveSuccess && (
                      <div className="mb-4 bg-green-50 border border-green-200 text-green-700 px-4 py-3 rounded">
                        Configuração salva com sucesso!
                      </div>
                    )}
                    
                    {saveError && (
                      <div className="mb-4 bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded">
                        {saveError}
                      </div>
                    )}

                    <div className="space-y-6">
                      {/* Model Selection */}
                      <div>
                        <label htmlFor="model" className="block text-sm font-medium text-gray-700 mb-2">
                          Modelo de IA
                        </label>
                        <select
                          id="model"
                          value={editModel}
                          onChange={(e) => setEditModel(e.target.value)}
                          className="w-full border border-gray-300 rounded-md py-2 px-3 focus:outline-none focus:ring-2 focus:ring-primary-500"
                        >
                          {availableModels.map((model) => (
                            <option key={model.value} value={model.value}>
                              {model.label} ({model.provider})
                            </option>
                          ))}
                        </select>
                      </div>

                      {/* Temperature */}
                      <div>
                        <label htmlFor="temperature" className="block text-sm font-medium text-gray-700 mb-2">
                          Temperatura ({editTemperature})
                        </label>
                        <input
                          type="range"
                          id="temperature"
                          min="0"
                          max="2"
                          step="0.1"
                          value={editTemperature}
                          onChange={(e) => setEditTemperature(parseFloat(e.target.value))}
                          className="w-full"
                        />
                        <div className="flex justify-between text-xs text-gray-500 mt-1">
                          <span>Conservador (0)</span>
                          <span>Criativo (2)</span>
                        </div>
                      </div>

                      {/* Max Tokens */}
                      <div>
                        <label htmlFor="max-tokens" className="block text-sm font-medium text-gray-700 mb-2">
                          Máximo de Tokens
                        </label>
                        <input
                          type="number"
                          id="max-tokens"
                          min="100"
                          max="8000"
                          step="100"
                          value={editMaxTokens}
                          onChange={(e) => setEditMaxTokens(parseInt(e.target.value))}
                          className="w-full border border-gray-300 rounded-md py-2 px-3 focus:outline-none focus:ring-2 focus:ring-primary-500"
                        />
                      </div>

                      {/* Active Status */}
                      <div>
                        <label className="flex items-center">
                          <input
                            type="checkbox"
                            checked={editIsActive}
                            onChange={(e) => setEditIsActive(e.target.checked)}
                            className="mr-2"
                          />
                          <span className="text-sm font-medium text-gray-700">
                            Configuração ativa
                          </span>
                        </label>
                      </div>

                      {/* Prompt Content */}
                      <div>
                        <label htmlFor="prompt-content" className="block text-sm font-medium text-gray-700 mb-2">
                          Conteúdo do Prompt
                        </label>
                        <textarea
                          id="prompt-content"
                          value={editPrompt}
                          onChange={(e) => setEditPrompt(e.target.value)}
                          className="w-full h-80 border border-gray-300 rounded-md py-2 px-3 focus:outline-none focus:ring-2 focus:ring-primary-500 font-mono text-sm"
                        />
                        <p className="mt-1 text-sm text-gray-500">
                          Use variáveis dinâmicas entre chaves quando necessário, ex: {'{patient_name}'}
                        </p>
                      </div>
                    </div>
                    
                    <div className="flex justify-end mt-6">
                      <button
                        onClick={handleSaveConfiguration}
                        disabled={isSaving}
                        className="bg-primary-600 hover:bg-primary-700 text-white font-medium py-2 px-6 rounded-lg disabled:opacity-50"
                      >
                        {isSaving ? 'Salvando...' : 'Salvar Alterações'}
                      </button>
                    </div>
                  </div>
                )}
              </div>
            </div>
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

export default AIConfigurationsPage; 