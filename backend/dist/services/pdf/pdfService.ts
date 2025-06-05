import pdfParse from 'pdf-parse';

/**
 * Configurações avançadas para extração de texto do PDF
 */
const pdfParseOptions = {
  // Não renderizar conteúdo de anotações
  disableCombineTextItems: false,
  // Opções para PDFs complexos ou de alta qualidade
  pagerender: (pageData: any) => {
    // Retornar o texto da página com formatação preservada
    return pageData.getTextContent({
      normalizeWhitespace: false,
      disableCombineTextItems: false
    });
  }
};

/**
 * Extrair texto de um buffer PDF
 * @param pdfBuffer Buffer contendo o PDF
 * @returns Objeto com texto extraído e metadados
 */
export const extractTextFromPDF = async (pdfBuffer: Buffer): Promise<{
  text: string;
  info: any;
  metadata: any;
  success: boolean;
  error?: string;
}> => {
  try {
    // Extrair texto do PDF usando pdf-parse com opções melhoradas
    const pdfData = await pdfParse(pdfBuffer, pdfParseOptions);
    
    // Processar e limpar o texto extraído
    let extractedText = pdfData.text;
    
    // Remover quebras de linha excessivas e normalizar espaços
    extractedText = extractedText
      .replace(/\n{3,}/g, '\n\n')           // Substituir 3+ quebras de linha por 2
      .replace(/\s{2,}/g, ' ')              // Substituir múltiplos espaços por um único
      .trim();                              // Remover espaços em branco do início e fim
    
    // Verificar se o texto foi extraído com sucesso
    // Mudamos a lógica para considerar que qualquer texto é melhor que nenhum texto
    if (extractedText && extractedText.length > 0) {
      // Adicionar tempo de início para monitoramento de desempenho
      const startTime = Date.now();
      const processingTime = Date.now() - startTime;
      
      // Adicionar diagnóstico sobre a qualidade do PDF
      const avgCharsPerPage = pdfData.numpages > 0 ? extractedText.length / pdfData.numpages : 0;
      const isLikelyHighQuality = avgCharsPerPage > 200; // Heurística: PDFs com mais texto são provavelmente de melhor qualidade
      
      // Verificar se o texto extraído contém conteúdo real (não apenas números e símbolos)
      const containsWords = /[A-Za-z]{3,}/.test(extractedText); // Procura por palavras com pelo menos 3 letras
      
      return {
        text: extractedText,
        metadata: {
          valid: true,
          textLength: extractedText.length,
          processingTime,
          avgCharsPerPage,
          isLikelyHighQuality,
          containsMeaningfulText: containsWords,
          isEmpty: extractedText.length < 10
        },
        info: {
          numPages: pdfData.numpages,
          numRender: pdfData.numrender,
          info: pdfData.info,
          metadata: pdfData.metadata,
          version: pdfData.version
        },
        success: true
      };
    } else {
      return {
        text: '',
        metadata: {
          valid: false,
          errorType: 'empty_file'
        },
        info: {
          error: 'O arquivo PDF está vazio'
        },
        success: false,
        error: 'O arquivo PDF está vazio'
      };
    }
  } catch (error: any) {
    console.error('Error parsing PDF:', error);
    
    // Categorizar erros para melhor diagnóstico
    let errorType = 'unknown';
    let userFriendlyMessage = 'Erro desconhecido ao processar PDF';
    
    if (error.message) {
      if (error.message.includes('password')) {
        errorType = 'password_protected';
        userFriendlyMessage = 'O PDF está protegido por senha e não pode ser processado';
      } else if (error.message.includes('corrupt') || error.message.includes('invalid')) {
        errorType = 'corrupt_file';
        userFriendlyMessage = 'O arquivo PDF parece estar corrompido ou inválido';
      } else if (error.message.includes('memory') || error.message.includes('heap')) {
        errorType = 'memory_limit';
        userFriendlyMessage = 'O PDF é muito grande ou complexo para ser processado';
      }
    }
    
    return {
      text: '',
      metadata: {
        valid: false,
        errorType
      },
      info: {
        error: error.message
      },
      success: false,
      error: userFriendlyMessage
    };
  }
};

/**
 * Converter uma string base64 para Buffer
 * @param base64String String em formato base64
 * @returns Buffer do PDF
 */
export const base64ToBuffer = (base64String: string) => {
  // Remover cabeçalho de data URL se existir
  const base64Data = base64String.replace(/^data:application\/pdf;base64,/, '');
  try {
    return Buffer.from(base64Data, 'base64');
  } catch (error: any) {
    console.error('Erro ao converter base64 para buffer:', error);
    throw new Error(`Falha na decodificação base64: ${error.message || 'Erro desconhecido'}`);
  }
};

/**
 * Extrair texto de um PDF em formato base64
 * @param base64PDF String em formato base64 contendo o PDF
 * @returns Objeto com texto extraído e metadados
 */
export const extractTextFromBase64PDF = async (base64PDF: string) => {
  try {
    // Verificar se a string base64 parece ser válida
    if (!base64PDF || typeof base64PDF !== 'string') {
      console.warn('Base64 PDF inválido ou vazio');
      return {
        text: '',
        info: { error: 'PDF inválido ou vazio' },
        metadata: { valid: false, size: 0 },
        success: false,
        error: 'PDF inválido ou vazio'
      };
    }
    
    // Verificar se o tamanho da string é razoável
    if (base64PDF.length < 100) {
      console.warn('String base64 muito curta para ser um PDF válido:', base64PDF.length, 'caracteres');
      return {
        text: '',
        info: { error: 'PDF muito curto para ser válido' },
        metadata: { valid: false, size: base64PDF.length },
        success: false,
        error: 'PDF muito curto para ser válido (menos de 100 caracteres)'
      };
    }
    
    // Verificar tamanho máximo para evitar processamento de PDFs extremamente grandes
    if (base64PDF.length > 10000000) { // ~10MB em base64
      console.warn('PDF muito grande para processamento:', base64PDF.length, 'caracteres');
      return {
        text: '',
        info: { error: 'PDF excede o tamanho máximo permitido' },
        metadata: { valid: false, size: base64PDF.length, tooLarge: true },
        success: false,
        error: 'PDF excede o tamanho máximo permitido (10MB)'
      };
    }

    // Limpar a string base64 antes de processá-la
    let cleanBase64 = base64PDF.trim();
    
    // Remover cabeçalho de data URL se existir
    if (cleanBase64.includes(',')) {
      cleanBase64 = cleanBase64.split(',')[1];
    }
    
    // Verificar se parece uma string base64 válida (permite mais flexível devido a possibilidades de codificação)
    const base64Pattern = /^[A-Za-z0-9+/=\s\r\n]+$/;
    if (!base64Pattern.test(cleanBase64)) {
      // Contar caracteres inválidos para diagnóstico
      const invalidChars = cleanBase64.replace(/[A-Za-z0-9+/=\s\r\n]/g, '');
      const invalidCharsSample = invalidChars.substring(0, 20) + (invalidChars.length > 20 ? '...' : '');
      
      console.warn(`String base64 contém ${invalidChars.length} caracteres inválidos. Amostra: ${invalidCharsSample}`);
      return {
        text: '',
        info: { error: 'String base64 contém caracteres inválidos', invalidChars: invalidCharsSample },
        metadata: { valid: false, invalidCharsCount: invalidChars.length },
        success: false,
        error: `String base64 inválida: contém ${invalidChars.length} caracteres inválidos`
      };
    }
    
    // Converter para buffer com tratamento de erro
    let pdfBuffer: Buffer;
    try {
      pdfBuffer = base64ToBuffer(cleanBase64);
    } catch (bufferError) {
      console.error('Erro ao converter base64 para buffer:', bufferError);
      return {
        text: '',
        info: { error: 'Falha ao decodificar base64' },
        metadata: { valid: false, decodingError: true },
        success: false,
        error: `Falha ao decodificar string base64: ${bufferError.message || 'Erro de decodificação'}`
      };
    }
    
    // Verificar se o buffer tem tamanho razoável
    if (pdfBuffer.length < 100) {
      console.warn('Buffer do PDF muito pequeno:', pdfBuffer.length, 'bytes');
      return {
        text: '',
        info: { error: 'PDF muito pequeno para ser válido' },
        metadata: { valid: false, size: pdfBuffer.length },
        success: false,
        error: `PDF muito pequeno para ser válido (${pdfBuffer.length} bytes)`
      };
    }
    
    // Verificar se o buffer parece ser um PDF válido (começa com %PDF)
    if (pdfBuffer.length < 5 || pdfBuffer.toString('ascii', 0, 4) !== '%PDF') {
      // Exibir primeiros bytes para diagnóstico
      const firstBytes = pdfBuffer.length >= 16 ? 
        pdfBuffer.toString('hex', 0, 16).match(/../g)?.join(' ') : 
        'buffer muito curto';
      
      console.warn(`O buffer não parece ser um PDF válido. Primeiros bytes: ${firstBytes}`);
      return {
        text: '',
        info: { error: 'O arquivo não parece ser um PDF válido', firstBytes },
        metadata: { valid: false, size: pdfBuffer.length, firstBytes },
        success: false,
        error: 'O arquivo não parece ser um PDF válido (não começa com %PDF)'
      };
    }
    
    // Processar o PDF com timeout para evitar bloqueio em PDFs problemáticos
    try {
      // Definir um timeout de 30 segundos para evitar bloqueio em PDFs problemáticos
      const timeoutPromise = new Promise<any>((_, reject) => {
        setTimeout(() => {
          reject(new Error('Timeout ao processar PDF - operação excedeu 30 segundos'));
        }, 30000); // 30 segundos
      });
      
      // Executar extração com timeout
      return await Promise.race([
        extractTextFromPDF(pdfBuffer),
        timeoutPromise
      ]);
    } catch (processingError: any) {
      console.error('Erro ao processar conteúdo do PDF:', processingError);
      
      // Verificar se é um erro de timeout
      const isTimeout = processingError.message && processingError.message.includes('Timeout');
      
      return {
        text: '',
        info: { processingError: processingError.message },
        metadata: { 
          valid: false, 
          size: pdfBuffer.length,
          processingFailed: true,
          timeout: isTimeout
        },
        success: false,
        error: isTimeout ? 
          'Processamento do PDF excedeu o tempo limite (30s). O documento pode ser muito complexo ou estar corrompido.' : 
          `Erro ao processar conteúdo do PDF: ${processingError.message || 'Erro desconhecido'}`
      };
    }
  } catch (error: any) {
    console.error('Erro geral ao processar PDF em base64:', error);
    
    // Determinar categoria do erro para mensagem mais específica
    let errorCategory = 'Erro desconhecido';
    let errorDetails = error.message || 'Sem detalhes disponíveis';
    
    if (errorDetails.includes('base64')) {
      errorCategory = 'Erro de decodificação base64';
    } else if (errorDetails.includes('buffer')) {
      errorCategory = 'Erro de processamento de buffer';
    } else if (errorDetails.includes('PDF')) {
      errorCategory = 'Erro de formato PDF';
    } else if (errorDetails.includes('memória') || errorDetails.toLowerCase().includes('memory')) {
      errorCategory = 'Erro de memória';
      errorDetails = 'PDF muito grande ou complexo para processamento';
    }
    
    return {
      text: '',
      info: { errorType: errorCategory },
      metadata: { error: true, errorType: errorCategory },
      success: false,
      error: `${errorCategory}: ${errorDetails}`
    };
  }
};
