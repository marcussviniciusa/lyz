import React, { useState, useEffect, useRef } from 'react';
import { useRouter } from 'next/router';
import Link from 'next/link';
import Layout from '../../../components/Layout';
import { useAuth } from '../../../contexts/AuthContext';
import { planAPI } from '../../../lib/api';
import LabAnalysisAnimation from '../../../components/analysis/LabAnalysisAnimation';
import { Document, Page, pdfjs } from 'react-pdf';
import 'react-pdf/dist/esm/Page/AnnotationLayer.css';
import 'react-pdf/dist/esm/Page/TextLayer.css';
import { useCallback } from 'react';

// Estender a interface Window para incluir pdfjsLib
declare global {
  interface Window {
    pdfjsLib: typeof pdfjs & {
      GlobalWorkerOptions: {
        workerSrc: string;
      }
    };
  }
}

// Não inicializamos o worker do PDF.js aqui para evitar problemas durante SSR
// A configuração será feita dentro de um useEffect no componente

type PlanData = {
  id: string;
  user_id: number;
  patient_data: {
    name: string;
    age?: number;
    gender?: string;
  };
  lab_results?: {
    file_url?: string;
    files?: Array<{
      fileUrl: string;
      fileName: string;
      fileType: string;
      originalName: string;
      uploadedAt: string;
    }>;
    notes: string;
    analyzed_data?: any;
  };
  professional_type: string;
  // Removed questionnaire_data
};

const LabResultsPage: React.FC = () => {
  const { user, loading: authLoading } = useAuth();
  const router = useRouter();
  const { id } = router.query;
  
  const [plan, setPlan] = useState<PlanData | null>(null);
  const [loading, setLoading] = useState(true);
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  const [notes, setNotes] = useState('');
  const [selectedFiles, setSelectedFiles] = useState<File[]>([]);
  const [previewUrls, setPreviewUrls] = useState<string[]>([]);
  const [selectedFile, setSelectedFile] = useState<File | null>(null); // Mantendo para compatibilidade
  const [currentFileIndex, setCurrentFileIndex] = useState<number>(0);
  const [numPages, setNumPages] = useState<number | null>(null);
  const [pageNumber, setPageNumber] = useState<number>(1);
  const [isPdf, setIsPdf] = useState<boolean>(false);
  
  // Status de rendering do PDF
  const [pdfRenderMode, setPdfRenderMode] = useState<'react-pdf' | 'iframe' | 'fallback'>('react-pdf');
  
  // Função para verificar se o worker do PDF.js está funcionando corretamente
  const checkPdfWorkerStatus = useCallback(() => {
    if (typeof window !== 'undefined') {
      try {
        const workerStatus = {
          workerSrcConfigured: Boolean(pdfjs.GlobalWorkerOptions.workerSrc),
          workerSrc: pdfjs.GlobalWorkerOptions.workerSrc || 'Não definido',
          pdfjsVersion: pdfjs.version
        };
        
        console.log('Status do worker PDF.js:', workerStatus);
        return workerStatus.workerSrcConfigured;
      } catch (err) {
        console.error('Erro ao verificar status do worker PDF.js:', err);
        return false;
      }
    }
    return false;
  }, []);

  // Configurar o worker do PDF.js apenas do lado do cliente
  useEffect(() => {
    // Verificar se estamos no navegador
    if (typeof window !== 'undefined' && typeof window.document !== 'undefined') {
      try {
        // Limpar qualquer configuração anterior para evitar conflitos
        if (pdfjs.GlobalWorkerOptions.workerSrc) {
          console.log('Worker já configurado com:', pdfjs.GlobalWorkerOptions.workerSrc);
        }
        
        // Usar uma versão específica para evitar incompatibilidades
        const workerSrc = `https://unpkg.com/pdfjs-dist@2.16.105/build/pdf.worker.min.js`;
        pdfjs.GlobalWorkerOptions.workerSrc = workerSrc;
        
        console.log('PDF.js worker configurado com sucesso:', workerSrc);
        
        // Verificar após 500ms se o worker foi configurado corretamente
        setTimeout(checkPdfWorkerStatus, 500);
      } catch (error) {
        console.error('Erro ao configurar PDF.js worker:', error);
        // Se houver um erro na configuração, usar modo alternativo
        setPdfRenderMode('iframe');
      }
    }
  }, [checkPdfWorkerStatus]);
  
  // Limpar o worker quando o componente for desmontado
  useEffect(() => {
    return () => {
      // Limpar recursos do PDF.js quando o componente for desmontado
      if (typeof window !== 'undefined') {
        try {
          // Tentativa de evitar o erro "Worker was destroyed"
          // ao navegar para longe da página
          const pdfjsLib = (window as any)['pdfjs-dist/build/pdf'];
          if (pdfjsLib && pdfjsLib.GlobalWorkerOptions) {
            console.log('Limpando recursos do PDF.js...');
          }
        } catch (error) {
          // Ignorar erros de limpeza
        }
      }
    };
  }, []);
  
  // Função para alternar entre os modos de renderização
  // Função para alternar entre os diferentes modos de visualização de PDF
  const switchPdfRenderMode = useCallback(() => {
    // Limpar qualquer erro anterior quando trocarmos de modo
    setError(null);
    
    if (pdfRenderMode === 'react-pdf') {
      console.log('Alternando para modo iframe para visualização de PDF');
      // Verificar se o worker do PDF.js está funcionando
      try {
        if (typeof window !== 'undefined' && window.pdfjsLib) {
          if (window.pdfjsLib.GlobalWorkerOptions.workerSrc) {
            console.log('Worker do PDF.js configurado corretamente:', window.pdfjsLib.GlobalWorkerOptions.workerSrc);
          } else {
            console.warn('Worker do PDF.js não configurado corretamente - ajustando...');
            // Tentativa de reconfigurar o worker
            window.pdfjsLib.GlobalWorkerOptions.workerSrc = `//unpkg.com/pdfjs-dist@${pdfjs.version}/build/pdf.worker.min.js`;
          }
        }
      } catch (err) {
        console.error('Erro ao verificar worker do PDF.js:', err);
      }
      
      setPdfRenderMode('iframe');
    } else if (pdfRenderMode === 'iframe') {
      console.log('Alternando para modo de download para visualização de PDF');
      setPdfRenderMode('fallback');
    } else {
      console.log('Alternando para modo react-pdf para visualização de PDF');
      // Tentativa de recarregar o worker do PDF.js antes de mudar para o modo react-pdf
      if (typeof window !== 'undefined') {
        try {
          // Garantir que o worker seja carregado novamente
          const workerSrc = `//unpkg.com/pdfjs-dist@${pdfjs.version}/build/pdf.worker.min.js`;
          if (window.pdfjsLib) {
            window.pdfjsLib.GlobalWorkerOptions.workerSrc = workerSrc;
            console.log('Worker do PDF.js reconfigurado:', workerSrc);
          } else {
            console.warn('pdfjsLib não disponível no window');
          }
        } catch (err) {
          console.error('Erro ao reconfigurar worker:', err);
        }
      }
      setPdfRenderMode('react-pdf');
    }
  }, [pdfRenderMode]);
  
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [analyzing, setAnalyzing] = useState(false);
  const [analysisComplete, setAnalysisComplete] = useState(false);
  const [isDragOver, setIsDragOver] = useState(false);
  
  // Variável para controlar se uma análise global já está em andamento
  const [isGlobalAnalysisRunning, setIsGlobalAnalysisRunning] = useState(false);

  // Função para navegar entre arquivos selecionados
  const navigateToFile = (index: number) => {
    if (index >= 0 && index < selectedFiles.length) {
      setCurrentFileIndex(index);
      const file = selectedFiles[index];
      setSelectedFile(file);
      setIsPdf(file.type === 'application/pdf');
      setPageNumber(1);
      setNumPages(null);
      
      // Usar URL existente ou criar nova
      if (previewUrls[index]) {
        // URL já existe, usar diretamente
      } else {
        // Criar nova URL para este arquivo
        const reader = new FileReader();
        reader.onloadend = () => {
          const newUrls = [...previewUrls];
          newUrls[index] = reader.result as string;
          setPreviewUrls(newUrls);
        };
        reader.readAsDataURL(file);
      }
    }
  };

  // Função para remover um arquivo específico
  const removeFile = (index: number) => {
    const newFiles = selectedFiles.filter((_, i) => i !== index);
    const newUrls = previewUrls.filter((_, i) => i !== index);
    
    setSelectedFiles(newFiles);
    setPreviewUrls(newUrls);
    
    // Ajustar índice atual se necessário
    if (currentFileIndex >= newFiles.length) {
      const newIndex = Math.max(0, newFiles.length - 1);
      setCurrentFileIndex(newIndex);
      if (newFiles.length > 0) {
        navigateToFile(newIndex);
      } else {
        setSelectedFile(null);
        setIsPdf(false);
      }
    } else if (currentFileIndex === index && newFiles.length > 0) {
      // Se removemos o arquivo atual, ir para o próximo ou anterior
      const newIndex = Math.min(currentFileIndex, newFiles.length - 1);
      navigateToFile(newIndex);
    }
    
    if (newFiles.length === 0) {
      setSuccessMessage(null);
    } else {
      setSuccessMessage(`${newFiles.length} arquivo${newFiles.length > 1 ? 's' : ''} selecionado${newFiles.length > 1 ? 's' : ''} para upload`);
    }
  };

  // Funções para drag & drop
  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragOver(true);
  };

  const handleDragLeave = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragOver(false);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragOver(false);

    const droppedFiles = Array.from(e.dataTransfer.files);
    if (droppedFiles.length > 0) {
      // Para drag & drop, substituir arquivos anteriores
      setSelectedFiles([]);
      setPreviewUrls([]);
      setCurrentFileIndex(0);
      processNewFiles(droppedFiles);
    }
  };

  // Função para processar arquivos (comum para input e drag & drop)
  const processFiles = (files: File[]) => {
    const validFiles: File[] = [];
    let hasError = false;
    
    // Verificar cada arquivo
    for (const file of files) {
      // Verificar o tipo do arquivo
      if (!['application/pdf', 'image/jpeg', 'image/png'].includes(file.type)) {
        setError('Por favor, selecione apenas arquivos PDF, JPEG ou PNG');
        hasError = true;
        break;
      }
      
      // Verificar o tamanho do arquivo
      if (file.size > 5 * 1024 * 1024) { // 5MB
        setError(`O arquivo ${file.name} excede o tamanho máximo de 5MB`);
        hasError = true;
        break;
      }
      
      validFiles.push(file);
    }
    
    if (hasError) {
      return;
    }
    
    // Adicionar aos arquivos existentes se houver
    const allFiles = [...selectedFiles, ...validFiles];
    setSelectedFiles(allFiles);
    setCurrentFileIndex(selectedFiles.length); // Vai para o primeiro arquivo novo
    
    if (allFiles.length > 0) {
      setSelectedFile(allFiles[selectedFiles.length]); // Arquivo recém adicionado
    }
    
    setError(null);
    
    // Criar URLs de preview para os novos arquivos
    const newPreviewUrls = [...previewUrls];
    let processedCount = 0;
    
    validFiles.forEach((file, index) => {
      const reader = new FileReader();
      reader.onloadend = () => {
        newPreviewUrls[selectedFiles.length + index] = reader.result as string;
        processedCount++;
        
        // Quando todos os novos arquivos foram processados
        if (processedCount === validFiles.length) {
          setPreviewUrls(newPreviewUrls);
          
          // Configurar o primeiro arquivo novo como ativo
          if (validFiles.length > 0) {
            const newActiveFile = validFiles[0];
            setIsPdf(newActiveFile.type === 'application/pdf');
            setPageNumber(1);
            setNumPages(null);
          }
        }
      };
      reader.readAsDataURL(file);
    });
    
    // Mostrar informação sobre arquivos adicionados
    if (allFiles.length > 1) {
      setSuccessMessage(`${allFiles.length} arquivos selecionados para upload (${validFiles.length} novos)`);
    } else if (allFiles.length === 1) {
      setSuccessMessage(`1 arquivo selecionado para upload`);
    }
  };

  // Função para analisar os resultados laboratoriais
  const analyzeResults = async () => {
    if (!id) throw new Error('ID do plano não encontrado');
    
    // Verificar se já há uma análise em andamento no nível de página
    if (isGlobalAnalysisRunning) {
      console.log('Uma análise já está em andamento a nível global, ignorando nova solicitação');
      return {
        summary: "Análise em andamento. Aguarde a conclusão da análise atual.",
        outOfRange: [],
        recommendations: ["Os resultados serão exibidos assim que a análise for concluída."]
      };
    }
    
    try {
      // Marcar que uma análise está em andamento globalmente
      setIsGlobalAnalysisRunning(true);
      
      // Preparando os dados para análise
      const fileUrl = previewUrls[currentFileIndex] || plan?.lab_results?.file_url;
      const notesText = notes || plan?.lab_results?.notes || '';
      
      // Se não houver arquivo nem texto para analisar, lançar um erro
      if (!fileUrl && !notesText) {
        throw new Error('Nenhum arquivo ou resumo textual encontrado para análise');
      }
      
      // Preparando dados para enviar à API
      // Verificar se é uma análise baseada apenas em texto
      const isTextOnlyAnalysis = !fileUrl && !!notesText;
      
      console.log('Análise baseada apenas em texto:', isTextOnlyAnalysis);
      
      const analysisInput = {
        file_url: fileUrl || '', // Se não houver arquivo, enviar string vazia
        notes: notesText,
        patient_data: plan?.patient_data || {},
        // Indicar se a análise é baseada apenas em texto
        text_only_analysis: isTextOnlyAnalysis
      };
      
      // Fazendo a chamada real à API para análise dos resultados
      const response = await planAPI.analyzeLabResults(id as string, analysisInput);
      
      // Retorna os dados analisados da resposta da API
      return response.data.analyzed_data || {
        summary: "A análise não retornou resultados. Por favor, verifique a qualidade do arquivo enviado.",
        outOfRange: [],
        recommendations: ["Considere enviar um arquivo mais legível ou completo para melhor análise."]
      };
    } catch (err) {
      console.error('Error analyzing lab results:', err);
      throw err;
    } finally {
      // Garantir que o flag global seja resetado independentemente do resultado
      setIsGlobalAnalysisRunning(false);
    }
  };
  
  // Função para garantir que os resultados da análise sejam salvos permanentemente
  const saveAnalysisResultsPermanently = (analysisData: any) => {
    if (!id || !plan) {
      console.error('Impossível salvar resultados: ID do plano ou plano não disponível');
      setError('Não foi possível salvar os resultados da análise. Por favor, tente novamente.');
      return Promise.reject('Dados do plano não disponíveis');
    }

    // Validar e normalizar os dados de análise para garantir uma estrutura consistente
    const validatedData = {
      summary: analysisData?.summary || 'Análise concluída',
      outOfRange: Array.isArray(analysisData?.outOfRange) ? analysisData.outOfRange : [],
      recommendations: Array.isArray(analysisData?.recommendations) ? analysisData.recommendations : []
    };
    
    // Preparar o payload para salvar
    const analysisPayload = {
      file_url: plan.lab_results?.file_url || previewUrls[currentFileIndex] || '',
      notes: notes || plan.lab_results?.notes || '',
      analyzed_data: validatedData
    };
    
    // Usar o novo método específico para salvar os resultados da análise permanentemente
    // Este método salva diretamente os resultados no campo lab_results do plano no banco de dados
    setUploading(true); // Indicar que está salvando
    return planAPI.saveLabAnalysisResults(id as string, analysisPayload)
      .then(response => {
        console.log('Resultados da análise salvos permanentemente:', response);
        setSuccessMessage('Análise dos resultados laboratoriais salva com sucesso!');
        // Atualizar o estado local do plano
        setPlan({
          ...plan,
          lab_results: {
            ...plan.lab_results || {},
            file_url: analysisPayload.file_url,
            notes: analysisPayload.notes,
            analyzed_data: validatedData
          }
        });
        return response;
      })
      .catch(err => {
        console.error('Erro ao salvar resultados permanentemente:', err);
        setError('Falha ao salvar os resultados da análise. Os dados podem ser perdidos se sair da página.');
        // Tentar novamente automaticamente após 5 segundos
        setTimeout(() => {
          saveAnalysisResultsPermanently(analysisData)
            .then(() => setError(null))
            .catch(e => console.error('Falha na segunda tentativa de salvar:', e));
        }, 5000);
        return Promise.reject(err);
      })
      .finally(() => {
        setUploading(false);
      });
  };

  // Função de callback quando a análise é concluída
  const handleAnalysisComplete = (analysisData: any) => {
    setAnalyzing(false); // Garantir que a flag de análise seja desativada
    setAnalysisComplete(true);
    
    // Validar e normalizar os dados de análise para garantir uma estrutura consistente
    const validatedData = {
      summary: analysisData?.summary || 'Análise concluída',
      outOfRange: Array.isArray(analysisData?.outOfRange) ? analysisData.outOfRange : [],
      recommendations: Array.isArray(analysisData?.recommendations) ? analysisData.recommendations : []
    };
    
    // Atualizar o estado local do plano imediatamente para exibição
    if (id && plan) {
      setPlan({
        ...plan,
        lab_results: plan.lab_results ? {
          ...plan.lab_results,
          analyzed_data: validatedData
        } : {
          file_url: '',
          notes: '',
          analyzed_data: validatedData
        }
      });
      
      // Salvar os resultados permanentemente
      saveAnalysisResultsPermanently(validatedData)
        .then(() => {
          console.log('Resultados da análise salvos com sucesso no servidor');
        })
        .catch(err => {
          console.error('Falha ao salvar resultados permanentemente:', err);
          // Já estamos exibindo o erro na função saveAnalysisResultsPermanently
        });
    }
  };

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
        
        // Se já existem notas de laboratório, preenche o estado
        if (planData?.lab_results?.notes) {
          setNotes(planData.lab_results.notes);
        }
        
        // Verificar se existem arquivos já enviados
        if (planData?.lab_results?.files && planData.lab_results.files.length > 0) {
          console.log('Arquivos existentes encontrados:', planData.lab_results.files);
          // Não precisamos recriar URLs de preview para arquivos já enviados
          // Eles já têm suas URLs no servidor
        } else if (planData?.lab_results?.file_url) {
          // Compatibilidade com sistema antigo (arquivo único)
          const fileUrl = planData.lab_results.file_url.toLowerCase();
          setIsPdf(fileUrl.endsWith('.pdf') || fileUrl.includes('application/pdf'));
        }
        
        // Verificar e definir o estado de análise completa
        if (planData?.lab_results?.analyzed_data) {
          setAnalysisComplete(true);
          console.log('Dados de análise carregados do backend:', planData.lab_results.analyzed_data);
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

  // O questionário foi removido do fluxo
  // useEffect(() => {
  //   // Verificação de questionário removida
  // }, [plan]);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files.length > 0) {
      const files = Array.from(e.target.files);
      
      // Limpar seleção anterior quando há novo upload via input
      setSelectedFiles([]);
      setPreviewUrls([]);
      setCurrentFileIndex(0);
      
      processNewFiles(files);
    }
  };

  // Função para processar arquivos novos (substituindo seleção anterior)
  const processNewFiles = (files: File[]) => {
    const validFiles: File[] = [];
    let hasError = false;
    
    // Verificar cada arquivo
    for (const file of files) {
      // Verificar o tipo do arquivo
      if (!['application/pdf', 'image/jpeg', 'image/png'].includes(file.type)) {
        setError('Por favor, selecione apenas arquivos PDF, JPEG ou PNG');
        hasError = true;
        break;
      }
      
      // Verificar o tamanho do arquivo
      if (file.size > 5 * 1024 * 1024) { // 5MB
        setError(`O arquivo ${file.name} excede o tamanho máximo de 5MB`);
        hasError = true;
        break;
      }
      
      validFiles.push(file);
    }
    
    if (hasError) {
      return;
    }
    
    setSelectedFiles(validFiles);
    setCurrentFileIndex(0);
    
    // Manter compatibilidade com o código existente
    if (validFiles.length > 0) {
      setSelectedFile(validFiles[0]);
    }
    
    setError(null);
    
    // Criar URLs de preview para todos os arquivos
    const newPreviewUrls: string[] = [];
    let processedCount = 0;
    
    validFiles.forEach((file, index) => {
      const reader = new FileReader();
      reader.onloadend = () => {
        newPreviewUrls[index] = reader.result as string;
        processedCount++;
        
        // Quando todos os arquivos foram processados
        if (processedCount === validFiles.length) {
          setPreviewUrls(newPreviewUrls);
          
          // Configurar o primeiro arquivo como ativo
          const firstFile = validFiles[0];
          setIsPdf(firstFile.type === 'application/pdf');
          setPageNumber(1);
          setNumPages(null);
        }
      };
      reader.readAsDataURL(file);
    });
    
    // Mostrar informação sobre múltiplos arquivos
    if (validFiles.length > 1) {
      setSuccessMessage(`${validFiles.length} arquivos selecionados para upload`);
    } else if (validFiles.length === 1) {
      setSuccessMessage(`1 arquivo selecionado para upload`);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!id) return;
    
    // Verifica se há arquivos ou notas de texto (resumo)
    if (selectedFiles.length === 0 && !plan?.lab_results?.file_url && !notes) {
      setError('Por favor, selecione um ou mais arquivos ou insira um resumo dos resultados laboratoriais');
      return;
    }
    
    try {
      setUploading(true);
      setSuccessMessage(null);
      setError(null);
      
      // Verificar se estamos lidando com análise baseada apenas em texto
      const isTextOnlyAnalysis = selectedFiles.length === 0 && !plan?.lab_results?.file_url && notes;
      
      if (isTextOnlyAnalysis) {
        console.log('Iniciando fluxo de análise baseada apenas em texto');
        // Criar payload diretamente para análise baseada em texto
        const textAnalysisPayload = {
          notes: notes,
          text_only_analysis: true,
          file_url: '' // Sem arquivo
        };
        
        // Salvar diretamente via endpoint de saveLabAnalysisResults
        await planAPI.saveLabAnalysisResults(id as string, textAnalysisPayload);
      } else {
        // Fluxo normal com arquivo(s)
        if (selectedFiles.length > 0) {
          // Verificar se temos função para upload de múltiplos arquivos
          if (selectedFiles.length === 1) {
            // Se só temos um arquivo, usar a função existente
            await planAPI.uploadLabResults(id as string, selectedFiles[0]);
          } else {
            // Enviar múltiplos arquivos
            await planAPI.uploadMultipleLabResults(id as string, selectedFiles);
          }
        }
        
        // Se há notas, atualiza as notas
        if (notes) {
          await planAPI.updateLabNotes(id as string, notes);
        }
      }
      
      // Busca o plano atualizado
      const response = await planAPI.getPlanById(id as string);
      setPlan(response.data.plan || null);
      
      setSuccessMessage('Resultados laboratoriais salvos com sucesso!');
      
      // Iniciar análise automaticamente apenas se não existirem dados analisados
      if (plan && !plan.lab_results?.analyzed_data) {
        setTimeout(() => {
          setAnalyzing(true);
        }, 500);
      } else {
        console.log('Já existem dados analisados, não iniciando nova análise automática');
        setAnalysisComplete(true);
      }
      
    } catch (err: any) {
      setError('Erro ao enviar resultados: ' + (err.message || 'Tente novamente mais tarde'));
      console.error('Error uploading lab results:', err);
    } finally {
      setUploading(false);
    }
  };

  if (authLoading || loading) {
    return (
      <Layout title="Carregando Resultados Laboratoriais - Lyz">
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

  if (error && !plan) {
    return (
      <Layout title="Erro - Lyz">
        <div className="max-w-3xl mx-auto px-4 py-10">
          <div className="bg-red-50 p-6 rounded-lg">
            <h2 className="text-lg font-medium text-red-700 mb-2">Ocorreu um erro</h2>
            <p className="text-red-600">{error}</p>
            <div className="mt-4">
              <Link href="/plans" className="text-primary-600 font-medium hover:text-primary-500">
                ← Voltar para a lista de planos
              </Link>
            </div>
          </div>
        </div>
      </Layout>
    );
  }

  return (
    <Layout title="Resultados Laboratoriais - Lyz">
      <div className="max-w-5xl mx-auto px-4 py-10">
        <div className="mb-6 flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-primary" data-component-name="LabResultsPage">Resultados Laboratoriais</h1>
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

        {error && (
          <div className="mb-6 bg-red-50 p-4 rounded-md">
            <p className="text-red-700">{error}</p>
          </div>
        )}

        <form onSubmit={handleSubmit} className="bg-white shadow-sm rounded-lg p-6">
            <div className="space-y-6">
              <div>
                <h2 className="text-lg font-medium text-gray-900 mb-4">Arquivo de Resultados</h2>
                <div 
                  className={`flex flex-col items-center p-6 border-2 border-dashed rounded-lg transition-colors ${
                    isDragOver 
                      ? 'border-primary-500 bg-primary-50' 
                      : 'border-gray-300 bg-gray-50'
                  }`}
                  onDragOver={handleDragOver}
                  onDragLeave={handleDragLeave}
                  onDrop={handleDrop}
                >
                  <input
                    type="file"
                    ref={fileInputRef}
                    onChange={handleFileChange}
                    className="hidden"
                    accept=".pdf,.jpg,.jpeg,.png"
                    multiple
                  />
                  
                  {(plan?.lab_results?.files && plan.lab_results.files.length > 0) || plan?.lab_results?.file_url ? (
                    <div className="text-center">
                      <div className="mb-4">
                        <svg className="mx-auto h-12 w-12 text-green-500" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                        </svg>
                        <p className="mt-1 text-sm text-gray-500">
                          {plan?.lab_results?.files && plan.lab_results.files.length > 1 
                            ? `${plan.lab_results.files.length} arquivos já enviados` 
                            : 'Arquivo já enviado'}
                        </p>
                      </div>
                      
                      {/* Exibir lista de arquivos já enviados */}
                      {plan?.lab_results?.files && plan.lab_results.files.length > 0 ? (
                        <div className="mb-4">
                          <div className="flex flex-wrap gap-2 justify-center">
                            {plan.lab_results.files.map((file, index) => (
                              <div key={index} className="flex items-center px-3 py-2 bg-green-50 border border-green-200 rounded-lg">
                                {file.fileType === 'application/pdf' ? (
                                  <svg className="w-4 h-4 mr-2 text-green-600" fill="currentColor" viewBox="0 0 20 20">
                                    <path d="M4 18h12V6l-4-4H4v16zm8-14v4h4l-4-4z"/>
                                  </svg>
                                ) : (
                                  <svg className="w-4 h-4 mr-2 text-green-600" fill="currentColor" viewBox="0 0 20 20">
                                    <path fillRule="evenodd" d="M4 3a2 2 0 00-2 2v10a2 2 0 002 2h12a2 2 0 002-2V5a2 2 0 00-2-2H4zm12 12H4l4-8 3 6 2-4 3 6z" clipRule="evenodd"/>
                                  </svg>
                                )}
                                <span className="text-sm text-green-700 truncate max-w-[120px]" title={file.originalName}>
                                  {file.originalName}
                                </span>
                                <a 
                                  href={file.fileUrl}
                                  target="_blank"
                                  rel="noopener noreferrer"
                                  className="ml-2 text-green-600 hover:text-green-800"
                                  title="Visualizar arquivo"
                                >
                                  <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
                                    <path d="M10 12a2 2 0 100-4 2 2 0 000 4z"/>
                                    <path fillRule="evenodd" d="M.458 10C1.732 5.943 5.522 3 10 3s8.268 2.943 9.542 7c-1.274 4.057-5.064 7-9.542 7S1.732 14.057.458 10zM14 10a4 4 0 11-8 0 4 4 0 018 0z" clipRule="evenodd"/>
                                  </svg>
                                </a>
                              </div>
                            ))}
                          </div>
                        </div>
                      ) : plan?.lab_results?.file_url ? (
                        <div className="mb-4">
                          <a 
                            href={plan.lab_results.file_url}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="btn-outline text-sm"
                          >
                            Visualizar Arquivo
                          </a>
                        </div>
                      ) : null}
                      
                      <button
                        type="button"
                        onClick={() => fileInputRef.current?.click()}
                        className="btn-text text-sm"
                      >
                        {plan?.lab_results?.files && plan.lab_results.files.length > 0 
                          ? 'Enviar Novos Arquivos' 
                          : 'Substituir'}
                      </button>
                    </div>
                  ) : previewUrls.length > 0 ? (
                    <div className="w-full">
                      {/* Lista de arquivos selecionados */}
                      <div className="mb-4">
                        <h3 className="text-sm font-medium text-gray-700 mb-2">
                          Arquivos Selecionados ({selectedFiles.length})
                        </h3>
                        <div className="flex flex-wrap gap-2 mb-4">
                          {selectedFiles.map((file, index) => (
                            <div
                              key={index}
                              className={`flex items-center px-3 py-2 rounded-lg border cursor-pointer transition-colors ${
                                index === currentFileIndex
                                  ? 'border-primary-500 bg-primary-50 text-primary-700'
                                  : 'border-gray-300 bg-gray-50 text-gray-700 hover:border-gray-400'
                              }`}
                              onClick={() => navigateToFile(index)}
                            >
                              <div className="flex items-center min-w-0">
                                {/* Ícone do tipo de arquivo */}
                                {file.type === 'application/pdf' ? (
                                  <svg className="w-4 h-4 mr-2 flex-shrink-0" fill="currentColor" viewBox="0 0 20 20">
                                    <path d="M4 18h12V6l-4-4H4v16zm8-14v4h4l-4-4z"/>
                                  </svg>
                                ) : (
                                  <svg className="w-4 h-4 mr-2 flex-shrink-0" fill="currentColor" viewBox="0 0 20 20">
                                    <path fillRule="evenodd" d="M4 3a2 2 0 00-2 2v10a2 2 0 002 2h12a2 2 0 002-2V5a2 2 0 00-2-2H4zm12 12H4l4-8 3 6 2-4 3 6z" clipRule="evenodd"/>
                                  </svg>
                                )}
                                
                                <span className="text-sm truncate max-w-[120px]" title={file.name}>
                                  {file.name}
                                </span>
                                
                                <span className="text-xs text-gray-500 ml-2">
                                  ({(file.size / 1024 / 1024).toFixed(1)}MB)
                                </span>
                              </div>
                              
                              {/* Botão de remover */}
                              <button
                                type="button"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  removeFile(index);
                                }}
                                className="ml-2 p-1 text-red-500 hover:text-red-700 flex-shrink-0"
                                title="Remover arquivo"
                              >
                                <svg className="w-3 h-3" fill="currentColor" viewBox="0 0 20 20">
                                  <path fillRule="evenodd" d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z" clipRule="evenodd"/>
                                </svg>
                              </button>
                            </div>
                          ))}
                        </div>
                      </div>

                      {/* Preview do arquivo atual */}
                      {selectedFiles.length > 0 && previewUrls[currentFileIndex] && (
                        <div className="text-center">
                          <div className="mb-4">
                            {isPdf ? (
                              <div className="flex flex-col items-center">
                                <div className="pdf-viewer-container border rounded-md p-4 bg-gray-50 w-full max-w-md">
                                  {/* Renderizar o PDF com base no modo selecionado */}
                                  {pdfRenderMode === 'react-pdf' && typeof window !== 'undefined' ? (
                                    <>
                                      <Document
                                        file={previewUrls[currentFileIndex]}
                                        onLoadSuccess={(pdf: { numPages: number }) => {
                                          console.log('PDF carregado com sucesso:', pdf.numPages, 'páginas');
                                          setNumPages(pdf.numPages);
                                        }}
                                        onLoadError={(error: Error | any) => {
                                          // Verificar se o erro é um objeto vazio (como visto nos logs)
                                          if (!error || (typeof error === 'object' && Object.keys(error).length === 0)) {
                                            console.error('Erro vazio ao carregar PDF. Detalhes adicionais:', {
                                              timestamp: new Date().toISOString(),
                                              pdfUrl: previewUrls[currentFileIndex] ? previewUrls[currentFileIndex].substring(0, 100) : 'null',
                                              workerStatus: checkPdfWorkerStatus(),
                                              browserInfo: typeof navigator !== 'undefined' ? {
                                                userAgent: navigator.userAgent,
                                                platform: navigator.platform
                                              } : 'Indisponível'
                                            });
                                            
                                            setError('Erro ao carregar o PDF: Worker possivelmente destruído. Alternando para visualização nativa do navegador...');
                                          } else {
                                            // Para erros não vazios, capturar detalhes normalmente
                                            try {
                                              console.error('Erro ao carregar PDF:', {
                                                message: error.message || 'Sem mensagem',
                                                name: error.name || 'Sem nome',
                                                stack: error.stack || 'Sem stack',
                                                toString: String(error)
                                              });
                                            } catch (e) {
                                              console.error('Erro ao tentar logar detalhes do erro:', e);
                                            }
                                            setError(`Erro ao carregar o PDF: ${error.message || 'Erro desconhecido'}. Tentando modo alternativo...`);
                                          }
                                          // Mudar para modo alternativo em caso de erro
                                          switchPdfRenderMode();
                                        }}
                                        options={{
                                          cMapUrl: 'https://unpkg.com/pdfjs-dist@2.16.105/cmaps/',
                                          cMapPacked: true,
                                          standardFontDataUrl: 'https://unpkg.com/pdfjs-dist@2.16.105/standard_fonts'
                                        }}
                                        className="pdf-document"
                                        loading={<div className="text-center py-4">Carregando PDF...</div>}
                                        error={<div className="text-center py-4 text-red-600">Não foi possível carregar o PDF. Tentando modo alternativo...</div>}
                                      >
                                        <Page 
                                          pageNumber={pageNumber} 
                                          width={300}
                                          renderTextLayer={false}
                                          renderAnnotationLayer={false}
                                          error={<div className="text-center py-2 text-red-600">Erro ao renderizar página</div>}
                                          loading={<div className="text-center py-2">Renderizando página...</div>}
                                        />
                                      </Document>
                                    </>
                                  ) : pdfRenderMode === 'iframe' ? (
                                    <>
                                      <div className="text-center mb-2">Visualização alternativa do PDF</div>
                                      <iframe 
                                        src={previewUrls[currentFileIndex]}
                                        className="w-full h-[400px]"
                                        title="Visualização de PDF"
                                        onLoad={() => {
                                          console.log('PDF carregado via iframe');
                                          // Verificar se o iframe carregou corretamente
                                          try {
                                            // Tentar acessar o conteúdo do iframe para confirmar carregamento
                                            setTimeout(() => {
                                              const iframeElement = document.querySelector('iframe');
                                              if (iframeElement) {
                                                console.log('iframe DOM disponível:', iframeElement.contentDocument ? 'Sim' : 'Não');
                                              }
                                            }, 1000);
                                          } catch (error) {
                                            console.warn('Não foi possível verificar o conteúdo do iframe:', error);
                                          }
                                        }}
                                        onError={(event) => {
                                          console.error('Erro ao carregar PDF via iframe:', {
                                            event: event,
                                            target: event.target,
                                            currentTime: new Date().toISOString()
                                          });
                                          setError('Falha ao carregar o PDF no modo iframe. Tentando download direto...');
                                          switchPdfRenderMode();
                                        }}
                                      />
                                    </>
                                  ) : (
                                    <>
                                      <div className="text-center mb-2">Visualização de PDF não disponível</div>
                                      <div className="text-center py-4">
                                        <a href={previewUrls[currentFileIndex]} target="_blank" rel="noopener noreferrer" className="btn-primary">
                                          Baixar PDF para visualizar
                                        </a>
                                        <p className="mt-2 text-sm text-gray-600">Ou tente carregar o arquivo em outro formato (JPG, PNG)</p>
                                      </div>
                                    </>
                                  )}
                                  {numPages && numPages > 1 && pdfRenderMode === 'react-pdf' && (
                                    <div className="flex justify-between items-center mt-4">
                                      <button 
                                        onClick={() => setPageNumber(prev => Math.max(1, prev - 1))}
                                        disabled={pageNumber <= 1}
                                        className="px-3 py-1 bg-gray-200 rounded disabled:opacity-50"
                                        type="button"
                                      >
                                        ← Anterior
                                      </button>
                                      <span className="text-sm text-gray-600">
                                        {pageNumber} de {numPages}
                                      </span>
                                      <button 
                                        onClick={() => setPageNumber(prev => Math.min(numPages, prev + 1))}
                                        disabled={pageNumber >= numPages}
                                        className="px-3 py-1 bg-gray-200 rounded disabled:opacity-50"
                                        type="button"
                                      >
                                        Próxima →
                                      </button>
                                    </div>
                                  )}
                                  
                                  {/* Botão para alternar modo de visualização do PDF */}
                                  {isPdf && previewUrls.length > 0 && (
                                    <div className="text-center mt-3">
                                      <button 
                                        onClick={switchPdfRenderMode} 
                                        className="text-sm text-blue-600 hover:text-blue-800"
                                        type="button"
                                      >
                                        {pdfRenderMode === 'react-pdf' ? 'Alternar para visualização alternativa' : 
                                         pdfRenderMode === 'iframe' ? 'Alternar para download direto' : 
                                         'Retornar para visualização padrão'}
                                      </button>
                                    </div>
                                  )}
                                </div>
                                <p className="text-sm font-medium text-gray-600 mt-2">PDF com extração automática de texto</p>
                              </div>
                            ) : (
                              <img 
                                src={previewUrls[currentFileIndex]} 
                                alt="Preview" 
                                className="mx-auto h-40 object-contain rounded-lg border" 
                              />
                            )}
                            <p className="mt-2 text-sm text-gray-600">
                              Arquivo {currentFileIndex + 1} de {selectedFiles.length}: {selectedFile?.name}
                            </p>
                          </div>
                          
                          {/* Navegação entre arquivos */}
                          {selectedFiles.length > 1 && (
                            <div className="flex justify-center items-center space-x-4 mb-4">
                              <button
                                type="button"
                                onClick={() => navigateToFile(Math.max(0, currentFileIndex - 1))}
                                disabled={currentFileIndex === 0}
                                className="px-3 py-2 bg-gray-200 text-gray-700 rounded disabled:opacity-50 hover:bg-gray-300"
                              >
                                ← Anterior
                              </button>
                              <span className="text-sm text-gray-600">
                                {currentFileIndex + 1} de {selectedFiles.length}
                              </span>
                              <button
                                type="button"
                                onClick={() => navigateToFile(Math.min(selectedFiles.length - 1, currentFileIndex + 1))}
                                disabled={currentFileIndex === selectedFiles.length - 1}
                                className="px-3 py-2 bg-gray-200 text-gray-700 rounded disabled:opacity-50 hover:bg-gray-300"
                              >
                                Próximo →
                              </button>
                            </div>
                          )}
                          
                          <div className="flex justify-center space-x-2">
                            <button
                              type="button"
                              onClick={() => {
                                // Criar um input temporário para adicionar mais arquivos
                                const tempInput = document.createElement('input');
                                tempInput.type = 'file';
                                tempInput.multiple = true;
                                tempInput.accept = '.pdf,.jpg,.jpeg,.png';
                                tempInput.onchange = (e) => {
                                  const target = e.target as HTMLInputElement;
                                  if (target.files && target.files.length > 0) {
                                    const newFiles = Array.from(target.files);
                                    processFiles(newFiles);
                                  }
                                };
                                tempInput.click();
                              }}
                              className="btn-outline text-sm"
                            >
                              Adicionar Mais Arquivos
                            </button>
                            <button
                              type="button"
                              onClick={() => {
                                setSelectedFiles([]);
                                setPreviewUrls([]);
                                setSelectedFile(null);
                                setCurrentFileIndex(0);
                                setSuccessMessage(null);
                              }}
                              className="btn-text text-sm text-red-600 hover:text-red-700"
                            >
                              Remover Todos
                            </button>
                          </div>
                        </div>
                      )}
                    </div>
                  ) : (
                    <div className="text-center py-8">
                      <svg className="mx-auto h-12 w-12 text-gray-400" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                      </svg>
                      <p className="mt-3 text-sm text-gray-600 font-medium">
                        Faça upload dos resultados laboratoriais
                      </p>
                      <p className="mt-1 text-sm text-gray-500">
                        Arraste e solte arquivos aqui, ou clique para selecionar
                      </p>
                      <button
                        type="button"
                        onClick={() => fileInputRef.current?.click()}
                        className="mt-4 btn-primary"
                      >
                        Selecionar Arquivos
                      </button>
                      <div className="mt-4 text-xs text-gray-500 space-y-1">
                        <p>• Formatos aceitos: PDF, PNG, JPG</p>
                        <p>• Tamanho máximo: 5MB por arquivo</p>
                        <p>• Múltiplos arquivos são suportados</p>
                        <p>• PDFs oferecem melhor precisão na análise automática</p>
                      </div>
                    </div>
                  )}
                </div>
              </div>

              <div>
                <h2 className="text-lg font-medium text-gray-900 mb-4">Resumo dos Dados Laboratoriais</h2>
                <p className="text-sm text-gray-600 mb-2">
                  Caso não tenha o documento de exames disponível, você pode inserir um resumo dos principais valores e resultados abaixo.
                </p>
                <textarea
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  rows={8}
                  className="w-full border border-gray-300 rounded-md px-3 py-2 focus:outline-none focus:ring-2 focus:ring-primary-500"
                  placeholder="Insira aqui os principais valores e resultados dos exames laboratoriais (ex: Hemoglobina: 12.5 g/dL, Ferritina: 35 ng/mL, Glicose: 95 mg/dL, etc). Quanto mais detalhado, melhor será a análise."
                />
              </div>

              {/* Componente de análise animada */}
              {/* Adicionar links úteis sobre a importância dos PDFs para análise */}
              {isPdf && !analyzing && !analysisComplete && !plan?.lab_results?.analyzed_data && (
                <div className="mt-4 p-3 bg-blue-50 rounded-md">
                  <p className="text-sm text-blue-600">
                    <strong>Dica:</strong> PDFs geralmente fornecem resultados mais precisos na análise automática, pois o texto pode ser extraído diretamente do documento.                   
                  </p>
                </div>
              )}
              
              {(analyzing || analysisComplete || plan?.lab_results?.analyzed_data) && (
                <div className="mt-6">
                  {/* Se a análise já foi concluída e carregada do backend, exibir os resultados */}
                  {!analyzing && plan?.lab_results?.analyzed_data && (
                    <div className="bg-white shadow-md rounded-lg p-6 mb-6">
                      <h3 className="text-lg font-medium text-gray-900 mb-4">Resultados da Análise</h3>
                      
                      <div className="mb-4">
                        <h4 className="font-medium text-gray-800 mb-2">Resumo</h4>
                        <p className="text-gray-600">{plan.lab_results.analyzed_data.summary}</p>
                      </div>
                      
                      {plan.lab_results.analyzed_data.outOfRange && plan.lab_results.analyzed_data.outOfRange.length > 0 && (
                        <div className="mb-4">
                          <h4 className="font-medium text-gray-800 mb-2">Valores Fora de Referência</h4>
                          <div className="space-y-3">
                            {plan.lab_results.analyzed_data.outOfRange.map((item: any, index: number) => (
                              <div key={index} className="p-3 bg-yellow-50 rounded-md">
                                <p className="font-medium">{item.name}: {item.value} {item.unit}</p>
                                <p className="text-sm text-gray-600">Referência: {item.reference}</p>
                                <p className="text-sm text-gray-700 mt-1">{item.interpretation}</p>
                              </div>
                            ))}
                          </div>
                        </div>
                      )}
                      
                      {plan.lab_results.analyzed_data.recommendations && plan.lab_results.analyzed_data.recommendations.length > 0 && (
                        <div>
                          <h4 className="font-medium text-gray-800 mb-2">Recomendações</h4>
                          <ul className="list-disc pl-5 space-y-1">
                            {plan.lab_results.analyzed_data.recommendations.map((rec: string, index: number) => (
                              <li key={index} className="text-gray-600">{rec}</li>
                            ))}
                          </ul>
                        </div>
                      )}
                    </div>
                  )}
                  
                  {/* Exibir o componente de animação quando estiver analisando ou ainda não tiver análise */}
                  {(analyzing || (!plan?.lab_results?.analyzed_data && analysisComplete)) && (
                    <LabAnalysisAnimation
                      analyzeResults={analyzeResults}
                      fileUrl={previewUrls[currentFileIndex] || plan?.lab_results?.file_url}
                      isAnalyzing={analyzing}
                      onAnalysisComplete={handleAnalysisComplete}
                      isPdf={isPdf}
                      planId={id as string}
                    />
                  )}
                </div>
              )}
            </div>

            {successMessage && (
                <div className="mt-4 p-3 bg-green-50 rounded-md">
                  <p className="text-sm text-green-600">
                    <strong>Sucesso:</strong> {successMessage}
                  </p>
                </div>
              )}
              
              {error && (
                <div className="mt-4 p-3 bg-red-50 rounded-md">
                  <p className="text-sm text-red-600">
                    <strong>Erro:</strong> {error}
                    {error.includes('Falha ao salvar') && (
                      <button 
                        onClick={() => {
                          if (plan?.lab_results?.analyzed_data) {
                            saveAnalysisResultsPermanently(plan.lab_results.analyzed_data)
                              .then(() => setError(null))
                              .catch(err => console.error('Erro ao tentar salvar novamente:', err));
                          }
                        }}
                        className="ml-2 underline text-red-700 hover:text-red-800"
                      >
                        Tentar novamente
                      </button>
                    )}
                  </p>
                </div>
              )}

              <div className="mt-8 flex justify-end space-x-4">
                <Link 
                  href={`/plans/${id}`}
                  className="btn-outline"
                >
                  Cancelar
                </Link>
                <button
                  type="submit"
                  disabled={uploading || (!selectedFile && !plan?.lab_results?.file_url && !notes)}
                  className="btn-primary"
                >
                  {uploading ? 'Enviando...' : 'Salvar e Analisar'}
                </button>
                {plan?.lab_results?.analyzed_data && (
                  <button
                    type="button"
                    onClick={() => saveAnalysisResultsPermanently(plan.lab_results?.analyzed_data)}
                    className="btn-primary bg-blue-600 hover:bg-blue-700"
                    disabled={uploading}
                  >
                    {uploading ? 'Salvando...' : 'Salvar Resultados'}
                  </button>
                )}
                {analysisComplete && (
                  <Link 
                    href={`/plans/${id}/tcm`}
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

export default LabResultsPage;
