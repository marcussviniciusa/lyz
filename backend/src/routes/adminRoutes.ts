import express from 'express';
import { 
  getDashboardData,
  getCompanies,
  getCompanyById,
  createCompany,
  updateCompany,
  deleteCompany,
  getUsers,
  getUserById,
  createUser,
  updateUser,
  deleteUser,
  getPrompts,
  getPromptById,
  updatePrompt,
  getTokenUsage
} from '../controllers/adminController';
import {
  getAIConfigurations,
  getAIConfigurationById,
  getAIConfigurationByPageKey,
  updateAIConfiguration,
  updateAIConfigurationById,
  createDefaultAIConfigurations,
  getAvailableModels
} from '../controllers/aiConfigurationController';
import {
  getGoogleSpeechConfig,
  updateGoogleSpeechConfig
} from '../controllers/settingsController';
import {
  getOpenAIApiKey,
  updateOpenAIApiKey,
  getAllApiKeys,
  updateApiKey,
  removeApiKey
} from '../controllers/openaiSettingsController';
import { authenticateToken, isSuperadmin } from '../middleware/authMiddleware';

const router = express.Router();

// Apply authentication middleware to all admin routes
router.use(authenticateToken);
// Apply superadmin check to all admin routes
router.use(isSuperadmin);

// Dashboard
router.get('/dashboard', getDashboardData);

// Companies
router.get('/companies', getCompanies);
router.get('/companies/:id', getCompanyById);
router.post('/companies', createCompany);
router.put('/companies/:id', updateCompany);
router.delete('/companies/:id', deleteCompany);

// Users
router.get('/users', getUsers);
router.get('/users/:id', getUserById);
router.post('/users', createUser);
router.put('/users/:id', updateUser);
router.delete('/users/:id', deleteUser);

// Prompts
router.get('/prompts', getPrompts);
router.get('/prompts/:id', getPromptById);
router.put('/prompts/:id', updatePrompt);

// Token usage
router.get('/tokens/usage', getTokenUsage);

// Settings
router.get('/settings/google-speech', getGoogleSpeechConfig);
router.put('/settings/google-speech', updateGoogleSpeechConfig);

// OpenAI API Key (compatibilidade)
router.get('/settings/openai-api', getOpenAIApiKey);
router.put('/settings/openai-api', updateOpenAIApiKey);

// API Keys para múltiplos provedores
router.get('/api-keys', getAllApiKeys);
router.put('/api-keys/:provider', updateApiKey);
router.delete('/api-keys/:provider', removeApiKey);

// AI Configurations
router.get('/ai-configurations', getAIConfigurations);
router.get('/ai-configurations/:id', getAIConfigurationById);
router.get('/ai-configurations/page/:pageKey', getAIConfigurationByPageKey);
router.put('/ai-configurations/:id', updateAIConfigurationById);
router.put('/ai-configurations/page/:pageKey', updateAIConfiguration);
router.post('/ai-configurations/defaults', createDefaultAIConfigurations);
router.get('/ai-models', getAvailableModels);

export default router;
