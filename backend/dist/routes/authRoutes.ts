import express from 'express';
import { validateEmail, register, login, refreshToken } from '../controllers/authController';

const router = express.Router();

// Auth routes
router.get('/validate-email', validateEmail);
router.post('/register', register);
router.post('/login', login);
router.post('/refresh', refreshToken);

export default router;
