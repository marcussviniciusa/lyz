import { Request, Response, NextFunction } from 'express';
import { verifyToken } from '../services/auth/authService';

// Extend Request type to include user information
declare global {
  namespace Express {
    interface Request {
      user?: any;
    }
  }
}

// Middleware to authenticate JWT token
export const authenticateToken = (req: Request, res: Response, next: NextFunction): void => {
  const authHeader = req.headers['authorization'];
  const token = authHeader && authHeader.split(' ')[1]; // Format: "Bearer TOKEN"
  
  if (!token) {
    res.status(401).json({ message: 'No token provided' });
    return;
  }

  const decoded = verifyToken(token);
  
  if (!decoded) {
    res.status(403).json({ message: 'Invalid or expired token' });
    return;
  }
  
  // Add user info to request
  req.user = decoded;
  next();
};

// Middleware to check if user is superadmin
export const isSuperadmin = (req: Request, res: Response, next: NextFunction): void => {
  if (!req.user) {
    res.status(401).json({ message: 'Authentication required' });
    return;
  }
  
  if (req.user.role !== 'superadmin') {
    res.status(403).json({ message: 'Superadmin privileges required' });
    return;
  }
  
  next();
};
