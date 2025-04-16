import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/router';
import Link from 'next/link';
import Layout from '../../../components/Layout';
import { useAuth } from '../../../contexts/AuthContext';
import { planAPI } from '../../../lib/api';
import FormInputOptions from '../../../components/FormInputOptions';
import TCMAnalysisAnimation from '../../../components/analysis/TCMAnalysisAnimation';

type TCMObservations = {
  tongue: {
    color: string;
    coating: string;
    shape: string;
    moisture: string;
    notes: string;
  };
  pulse: {
    rate: string;
    strength: string;
    rhythm: string;
    quality: string;
    notes: string;
  };
  pattern_diagnosis: string;
  treatment_principles: string;
  additional_notes: string;
  analyzed_data?: any;
};

type PlanData = {
  id: string;
  user_id: number;
  patient_data: {
    name: string;
    age?: number;
    gender?: string;
  };
  // Removed questionnaire_data
  lab_results?: any;
  tcm_observations?: TCMObservations;
  professional_type: string;
};

const TCMObservationsPage: React.FC = () => {
  const { user, loading: authLoading } = useAuth();
  const router = useRouter();
  const { id } = router.query;
  
  const [plan, setPlan] = useState<PlanData | null>(null);
  const [formData, setFormData] = useState<TCMObservations>({
    tongue: {
      color: '',
      coating: '',
      shape: '',
      moisture: '',
      notes: '',
    },
    pulse: {
      rate: '',
      strength: '',
      rhythm: '',
      quality: '',
      notes: '',
    },
    pattern_diagnosis: '',
    treatment_principles: '',
    additional_notes: '',
  });
  
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  const [analyzing, setAnalyzing] = useState(false);
  const [analysisComplete, setAnalysisComplete] = useState(false);

  // Busca os dados do plano quando o componente é montado
  useEffect(() => {
    if (!user && !authLoading) {
      router.push('/auth/login');
    }
  }, [user, authLoading, router]);

  useEffect(() => {
    const fetchPlanDetails = async () => {
      if (!id) return;
      
      try {
        setLoading(true);
        const response = await planAPI.getPlanById(id as string);
        const planData = response.data.plan || null;
        
        setPlan(planData);
        
        // Se já existem observações TCM, preenche o formulário
        if (planData?.tcm_observations) {
          setFormData(planData.tcm_observations);
        }
        
        setError(null);
      } catch (err: any) {
        setError('Erro ao carregar detalhes do plano: ' + (err.message || 'Tente novamente mais tarde'));
        console.error('Error fetching plan details:', err);
      } finally {
        setLoading(false);
      }
    };

    if (user && id) {
      fetchPlanDetails();
    }
  }, [user, id]);

  // Verifica se as etapas anteriores foram preenchidas
  useEffect(() => {
    if (plan) {
      if (!plan.lab_results) {
        setError('É necessário enviar os resultados laboratoriais antes das observações TCM');
      }
    }
  }, [plan]);

  // Handlers para atualizar o estado do formulário
  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target;
    
    if (name.includes('.')) {
      const [section, field] = name.split('.');
      setFormData(prev => ({
        ...prev,
        [section]: {
          ...prev[section as keyof TCMObservations] as any,
          [field]: value
        }
      }));
    } else {
      setFormData(prev => ({
        ...prev,
        [name]: value
      }));
    }
  };
  
  // Função para analisar as observações TCM
  const performTCMAnalysis = async () => {
    if (!id) throw new Error('ID do plano não encontrado');
    
    try {
      console.log('Iniciando análise TCM...');
      
      // Verificar se temos algum dado TCM para analisar
      // Em vez de exigir todos os campos, verificamos se pelo menos alguns deles estão preenchidos
      const hasTongueData = formData.tongue.color || formData.tongue.coating || formData.tongue.shape || formData.tongue.moisture;
      const hasPulseData = formData.pulse.rate || formData.pulse.strength || formData.pulse.rhythm || formData.pulse.quality;
      const hasOtherData = formData.pattern_diagnosis || formData.treatment_principles || formData.additional_notes;
      
      // Se não houver nenhum dado relevante, usamos dados de exemplo para permitir que a demonstração continue
      if (!hasTongueData && !hasPulseData && !hasOtherData) {
        console.log('Usando dados de demonstração para análise TCM');
        // Preenchendo dados mínimos para a análise funcionar
        formData.tongue.color = formData.tongue.color || 'Pálida';
        formData.pulse.rate = formData.pulse.rate || 'Lento';
        formData.pattern_diagnosis = formData.pattern_diagnosis || 'Análise demonstrativa - falta de dados';
      }
      
      // Preparar os dados da análise com todas as informações contextuais necessárias
      // O sistema Lyz espera os dados no formato { tcm_observations: data }
      // E também inclui dados adicionais do paciente para contexto da análise
      const analysisInput = {
        ...formData,  // Dados TCM diretamente no objeto
        context: {
          patient_data: plan?.patient_data || {},
          lab_results: plan?.lab_results || {}  // Incluir resultados laboratoriais para análise mais completa
        }
      };
      
      try {
        console.log('Enviando dados para análise TCM:', { id, dados: analysisInput });
        
        // Usar um endpoint alternativo se necessário
        // O endpoint principal é /plans/:id/tcm, mas também podemos usar uma API específica de IA
        let response;
        
        try {
          // Tentativa 1: Usar o endpoint padrão da API
          response = await planAPI.analyzeTCM(id as string, analysisInput);
          console.log('Resposta (endpoint padrão):', response?.data);
        } catch (apiError: any) {
          console.warn('Erro no endpoint principal de análise:', apiError?.message);
          
          // Tentativa 2: Tentar usar um endpoint alternativo de análise - só para desenvolvimento
          try {
            // Endpoint alternativo que usa a API de análise diretamente com o prompt "tcm_analysis"
            response = await planAPI.updateTCM(id as string, {
              ...formData,
              _analyze: true, // Sinalizador especial para análise
              _prompt_key: 'tcm_analysis' // Chave do prompt a ser usado
            });
            console.log('Resposta (endpoint alternativo):', response?.data);
          } catch (fallbackError) {
            console.error('Falha em ambos endpoints de análise:', fallbackError);
            throw new Error('Falha em todos os endpoints de análise disponíveis');
          }
        }
        
        // Extrair dados da análise - verificar vários caminhos possíveis na resposta
        const analysisData = response?.data?.analyzed_data || 
                            response?.data?.tcm_analysis_results || 
                            response?.data?.analysis_results ||
                            response?.data?.ai_analysis;
                            
        if (analysisData) {
          console.log('Dados de análise extraídos com sucesso:', analysisData);
          return analysisData;
        }
        
        // Se chegou aqui mas temos ALGUM dado na resposta, tente usar diretamente
        if (response?.data && typeof response.data === 'object') {
          // Verificar se o objeto de resposta tem chaves que parecem análise
          const hasAnalysisKeys = Object.keys(response.data).some(key => 
            ['patterns', 'diagnosis', 'recommendations', 'analysis', 'summary'].includes(key)
          );
          
          if (hasAnalysisKeys) {
            console.log('Usando dados diretos da resposta como análise');
            return response.data;
          }
        }
        
        // Se chegou aqui, realmente não temos dados da API
        throw new Error('A API não retornou dados de análise utilizáveis');
      } catch (apiError) {
        console.error('Falha na API de análise TCM:', apiError);
        
        // Mostrar mensagem de erro real, em vez de dados simulados
        throw new Error('Não foi possível realizar a análise TCM. Entre em contato com o suporte técnico.');
      }
    } catch (err) {
      console.error('Erro analisando observações TCM:', err);
      throw err;
    }
  };
  
  // Esta função será passada para o componente de animação
  const analyzeTCM = performTCMAnalysis;
  
  // Função de callback quando a análise é concluída
  const handleAnalysisComplete = (analysisData: any) => {
    setAnalysisComplete(true);
    
    // Validar e normalizar os dados de análise para garantir uma estrutura consistente
    const validatedData = {
      patterns: Array.isArray(analysisData?.patterns) ? analysisData.patterns : [],
      summary: analysisData?.summary || 'Análise das observações TCM concluída',
      recommendations: Array.isArray(analysisData?.recommendations) ? analysisData.recommendations : []
    };
    
    if (id && plan) {
      // Atualizar as observações TCM no backend com os dados da análise
      // Seguindo a estrutura esperada: { tcm_observations: data }
      const updatedTCMData = {
        ...formData,
        analyzed_data: validatedData
      };
      
      planAPI.updateTCM(id as string, updatedTCMData)
        .then(() => {
          console.log('Análise TCM salva com sucesso');
        })
        .catch(err => {
          console.error('Erro ao salvar análise TCM:', err);
          // Continuar mesmo com erro no salvamento, já que os dados estão disponíveis localmente
        });
      
      // Atualizar o estado local do plano
      setPlan({
        ...plan,
        tcm_observations: updatedTCMData
      });
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!id) return;
    
    try {
      setSaving(true);
      setSuccessMessage(null);
      setError(null);
      
      console.log('Enviando dados de TCM para API:', {
        endpoint: `/plans/${id}/tcm`,
        data: formData
      });
      
      await planAPI.updateTCM(id as string, formData);
      
      setSuccessMessage('Observações TCM salvas com sucesso!');
      
      // Iniciar análise automaticamente após salvamento
      setTimeout(() => {
        setAnalyzing(true);
      }, 500);
      
    } catch (err: any) {
      const errorMessage = err.response?.data?.message || err.message || 'Tente novamente mais tarde';
      const statusCode = err.response?.status || 'Desconhecido';
      
      setError(`Erro ao salvar observações TCM (${statusCode}): ${errorMessage}`);
      console.error('Error saving TCM observations:', {
        status: statusCode,
        message: errorMessage,
        details: err.response?.data,
        axiosError: err
      });
    } finally {
      setSaving(false);
    }
  };

  if (authLoading || loading) {
    return (
      <Layout title="Carregando Observações TCM - Lyz">
        <div className="flex justify-center py-20">
          <div className="text-center">
            <div className="spinner-border h-10 w-10 text-primary-600 animate-spin"></div>
            <p className="mt-4 text-lg text-gray-600">Carregando dados...</p>
          </div>
        </div>
      </Layout>
    );
  }

  if (!user) {
    return null; // Will redirect to login
  }

  if (error && (!plan || !plan.lab_results)) {
    return (
      <Layout title="Etapa Anterior Pendente - Lyz">
        <div className="max-w-3xl mx-auto px-4 py-10">
          <div className="bg-yellow-50 p-6 rounded-lg">
            <h2 className="text-lg font-medium text-yellow-700 mb-2">Etapa anterior pendente</h2>
            <p className="text-yellow-600 mb-4">{error}</p>
            <div className="mt-4 flex space-x-4">
              {/* Questáonário removido */}
              {!plan?.lab_results && (
                <Link href={`/plans/${id}/lab`} className="btn-primary">
                  Ir para Resultados Laboratoriais
                </Link>
              )}
              <Link href={`/plans/${id}`} className="btn-outline">
                Voltar ao Plano
              </Link>
            </div>
          </div>
        </div>
      </Layout>
    );
  }

  return (
    <Layout title="Observações TCM - Lyz">
      <div className="max-w-5xl mx-auto px-4 py-10">
        <div className="mb-6 flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-primary" data-component-name="TCMObservationsPage">Observações TCM</h1>
            <p className="text-sm text-gray-500 mt-1">
              Paciente: {plan?.patient_data?.name || ''}
            </p>
          </div>
          <Link href={`/plans/${id}`} className="btn-outline">
            Voltar ao Plano
          </Link>
        </div>

        {successMessage && (
          <div className="mb-6 bg-green-50 p-4 rounded-md">
            <p className="text-green-700">{successMessage}</p>
          </div>
        )}

        {error && plan?.lab_results && (
          <div className="mb-6 bg-red-50 p-4 rounded-md">
            <p className="text-red-700">{error}</p>
          </div>
        )}

        <FormInputOptions 
          onFormDataChange={(data: TCMObservations) => setFormData(data)}
          currentData={formData}
          formType="tcm"
        />
        
        <form onSubmit={handleSubmit} className="bg-white shadow-sm rounded-lg p-6">
          <div className="space-y-8">
            <div>
              <h2 className="text-lg font-medium text-gray-900 mb-4">Observação da Língua</h2>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Cor
                  </label>
                  <input
                    type="text"
                    name="tongue.color"
                    value={formData.tongue.color}
                    onChange={handleInputChange}
                    className="w-full border border-gray-300 rounded-md px-3 py-2 focus:outline-none focus:ring-2 focus:ring-primary-500"
                    placeholder="Pálida, vermelha, púrpura, etc."
                  />
                </div>
                
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Saburra
                  </label>
                  <input
                    type="text"
                    name="tongue.coating"
                    value={formData.tongue.coating}
                    onChange={handleInputChange}
                    className="w-full border border-gray-300 rounded-md px-3 py-2 focus:outline-none focus:ring-2 focus:ring-primary-500"
                    placeholder="Fina, grossa, branca, amarela, etc."
                  />
                </div>
                
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Forma
                  </label>
                  <input
                    type="text"
                    name="tongue.shape"
                    value={formData.tongue.shape}
                    onChange={handleInputChange}
                    className="w-full border border-gray-300 rounded-md px-3 py-2 focus:outline-none focus:ring-2 focus:ring-primary-500"
                    placeholder="Inchada, fina, fissuras, etc."
                  />
                </div>
                
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Umidade
                  </label>
                  <input
                    type="text"
                    name="tongue.moisture"
                    value={formData.tongue.moisture}
                    onChange={handleInputChange}
                    className="w-full border border-gray-300 rounded-md px-3 py-2 focus:outline-none focus:ring-2 focus:ring-primary-500"
                    placeholder="Seca, úmida, pegajosa, etc."
                  />
                </div>
              </div>
              
              <div className="mt-4">
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Observações adicionais sobre a língua
                </label>
                <textarea
                  name="tongue.notes"
                  value={formData.tongue.notes}
                  onChange={handleInputChange}
                  rows={2}
                  className="w-full border border-gray-300 rounded-md px-3 py-2 focus:outline-none focus:ring-2 focus:ring-primary-500"
                  placeholder="Detalhes relevantes sobre marcas, áreas específicas, etc."
                />
              </div>
            </div>

            <div>
              <h2 className="text-lg font-medium text-gray-900 mb-4">Observação do Pulso</h2>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Frequência
                  </label>
                  <input
                    type="text"
                    name="pulse.rate"
                    value={formData.pulse.rate}
                    onChange={handleInputChange}
                    className="w-full border border-gray-300 rounded-md px-3 py-2 focus:outline-none focus:ring-2 focus:ring-primary-500"
                    placeholder="Lento, rápido, normal, etc."
                  />
                </div>
                
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Força
                  </label>
                  <input
                    type="text"
                    name="pulse.strength"
                    value={formData.pulse.strength}
                    onChange={handleInputChange}
                    className="w-full border border-gray-300 rounded-md px-3 py-2 focus:outline-none focus:ring-2 focus:ring-primary-500"
                    placeholder="Forte, fraco, vazio, cheio, etc."
                  />
                </div>
                
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Ritmo
                  </label>
                  <input
                    type="text"
                    name="pulse.rhythm"
                    value={formData.pulse.rhythm}
                    onChange={handleInputChange}
                    className="w-full border border-gray-300 rounded-md px-3 py-2 focus:outline-none focus:ring-2 focus:ring-primary-500"
                    placeholder="Regular, irregular, etc."
                  />
                </div>
                
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Qualidade
                  </label>
                  <input
                    type="text"
                    name="pulse.quality"
                    value={formData.pulse.quality}
                    onChange={handleInputChange}
                    className="w-full border border-gray-300 rounded-md px-3 py-2 focus:outline-none focus:ring-2 focus:ring-primary-500"
                    placeholder="Deslizante, em corda, firme, etc."
                  />
                </div>
              </div>
              
              <div className="mt-4">
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Observações adicionais sobre o pulso
                </label>
                <textarea
                  name="pulse.notes"
                  value={formData.pulse.notes}
                  onChange={handleInputChange}
                  rows={2}
                  className="w-full border border-gray-300 rounded-md px-3 py-2 focus:outline-none focus:ring-2 focus:ring-primary-500"
                  placeholder="Posições específicas, diferenças entre direita e esquerda, etc."
                />
              </div>
            </div>

            <div>
              <h2 className="text-lg font-medium text-gray-900 mb-4">Diagnóstico de Padrões</h2>
              <textarea
                name="pattern_diagnosis"
                value={formData.pattern_diagnosis}
                onChange={handleInputChange}
                rows={4}
                className="w-full border border-gray-300 rounded-md px-3 py-2 focus:outline-none focus:ring-2 focus:ring-primary-500"
                placeholder="Identificação dos padrões de desarmonia segundo a Medicina Tradicional Chinesa"
              />
            </div>

            <div>
              <h2 className="text-lg font-medium text-gray-900 mb-4">Princípios de Tratamento</h2>
              <textarea
                name="treatment_principles"
                value={formData.treatment_principles}
                onChange={handleInputChange}
                rows={4}
                className="w-full border border-gray-300 rounded-md px-3 py-2 focus:outline-none focus:ring-2 focus:ring-primary-500"
                placeholder="Princípios e estratégias de tratamento baseados na MTC"
              />
            </div>

            <div>
              <h2 className="text-lg font-medium text-gray-900 mb-4">Observações Adicionais</h2>
              <textarea
                name="additional_notes"
                value={formData.additional_notes}
                onChange={handleInputChange}
                rows={4}
                className="w-full border border-gray-300 rounded-md px-3 py-2 focus:outline-none focus:ring-2 focus:ring-primary-500"
                placeholder="Quaisquer outras observações relevantes para o diagnóstico e tratamento"
              />
            </div>
            
            {/* Componente de análise animada de TCM */}
            {(analyzing || analysisComplete || plan?.tcm_observations?.analyzed_data) && (
              <div className="mt-6">
                <TCMAnalysisAnimation
                  analyzeTCM={analyzeTCM}
                  tcmData={formData}
                  isAnalyzing={analyzing}
                  onAnalysisComplete={handleAnalysisComplete}
                />
              </div>
            )}
          </div>

          <div className="mt-8 flex justify-end space-x-4">
            <Link 
              href={`/plans/${id}`}
              className="btn-outline"
            >
              Cancelar
            </Link>
            <button
              type="submit"
              disabled={saving}
              className="btn-primary"
            >
              {saving ? 'Salvando...' : 'Salvar e Analisar'}
            </button>
            {analysisComplete && (
              <Link 
                href={`/plans/${id}/timeline`}
                className="btn-primary bg-green-600 hover:bg-green-700"
              >
                Continuar para Próxima Etapa
              </Link>
            )}
          </div>
        </form>
      </div>
    </Layout>
  );
};

export default TCMObservationsPage;
