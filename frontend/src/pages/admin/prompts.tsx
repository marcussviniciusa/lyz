import React, { useEffect, useState } from 'react';
import Layout from '../../components/Layout';
import { useAuth } from '../../contexts/AuthContext';
import { useRouter } from 'next/router';
import { adminAPI } from '../../lib/api';
import Link from 'next/link';

interface Prompt {
  id: string;
  step_key: string;
  content: string;
  temperature: number;
  max_tokens: number;
  updated_at: string;
  updated_by?: number;
}

const PromptsPage: React.FC = () => {
  const { user, isAuthenticated, isSuperadmin, loading } = useAuth();
  const router = useRouter();
  
  const [prompts, setPrompts] = useState<Prompt[]>([]);
  const [selectedPrompt, setSelectedPrompt] = useState<Prompt | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  
  // Estado para controle do formulário
  const [editContent, setEditContent] = useState('');
  const [isSaving, setIsSaving] = useState(false);
  const [saveSuccess, setSaveSuccess] = useState(false);
  const [saveError, setSaveError] = useState<string | null>(null);

  // Redirect if not authenticated or not superadmin
  useEffect(() => {
    if (!loading && (!isAuthenticated || !isSuperadmin)) {
      router.push('/auth/login');
    }
  }, [isAuthenticated, isSuperadmin, loading, router]);

  // Fetch prompts data
  const fetchPrompts = async () => {
    try {
      setIsLoading(true);
      setError(null);
      const response = await adminAPI.getPrompts();
      setPrompts(response.data.prompts || []);
    } catch (err: any) {
      console.error('Error fetching prompts:', err);
      setError('Erro ao carregar prompts: ' + (err.message || 'Tente novamente'));
    } finally {
      setIsLoading(false);
    }
  };

  // Load prompts on mount
  useEffect(() => {
    if (isAuthenticated && isSuperadmin) {
      fetchPrompts();
    }
  }, [isAuthenticated, isSuperadmin]);

  // Handle prompt selection
  const handleSelectPrompt = async (promptId: string) => {
    try {
      setIsLoading(true);
      const response = await adminAPI.getPromptById(promptId);
      const prompt = response.data.prompt;
      setSelectedPrompt(prompt);
      setEditContent(prompt.content);
      setSaveSuccess(false);
      setSaveError(null);
    } catch (err: any) {
      console.error('Error loading prompt:', err);
      alert('Erro ao carregar prompt: ' + (err.message || 'Tente novamente'));
    } finally {
      setIsLoading(false);
    }
  };

  // Handle save prompt
  const handleSavePrompt = async () => {
    if (!selectedPrompt) return;
    
    try {
      setIsSaving(true);
      setSaveSuccess(false);
      setSaveError(null);
      
      await adminAPI.updatePrompt(selectedPrompt.id, {
        content: editContent
      });
      
      // Update local state
      setPrompts(prompts.map(p => 
        p.id === selectedPrompt.id 
          ? { ...p, content: editContent, updated_at: new Date().toISOString() }
          : p
      ));
      
      setSelectedPrompt({
        ...selectedPrompt,
        content: editContent,
        updated_at: new Date().toISOString()
      });
      
      setSaveSuccess(true);
      
      // Clear success message after 3 seconds
      setTimeout(() => {
        setSaveSuccess(false);
      }, 3000);
      
    } catch (err: any) {
      console.error('Error saving prompt:', err);
      setSaveError('Erro ao salvar prompt: ' + (err.message || 'Tente novamente'));
    } finally {
      setIsSaving(false);
    }
  };

  if (loading || !isAuthenticated || !isSuperadmin) {
    return <div className="flex justify-center items-center h-screen">Carregando...</div>;
  }

  return (
    <Layout title="Gerenciar Prompts - Lyz">
      <div className="bg-gray-50 min-h-[calc(100vh-136px)] py-10">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="mb-8">
            <h1 className="text-3xl font-bold text-gray-900">
              Gerenciamento de Prompts
            </h1>
            <p className="mt-2 text-gray-600">
              Edite os prompts utilizados pelo sistema Lyz para interação com IA
            </p>
          </div>

          <div className="flex flex-col lg:flex-row gap-6">
            {/* Prompts List */}
            <div className="w-full lg:w-1/3">
              <div className="bg-white shadow-md rounded-lg overflow-hidden">
                <div className="px-6 py-4 border-b border-gray-200">
                  <h2 className="text-xl font-semibold text-gray-800">Prompts Disponíveis</h2>
                </div>

                {isLoading && !selectedPrompt ? (
                  <div className="text-center py-8">
                    <p className="text-gray-500">Carregando prompts...</p>
                  </div>
                ) : error ? (
                  <div className="text-center py-8 text-red-500">
                    <p>{error}</p>
                    <button
                      className="mt-2 text-primary-600 hover:underline"
                      onClick={fetchPrompts}
                    >
                      Tentar novamente
                    </button>
                  </div>
                ) : prompts.length === 0 ? (
                  <div className="text-center py-8">
                    <p className="text-gray-500">Nenhum prompt encontrado.</p>
                  </div>
                ) : (
                  <div className="divide-y divide-gray-200">
                    {prompts.map((prompt) => (
                      <button
                        key={prompt.id}
                        onClick={() => handleSelectPrompt(prompt.id)}
                        className={`w-full text-left px-6 py-4 hover:bg-gray-50 transition-colors ${
                          selectedPrompt?.id === prompt.id ? 'bg-blue-50' : ''
                        }`}
                      >
                        <p className="font-medium text-gray-900">{prompt.step_key}</p>
                        <p className="text-sm text-gray-500 truncate">{prompt.step_key}</p>
                        <p className="text-xs text-gray-400 mt-1">
                          Atualizado em: {new Date(prompt.updated_at).toLocaleString('pt-BR')}
                        </p>
                      </button>
                    ))}
                  </div>
                )}
              </div>
            </div>

            {/* Prompt Editor */}
            <div className="w-full lg:w-2/3">
              <div className="bg-white shadow-md rounded-lg overflow-hidden">
                <div className="px-6 py-4 border-b border-gray-200">
                  <h2 className="text-xl font-semibold text-gray-800">
                    {selectedPrompt 
                      ? `Editando: ${selectedPrompt.step_key}`
                      : 'Selecione um prompt para editar'}
                  </h2>
                </div>

                {!selectedPrompt ? (
                  <div className="text-center py-16">
                    <p className="text-gray-500">
                      Selecione um prompt da lista para começar a editar
                    </p>
                  </div>
                ) : isLoading ? (
                  <div className="text-center py-16">
                    <p className="text-gray-500">Carregando conteúdo do prompt...</p>
                  </div>
                ) : (
                  <div className="p-6">
                    {saveSuccess && (
                      <div className="mb-4 bg-green-50 border border-green-200 text-green-700 px-4 py-3 rounded">
                        Prompt salvo com sucesso!
                      </div>
                    )}
                    
                    {saveError && (
                      <div className="mb-4 bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded">
                        {saveError}
                      </div>
                    )}
                    
                    <div className="mb-6">
                      <label htmlFor="prompt-content" className="block text-sm font-medium text-gray-700 mb-2">
                        Conteúdo do Prompt
                      </label>
                      <textarea
                        id="prompt-content"
                        value={editContent}
                        onChange={(e) => setEditContent(e.target.value)}
                        className="w-full h-80 border border-gray-300 rounded-md py-2 px-3 focus:outline-none focus:ring-2 focus:ring-primary-500 font-mono text-sm"
                      />
                      <p className="mt-1 text-sm text-gray-500">
                        Use as variáveis entre chaves para inserir informações dinâmicas, ex: {'{patient_name}'}
                      </p>
                    </div>
                    
                    <div className="flex justify-end">
                      <button
                        onClick={handleSavePrompt}
                        disabled={isSaving}
                        className="bg-primary-600 hover:bg-primary-700 text-white font-medium py-2 px-6 rounded-lg"
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

export default PromptsPage;
