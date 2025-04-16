import React, { useEffect, useState } from 'react';
import Layout from '../../components/Layout';
import { useAuth } from '../../contexts/AuthContext';
import { useRouter } from 'next/router';
import { adminAPI } from '../../lib/api';
import Link from 'next/link';

const TranscriptionConfig: React.FC = () => {
  const { user, isAuthenticated, isSuperadmin, loading } = useAuth();
  const router = useRouter();
  
  const [jsonContent, setJsonContent] = useState('');
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [saveSuccess, setSaveSuccess] = useState(false);
  const [saveError, setSaveError] = useState<string | null>(null);
  const [validJSON, setValidJSON] = useState(true);

  // Redirect if not authenticated or not superadmin
  useEffect(() => {
    if (!loading && (!isAuthenticated || !isSuperadmin)) {
      router.push('/auth/login');
    }
  }, [isAuthenticated, isSuperadmin, loading, router]);

  // Fetch current Google Speech credentials
  const fetchGoogleCredentials = async () => {
    try {
      setIsLoading(true);
      const response = await adminAPI.getGoogleSpeechConfig();
      if (response.data.config) {
        // Pretty print the JSON
        const formattedJson = JSON.stringify(JSON.parse(response.data.config), null, 2);
        setJsonContent(formattedJson);
      } else {
        setJsonContent('');
      }
      setSaveSuccess(false);
      setSaveError(null);
    } catch (err: any) {
      console.error('Erro ao carregar configuração do Google Speech:', err);
      setSaveError('Erro ao carregar configuração: ' + (err.message || 'Tente novamente'));
      setJsonContent('');
    } finally {
      setIsLoading(false);
    }
  };

  // Load configuration on mount
  useEffect(() => {
    if (isAuthenticated && isSuperadmin) {
      fetchGoogleCredentials();
    }
  }, [isAuthenticated, isSuperadmin]);

  // Validate JSON when content changes
  useEffect(() => {
    try {
      if (jsonContent.trim() === '') {
        setValidJSON(true);
        return;
      }
      JSON.parse(jsonContent);
      setValidJSON(true);
    } catch (e) {
      setValidJSON(false);
    }
  }, [jsonContent]);

  // Handle save configuration
  const handleSaveConfig = async () => {
    if (!validJSON) {
      setSaveError('O JSON fornecido é inválido. Corrija antes de salvar.');
      return;
    }
    
    try {
      setIsSaving(true);
      setSaveSuccess(false);
      setSaveError(null);
      
      await adminAPI.updateGoogleSpeechConfig({ 
        config: jsonContent.trim() ? jsonContent : null 
      });
      
      setSaveSuccess(true);
      
      // Clear success message after 3 seconds
      setTimeout(() => {
        setSaveSuccess(false);
      }, 3000);
      
    } catch (err: any) {
      console.error('Erro ao salvar configuração:', err);
      setSaveError('Erro ao salvar configuração: ' + (err.message || 'Tente novamente'));
    } finally {
      setIsSaving(false);
    }
  };

  // Handle file upload
  const handleFileUpload = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (e) => {
      try {
        const content = e.target?.result as string;
        // Verify it's valid JSON
        const parsed = JSON.parse(content);
        // Pretty print the JSON
        const formatted = JSON.stringify(parsed, null, 2);
        setJsonContent(formatted);
        setValidJSON(true);
      } catch (err) {
        setSaveError('O arquivo selecionado não contém um JSON válido.');
        setValidJSON(false);
      }
    };
    reader.readAsText(file);
  };

  if (loading || !isAuthenticated || !isSuperadmin) {
    return <div className="flex justify-center items-center h-screen">Carregando...</div>;
  }

  return (
    <Layout title="Configuração de Transcrição - Lyz">
      <div className="bg-gray-50 min-h-[calc(100vh-136px)] py-10">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="mb-8">
            <h1 className="text-3xl font-bold text-gray-900">
              Configuração de Transcrição
            </h1>
            <p className="mt-2 text-gray-600">
              Configure as credenciais do Google Speech para o serviço de transcrição de áudio
            </p>
          </div>

          <div className="bg-white shadow-md rounded-lg overflow-hidden p-6">
            <div className="mb-6">
              <h2 className="text-xl font-semibold text-gray-800 mb-4">
                Credenciais do Google Cloud
              </h2>
              <p className="text-gray-600 mb-4">
                Cole o conteúdo do arquivo JSON de credenciais do Google Cloud para a API Speech-to-Text 
                ou faça upload do arquivo diretamente.
              </p>
              <div className="mb-4">
                <label className="inline-block bg-primary-600 hover:bg-primary-700 text-white font-medium py-2 px-4 rounded-md cursor-pointer transition-colors">
                  <span>Fazer upload do arquivo JSON</span>
                  <input 
                    type="file" 
                    accept=".json" 
                    className="hidden" 
                    onChange={handleFileUpload}
                  />
                </label>
              </div>
            </div>

            {isLoading ? (
              <div className="text-center py-8">
                <p className="text-gray-500">Carregando configuração...</p>
              </div>
            ) : (
              <>
                <div className="mb-6">
                  <label htmlFor="json-content" className="block text-sm font-medium text-gray-700 mb-2">
                    Conteúdo JSON das Credenciais
                  </label>
                  <textarea
                    id="json-content"
                    rows={15}
                    className={`w-full px-3 py-2 border ${
                      !validJSON ? 'border-red-500' : 'border-gray-300'
                    } rounded-md shadow-sm focus:outline-none focus:ring-primary-500 focus:border-primary-500 font-mono text-sm`}
                    value={jsonContent}
                    onChange={(e) => setJsonContent(e.target.value)}
                    placeholder='{"type": "service_account", "project_id": "seu-projeto", ...}'
                  ></textarea>
                  {!validJSON && (
                    <p className="mt-1 text-sm text-red-600">
                      O JSON fornecido é inválido. Verifique a formatação.
                    </p>
                  )}
                </div>

                <div className="flex items-center justify-between">
                  <div>
                    {saveSuccess && (
                      <p className="text-sm text-green-600">
                        Configuração salva com sucesso!
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
                      onClick={fetchGoogleCredentials}
                      disabled={isLoading || isSaving}
                    >
                      Cancelar
                    </button>
                    <button
                      type="button"
                      className={`bg-primary-600 hover:bg-primary-700 text-white font-medium py-2 px-4 rounded-md transition-colors ${
                        (isSaving || !validJSON) ? 'opacity-50 cursor-not-allowed' : ''
                      }`}
                      onClick={handleSaveConfig}
                      disabled={isSaving || !validJSON}
                    >
                      {isSaving ? 'Salvando...' : 'Salvar Configuração'}
                    </button>
                  </div>
                </div>
              </>
            )}
          </div>

          <div className="mt-8 bg-white shadow-md rounded-lg overflow-hidden p-6">
            <h2 className="text-xl font-semibold text-gray-800 mb-4">
              Instruções
            </h2>
            <div className="prose max-w-none">
              <p>Para obter credenciais do Google Cloud para a API Speech-to-Text, siga os passos abaixo:</p>
              <ol className="list-decimal list-inside space-y-2 ml-4">
                <li>Acesse o <a href="https://console.cloud.google.com/" target="_blank" rel="noopener noreferrer" className="text-primary-600 hover:underline">Console do Google Cloud</a></li>
                <li>Crie um novo projeto ou selecione um projeto existente</li>
                <li>Ative a API Speech-to-Text para o projeto</li>
                <li>Crie uma conta de serviço e gere uma chave JSON</li>
                <li>Faça o download do arquivo JSON de credenciais</li>
                <li>Cole o conteúdo do arquivo JSON no campo acima ou faça upload do arquivo</li>
              </ol>
              <p className="mt-4">
                <strong>Nota:</strong> As credenciais serão armazenadas de forma segura e utilizadas apenas 
                para a funcionalidade de transcrição de áudio no sistema Lyz.
              </p>
            </div>
          </div>
        </div>
      </div>
    </Layout>
  );
};

export default TranscriptionConfig;
