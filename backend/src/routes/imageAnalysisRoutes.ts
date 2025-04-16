import express, { Request, Response } from 'express';
import { 
  analyzeImageFile, 
  analyzeImageUrl, 
  analyzeImageBase64,
  upload
} from '../controllers/imageAnalysisController';
import { authenticateToken } from '../middleware/authMiddleware';

const router = express.Router();

// Aplicar middleware de autenticação em todas as rotas
router.use(authenticateToken);

// Rota para análise de imagem por arquivo
router.post('/analyze/file', upload.single('image'), (req: Request, res: Response) => analyzeImageFile(req, res));

// Rota para análise de imagem por URL
router.post('/analyze/url', (req: Request, res: Response) => analyzeImageUrl(req, res));

// Rota para análise de imagem por Base64
router.post('/analyze/base64', (req: Request, res: Response) => analyzeImageBase64(req, res));

export default router;
