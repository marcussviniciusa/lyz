import { Document } from "@langchain/core/documents";
import { MemoryVectorStore } from "langchain/vectorstores/memory";
import { OpenAIEmbeddings } from "@langchain/openai";
import { RecursiveCharacterTextSplitter } from "langchain/text_splitter";
import fs from 'fs';
import path from 'path';
import { getOpenAIApiKey } from '../../services/ai/openaiService';

/**
 * Classe que gerencia a base de conhecimento médico para o sistema RAG
 */
export class MedicalKnowledgeBase {
  private vectorStore: MemoryVectorStore | null = null;
  private isInitialized: boolean = false;

  /**
   * Inicializa a base de conhecimento
   */
  async initialize(): Promise<void> {
    if (this.isInitialized) {
      return;
    }

    try {
      const apiKey = await getOpenAIApiKey();
      const embeddings = new OpenAIEmbeddings({ openAIApiKey: apiKey });
      
      // Carregar documentos da pasta de conhecimento médico
      await this.loadDocuments(embeddings);
      
      this.isInitialized = true;
      console.log('Base de conhecimento médico inicializada com sucesso');
    } catch (error) {
      console.error('Erro ao inicializar a base de conhecimento médico:', error);
      throw error;
    }
  }

  /**
   * Carrega os documentos médicos no vector store
   */
  private async loadDocuments(embeddings: OpenAIEmbeddings): Promise<void> {
    try {
      const knowledgePath = path.join(__dirname, '../../../resources/knowledge');
      
      // Criar diretório se não existir
      if (!fs.existsSync(knowledgePath)) {
        fs.mkdirSync(knowledgePath, { recursive: true });
        this.createSampleKnowledgeFiles(knowledgePath);
      }
      
      const files = fs.readdirSync(knowledgePath)
        .filter(file => file.endsWith('.txt') || file.endsWith('.md'));
      
      if (files.length === 0) {
        this.createSampleKnowledgeFiles(knowledgePath);
      }
      
      const documents: Document[] = [];
      const textSplitter = new RecursiveCharacterTextSplitter({
        chunkSize: 1000,
        chunkOverlap: 200
      });
      
      for (const file of files) {
        const filePath = path.join(knowledgePath, file);
        const content = fs.readFileSync(filePath, 'utf-8');
        
        const docs = await textSplitter.createDocuments([content], [{ source: file }]);
        documents.push(...docs);
      }
      
      // Criar vector store com os documentos
      this.vectorStore = await MemoryVectorStore.fromDocuments(
        documents,
        embeddings
      );
      
      console.log(`Carregados ${documents.length} chunks de conhecimento médico`);
    } catch (error) {
      console.error('Erro ao carregar documentos médicos:', error);
      throw error;
    }
  }
  
  /**
   * Cria arquivos de exemplo para a base de conhecimento
   */
  private createSampleKnowledgeFiles(knowledgePath: string): void {
    const nutritionalGuidelines = `# Diretrizes Nutricionais para Condições Comuns

## Deficiência de Ferro e Anemia Ferropriva
- Alimentos ricos em ferro: carnes vermelhas magras, fígado, peixes, aves, mariscos (especialmente ostras), leguminosas, tofu, espinafre, couve, agrião, brócolis, frutas secas (damascos, uvas passas), sementes de abóbora, quinoa.
- Melhorar absorção: combinar com fontes de vitamina C (frutas cítricas, morango, kiwi, pimentões) e evitar chá/café nas refeições.
- Suplementação: sulfato ferroso, gluconato ferroso, ou complexo férrico, preferencialmente com estômago vazio.
- Frequência de refeições: 5-6 pequenas refeições ao dia para melhorar absorção.

## Diabetes Tipo 2
- Índice glicêmico baixo: legumes, maioria das frutas, grãos integrais, leguminosas.
- Priorizar: vegetais não-amiláceos, proteínas magras, gorduras saudáveis.
- Limitar: carboidratos refinados, açúcares adicionados, bebidas açucaradas.
- Padrão alimentar: Dieta mediterrânea ou abordagem de prato (1/2 vegetais, 1/4 proteína, 1/4 carboidratos complexos).
- Controle de porções: essencial para gerenciamento do peso e controle glicêmico.
- Horários regulares: manter horários estáveis para refeições para estabilizar glicemia.

## Hipertensão Arterial
- Abordagem DASH: rica em frutas, vegetais, grãos integrais, laticínios com baixo teor de gordura.
- Reduzir sódio: limite de 2300mg/dia (ideal 1500mg/dia).
- Aumentar potássio: bananas, batatas, abacates, espinafre, feijões.
- Limitar álcool: máximo 1 dose/dia para mulheres, 2 doses/dia para homens.
- Alimentos a evitar: alimentos processados, embutidos, enlatados, molhos prontos, fast food.
- Temperos alternativos: ervas, especiarias, alho, limão.`;
    
    const tcmGuide = `# Guia de Medicina Tradicional Chinesa para Condições Comuns

## Deficiência de Qi do Baço
- Sintomas: fadiga, falta de apetite, digestão lenta, fezes amolecidas, língua pálida com revestimento branco, membros pesados.
- Alimentos recomendados: arroz, painço, batata-doce, abóbora, cenoura, inhame, carne de boi, frango, datas chinesas, gengibre.
- Alimentos a evitar: alimentos crus, frios, sucos, laticínios, frutas cruas, açúcar refinado.
- Ervas: Radix Codonopsis (Dang Shen), Radix Astragali (Huang Qi), Rhizoma Atractylodis Macrocephalae (Bai Zhu).
- Acupuntura: ST36 (Zusanli), SP6 (Sanyinjiao), SP3 (Taibai), BL20 (Pishu), BL21 (Weishu), CV12 (Zhongwan).

## Deficiência de Yang do Rim
- Sintomas: lombalgia, joelhos fracos, sensação de frio, urina clara e frequente, impotência, ejaculação precoce, infertilidade.
- Alimentos recomendados: cordeiro, cebolinha, camarão, nozes, castanha-do-pará, anis estrelado, canela, gengibre.
- Alimentos a evitar: alimentos crus, frios, melancia, banana, pera, saladas, bebidas geladas.
- Ervas: Radix Aconiti Praeparata (Fu Zi), Cortex Cinnamomi (Rou Gui), Fructus Evodiae (Wu Zhu Yu).
- Acupuntura: KI3 (Taixi), KI7 (Fuliu), CV4 (Guanyuan), GV4 (Mingmen), BL23 (Shenshu) com moxa.`;
    
    const lifestyleGuide = `# Recomendações de Estilo de Vida para Condições Médicas Comuns

## Exercícios Físicos Terapêuticos

### Para Doenças Cardiovasculares
- Aeróbicos de baixo impacto: caminhada, natação, ciclismo estacionário, remo.
- Frequência: 30-60 minutos, 5x/semana.
- Intensidade: moderada (50-70% da FC máxima).
- Monitoramento: frequência cardíaca, pressão arterial.
- Progressão: gradual, iniciando com 10-15 minutos.
- Contraindicações: durante episódios agudos, dor no peito, arritmias não controladas.

### Para Diabetes Tipo 2
- Combinação: aeróbicos + resistência.
- Aeróbicos: 150 minutos/semana de intensidade moderada.
- Resistência: 2-3x/semana, principais grupos musculares.
- Flexibilidade: alongamentos diários, especialmente em extremidades.
- Monitoramento: glicemia antes e após exercícios.
- Considerações: ajuste de medicação, hidratação, inspeção dos pés.`;

    fs.writeFileSync(path.join(knowledgePath, 'nutritional_guidelines.md'), nutritionalGuidelines);
    fs.writeFileSync(path.join(knowledgePath, 'tcm_guide.md'), tcmGuide);
    fs.writeFileSync(path.join(knowledgePath, 'lifestyle_guide.md'), lifestyleGuide);
    
    console.log('Arquivos de conhecimento de exemplo criados');
  }

  /**
   * Recupera documentos relevantes para uma consulta
   * @param query Consulta para buscar documentos relevantes
   * @param numDocuments Número de documentos a serem recuperados
   * @returns Documentos relevantes
   */
  async retrieveRelevantDocuments(query: string, numDocuments: number = 3): Promise<Document[]> {
    if (!this.isInitialized || !this.vectorStore) {
      await this.initialize();
    }
    
    if (!this.vectorStore) {
      throw new Error('Vector store não inicializado corretamente');
    }
    
    const documents = await this.vectorStore.similaritySearch(query, numDocuments);
    return documents;
  }
  
  /**
   * Adiciona um novo documento à base de conhecimento
   * @param content Conteúdo do documento
   * @param metadata Metadados do documento
   */
  async addDocument(content: string, metadata: Record<string, any> = {}): Promise<void> {
    if (!this.isInitialized || !this.vectorStore) {
      await this.initialize();
    }
    
    if (!this.vectorStore) {
      throw new Error('Vector store não inicializado corretamente');
    }
    
    const textSplitter = new RecursiveCharacterTextSplitter({
      chunkSize: 1000,
      chunkOverlap: 200
    });
    
    const docs = await textSplitter.createDocuments([content], [metadata]);
    await this.vectorStore.addDocuments(docs);
    console.log(`Documento adicionado à base de conhecimento: ${metadata.source || 'documento sem nome'}`);
  }
}

// Singleton instance
let instance: MedicalKnowledgeBase | null = null;

/**
 * Obtém a instância singleton da base de conhecimento médico
 * @returns Instância da base de conhecimento médico
 */
export const getMedicalKnowledgeBase = async (): Promise<MedicalKnowledgeBase> => {
  if (!instance) {
    instance = new MedicalKnowledgeBase();
    await instance.initialize();
  }
  return instance;
}
