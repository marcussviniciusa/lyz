import express from 'express';
import { validateEmail, register, login, refreshToken, resetPassword } from '../controllers/authController';

const router = express.Router();

// Auth routes
router.get('/validate-email', validateEmail);
router.post('/register', register);
router.post('/login', login);
router.post('/refresh', refreshToken);
router.post('/reset-password', resetPassword);

export default router;
