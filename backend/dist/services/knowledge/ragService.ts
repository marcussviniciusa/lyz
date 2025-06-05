import { Document } from "@langchain/core/documents";
import { getMedicalKnowledgeBase } from "./medicalKnowledgeBase";

/**
 * Serviço de Recuperação Aumentada para Geração (RAG)
 * Melhora a geração de modelos de linguagem com conhecimento específico do domínio
 */
export class RAGService {
  /**
   * Enriquece um prompt com conhecimento relevante da base de conhecimento médico
   * 
   * @param userQuery Consulta ou contexto do usuário para encontrar informações relevantes
   * @param originalPrompt Prompt original a ser enriquecido
   * @param numDocuments Número de documentos a serem recuperados (padrão: 3)
   * @returns Prompt enriquecido com informações relevantes
   */
  async enhancePromptWithKnowledge(
    userQuery: string,
    originalPrompt: string,
    numDocuments: number = 3
  ): Promise<string> {
    try {
      // Obter a base de conhecimento médico
      const knowledgeBase = await getMedicalKnowledgeBase();
      
      // Recuperar documentos relevantes com base na consulta do usuário
      const relevantDocs = await knowledgeBase.retrieveRelevantDocuments(userQuery, numDocuments);
      
      // Se não houver documentos relevantes, retornar o prompt original
      if (relevantDocs.length === 0) {
        console.log('Nenhum documento relevante encontrado para enriquecer o prompt');
        return originalPrompt;
      }
      
      // Formatar os documentos recuperados em um único texto
      const formattedKnowledge = this.formatRetrievedDocuments(relevantDocs);
      
      // Enriquecer o prompt original com o conhecimento relevante
      const enhancedPrompt = `${originalPrompt}
      
Utilize o conhecimento médico especializado abaixo para enriquecer sua resposta:

${formattedKnowledge}

Baseie-se nesse conhecimento médico especializado para criar um plano terapêutico preciso e completo. Adapte as informações acima ao caso específico do paciente, mas siga as diretrizes e recomendações apresentadas quando forem aplicáveis.`;
      
      return enhancedPrompt;
    } catch (error) {
      console.error('Erro ao enriquecer prompt com conhecimento:', error);
      // Em caso de erro, retornar o prompt original para garantir que o sistema continue funcionando
      return originalPrompt;
    }
  }
  
  /**
   * Formata os documentos recuperados em um texto coeso
   * @param documents Documentos recuperados
   * @returns Texto formatado com o conteúdo dos documentos
   */
  private formatRetrievedDocuments(documents: Document[]): string {
    // Extrair fontes únicas
    const uniqueSources = new Set<string>();
    documents.forEach(doc => {
      if (doc.metadata.source) {
        uniqueSources.add(doc.metadata.source);
      }
    });
    
    let formattedText = '### Conhecimento Médico Especializado\n\n';
    
    // Adicionar informações sobre as fontes consultadas
    formattedText += `Fontes consultadas: ${Array.from(uniqueSources).join(', ')}\n\n`;
    
    // Adicionar o conteúdo de cada documento
    documents.forEach((doc, index) => {
      formattedText += `--- Trecho ${index + 1} ---\n${doc.pageContent}\n\n`;
    });
    
    return formattedText;
  }
  
  /**
   * Gera uma consulta personalizada com base nos dados do paciente para recuperação de informações relevantes
   * @param patientData Dados do paciente
   * @param plan Dados do plano existente (exames de laboratório, observações TCM, etc.)
   * @returns Consulta personalizada para recuperação de informações
   */
  generateQueryFromPatientData(patientData: any, plan: any): string {
    // Extrair condições e sintomas relevantes dos dados do paciente e do plano
    const conditions: string[] = [];
    const symptoms: string[] = [];
    
    // Extrair informações de diferentes partes do plano terapêutico
    
    // 1. Extrair do questionário
    if (plan.questionnaire_data && typeof plan.questionnaire_data === 'object') {
      // Tente extrair condições médicas conhecidas, se disponíveis
      if (plan.questionnaire_data.medical_conditions) {
        conditions.push(...this.extractArrayOrString(plan.questionnaire_data.medical_conditions));
      }
      
      // Tente extrair sintomas, se disponíveis
      if (plan.questionnaire_data.symptoms) {
        symptoms.push(...this.extractArrayOrString(plan.questionnaire_data.symptoms));
      }
      
      // Tente extrair queixas principais, se disponíveis
      if (plan.questionnaire_data.main_complaints) {
        symptoms.push(...this.extractArrayOrString(plan.questionnaire_data.main_complaints));
      }
    }
    
    // 2. Extrair de resultados laboratoriais
    if (plan.lab_results && typeof plan.lab_results === 'object') {
      // Se houver análise de laboratório
      if (plan.lab_results.analysis) {
        const analysis = plan.lab_results.analysis;
        
        // Extrair achados anormais
        if (analysis.abnormal_findings) {
          conditions.push(...this.extractArrayOrString(analysis.abnormal_findings));
        }
        
        // Extrair valores fora da faixa
        if (analysis.out_of_range_values) {
          conditions.push(...this.extractArrayOrString(analysis.out_of_range_values));
        }
      }
    }
    
    // 3. Extrair de observações de TCM
    if (plan.tcm_observations && typeof plan.tcm_observations === 'object') {
      // Se houver análise de TCM
      if (plan.tcm_observations.analysis) {
        const tcmAnalysis = plan.tcm_observations.analysis;
        
        // Extrair padrões de TCM
        if (tcmAnalysis.patterns) {
          conditions.push(...this.extractArrayOrString(tcmAnalysis.patterns));
        }
        
        // Extrair desequilíbrios
        if (tcmAnalysis.imbalances) {
          conditions.push(...this.extractArrayOrString(tcmAnalysis.imbalances));
        }
      }
    }
    
    // 4. Extrair dados demográficos do paciente para personalização
    let patientContext = '';
    if (patientData && typeof patientData === 'object') {
      const age = patientData.age || patientData.birth_date;
      const gender = patientData.gender || patientData.sex;
      
      if (age && gender) {
        patientContext = `paciente ${gender} de ${age} anos`;
      } else if (age) {
        patientContext = `paciente de ${age} anos`;
      } else if (gender) {
        patientContext = `paciente ${gender}`;
      }
    }
    
    // Construir a consulta
    let query = '';
    
    // Adicionar condições se existirem
    if (conditions.length > 0) {
      query += `Tratamento para ${conditions.join(', ')} `;
    }
    
    // Adicionar sintomas se existirem
    if (symptoms.length > 0) {
      query += `${query ? 'com' : 'Tratamento para paciente com'} sintomas de ${symptoms.join(', ')} `;
    }
    
    // Adicionar contexto do paciente
    if (patientContext) {
      query += `${query ? 'em' : 'Recomendações para'} ${patientContext}`;
    }
    
    // Se não conseguirmos extrair informações suficientes, use uma consulta genérica
    if (!query) {
      query = "Recomendações nutricionais, de estilo de vida e tratamento integrativo para saúde geral";
    }
    
    return query;
  }
  
  /**
   * Utilitário para extrair arrays ou strings dos dados do plano
   * @param value Valor que pode ser string ou array
   * @returns Array de strings
   */
  private extractArrayOrString(value: any): string[] {
    if (Array.isArray(value)) {
      return value.map(item => String(item));
    } else if (typeof value === 'string') {
      return [value];
    } else if (typeof value === 'object' && value !== null) {
      // Tenta extrair valores de um objeto
      return Object.values(value).map(item => String(item));
    }
    return [];
  }
}

// Singleton instance
let instance: RAGService | null = null;

/**
 * Obtém a instância singleton do serviço RAG
 * @returns Instância do serviço RAG
 */
export const getRAGService = (): RAGService => {
  if (!instance) {
    instance = new RAGService();
  }
  return instance;
};
