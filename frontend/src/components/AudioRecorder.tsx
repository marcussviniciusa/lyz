import React, { useState, useRef } from 'react';
import axios from 'axios';

interface AudioRecorderProps {
  onTranscriptionComplete: (text: string) => void;
  buttonText?: string;
}

const AudioRecorder: React.FC<AudioRecorderProps> = ({ 
  onTranscriptionComplete, 
  buttonText = 'Gravar Áudio' 
}) => {
  const [isRecording, setIsRecording] = useState(false);
  const [audioBlob, setAudioBlob] = useState<Blob | null>(null);
  const [isTranscribing, setIsTranscribing] = useState(false);
  const [recordingTime, setRecordingTime] = useState(0);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const audioChunksRef = useRef<Blob[]>([]);
  const timerRef = useRef<NodeJS.Timeout | null>(null);

  const startRecording = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      mediaRecorderRef.current = new MediaRecorder(stream);
      audioChunksRef.current = [];

      mediaRecorderRef.current.ondataavailable = (event) => {
        if (event.data.size > 0) {
          audioChunksRef.current.push(event.data);
        }
      };

      mediaRecorderRef.current.onstop = () => {
        const audioBlob = new Blob(audioChunksRef.current, { type: 'audio/wav' });
        setAudioBlob(audioBlob);
      };

      mediaRecorderRef.current.start();
      setIsRecording(true);

      // Iniciar o timer
      setRecordingTime(0);
      timerRef.current = setInterval(() => {
        setRecordingTime(prev => prev + 1);
      }, 1000);
    } catch (error) {
      console.error("Erro ao iniciar gravação:", error);
      alert("Não foi possível acessar o microfone. Verifique as permissões do navegador.");
    }
  };

  const stopRecording = () => {
    if (mediaRecorderRef.current && isRecording) {
      mediaRecorderRef.current.stop();
      setIsRecording(false);
      
      // Parar o timer
      if (timerRef.current) {
        clearInterval(timerRef.current);
        timerRef.current = null;
      }
      
      // Encerrar todas as faixas do stream para liberar o microfone
      mediaRecorderRef.current.stream.getTracks().forEach(track => track.stop());
    }
  };

  const transcribeAudio = async () => {
    if (!audioBlob) return;

    setIsTranscribing(true);
    const formData = new FormData();
    formData.append('audio', audioBlob, 'recording.wav');

    try {
      // URL direta e fixa para o backend com timestamp para evitar cache
      const timestamp = new Date().getTime();
      const directBackendUrl = `https://apilyz.marcussviniciusa.cloud/api/transcribe?t=${timestamp}`;
      console.log('Enviando para URL direta com timestamp:', directBackendUrl);

      // Usar instância do Axios com configuração específica
      const axiosInstance = axios.create({
        baseURL: 'https://apilyz.marcussviniciusa.cloud',
        withCredentials: true,
        headers: {
          'Content-Type': 'multipart/form-data',
          'Access-Control-Allow-Origin': '*',
          'Cache-Control': 'no-cache, no-store, must-revalidate',
          'Pragma': 'no-cache',
          'Expires': '0'
        }
      });

      // Fazer a requisição diretamente para a API usando a instância configurada
      const response = await axiosInstance.post('/api/transcribe', formData);
      
      // Verificar se a resposta contém uma transcrição, mesmo que vazia
      if (response.data && response.data.transcription !== undefined) {
        const transcription = response.data.transcription;
        const source = response.data.source || 'desconhecido';
        
        // Tratar o caso de transcrição vazia de forma mais amigável
        if (transcription.trim() === '') {
          console.warn('Transcrição vazia recebida da fonte:', source);
          alert('Não foi possível extrair texto do áudio. Por favor, tente novamente falando mais claramente.');
        } else {
          console.log(`Transcrição bem-sucedida usando: ${source}`);
          onTranscriptionComplete(transcription);
        }
      } else {
        // Tratar caso em que a resposta não tem o campo transcription
        console.error('Resposta da API não contém campo de transcrição:', response.data);
        alert('Erro no formato da resposta de transcrição. Por favor, tente novamente.');
      }
    } catch (error: any) {
      console.error("Erro na transcrição:", error);
      // Exibir mensagem de erro mais detalhada quando disponível
      const errorMessage = error.response?.data?.message || error.message || 'Erro desconhecido';
      alert(`Erro ao transcrever o áudio: ${errorMessage}`);
    } finally {
      setIsTranscribing(false);
      setAudioBlob(null); // Limpar após a transcrição
    }
  };

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  };

  return (
    <div className="audio-recorder mt-2 flex flex-col items-start space-y-2">
      <div className="controls flex items-center space-x-2">
        {!isRecording && !audioBlob && (
          <button 
            onClick={startRecording} 
            className="btn-secondary flex items-center space-x-1 text-sm"
            type="button"
          >
            <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M12 2a3 3 0 0 0-3 3v7a3 3 0 0 0 6 0V5a3 3 0 0 0-3-3Z"></path>
              <path d="M19 10v2a7 7 0 0 1-14 0v-2"></path>
              <line x1="12" x2="12" y1="19" y2="22"></line>
            </svg>
            <span>{buttonText}</span>
          </button>
        )}
        
        {isRecording && (
          <div className="flex items-center space-x-2">
            <span className="recording-indicator animate-pulse text-red-500">●</span>
            <span className="recording-time">{formatTime(recordingTime)}</span>
            <button 
              onClick={stopRecording} 
              className="btn-danger text-sm"
              type="button"
            >
              Parar
            </button>
          </div>
        )}
        
        {audioBlob && !isTranscribing && (
          <div className="flex space-x-2">
            <span className="text-sm text-gray-500">Áudio gravado</span>
            <button 
              onClick={transcribeAudio}
              className="btn-primary text-sm"
              type="button"
            >
              Transcrever
            </button>
          </div>
        )}
        
        {isTranscribing && (
          <div className="flex items-center space-x-2">
            <div className="spinner-border h-4 w-4 text-primary-600 animate-spin"></div>
            <span className="text-sm text-gray-600">Transcrevendo...</span>
          </div>
        )}
      </div>
    </div>
  );
};

export default AudioRecorder;
