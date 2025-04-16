import express from 'express';
import multer from 'multer';
import { transcribeAudio } from '../controllers/transcriptionController';
import path from 'path';

const router = express.Router();

// Configuração do multer para upload de arquivos de áudio
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, 'uploads/');
  },
  filename: (req, file, cb) => {
    cb(null, `audio-${Date.now()}${path.extname(file.originalname)}`);
  }
});

const upload = multer({ 
  storage,
  limits: { fileSize: 10 * 1024 * 1024 }, // 10MB max
  fileFilter: (req, file, cb) => {
    if (file.mimetype.startsWith('audio/')) {
      cb(null, true);
    } else {
      cb(new Error('Apenas arquivos de áudio são aceitos'));
    }
  }
});

// Rota para transcrição de áudio - certifique-se de que o caminho está correto
// Observe que esta rota será acessível como /api/transcribe
router.post('/transcribe', upload.single('audio'), (req, res) => {
  console.log('Requisição de transcrição recebida');
  return transcribeAudio(req, res);
});

export default router;
