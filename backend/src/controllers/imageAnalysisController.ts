import { Request, Response } from 'express';
import { analyzeImage } from '../services/ai/openaiService';
import multer from 'multer';
import path from 'path';
import fs from 'fs';

// Configurar multer para upload de arquivos
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    const uploadDir = path.join(__dirname, '../../uploads');
    // Criar diretório se não existir
    if (!fs.existsSync(uploadDir)) {
      fs.mkdirSync(uploadDir, { recursive: true });
    }
    cb(null, uploadDir);
  },
  filename: (req, file, cb) => {
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
    cb(null, uniqueSuffix + path.extname(file.originalname));
  }
});

// Filtro para permitir apenas imagens
const fileFilter = (req: any, file: Express.Multer.File, cb: multer.FileFilterCallback) => {
  if (file.mimetype.startsWith('image/')) {
    cb(null, true);
  } else {
    cb(new Error('Apenas imagens são permitidas'));
  }
};

export const upload = multer({
  storage,
  fileFilter,
  limits: {
    fileSize: 10 * 1024 * 1024 // limite de 10MB
  }
});

// Analisar imagem enviada por arquivo
export const analyzeImageFile = async (req: Request, res: Response): Promise<void> => {
  try {
    const userId = req.user?.id;
    const companyId = req.user?.company_id;

    if (!userId || !companyId) {
      res.status(401).json({ message: 'Usuário não autenticado corretamente' });
      return;
    }

    // Verificar se o arquivo foi enviado
    if (!req.file) {
      res.status(400).json({ message: 'Nenhuma imagem enviada' });
      return;
    }

    // Obter prompt personalizado (opcional)
    const { prompt } = req.body;
    const customPrompt = prompt || undefined;

    // Caminho do arquivo enviado
    const filePath = req.file.path;

    // Analisar a imagem
    const result = await analyzeImage(userId, companyId, filePath, customPrompt);

    // Remover o arquivo temporário após análise
    fs.unlinkSync(filePath);

    if (!result.success) {
      res.status(400).json({ message: result.message });
      return;
    }

    res.status(200).json({
      success: true,
      description: result.data,
      tokensUsed: result.tokensUsed
    });

  } catch (error: any) {
    console.error('Erro ao analisar imagem:', error);
    res.status(500).json({ 
      message: 'Erro ao analisar imagem', 
      error: error.message 
    });
  }
};

// Analisar imagem enviada por URL
export const analyzeImageUrl = async (req: Request, res: Response): Promise<void> => {
  try {
    const userId = req.user?.id;
    const companyId = req.user?.company_id;

    if (!userId || !companyId) {
      res.status(401).json({ message: 'Usuário não autenticado corretamente' });
      return;
    }

    // Verificar se a URL foi enviada
    const { image_url, prompt } = req.body;
    
    if (!image_url) {
      res.status(400).json({ message: 'URL da imagem não fornecida' });
      return;
    }

    // Analisar a imagem
    const result = await analyzeImage(userId, companyId, image_url, prompt);

    if (!result.success) {
      res.status(400).json({ message: result.message });
      return;
    }

    res.status(200).json({
      success: true,
      description: result.data,
      tokensUsed: result.tokensUsed
    });

  } catch (error: any) {
    console.error('Erro ao analisar imagem por URL:', error);
    res.status(500).json({ 
      message: 'Erro ao analisar imagem por URL', 
      error: error.message 
    });
  }
};

// Analisar imagem enviada como base64
export const analyzeImageBase64 = async (req: Request, res: Response): Promise<void> => {
  try {
    const userId = req.user?.id;
    const companyId = req.user?.company_id;

    if (!userId || !companyId) {
      res.status(401).json({ message: 'Usuário não autenticado corretamente' });
      return;
    }

    // Verificar se a string base64 foi enviada
    const { image_data, prompt } = req.body;
    
    if (!image_data) {
      res.status(400).json({ message: 'Dados da imagem (base64) não fornecidos' });
      return;
    }

    // Analisar a imagem
    const result = await analyzeImage(userId, companyId, image_data, prompt);

    if (!result.success) {
      res.status(400).json({ message: result.message });
      return;
    }

    res.status(200).json({
      success: true,
      description: result.data,
      tokensUsed: result.tokensUsed
    });

  } catch (error: any) {
    console.error('Erro ao analisar imagem em base64:', error);
    res.status(500).json({ 
      message: 'Erro ao analisar imagem em base64', 
      error: error.message 
    });
  }
};
