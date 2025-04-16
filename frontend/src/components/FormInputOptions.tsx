import React, { useState } from 'react';
import AudioRecorder from './AudioRecorder';

interface FormInputOptionsProps {
  onFormDataChange: (data: any) => void;
  currentData: any;
  formType: 'tcm';
}

const FormInputOptions: React.FC<FormInputOptionsProps> = ({ 
  onFormDataChange, 
  currentData,
  formType
}) => {
  const [activeTab, setActiveTab] = useState<'form' | 'audio' | 'summary'>('form');
  const [summaryText, setSummaryText] = useState('');

  // Função para processar a transcrição de áudio
  const handleTranscription = (transcription: string) => {
    // Caso de observações TCM
    const processedData = {
      tongue: {
        color: extractInfo(transcription, ['cor da língua', 'língua cor']),
        coating: extractInfo(transcription, ['cobertura da língua', 'revestimento da língua']),
        shape: extractInfo(transcription, ['forma da língua', 'língua forma']),
        moisture: extractInfo(transcription, ['umidade da língua', 'língua úmida', 'língua seca']),
        notes: extractInfo(transcription, ['notas da língua', 'observações da língua'])
      },
      pulse: {
        rate: extractInfo(transcription, ['frequência do pulso', 'pulso frequência']),
        strength: extractInfo(transcription, ['força do pulso', 'pulso força']),
        rhythm: extractInfo(transcription, ['ritmo do pulso', 'pulso ritmo']),
        quality: extractInfo(transcription, ['qualidade do pulso', 'pulso qualidade']),
        notes: extractInfo(transcription, ['notas do pulso', 'observações do pulso'])
      },
      pattern_diagnosis: extractInfo(transcription, ['diagnóstico de padrão', 'padrão tcm']),
      treatment_principles: extractInfo(transcription, ['princípios de tratamento', 'tratamento']),
      additional_notes: transcription // Todo o texto é salvo como notas adicionais
    };
    
    onFormDataChange(processedData);
  };

  // Função para processar o texto do resumo
  const handleSummarySubmit = () => {
    // Processamento do resumo para TCM
    const processedData = {
      tongue: {
        color: extractInfo(summaryText, ['cor da língua', 'língua cor']),
        coating: extractInfo(summaryText, ['cobertura da língua', 'revestimento da língua']),
        shape: extractInfo(summaryText, ['forma da língua', 'língua forma']),
        moisture: extractInfo(summaryText, ['umidade da língua', 'língua úmida', 'língua seca']),
        notes: extractInfo(summaryText, ['notas da língua', 'observações da língua'])
      },
      pulse: {
        rate: extractInfo(summaryText, ['frequência do pulso', 'pulso frequência']),
        strength: extractInfo(summaryText, ['força do pulso', 'pulso força']),
        rhythm: extractInfo(summaryText, ['ritmo do pulso', 'pulso ritmo']),
        quality: extractInfo(summaryText, ['qualidade do pulso', 'pulso qualidade']),
        notes: extractInfo(summaryText, ['notas do pulso', 'observações do pulso'])
      },
      pattern_diagnosis: extractInfo(summaryText, ['diagnóstico de padrão', 'padrão tcm']),
      treatment_principles: extractInfo(summaryText, ['princípios de tratamento', 'tratamento']),
      additional_notes: summaryText
    };
    
    onFormDataChange(processedData);
    
    // Mudar para a aba do formulário após processar o resumo
    setActiveTab('form');
  };

  // Função simples para extrair informações relevantes do texto
  const extractInfo = (text: string, keywords: string[]): string => {
    const lowerText = text.toLowerCase();
    
    for (const keyword of keywords) {
      const index = lowerText.indexOf(keyword.toLowerCase());
      if (index !== -1) {
        // Extrai o texto após a palavra-chave até o próximo ponto ou final do texto
        const startPos = index + keyword.length;
        const endPos = lowerText.indexOf('.', startPos);
        
        if (endPos !== -1) {
          return text.substring(startPos, endPos).trim();
        } else {
          return text.substring(startPos).trim();
        }
      }
    }
    
    return '';
  };

  return (
    <div className="form-input-options mt-4 mb-8 border rounded-lg p-4 bg-gray-50">
      <div className="tabs flex border-b mb-4">
        <button 
          className={`tab-button px-4 py-2 ${activeTab === 'form' ? 'border-b-2 border-primary text-primary font-medium' : 'text-gray-600'}`}
          onClick={() => setActiveTab('form')}
        >
          Preencher Formulário
        </button>
        <button 
          className={`tab-button px-4 py-2 ${activeTab === 'audio' ? 'border-b-2 border-primary text-primary font-medium' : 'text-gray-600'}`}
          onClick={() => setActiveTab('audio')}
        >
          Gravar Áudio
        </button>
        <button 
          className={`tab-button px-4 py-2 ${activeTab === 'summary' ? 'border-b-2 border-primary text-primary font-medium' : 'text-gray-600'}`}
          onClick={() => setActiveTab('summary')}
        >
          Resumo de Texto
        </button>
      </div>

      <div className="tab-content">
        {activeTab === 'form' && (
          <div className="form-note text-xs text-gray-500 italic mb-2">
            Preencha o formulário abaixo com as informações detalhadas.
          </div>
        )}

        {activeTab === 'audio' && (
          <div className="audio-input p-4 bg-white rounded border mb-4">
            <h3 className="text-sm font-medium mb-2">Instruções para gravação:</h3>
            <p className="text-sm text-gray-600 mb-4">
              Grave um áudio descrevendo todas as informações relevantes para este formulário. 
              O sistema tentará extrair automaticamente os dados para os campos apropriados.
            </p>
            <AudioRecorder 
              onTranscriptionComplete={handleTranscription}
              buttonText="Iniciar Gravação"
            />
            <p className="text-xs text-gray-500 mt-4">
              Dica: Mencione claramente cada aspecto relevante precedido pela categoria, 
              por exemplo: "Queixa principal: dor de cabeça frequente."
            </p>
          </div>
        )}

        {activeTab === 'summary' && (
          <div className="summary-input p-4 bg-white rounded border mb-4">
            <h3 className="text-sm font-medium mb-2">Resumo de texto:</h3>
            <p className="text-sm text-gray-600 mb-4">
              Digite um resumo com todas as informações relevantes. 
              O sistema tentará extrair automaticamente os dados para os campos apropriados.
            </p>
            <textarea
              className="w-full p-2 border rounded"
              rows={8}
              value={summaryText}
              onChange={(e) => setSummaryText(e.target.value)}
              placeholder="Digite seu resumo aqui..."
            />
            <button 
              className="btn-primary mt-2"
              onClick={handleSummarySubmit}
              disabled={!summaryText.trim()}
            >
              Processar Resumo
            </button>
            <p className="text-xs text-gray-500 mt-4">
              Dica: Estruture seu texto com categorias claras, 
              por exemplo: "Queixa principal: dor de cabeça frequente. Histórico médico: hipertensão..."
            </p>
          </div>
        )}
      </div>
    </div>
  );
};

export default FormInputOptions;
