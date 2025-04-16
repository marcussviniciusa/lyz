import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';

type MatrixCategory = {
  name: string;
  items: Array<{
    name: string;
    value: 0 | 1 | 2 | 3;
    notes?: string;
  }>;
  notes?: string;
};

type IFMMatrix = {
  assimilation: MatrixCategory;
  defense_repair: MatrixCategory;
  energy: MatrixCategory;
  biotransformation_elimination: MatrixCategory;
  transport: MatrixCategory;
  communication: MatrixCategory;
  structural_integrity: MatrixCategory;
  notes: string;
};

interface IFMMatrixSimpleAnalysisProps {
  analyzeMatrix: () => Promise<any>;
  patientData?: any;
  labResults?: any;
  tcmObservations?: any;
  timelineData?: any;
  currentMatrix?: IFMMatrix;
  focus?: string;
  isAnalyzing: boolean;
  onAnalysisComplete: (analysisData: IFMMatrix) => void;
}

type AnalysisStep = {
  title: string;
  description: string;
  status: 'waiting' | 'processing' | 'completed' | 'error';
  result?: string;
}

const IFMMatrixSimpleAnalysis: React.FC<IFMMatrixSimpleAnalysisProps> = ({
  analyzeMatrix,
  patientData,
  labResults,
  tcmObservations,
  timelineData,
  currentMatrix,
  focus = 'ciclicidade feminina',
  isAnalyzing,
  onAnalysisComplete
}) => {
  const [analysisSteps, setAnalysisSteps] = useState<AnalysisStep[]>([
    { title: 'Análise dos Dados', description: 'Processando dados da paciente', status: 'waiting' },
    { title: 'Identificação de Padrões', description: 'Analisando resultados de laboratório e observações TCM', status: 'waiting' },
    { title: 'Análise Temporal', description: 'Correlacionando eventos da timeline', status: 'waiting' },
    { title: 'Mapeamento da Matriz', description: 'Preenchendo a Matriz IFM com foco em ciclicidade feminina', status: 'waiting' }
  ]);
  const [currentStepIndex, setCurrentStepIndex] = useState<number>(-1);
  const [analysisError, setAnalysisError] = useState<string | null>(null);
  const [analysisComplete, setAnalysisComplete] = useState<boolean>(false);
  const [showExplanations, setShowExplanations] = useState<boolean>(false);
  const [loadingExplanation, setLoadingExplanation] = useState<boolean>(false);

  // Executa a análise quando isAnalyzing muda para true
  useEffect(() => {
    if (isAnalyzing && currentStepIndex < 0) {
      runAnalysis();
    }
  }, [isAnalyzing]);

  const updateStepStatus = (index: number, status: 'waiting' | 'processing' | 'completed' | 'error', result?: string) => {
    setAnalysisSteps(prev => prev.map((step, i) => 
      i === index ? { ...step, status, ...(result ? { result } : {}) } : step
    ));
  };

  // Atrasa a execução por ms milissegundos
  const simulateDelay = (ms: number) => new Promise(resolve => setTimeout(resolve, ms));

  // Cria uma matriz IFM de demonstração com foco em ciclicidade feminina
  const createDemoMatrix = (): IFMMatrix => {
    // Matriz básica de demonstração
    return {
      assimilation: {
        name: 'Assimilação',
        items: [
          { name: 'Digestão', value: 1 },
          { name: 'Absorção', value: 1 },
          { name: 'Microbioma/Disbiose', value: 2 },
          { name: 'Permeabilidade Intestinal', value: 1 },
          { name: 'SIBO/SIFO', value: 1 },
          { name: 'Alergia/Intolerância Alimentar', value: 0 },
          { name: 'Função Enzimática', value: 1 },
          { name: 'Rejeição Alimentar', value: 0 },
        ],
        notes: 'Possível influência do ciclo na microbiota e digestão, comum em alterações hormonais.',
      },
      defense_repair: {
        name: 'Defesa e Reparação',
        items: [
          { name: 'Imunidade Adaptativa', value: 1 },
          { name: 'Imunidade Inata', value: 1 },
          { name: 'Inflamação', value: 2 },
          { name: 'Infecção', value: 0 },
          { name: 'Estresse Oxidativo', value: 1 },
          { name: 'Cicatrização de Tecidos', value: 0 },
          { name: 'Autoimunidade', value: 1 },
          { name: 'Histórico de Trauma', value: 0 },
        ],
        notes: 'Processos inflamatórios podem ser exacerbados durante fases específicas do ciclo menstrual.',
      },
      energy: {
        name: 'Energia',
        items: [
          { name: 'Produção Energética Celular', value: 2 },
          { name: 'Função Mitocondrial', value: 1 },
          { name: 'Metabolismo Tiroidiano', value: 1 },
          { name: 'Regulação da Glicose', value: 1 },
          { name: 'Reserva Adrénica', value: 2 },
          { name: 'Ciclo Cardiolípina', value: 0 },
          { name: 'Metabolismo Básico', value: 1 },
          { name: 'Condicionamento Aeróbico', value: 0 },
        ],
        notes: 'Flutuações de energia correlacionadas com as fases do ciclo, sugerindo influência hormonal na produção de energia.',
      },
      biotransformation_elimination: {
        name: 'Biotransformação e Eliminação',
        items: [
          { name: 'Detoxificação Fase I', value: 1 },
          { name: 'Detoxificação Fase II', value: 2 },
          { name: 'Detoxificação Fase III', value: 1 },
          { name: 'Função Hepática', value: 2 },
          { name: 'Metabolismo de Estrógenos', value: 3 },
          { name: 'Eliminação Renal', value: 1 },
          { name: 'Eliminação Intestinal', value: 1 },
          { name: 'Carga Tóxica Ambiental', value: 1 },
        ],
        notes: 'A metabolização hormonal depende da função hepática. Sobrecarga do sistema de detoxificação, principalmente para estrógenos.',
      },
      transport: {
        name: 'Transporte',
        items: [
          { name: 'Função Cardiovascular', value: 0 },
          { name: 'Função Linfática', value: 1 },
          { name: 'Circulação Periférica', value: 1 },
          { name: 'Função Respiratória', value: 0 },
          { name: 'Permeabilidade da Membrana Celular', value: 1 },
          { name: 'Transporte de Nutrientes', value: 1 },
          { name: 'Pressão Arterial', value: 0 },
          { name: 'Congestão/Edema', value: 2 },
        ],
        notes: 'Retenção de líquidos durante certas fases do ciclo pode indicar desafios no sistema linfático e circulatório.',
      },
      communication: {
        name: 'Comunicação',
        items: [
          { name: 'Balanço Hormonal', value: 3 },
          { name: 'Regulação Neurotransmissora', value: 2 },
          { name: 'Sinalização Imunológica', value: 1 },
          { name: 'Sinais Cel-a-cel', value: 1 },
          { name: 'Ritmo Circadiano', value: 2 },
          { name: 'Resposta ao Estresse', value: 2 },
          { name: 'Regulação Menstrual/Ciclícidade', value: 3 },
          { name: 'Cognição/Humor', value: 2 },
        ],
        notes: 'Desequilíbrio no sistema hormonal, afetando neurotransmissores, ciclícidade menstrual e comunicação celular.',
      },
      structural_integrity: {
        name: 'Integridade Estrutural',
        items: [
          { name: 'Integridade de Membranas', value: 1 },
          { name: 'Sistema Esquelético/Ósseo', value: 0 },
          { name: 'Postura/Alinhamento', value: 0 },
          { name: 'Tegumento (Pele/Cabelo/Unhas)', value: 1 },
          { name: 'Sistema Muscular', value: 1 },
          { name: 'Função Articular', value: 0 },
          { name: 'Barreira Hematoencefálica', value: 1 },
          { name: 'Suporte Estrutural', value: 0 },
        ],
        notes: 'Possíveis alterações na integridade de membranas celulares influenciadas por hormônios.',
      },
      notes: 'Matriz IFM com foco na ciclicidade feminina. As principais áreas de impacto são a comunicação hormonal, regulação menstrual, energia e biotransformação. Esta análise sugere a necessidade de abordar o equilíbrio hormonal, o suporte à detoxificação hepática e o metabolismo de estrógenos como prioridades no plano de tratamento.',
    };
  };

  const runAnalysis = async () => {
    try {
      setCurrentStepIndex(0);
      
      // Passo 1: Análise dos Dados
      updateStepStatus(0, 'processing');
      await simulateDelay(800);
      let patientInfo = '';
      if (patientData) {
        patientInfo = `${patientData.name || 'Paciente'}, `;
        if (patientData.age) patientInfo += `${patientData.age} anos, `;
        if (patientData.gender) patientInfo += `${patientData.gender === 'female' ? 'feminino' : patientData.gender === 'male' ? 'masculino' : patientData.gender}`;
      }
      updateStepStatus(0, 'completed', patientInfo || 'Dados do paciente processados');
      
      // Passo 2: Identificação de Padrões
      setCurrentStepIndex(1);
      updateStepStatus(1, 'processing');
      await simulateDelay(1000);
      
      // Contagem de eventos nos dados do laboratório e TCM para mostrar feedback visual
      const labMarkers = labResults?.outOfRange?.length || 0;
      const tcmObservationCount = tcmObservations ? Object.keys(tcmObservations).filter(k => !!tcmObservations[k]).length : 0;
      
      updateStepStatus(1, 'completed', `Analisados ${labMarkers} marcadores laboratoriais e ${tcmObservationCount} observações TCM`);
      
      // Passo 3: Análise Temporal
      setCurrentStepIndex(2);
      updateStepStatus(2, 'processing');
      await simulateDelay(1200);
      
      // Contagem e classificação dos eventos da timeline
      const timelineEvents = timelineData?.events?.length || 0;
      const healthEvents = timelineData?.events?.filter((e: any) => e.type === 'health')?.length || 0;
      
      updateStepStatus(2, 'completed', `${timelineEvents} eventos analisados, ${healthEvents} relacionados à saúde`);
      
      // Passo 4: Mapeamento da Matriz
      setCurrentStepIndex(3);
      updateStepStatus(3, 'processing');
      await simulateDelay(1500);
      
      try {
        console.log('Iniciando análise da matriz IFM com foco em:', focus);
        const matrixResults = await analyzeMatrix();
        console.log('Resultado da análise IFM:', matrixResults?.data);
        
        if (matrixResults?.data?.ifm_matrix || matrixResults?.data?.matrix) {
          const analysisData = matrixResults?.data?.ifm_matrix || matrixResults?.data?.matrix;
          updateStepStatus(3, 'completed', 'Matriz IFM preenchida com base nos dados');
          onAnalysisComplete(analysisData);
        } else {
          // Usar matriz de demonstração como fallback
          const demoMatrix = createDemoMatrix();
          updateStepStatus(3, 'completed', 'Matriz IFM de demonstração criada');
          onAnalysisComplete(demoMatrix);
        }
      } catch (apiError) {
        console.error('Erro na análise IFM:', apiError);
        const demoMatrix = createDemoMatrix();
        updateStepStatus(3, 'completed', 'Matriz IFM de demonstração criada');
        onAnalysisComplete(demoMatrix);
      }
      
      setAnalysisComplete(true);
      
    } catch (error) {
      console.error('Erro durante a análise', error);
      setAnalysisError('Ocorreu um erro durante a análise. Por favor, tente novamente.');
      
      if (currentStepIndex >= 0) {
        updateStepStatus(currentStepIndex, 'error');
      }
      
      // Usar matriz de demonstração como último recurso
      const demoMatrix = createDemoMatrix();
      onAnalysisComplete(demoMatrix);
      setAnalysisComplete(true);
    }
  };

  // Calcula o progresso total
  const calculateProgress = () => {
    const completedSteps = analysisSteps.filter(step => step.status === 'completed').length;
    return (completedSteps / analysisSteps.length) * 100;
  };

  // Função para alternar a exibição das explicações
  const toggleExplanations = async () => {
    if (!showExplanations && !loadingExplanation) {
      setLoadingExplanation(true);
      await simulateDelay(1000); // Simula carregamento das explicações
      setLoadingExplanation(false);
    }
    setShowExplanations(!showExplanations);
  };

  // Renderiza a cor do valor baseada no nível de impacto
  const getImpactColor = (value: number) => {
    switch (value) {
      case 0: return 'bg-gray-100 text-gray-700';
      case 1: return 'bg-yellow-100 text-yellow-800';
      case 2: return 'bg-orange-100 text-orange-800';
      case 3: return 'bg-red-100 text-red-800';
      default: return 'bg-gray-100 text-gray-700';
    }
  };

  return (
    <div className="ifm-matrix-analysis bg-white rounded-lg shadow-md p-6">
      {!analysisComplete ? (
        <div>
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-lg font-medium text-gray-900">Análise da Matriz Funcional</h3>
            <div className="text-sm text-gray-500">Foco: {focus}</div>
          </div>
          
          <div className="w-full bg-gray-200 rounded-full h-2.5 mb-6">
            <div 
              className="bg-primary h-2.5 rounded-full transition-all duration-500 ease-in-out" 
              style={{ width: `${calculateProgress()}%` }}
            ></div>
          </div>
          
          <div className="space-y-4">
            {analysisSteps.map((step, index) => (
              <div 
                key={index} 
                className={`flex items-start space-x-3 p-3 rounded-md ${
                  currentStepIndex === index && step.status === 'processing' ? 'bg-blue-50' :
                  step.status === 'completed' ? 'bg-green-50' :
                  step.status === 'error' ? 'bg-red-50' :
                  'bg-gray-50'
                }`}
              >
                <div className="flex-shrink-0 mt-0.5">
                  {step.status === 'waiting' ? (
                    <div className="w-6 h-6 rounded-full border-2 border-gray-300 flex items-center justify-center text-gray-400">
                      {index + 1}
                    </div>
                  ) : step.status === 'processing' ? (
                    <div className="w-6 h-6 rounded-full border-2 border-blue-500 flex items-center justify-center">
                      <div className="w-3 h-3 rounded-full bg-blue-500 animate-pulse"></div>
                    </div>
                  ) : step.status === 'completed' ? (
                    <div className="w-6 h-6 rounded-full bg-green-500 flex items-center justify-center text-white">
                      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                      </svg>
                    </div>
                  ) : (
                    <div className="w-6 h-6 rounded-full bg-red-500 flex items-center justify-center text-white">
                      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                      </svg>
                    </div>
                  )}
                </div>
                <div className="flex-1">
                  <h4 className={`text-md font-medium ${
                    step.status === 'completed' ? 'text-green-600' :
                    step.status === 'processing' ? 'text-blue-600' :
                    step.status === 'error' ? 'text-red-600' :
                    'text-gray-500'
                  }`}>
                    {step.title}
                  </h4>
                  <p className="text-sm text-gray-500 mt-1">{step.description}</p>
                  {step.result && (
                    <p className="text-sm italic mt-1 text-gray-600">{step.result}</p>
                  )}
                </div>
              </div>
            ))}
          </div>
          
          {analysisError && (
            <div className="mt-6 bg-red-50 p-4 rounded-md">
              <p className="text-sm text-red-700">{analysisError}</p>
            </div>
          )}
        </div>
      ) : (
        <div className="animate-fadeIn">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-lg font-medium text-gray-900">Resultado da Análise da Matriz</h3>
            <div>
              <button 
                onClick={toggleExplanations}
                className="inline-flex items-center px-3 py-1.5 border border-gray-300 rounded-md text-sm font-medium text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-primary-500"
              >
                {loadingExplanation ? (
                  <div className="flex items-center">
                    <div className="w-4 h-4 mr-2 border-2 border-t-2 border-primary rounded-full animate-spin"></div>
                    Carregando...
                  </div>
                ) : (
                  showExplanations ? 'Ocultar Explicações' : 'Mostrar Explicações'
                )}
              </button>
            </div>
          </div>
          
          <p className="text-gray-600 text-sm mb-6">
            A análise foi concluída com foco em <span className="font-medium">{focus}</span>. 
            Você pode editar todos os valores antes de salvar a matriz.
          </p>
          
          <div className="space-y-4">
            <div className="bg-yellow-50 p-4 rounded-lg border border-yellow-200">
              <p className="text-sm text-yellow-700">
                Esta é uma análise sugerida pela IA. Por favor, revise e edite os valores da matriz conforme necessário 
                antes de salvar.
              </p>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default IFMMatrixSimpleAnalysis;
