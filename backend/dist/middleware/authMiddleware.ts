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
export const authenticateToken = (req: Request, res: Response, next: NextFunction) => {
  const authHeader = req.headers['authorization'];
  const token = authHeader && authHeader.split(' ')[1]; // Format: "Bearer TOKEN"
  
  if (!token) {
    return res.status(401).json({ message: 'No token provided' });
  }

  const decoded = verifyToken(token);
  
  if (!decoded) {
    return res.status(403).json({ message: 'Invalid or expired token' });
  }
  
  // Add user info to request
  req.user = decoded;
  next();
};

// Middleware to check if user is superadmin
export const isSuperadmin = (req: Request, res: Response, next: NextFunction) => {
  if (!req.user) {
    return res.status(401).json({ message: 'Authentication required' });
  }
  
  if (req.user.role !== 'superadmin') {
    return res.status(403).json({ message: 'Superadmin privileges required' });
  }
  
  next();
};
