import { Request, Response } from 'express';
import { 
  validateCursEducaUser, 
  createUserFromCurseduca, 
  getUserByEmail, 
  generateToken, 
  generateRefreshToken,
  updateLastLogin,
  verifyToken
} from '../services/auth/authService';
import { User, Company } from '../models';

// Validate email with Curseduca API
export const validateEmail = async (req: Request, res: Response) => {
  const { email, purpose } = req.query; // Adicionar parâmetro purpose
  
  if (!email) {
    return res.status(400).json({ message: 'Email is required' });
  }
  
  try {
    const validationResult = await validateCursEducaUser(email as string);
    
    if (validationResult.success) {
      // Check if user already exists in our system
      const existingUser = await getUserByEmail(email as string);
      
      // For registration: user should NOT exist
      if (purpose !== 'reset-password' && existingUser) {
        return res.status(409).json({ message: 'User already registered in Lyz' });
      }
      
      // For password reset: user MUST exist
      if (purpose === 'reset-password' && !existingUser) {
        return res.status(404).json({ message: 'User not found in Lyz system. Please register first.' });
      }
      
      return res.status(200).json({
        message: 'Email validated successfully',
        userData: validationResult.data
      });
    }
    
    return res.status(404).json({ message: validationResult.message });
  } catch (error) {
    console.error('Error validating email:', error);
    return res.status(500).json({ message: 'Internal server error' });
  }
};

// Register new user
export const register = async (req: Request, res: Response) => {
  const { email, password, curseduca_id, name, company_id } = req.body;
  
  if (!email || !password) {
    return res.status(400).json({ message: 'Email and password are required' });
  }
  
  try {
    // If it's not a superadmin creation (via seed or admin panel), validate with Curseduca
    if (!req.body.isSuperadmin) {
      // Validate user in Curseduca
      const validationResult = await validateCursEducaUser(email);
      
      if (!validationResult.success) {
        return res.status(400).json({ message: validationResult.message });
      }
      
      // Check if user already exists
      const existingUser = await getUserByEmail(email);
      
      if (existingUser) {
        return res.status(409).json({ message: 'User already exists' });
      }
      
      // Criar usuário a partir dos dados do Curseduca
      // A função irá criar automaticamente uma empresa para o usuário
      const userResult = await createUserFromCurseduca(
        validationResult.data,
        password
      );
      
      if (!userResult.success) {
        return res.status(500).json({ message: userResult.message });
      }
      
      // Generate tokens
      const accessToken = generateToken(userResult.user);
      const refreshToken = generateRefreshToken(userResult.user);
      
      return res.status(201).json({
        message: 'User registered successfully',
        accessToken,
        refreshToken
      });
    } else {
      // Create superadmin
      if (!name) {
        return res.status(400).json({ message: 'Name is required for superadmin' });
      }
      
      // Check if superadmin already exists with this email
      const existingAdmin = await getUserByEmail(email);
      
      if (existingAdmin) {
        return res.status(409).json({ message: 'Superadmin already exists with this email' });
      }
      
      // Get default company if company_id not provided
      let targetCompanyId = company_id;
      if (!targetCompanyId) {
        const defaultCompany = await Company.findOne();
        if (!defaultCompany) {
          return res.status(500).json({ message: 'No company found in the system' });
        }
        targetCompanyId = defaultCompany.id;
      }
      
      // Create superadmin user directly
      const superadmin = await User.create({
        curseduca_id: null, // Superadmins don't have Curseduca ID
        name,
        email,
        password,
        role: 'superadmin',
        company_id: targetCompanyId
      });
      
      // Generate tokens
      const accessToken = generateToken(superadmin);
      const refreshToken = generateRefreshToken(superadmin);
      
      return res.status(201).json({
        message: 'Superadmin created successfully',
        accessToken,
        refreshToken
      });
    }
  } catch (error) {
    console.error('Error in registration:', error);
    return res.status(500).json({ message: 'Internal server error' });
  }
};

// Login user
export const login = async (req: Request, res: Response) => {
  const { email, password } = req.body;
  
  if (!email || !password) {
    return res.status(400).json({ message: 'Email and password are required' });
  }
  
  try {
    // Find user by email
    const user = await getUserByEmail(email);
    
    if (!user) {
      return res.status(401).json({ message: 'Invalid credentials' });
    }
    
    // Verify password
    const isPasswordValid = await user.comparePassword(password);
    
    if (!isPasswordValid) {
      return res.status(401).json({ message: 'Invalid credentials' });
    }
    
    // Update last login
    await updateLastLogin(user.id);
    
    // Generate tokens
    const accessToken = generateToken(user);
    const refreshToken = generateRefreshToken(user);
    
    return res.status(200).json({
      message: 'Login successful',
      user: {
        id: user.id,
        name: user.name,
        email: user.email,
        role: user.role,
        company_id: user.company_id
      },
      accessToken,
      refreshToken
    });
  } catch (error) {
    console.error('Error in login:', error);
    return res.status(500).json({ message: 'Internal server error' });
  }
};

// Refresh token
export const refreshToken = async (req: Request, res: Response) => {
  const { refreshToken } = req.body;
  
  if (!refreshToken) {
    return res.status(400).json({ message: 'Refresh token is required' });
  }
  
  try {
    // Verify refresh token
    const decoded = verifyToken(refreshToken);
    
    if (!decoded || !decoded.id) {
      return res.status(403).json({ message: 'Invalid refresh token' });
    }
    
    // Find user
    const user = await User.findByPk(decoded.id);
    
    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }
    
    // Generate new access token
    const newAccessToken = generateToken(user);
    
    return res.status(200).json({
      accessToken: newAccessToken
    });
  } catch (error) {
    console.error('Error refreshing token:', error);
    return res.status(500).json({ message: 'Internal server error' });
  }
};

// Reset password
export const resetPassword = async (req: Request, res: Response) => {
  const { email, newPassword, cursEducaData } = req.body;
  
  if (!email || !newPassword) {
    return res.status(400).json({ message: 'Email and new password are required' });
  }
  
  if (newPassword.length < 6) {
    return res.status(400).json({ message: 'Password must be at least 6 characters long' });
  }
  
  try {
    // First validate that the email exists in Curseduca
    const validationResult = await validateCursEducaUser(email);
    
    if (!validationResult.success) {
      return res.status(404).json({ message: 'Email not found in Curseduca system' });
    }
    
    // Find user in our system
    const user = await getUserByEmail(email);
    
    if (!user) {
      return res.status(404).json({ 
        message: 'User not found in Lyz system. Please register first.' 
      });
    }
    
    // Update user password
    user.password = newPassword; // The model should hash this automatically
    await user.save();
    
    return res.status(200).json({
      message: 'Password reset successfully'
    });
  } catch (error) {
    console.error('Error resetting password:', error);
    return res.status(500).json({ message: 'Internal server error' });
  }
};
