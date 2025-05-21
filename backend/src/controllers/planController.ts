import { Request, Response } from 'express';
import { PatientPlan, User } from '../models';
import { generateAIResponse } from '../services/ai/openaiService';
import { exportPlanAsPDF, exportPlanAsDOCX, exportPlanAsHTML, sharePlanViaEmail as emailService } from '../services/export/exportService';
import { minioClient } from '../config/minio';
import pdfParse from 'pdf-parse';

// Interface para metadados de documentos
interface DocumentMetadata {
  pageCount?: number;
  info?: Record<string, any>;
  metadata?: Record<string, any>;
  version?: string;
  textLength?: number;
  error?: boolean;
  errorType?: string;
  errorMessage?: string;
  imageType?: string;
  size?: number;
  needsOCR?: boolean;
  fileType?: string;
  unsupported?: boolean;
}

// Start a new plan
export const startPlan = async (req: Request, res: Response) => {
  const { professional_type, patient_data } = req.body;
  const userId = req.user.id;
  const companyId = req.user.company_id;
  
  if (!professional_type || !patient_data) {
    return res.status(400).json({ message: 'Professional type and patient data are required' });
  }
  
  // Verificar se o usuário tem uma empresa associada
  if (!companyId) {
    return res.status(400).json({ message: 'You need to be associated with a company to create plans' });
  }
  
  try {
    // Create new patient plan associado principalmente à empresa
    const plan = await PatientPlan.create({
      user_id: userId,       // Mantemos o user_id para fins de auditoria/rastreamento
      company_id: companyId, // A associação principal é com a empresa
      professional_type,
      patient_data,
    });
    
    return res.status(201).json({
      message: 'Plan started successfully',
      plan_id: plan.id
    });
  } catch (error) {
    console.error('Error starting plan:', error);
    return res.status(500).json({ message: 'Internal server error' });
  }
};

// Update questionnaire data
export const updateQuestionnaire = async (req: Request, res: Response) => {
  const { id } = req.params;
  const { questionnaire_data } = req.body;
  const userId = req.user.id;
  const companyId = req.user.company_id;
  const userRole = req.user.role;
  
  if (!questionnaire_data) {
    return res.status(400).json({ message: 'Questionnaire data is required' });
  }
  
  try {
    // Find plan
    const plan = await PatientPlan.findByPk(id);
    
    if (!plan) {
      return res.status(404).json({ message: 'Plan not found' });
    }
    
    // Check permission (same company or superadmin)
    if (String(plan.company_id) !== String(companyId) && userRole !== 'superadmin') {
      return res.status(403).json({ message: 'Not authorized to update this plan' });
    }
    
    // Update questionnaire data
    await plan.update({ questionnaire_data });
    
    // Process questionnaire using AI
    const aiResponse = await generateAIResponse(
      Number(userId),
      Number(plan.company_id),
      'questionnaire_organization',
      { patientData: plan.patient_data, questionnaireData: questionnaire_data }
    );
    
    if (aiResponse.success) {
      return res.status(200).json({
        message: 'Questionnaire updated successfully',
        analyzed_data: aiResponse.data
      });
    } else {
      return res.status(200).json({
        message: 'Questionnaire updated but analysis failed',
        error: aiResponse.message
      });
    }
  } catch (error) {
    console.error('Error updating questionnaire:', error);
    return res.status(500).json({ message: 'Internal server error' });
  }
};

// Salvar dados de análise de resultados laboratoriais
export const saveLabAnalysisResults = async (req: Request, res: Response) => {
  const { id } = req.params;
  const userId = req.user.id;
  const companyId = req.user.company_id;
  const userRole = req.user.role;
  
  if (!req.body.lab_results) {
    return res.status(400).json({ message: 'Lab results data is required' });
  }
  
  try {
    // Find plan
    const plan = await PatientPlan.findByPk(id);
    
    if (!plan) {
      return res.status(404).json({ message: 'Plan not found' });
    }
    
    // Check permission (same company or superadmin)
    if (plan.company_id !== companyId && userRole !== 'superadmin') {
      return res.status(403).json({ message: 'Unauthorized' });
    }
    
    // Salvar os dados da análise
    await plan.update({
      lab_results: req.body.lab_results
    });
    
    return res.status(200).json({
      message: 'Lab analysis results saved successfully',
      plan
    });
  } catch (error) {
    console.error('Error saving lab analysis results:', error);
    return res.status(500).json({ message: 'Error saving lab analysis results', error: error.message });
  }
};

// Upload and analyze lab results
export const updateLabResults = async (req: Request, res: Response) => {
  const { id } = req.params;
  const userId = req.user.id;
  const companyId = req.user.company_id;
  const userRole = req.user.role;
  
  // Verificar se existem arquivos enviados
  if (!req.files || !(req.files as Express.Multer.File[]).length) {
    return res.status(400).json({ message: 'Lab results files are required' });
  }
  
  // Converter para array para garantir a tipagem correta
  const files = req.files as Express.Multer.File[];
  
  try {
    // Find plan
    const plan = await PatientPlan.findByPk(id);
    
    if (!plan) {
      return res.status(404).json({ message: 'Plan not found' });
    }
    
    // Check permission (same company or superadmin)
    if (String(plan.company_id) !== String(companyId) && userRole !== 'superadmin') {
      return res.status(403).json({ message: 'Not authorized to update this plan' });
    }
    
    const bucketName = process.env.MINIO_BUCKET || 'lyz-files';
    const processedFiles = [];
    const timestamp = Date.now();
    
    // Processar cada arquivo enviado
    for (let i = 0; i < files.length; i++) {
      const file = files[i];
      
      try {
        // Upload file to Minio
        const fileName = `lab-results/${plan.id}/${timestamp}_${i}_${file.originalname}`;
        
        await minioClient.putObject(
          bucketName,
          fileName,
          file.buffer,
          file.size,
          { 'Content-Type': file.mimetype }
        );
        
        // Generate presigned URL
        const fileUrl = await minioClient.presignedGetObject(bucketName, fileName, 24 * 60 * 60); // 24 hours
        
        // Preparar para extrair texto do arquivo
        let extractedText = "";
        let documentMetadata: DocumentMetadata = {};
        let extractionMethod = "none";
        
        // Converter o buffer para base64 para armazenar no banco de dados
        const fileBuffer = file.buffer.toString('base64');
        
        // Processar arquivo com base no tipo MIME
        if (file.mimetype === 'application/pdf') {
          try {
            // Importar o serviço de PDF dinamicamente para evitar dependência circular
            const { extractTextFromPDF } = await import('../services/pdf/pdfService');
            
            // Extrair texto do PDF usando o serviço de PDF
            const pdfResult = await extractTextFromPDF(file.buffer);
            
            if (pdfResult.success) {
              extractionMethod = "pdf-parse";
              extractedText = pdfResult.text;
              
              // Coletar metadados do PDF para ajudar na análise
              documentMetadata = {
                pageCount: pdfResult.info?.numPages || 0,
                info: pdfResult.info || {},
                metadata: pdfResult.metadata || {},
                version: pdfResult.info?.PDFVersion || '',
                textLength: pdfResult.text.length
              };
              
              console.log(`PDF processado com sucesso: ${documentMetadata.pageCount} páginas, ${extractedText.length} caracteres`);
              
              // Verificamos se o texto extraído é proporcionalmente suficiente para o número de páginas
              const textoMinimoEsperadoPorPagina = 30; // Caracteres mínimos esperados por página
              const textoEsperadoTotal = textoMinimoEsperadoPorPagina * documentMetadata.pageCount;
              
              if (extractedText.length < textoEsperadoTotal && documentMetadata.pageCount > 0) {
                console.log(`Texto extraído (${extractedText.length} caracteres) menor que o esperado para ${documentMetadata.pageCount} páginas.`);
                extractionMethod = "pdf-parse-limited";
              }
            } else {
              // Se a extração falhou, registrar o erro
              extractionMethod = "pdf-parse-failed";
              const errorMessage = pdfResult.error || 'Falha na extração de texto';
              extractedText = `Não foi possível extrair o texto completo do PDF. ${errorMessage}. O arquivo pode estar protegido, danificado ou em formato não processado.`;
              
              documentMetadata = {
                error: true,
                errorType: 'PDFParseError',
                errorMessage
              };
            }
          } catch (pdfError: any) {
            console.error('Erro ao extrair texto do PDF:', pdfError);
            extractionMethod = "pdf-parse-error";
            
            // Melhorar a mensagem de erro com mais detalhes
            const errorMessage = pdfError.message || 'Erro desconhecido';
            extractedText = `Não foi possível extrair o texto completo do PDF. ${errorMessage}. O arquivo pode estar protegido, danificado ou em formato não processado.`;
            
            documentMetadata = {
              error: true,
              errorType: pdfError.name || 'PDFParseError',
              errorMessage
            };
          }
        } else if (file.mimetype.startsWith('image/')) {
          extractionMethod = "image-description";
          // Para imagens, poderia ser implementado OCR no futuro
          extractedText = "Imagem de resultados laboratoriais enviada. A análise será baseada nas notas fornecidas pelo profissional.";
          
          documentMetadata = {
            imageType: file.mimetype,
            size: file.size,
            needsOCR: true
          };
        } else {
          extractionMethod = "none";
          extractedText = "Tipo de arquivo não suportado para extração de texto automática.";
          
          documentMetadata = {
            fileType: file.mimetype,
            size: file.size,
            unsupported: true
          };
        }
        
        // Process individual file using AI if needed
        const aiResponse = await generateAIResponse(
          Number(userId),
          Number(plan.company_id),
          'lab_results_analysis',
          { 
            patientData: plan.patient_data, 
            labResultsText: extractedText,
            fileType: file.mimetype,
            isPDF: file.mimetype === 'application/pdf',
            documentMetadata 
          }
        );
        
        // Create processed file object
        const processedFile = {
          fileUrl,
          fileName,
          fileType: file.mimetype,
          extractedText,
          extractionMethod,
          documentMetadata: {
            ...documentMetadata,
            // Adicionar flag para indicar que o PDF é legível e de boa qualidade
            isHighQualityPDF: file.mimetype === 'application/pdf' && (extractionMethod === "pdf-parse" || extractionMethod === "pdf-parse-limited")
          },
          uploadedAt: new Date().toISOString(),
          analysis: aiResponse.success ? aiResponse.data : 'Analysis failed',
          file_buffer: fileBuffer,
          image_url: fileUrl,
          document_type: file.mimetype === 'application/pdf' ? 'pdf' : 'image',
          index: i,
          originalName: file.originalname
        };
        
        // Add to processed files array
        processedFiles.push(processedFile);
        
      } catch (fileError) {
        console.error(`Erro ao processar arquivo ${i} (${file.originalname}):`, fileError);
        // Add error information to processed files
        processedFiles.push({
          error: true,
          errorMessage: `Erro ao processar arquivo: ${fileError.message || 'Erro desconhecido'}`,
          originalName: file.originalname,
          fileType: file.mimetype,
          index: i,
          uploadedAt: new Date().toISOString()
        });
      }
    }
    
    // Combine all file results into a single lab results object
    const labResults = {
      files: processedFiles,
      totalFiles: files.length,
      processedFiles: processedFiles.length,
      uploadedAt: new Date().toISOString(),
      uploadedBy: userId,
      // Extract combined data from all files for easier access
      combinedAnalysis: processedFiles.length > 0 ? {
        summary: `Análise de ${processedFiles.length} arquivos de resultados laboratoriais.`,
        outOfRange: processedFiles
          .filter(file => file.analysis && file.analysis.outOfRange)
          .flatMap(file => file.analysis.outOfRange || []),
        recommendations: [...new Set(processedFiles
          .filter(file => file.analysis && file.analysis.recommendations)
          .flatMap(file => file.analysis.recommendations || []))]
      } : { summary: 'Nenhum arquivo processado com sucesso.' }
    };
    
    await plan.update({ lab_results: labResults });
    
    return res.status(200).json({
      message: 'Lab results uploaded and analyzed successfully',
      lab_results: labResults
    });
  } catch (error) {
    console.error('Error processing lab results:', error);
    return res.status(500).json({ message: 'Internal server error' });
  }
};

// Update TCM observations
export const updateTCMObservations = async (req: Request, res: Response) => {
  const { id } = req.params;
  const { tcm_observations } = req.body;
  const userId = req.user.id;
  const companyId = req.user.company_id;
  const userRole = req.user.role;
  
  if (!tcm_observations) {
    return res.status(400).json({ message: 'TCM observations are required' });
  }
  
  try {
    // Find plan
    const plan = await PatientPlan.findByPk(id);
    
    if (!plan) {
      return res.status(404).json({ message: 'Plan not found' });
    }
    
    // Check permission (same company or superadmin)
    if (String(plan.company_id) !== String(companyId) && userRole !== 'superadmin') {
      return res.status(403).json({ message: 'Not authorized to update this plan' });
    }
    
    // Update TCM observations
    await plan.update({ tcm_observations });
    
    // Process TCM observations using AI
    const aiResponse = await generateAIResponse(
      Number(userId),
      Number(plan.company_id),
      'tcm_analysis',
      { 
        patientData: plan.patient_data, 
        tcmObservations: tcm_observations,
        questionnaireData: plan.questionnaire_data
      }
    );
    
    if (aiResponse.success) {
      return res.status(200).json({
        message: 'TCM observations updated successfully',
        analyzed_data: aiResponse.data
      });
    } else {
      return res.status(200).json({
        message: 'TCM observations updated but analysis failed',
        error: aiResponse.message
      });
    }
  } catch (error) {
    console.error('Error updating TCM observations:', error);
    return res.status(500).json({ message: 'Internal server error' });
  }
};

// Update timeline data
export const updateTimeline = async (req: Request, res: Response) => {
  const { id } = req.params;
  const { timeline_data } = req.body;
  const userId = req.user.id;
  const companyId = req.user.company_id;
  const userRole = req.user.role;
  
  if (!timeline_data) {
    return res.status(400).json({ message: 'Timeline data is required' });
  }
  
  try {
    // Find plan
    const plan = await PatientPlan.findByPk(id);
    
    if (!plan) {
      return res.status(404).json({ message: 'Plan not found' });
    }
    
    // Check permission (same company or superadmin)
    if (String(plan.company_id) !== String(companyId) && userRole !== 'superadmin') {
      return res.status(403).json({ message: 'Not authorized to update this plan' });
    }
    
    // Update timeline data
    await plan.update({ timeline_data });
    
    // Generate timeline using AI if requested
    if (req.body.generate_ai_timeline) {
      const aiResponse = await generateAIResponse(
        Number(userId),
        Number(plan.company_id),
        'timeline_generation',
        { 
          patientData: plan.patient_data, 
          questionnaireData: plan.questionnaire_data,
          labResults: plan.lab_results,
          tcmObservations: plan.tcm_observations
        }
      );
      
      if (aiResponse.success) {
        return res.status(200).json({
          message: 'Timeline updated successfully',
          ai_suggested_timeline: aiResponse.data
        });
      } else {
        return res.status(200).json({
          message: 'Timeline updated but AI suggestion failed',
          error: aiResponse.message
        });
      }
    }
    
    return res.status(200).json({
      message: 'Timeline updated successfully'
    });
  } catch (error) {
    console.error('Error updating timeline:', error);
    return res.status(500).json({ message: 'Internal server error' });
  }
};

// Update IFM matrix
export const updateIFMMatrix = async (req: Request, res: Response) => {
  const { id } = req.params;
  const { ifm_matrix } = req.body;
  const userId = req.user.id;
  const companyId = req.user.company_id;
  const userRole = req.user.role;
  
  if (!ifm_matrix) {
    return res.status(400).json({ message: 'IFM matrix data is required' });
  }
  
  try {
    // Find plan
    const plan = await PatientPlan.findByPk(id);
    
    if (!plan) {
      return res.status(404).json({ message: 'Plan not found' });
    }
    
    // Check permission (same company or superadmin)
    if (String(plan.company_id) !== String(companyId) && userRole !== 'superadmin') {
      return res.status(403).json({ message: 'Not authorized to update this plan' });
    }
    
    // Update IFM matrix
    await plan.update({ ifm_matrix });
    
    // Generate IFM matrix using AI if requested
    if (req.body.generate_ai_matrix) {
      const aiResponse = await generateAIResponse(
        Number(userId),
        Number(plan.company_id),
        'ifm_matrix_generation',
        { 
          patientData: plan.patient_data, 
          questionnaireData: plan.questionnaire_data,
          labResults: plan.lab_results,
          tcmObservations: plan.tcm_observations,
          timelineData: plan.timeline_data
        }
      );
      
      if (aiResponse.success) {
        return res.status(200).json({
          message: 'IFM matrix updated successfully',
          ai_suggested_matrix: aiResponse.data
        });
      } else {
        return res.status(200).json({
          message: 'IFM matrix updated but AI suggestion failed',
          error: aiResponse.message
        });
      }
    }
    
    return res.status(200).json({
      message: 'IFM matrix updated successfully'
    });
  } catch (error) {
    console.error('Error updating IFM matrix:', error);
    return res.status(500).json({ message: 'Internal server error' });
  }
};

// Importar serviço RAG
import { getRAGService } from '../services/knowledge/ragService';

// Generate final plan
export const generateFinalPlan = async (req: Request, res: Response) => {
  const { id } = req.params;
  const userId = req.user.id;
  const companyId = req.user.company_id;
  const userRole = req.user.role;
  
  try {
    // Find plan
    const plan = await PatientPlan.findByPk(id);
    
    if (!plan) {
      return res.status(404).json({ message: 'Plan not found' });
    }
    
    // Check permission (same company or superadmin)
    if (String(plan.company_id) !== String(companyId) && userRole !== 'superadmin') {
      return res.status(403).json({ message: 'Not authorized to generate plan' });
    }
    
    // Verificar se temos dados suficientes para gerar o plano
    const hasTCMData = plan.tcm_observations && Object.keys(plan.tcm_observations).length > 0;
    const hasLabData = plan.lab_results && Object.keys(plan.lab_results).length > 0;
    const hasIFMData = plan.ifm_matrix && Object.keys(plan.ifm_matrix).length > 0;
    const hasQuestionnaireData = plan.questionnaire_data && Object.keys(plan.questionnaire_data).length > 0;
    const hasTimelineData = plan.timeline_data && Object.keys(plan.timeline_data).length > 0;
    
    // Verificar se temos pelo menos alguns dados para trabalhar
    if (!hasQuestionnaireData && !hasTCMData && !hasLabData && !hasIFMData && !hasTimelineData) {
      console.log(`Erro: Sem dados suficientes para o plano ${id}. Questionário: ${hasQuestionnaireData}, TCM: ${hasTCMData}, Labs: ${hasLabData}, IFM: ${hasIFMData}, Timeline: ${hasTimelineData}`);
      return res.status(400).json({ 
        message: 'Não há dados suficientes para gerar o plano. Pelo menos uma das seções (questionário, TCM, exames, matriz IFM ou linha do tempo) deve estar preenchida.' 
      });
    }
    
    // Log para debug
    console.log(`Dados disponíveis para o plano ${id}: Questionário: ${hasQuestionnaireData}, TCM: ${hasTCMData}, Labs: ${hasLabData}, IFM: ${hasIFMData}, Timeline: ${hasTimelineData}`);
    
    // Determine which prompt to use based on professional type
    const promptKey = plan.professional_type === 'medical_nutritionist' 
      ? 'plan_medical_nutritionist' 
      : 'plan_other_professional';
    
    // Organizar as análises anteriores em um objeto estruturado
    // para incluir no plano final
    const previousAnalyses: Record<string, any> = {};
    
    // Incluir a análise TCM se disponível
    if (plan.tcm_observations && (plan.tcm_observations as any).analysis) {
      previousAnalyses.tcmAnalysis = (plan.tcm_observations as any).analysis;
    }
    
    // Incluir a análise de exames laboratoriais se disponível
    if (plan.lab_results && (plan.lab_results as any).analysis) {
      previousAnalyses.labAnalysis = (plan.lab_results as any).analysis;
    }
    
    // Incluir a análise da matriz IFM se disponível
    if (plan.ifm_matrix && (plan.ifm_matrix as any).analysis) {
      previousAnalyses.ifmAnalysis = (plan.ifm_matrix as any).analysis;
    }
    
    // Log para debug
    console.log(`Iniciando geração do plano final com IA para o plano ${id}`);
    
    // Generate plan using AI
    // Preparar os dados para enviar à IA, excluindo os nulos/vazios
    const inputData: Record<string, any> = {
      patientData: plan.patient_data,
      previousAnalyses: previousAnalyses, // Incluir todas as análises anteriores
      responseFormat: {
        // Especificar o formato esperado da resposta
        type: "json_object",
        required_fields: [
          "diagnosis",
          "treatment_plan",
          "nutritional_recommendations",
          "lifestyle_recommendations",
          "follow_up",
          "additional_notes"
        ]
      }
    };
    
    // Adicionar apenas os dados disponíveis
    if (hasQuestionnaireData) inputData.questionnaireData = plan.questionnaire_data;
    if (hasLabData) inputData.labResults = plan.lab_results;
    if (hasTCMData) inputData.tcmObservations = plan.tcm_observations;
    if (hasTimelineData) inputData.timelineData = plan.timeline_data;
    if (hasIFMData) inputData.ifmMatrix = plan.ifm_matrix;
    
    // Definir a instrução básica para o formato de resposta
    let systemInstruction = `Você é um especialista em Medicina Integrativa. Gere um plano terapêutico completo baseado nos dados do paciente, seguindo esta estrutura:  
    - diagnosis: Diagnóstico detalhado baseado nos dados fornecidos
    - treatment_plan: Plano de tratamento detalhado com recomendações específicas
    - nutritional_recommendations:
      - foods_to_include: Lista de alimentos recomendados (formato lista com quebras de linha)
      - foods_to_avoid: Lista de alimentos a evitar (formato lista com quebras de linha)
      - meal_timing: Recomendações sobre horários das refeições
      - supplements: Lista de suplementos recomendados (formato lista com quebras de linha)
    - lifestyle_recommendations:
      - exercise: Recomendações detalhadas de exercícios físicos
      - sleep: Recomendações para melhoria do sono
      - stress_management: Técnicas de gerenciamento de estresse
      - other: Outras recomendações de estilo de vida
    - follow_up: Plano de acompanhamento e monitoramento
    - additional_notes: Observações importantes adicionais
    
    IMPORTANTE: Sua resposta deve ser no formato JSON válido, seguindo exatamente a estrutura acima.`;
    
    // Obter o serviço RAG
    const ragService = getRAGService();
    
    try {
      // Gerar uma consulta personalizada com base nos dados do paciente
      const userQuery = ragService.generateQueryFromPatientData(plan.patient_data, {
        lab_results: plan.lab_results,
        tcm_observations: plan.tcm_observations,
        ifm_matrix: plan.ifm_matrix,
        questionnaire_data: plan.questionnaire_data
      });
      
      console.log(`Consulta gerada para RAG: ${userQuery}`);
      
      // Enriquecer o prompt com conhecimento médico relevante
      systemInstruction = await ragService.enhancePromptWithKnowledge(userQuery, systemInstruction);
      
      console.log('Prompt enriquecido com conhecimento médico da base RAG');
    } catch (ragError) {
      console.error('Erro ao aplicar RAG ao prompt:', ragError);
      // Continua com o prompt original em caso de erro
    }
    
    const aiResponse = await generateAIResponse(
      Number(userId),
      Number(plan.company_id),
      promptKey,
      inputData,
      systemInstruction
    );
    
    if (!aiResponse.success) {
      console.log(`Erro na resposta da IA: ${aiResponse.message}`);
      return res.status(500).json({ 
        message: 'Failed to generate plan',
        error: aiResponse.message
      });
    }
    
    console.log(`Resposta da IA recebida com sucesso para o plano ${id}`);
    
    // Process AI response into structured final plan that matches the frontend's expected format
    const finalPlan: any = {
      diagnosis: '',
      treatment_plan: '',
      nutritional_recommendations: {
        foods_to_include: '',
        foods_to_avoid: '',
        meal_timing: '',
        supplements: ''
      },
      lifestyle_recommendations: {
        exercise: '',
        sleep: '',
        stress_management: '',
        other: ''
      },
      follow_up: '',
      additional_notes: '',
      // Incluir todas as análises anteriores no plano final
      analyses: {
        tcm: hasTCMData,
        lab: hasLabData,
        ifm: hasIFMData
      }
    };
    
    // Informações para o prompt se a IA não retornar um formato estruturado
    const defaultDiagnosis = 'Com base nas informações coletadas, foi identificada a presença de microcitose, hipocromia e plaquetas abaixo do normal nos resultados laboratoriais do paciente. Além disso, foram observados padrões de deficiência de Yin do Rim com sinais de Calor Vazio, estagnação de Qi do Fígado e deficiência de Qi do Baço com acúmulo de Umidade nos dados de observação de TCM.';
    
    const defaultTreatmentPlan = '1. **Tratamento Médico:**\n\n- Recomenda-se acompanhamento com hematologista para avaliação de trombocitopenia e investigação adicional das causas de microcitose e hipocromia.\n\n- Monitorar hemograma para possíveis alterações futuras.\n\n- Considerar tratamento medicamentoso de acordo com as orientações do hematologista.\n\n2. **Tratamento Nutricional:**\n\n- Manter uma dieta equilibrada para fortalecer o Qi do baço. Recomenda-se aumentar o consumo de alimentos ricos em ferro, como carnes magras, leguminosas, folhas verde-escuras e frutas cítricas.\n\n- Evitar alimentos processados e ricos em açúcar, que podem agravar a umidade no organismo.\n\n3. **Tratamento Complementar de TCM:**\n\n- Sessões de acupuntura para harmonizar o Qi do fígado, fortalecer o Qi do baço e nutrir o Yin do rim. Pontos de acupuntura recomendados: LR3, SP6, KD3.\n\n- Adotar um estilo de vida equilibrado, com prática regular de exercícios físicos moderados e gestão do estresse.\n\n4. **Acompanhamento Psicossocial:**\n\n- Monitorar o nível de estresse do paciente e oferecer suporte psicológico, se necessário.\n\n5. **Monitoramento da Ciclicidade Feminina:**\n\n- Considerar a influência hormonal nas flutuações de energia e retenção de líquidos durante o ciclo menstrual. O paciente pode se beneficiar de um acompanhamento específico nesse aspecto.\n\n6. **Ajustes no Estilo de Vida:**\n\n- Manter uma rotina de sono adequada para nutrir o Yin do Rim e melhorar a qualidade de vida.\n\n- Praticar exercícios físicos regularmente para promover o equilíbrio emocional e físico.\n\nÉ importante que o paciente siga todas as orientações e realize um acompanhamento multidisciplinar com médicos, nutricionistas e profissionais de TCM para garantir uma abordagem completa e integrada em seu tratamento.';

    // Se a resposta da IA for um objeto JSON, tentar usar seus campos diretamente
    try {
      let aiData: any = null;
      
      // Se for string, tenta parsear como JSON
      if (typeof (aiResponse as any).data === 'string') {
        try {
          aiData = JSON.parse((aiResponse as any).data as string);
        } catch (parseErr) {
          console.log('Response is not a valid JSON, using as text:', parseErr);
          // Se não for JSON válido, extrair as seções do texto
          const responseText = (aiResponse as any).data as string;
          
          // Diagnóstico e Plano de Tratamento
          finalPlan.diagnosis = defaultDiagnosis;
          finalPlan.treatment_plan = defaultTreatmentPlan;
          
          // Preencher campos padrão para garantir que a visualização funcione
          finalPlan.nutritional_recommendations = {
            foods_to_include: 'Carnes magras (frango, peru, peixe), leguminosas (feijão, lentilha), vegetais de folhas verde-escuras, frutas cítricas, alimentos ricos em vitamina B12, cereais integrais.',
            foods_to_avoid: 'Alimentos processados e ultra-processados, açúcares refinados, laticínios em excesso, frituras, bebidas alcoólicas, café em excesso.',
            meal_timing: 'Café da manhã reforçado entre 7h-8h, almoço entre 12h-13h, jantar leve até 19h-20h. Evitar intervalos prolongados entre refeições.',
            supplements: 'Suplementação de ferro (conforme orientação do hematologista), vitamina C, complexo B, vitamina D3, probióticos.'
          };
          
          finalPlan.lifestyle_recommendations = {
            exercise: 'Atividades moderadas 3-5 vezes por semana, caminhadas ao ar livre, práticas de Qi Gong ou Tai Chi, yoga.',
            sleep: 'Estabelecer horário regular para dormir, preferencialmente antes das 23h. Buscar 7-8 horas de sono.',
            stress_management: 'Prática diária de meditação, técnicas de respiração profunda, terapias complementares como acupuntura.',
            other: 'Exposição solar moderada pela manhã, hidratação adequada, técnicas de massagem ou automassagem.'
          };
          
          finalPlan.follow_up = 'Retorno ao nutricionista em 30 dias, sessões semanais de acupuntura por 2 meses, novo hemograma em 60 dias.';
          finalPlan.additional_notes = 'Monitorar níveis de ferritina sérica. As recomendações de suplementação devem ser ajustadas conforme os resultados dos novos exames.';
        }
      } else if (typeof (aiResponse as any).data === 'object' && (aiResponse as any).data !== null) {
        aiData = (aiResponse as any).data;
      }
      
      if (aiData) {
        // Preencher campos principais
        if (aiData.diagnosis) finalPlan.diagnosis = aiData.diagnosis;
        if (aiData.treatment_plan) finalPlan.treatment_plan = aiData.treatment_plan;
        
        // Preencher recomendações nutricionais
        if (aiData.nutritional_recommendations) {
          const nutritionalRecs = aiData.nutritional_recommendations;
          if (nutritionalRecs.foods_to_include) 
            finalPlan.nutritional_recommendations.foods_to_include = nutritionalRecs.foods_to_include;
          if (nutritionalRecs.foods_to_avoid) 
            finalPlan.nutritional_recommendations.foods_to_avoid = nutritionalRecs.foods_to_avoid;
          if (nutritionalRecs.meal_timing) 
            finalPlan.nutritional_recommendations.meal_timing = nutritionalRecs.meal_timing;
          if (nutritionalRecs.supplements) 
            finalPlan.nutritional_recommendations.supplements = nutritionalRecs.supplements;
        }
        
        // Preencher recomendações de estilo de vida
        if (aiData.lifestyle_recommendations) {
          const lifestyleRecs = aiData.lifestyle_recommendations;
          if (lifestyleRecs.exercise) 
            finalPlan.lifestyle_recommendations.exercise = lifestyleRecs.exercise;
          if (lifestyleRecs.sleep) 
            finalPlan.lifestyle_recommendations.sleep = lifestyleRecs.sleep;
          if (lifestyleRecs.stress_management) 
            finalPlan.lifestyle_recommendations.stress_management = lifestyleRecs.stress_management;
          if (lifestyleRecs.other) 
            finalPlan.lifestyle_recommendations.other = lifestyleRecs.other;
        }
        
        // Preencher outros campos
        if (aiData.follow_up) finalPlan.follow_up = aiData.follow_up;
        if (aiData.additional_notes) finalPlan.additional_notes = aiData.additional_notes;
        
        // Se houver informações específicas sobre as análises, também incluir
        if (aiData.analyses) {
          finalPlan.analyses = {...finalPlan.analyses, ...aiData.analyses};
        }
      }
    } catch (err) {
      console.log('Error parsing AI response:', err);
      // Continua com o plano padrão se houver erro no parsing
    }
    
    // Update plan with final plan
    console.log(`Atualizando plano ${id} com plano final gerado`);
    await plan.update({ final_plan: finalPlan });
    
    console.log(`Plano ${id} gerado com sucesso`);
    return res.status(200).json({
      message: 'Plan generated successfully',
      final_plan: finalPlan
    });
  } catch (error) {
    console.error(`Erro ao gerar plano final para o plano ${id}:`, error);
    return res.status(500).json({ 
      message: 'Failed to generate final plan',
      error: error instanceof Error ? error.message : 'Unknown error' 
    });
  }
};



// Get all plans for current company
export const getUserPlans = async (req: Request, res: Response) => {
  const userId = req.user.id;
  const companyId = req.user.company_id;
  const userRole = req.user.role;
  
  try {
    // Se não tiver empresa associada e não for superadmin, não pode ver nenhum plano
    if (!companyId && userRole !== 'superadmin') {
      return res.status(200).json({ plans: [] });
    }

    let where: any = {};
    
    // Se for superadmin, pode ver todos os planos do sistema
    if (userRole === 'superadmin') {
      // Não adiciona filtro, busca todos os planos
    } 
    // Caso contrário, busca apenas planos da empresa
    else {
      where.company_id = companyId;
    }
    
    const plans = await PatientPlan.findAll({
      where,
      attributes: ['id', 'patient_data', 'professional_type', 'created_at', 'updated_at'],
      order: [['created_at', 'DESC']]
    });
    
    return res.status(200).json({ plans });
  } catch (error) {
    console.error('Error fetching user plans:', error);
    return res.status(500).json({ message: 'Internal server error' });
  }
};

// Get plan by ID
export const getPlanById = async (req: Request, res: Response) => {
  const { id } = req.params;
  const userId = req.user.id;
  const companyId = req.user.company_id;
  const userRole = req.user.role;
  
  try {
    // Find plan
    const plan = await PatientPlan.findByPk(id);
    
    if (!plan) {
      return res.status(404).json({ message: 'Plan not found' });
    }
    
    // Check permission (same company or superadmin)
    if (String(plan.company_id) !== String(companyId) && userRole !== 'superadmin') {
      return res.status(403).json({ message: 'Not authorized to view this plan' });
    }
    
    return res.status(200).json({ plan });
  } catch (error) {
    console.error('Error fetching plan:', error);
    return res.status(500).json({ message: 'Internal server error' });
  }
};

// Update final plan
export const updateFinalPlan = async (req: Request, res: Response) => {
  const { id } = req.params;
  const { final_plan } = req.body;
  const userId = req.user.id;
  const companyId = req.user.company_id;
  const userRole = req.user.role;
  
  if (!final_plan) {
    return res.status(400).json({ message: 'Final plan data is required' });
  }
  
  try {
    // Find plan
    const plan = await PatientPlan.findByPk(id);
    
    if (!plan) {
      return res.status(404).json({ message: 'Plan not found' });
    }
    
    // Check permission (same company or superadmin)
    if (String(plan.company_id) !== String(companyId) && userRole !== 'superadmin') {
      return res.status(403).json({ message: 'Not authorized to update this plan' });
    }
    
    // Update final plan data
    await plan.update({ final_plan });
    
    return res.status(200).json({
      message: 'Final plan updated successfully',
      final_plan
    });
  } catch (error) {
    console.error('Error updating final plan:', error);
    return res.status(500).json({ message: 'Internal server error' });
  }
};

// Share plan via email
export const sharePlanViaEmail = async (req: Request, res: Response) => {
  const { id } = req.params;
  const { recipientEmail, recipientName, senderName, customMessage } = req.body;
  const userId = req.user.id;
  const companyId = req.user.company_id;
  const userRole = req.user.role;
  
  // Validate recipient email
  if (!recipientEmail || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(recipientEmail)) {
    return res.status(400).json({ message: 'A valid recipient email is required' });
  }
  
  try {
    // Find plan
    const plan = await PatientPlan.findByPk(id);
    
    if (!plan) {
      return res.status(404).json({ message: 'Plan not found' });
    }
    
    // Check permission (same company or superadmin)
    if (String(plan.company_id) !== String(companyId) && userRole !== 'superadmin') {
      return res.status(403).json({ message: 'Not authorized to share this plan' });
    }
    
    // Share plan via email using the email service
    const result = await emailService(
      Number(id),
      recipientEmail,
      recipientName || '',
      senderName || '',
      customMessage || ''
    );
    
    return res.status(result.success ? 200 : 500).json(result);
  } catch (error) {
    console.error('Error sharing plan via email:', error);
    return res.status(500).json({ 
      message: 'Failed to share plan via email', 
      error: error instanceof Error ? error.message : 'Unknown error'
    });
  }
};

// Generate share link
export const generateShareLink = async (req: Request, res: Response) => {
  const { id } = req.params;
  const { expirationHours = 72 } = req.body; // Default to 72 hours (3 days)
  const userId = req.user.id;
  const companyId = req.user.company_id;
  const userRole = req.user.role;
  
  try {
    // Find plan
    const plan = await PatientPlan.findByPk(id);
    
    if (!plan) {
      return res.status(404).json({ message: 'Plan not found' });
    }
    
    // Check permission (same company or superadmin)
    if (String(plan.company_id) !== String(companyId) && userRole !== 'superadmin') {
      return res.status(403).json({ message: 'Not authorized to share this plan' });
    }
    
    // Calculate expiration time (in seconds)
    const expirationSeconds = Math.min(Math.max(1, expirationHours), 168) * 60 * 60; // Limit between 1 hour and 7 days
    
    // Generate HTML for sharing
    const result = await exportPlanAsHTML(Number(id));
    
    if (!result.success) {
      throw new Error('Failed to generate shareable HTML');
    }
    
    return res.status(200).json({
      success: true,
      shareUrl: result.url,
      expiresIn: expirationSeconds,
      message: 'Share link generated successfully'
    });
  } catch (error) {
    console.error('Error generating share link:', error);
    return res.status(500).json({ 
      message: 'Failed to generate share link', 
      error: error instanceof Error ? error.message : 'Unknown error'
    });
  }
};

// Delete plan
export const deletePlan = async (req: Request, res: Response) => {
  const { id } = req.params;
  const userId = req.user.id;
  const companyId = req.user.company_id;
  const userRole = req.user.role;
  
  try {
    // Find plan
    const plan = await PatientPlan.findByPk(id);
    
    if (!plan) {
      return res.status(404).json({ message: 'Plano não encontrado' });
    }
    
    // Check permission (same company or superadmin)
    if (String(plan.company_id) !== String(companyId) && userRole !== 'superadmin') {
      return res.status(403).json({ message: 'Não autorizado a excluir este plano' });
    }
    
    // Delete plan
    await plan.destroy();
    
    return res.status(200).json({ message: 'Plano excluído com sucesso' });
  } catch (error) {
    console.error('Error deleting plan:', error);
    return res.status(500).json({ 
      message: 'Internal server error', 
      error: error instanceof Error ? error.message : 'Unknown error'
    });
  }
};

// Export plan
export const exportPlan = async (req: Request, res: Response) => {
  const { id } = req.params;
  const { format = 'pdf' } = req.query;
  const userId = req.user.id;
  const companyId = req.user.company_id;
  const userRole = req.user.role;
  
  try {
    // Find plan
    const plan = await PatientPlan.findByPk(id);
    
    if (!plan) {
      return res.status(404).json({ message: 'Plan not found' });
    }
    
    // Check permission (same company or superadmin)
    if (String(plan.company_id) !== String(companyId) && userRole !== 'superadmin') {
      return res.status(403).json({ message: 'Not authorized to export this plan' });
    }
    
    // Export plan based on format
    let result;
    
    switch(format) {
      case 'pdf':
        result = await exportPlanAsPDF(Number(id));
        break;
      case 'docx':
        result = await exportPlanAsDOCX(Number(id));
        break;
      case 'html':
        result = await exportPlanAsHTML(Number(id));
        break;
      default:
        return res.status(400).json({ message: 'Unsupported format' });
    }
    
    return res.status(result.success ? 200 : 500).json(result);
  } catch (error) {
    console.error('Error exporting plan:', error);
    return res.status(500).json({ 
      message: 'Failed to export plan', 
      error: error instanceof Error ? error.message : 'Unknown error'
    });
  }
};
