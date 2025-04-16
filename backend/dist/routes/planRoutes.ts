import express from 'express';
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
  getPlanById
} from '../controllers/planController';
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

export default router;
