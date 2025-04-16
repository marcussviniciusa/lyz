import { User, Company } from '../../models';
import jwt, { JwtPayload, Secret, SignOptions } from 'jsonwebtoken';
import axios from 'axios';
import dotenv from 'dotenv';

dotenv.config();

const JWT_SECRET = process.env.JWT_SECRET || 'default_secret_key';
// Definindo expiração como números (segundos) ao invés de strings
const JWT_EXPIRATION = 28800; // 8 horas em segundos
const JWT_REFRESH_EXPIRATION = 604800; // 7 dias em segundos
const CURSEDUCA_API_URL = process.env.CURSEDUCA_API_URL;
const CURSEDUCA_API_KEY = process.env.CURSEDUCA_API_KEY;

// Generate JWT token
export const generateToken = (user: any) => {
  const payload = { 
    id: user.id,
    email: user.email,
    role: user.role,
    company_id: user.company_id
  };
  
  const secret: Secret = JWT_SECRET;
  const options: SignOptions = { expiresIn: JWT_EXPIRATION };
  
  return jwt.sign(payload, secret, options);
};

// Generate refresh token
export const generateRefreshToken = (user: any) => {
  const payload = { id: user.id };
  
  const secret: Secret = JWT_SECRET;
  const options: SignOptions = { expiresIn: JWT_REFRESH_EXPIRATION };
  
  return jwt.sign(payload, secret, options);
};

interface JwtUserPayload extends JwtPayload {
  id: number;
}

// Verify token
export const verifyToken = (token: string): JwtUserPayload | null => {
  try {
    const secret: Secret = JWT_SECRET;
    const decoded = jwt.verify(token, secret) as JwtUserPayload;
    if (decoded && decoded.id) {
      return decoded;
    }
    return null;
  } catch (error) {
    return null;
  }
};

// Validate user email against Curseduca API
export const validateCursEducaUser = async (email: string) => {
  try {
    const response = await axios.get(`${CURSEDUCA_API_URL}/members/by`, {
      params: { email },
      headers: { 'api_key': CURSEDUCA_API_KEY }
    });

    if (response.status === 200) {
      return {
        success: true,
        data: response.data
      };
    }
    
    return {
      success: false,
      message: 'User not found in Curseduca'
    };
  } catch (error: any) {
    const status = error.response?.status;
    let message = 'Error validating user in Curseduca';
    
    if (status === 400) {
      message = 'Invalid request to Curseduca API';
    } else if (status === 401) {
      message = 'Unauthorized access to Curseduca API';
    } else if (status === 404) {
      message = 'User not found in Curseduca';
    }
    
    return {
      success: false,
      message
    };
  }
};

// Create a company for the user
export const createCompanyForUser = async (userName: string) => {
  try {
    const companyName = `${userName} - Empresa`;
    
    const company = await Company.create({
      name: companyName,
      token_limit: 10000, // Limite padrão de tokens
    });
    
    return {
      success: true,
      company
    };
  } catch (error: any) {
    return {
      success: false,
      message: error.message || 'Error creating company'
    };
  }
};

// Create user from Curseduca data
export const createUserFromCurseduca = async (cursEducaData: any, password: string) => {
  try {
    // Criar uma empresa para o usuário
    const companyResult = await createCompanyForUser(cursEducaData.name);
    
    if (!companyResult.success) {
      return {
        success: false,
        message: companyResult.message || 'Falha ao criar empresa para o usuário'
      };
    }
    
    const user = await User.create({
      curseduca_id: cursEducaData.id.toString(),
      name: cursEducaData.name,
      email: cursEducaData.email,
      password,
      role: 'user',
      company_id: companyResult.company.id
    });
    
    return {
      success: true,
      user,
      company: companyResult.company
    };
  } catch (error: any) {
    return {
      success: false,
      message: error.message || 'Error creating user'
    };
  }
};

// Get user by email
export const getUserByEmail = async (email: string) => {
  return User.findOne({ where: { email } });
};

// Update last login time
export const updateLastLogin = async (userId: number) => {
  await User.update(
    { last_login: new Date() },
    { where: { id: userId } }
  );
};
