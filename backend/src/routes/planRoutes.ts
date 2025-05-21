import express, { Request, Response, NextFunction, RequestHandler } from 'express';
import multer from 'multer';

// Wrapper para converter controllers que retornam Promise<Response> para o formato esperado pelo Express
const asyncHandler = (fn: (req: Request, res: Response, next?: NextFunction) => Promise<any>) => 
  (req: Request, res: Response, next: NextFunction) => {
    Promise.resolve(fn(req, res, next)).catch(next);
  };
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
  saveLabAnalysisResults,
  sharePlanViaEmail,
  generateShareLink
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
router.post('/start', asyncHandler(startPlan));
router.post('/:id/questionnaire', asyncHandler(updateQuestionnaire));
router.post('/:id/lab-results', upload.array('files', 10), asyncHandler(updateLabResults));
router.post('/:id/tcm', asyncHandler(updateTCMObservations));
router.post('/:id/timeline', asyncHandler(updateTimeline));
router.post('/:id/ifm-matrix', asyncHandler(updateIFMMatrix));
router.post('/:id/final', asyncHandler(updateFinalPlan));
router.post('/:id/generate', asyncHandler(generateFinalPlan));
router.get('/:id/export', asyncHandler(exportPlan));
router.get('/', asyncHandler(getUserPlans));
router.get('/:id', asyncHandler(getPlanById));
router.delete('/:id', asyncHandler(deletePlan));

// Sharing and export routes
router.post('/:id/share/email', asyncHandler(sharePlanViaEmail));
router.post('/:id/share/link', asyncHandler(generateShareLink));

// Analysis routes
router.post('/:id/analyze-labs', asyncHandler(analyzeLabResults));
router.post('/:id/save-lab-analysis', asyncHandler(saveLabAnalysisResults));
router.get('/:id/analysis-status', asyncHandler(getAnalysisStatus)); // Nova rota para status da análise
router.post('/:id/analyze-tcm', asyncHandler(analyzeTCMObservations));
router.post('/:id/analyze-ifm', asyncHandler(analyzeIFMMatrix));

export default router;
