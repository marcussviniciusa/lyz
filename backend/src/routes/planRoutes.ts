import express, { Request, Response, RequestHandler } from 'express';
import multer from 'multer';
import { 
  startPlan, 
  updateQuestionnaire, 
  updateLabResults, 
  updateTCMObservations, 
  updateTimeline,
  updateIFMMatrix,
  updateFinalPlan,
  generateFinalPlan,
  exportPlan,
  getUserPlans,
  getPlanById,
  deletePlan,
  saveLabAnalysisResults
} from '../controllers/planController';
import {
  analyzeLabResults,
  analyzeIFMMatrix,
  analyzeTCMObservations,
  getAnalysisStatus
} from '../controllers/analysisController';
import { authenticateToken } from '../middleware/authMiddleware';

const router = express.Router();

// Configure multer for file uploads
const storage = multer.memoryStorage();
const upload = multer({ 
  storage,
  limits: { fileSize: 10 * 1024 * 1024 } // 10MB limit
});

// Apply authentication middleware to all plan routes
router.use(authenticateToken);

// Plan routes
router.post('/start', startPlan);
router.post('/:id/questionnaire', updateQuestionnaire);
router.post('/:id/lab-results', upload.single('file'), updateLabResults);
router.post('/:id/tcm', updateTCMObservations);
router.post('/:id/timeline', updateTimeline);
router.post('/:id/ifm-matrix', updateIFMMatrix);
router.post('/:id/final', updateFinalPlan);
router.post('/:id/generate', generateFinalPlan);
router.get('/:id/export', exportPlan);
router.get('/', getUserPlans);
router.get('/:id', getPlanById);
router.delete('/:id', deletePlan);

// Analysis routes
router.post('/:id/analyze-labs', analyzeLabResults);
router.post('/:id/save-lab-analysis', saveLabAnalysisResults);
router.get('/:id/analysis-status', getAnalysisStatus); // Nova rota para status da análise
router.post('/:id/analyze-tcm', analyzeTCMObservations);
router.post('/:id/analyze-ifm', analyzeIFMMatrix);

export default router;
