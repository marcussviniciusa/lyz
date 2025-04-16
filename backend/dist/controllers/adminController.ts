import { Request, Response } from 'express';
import { Company, User, Prompt, TokenUsage, PatientPlan } from '../models';
import { Op } from 'sequelize';
import bcrypt from 'bcrypt';

// Dashboard data
export const getDashboardData = async (req: Request, res: Response) => {
  try {
    // Get token usage stats
    const totalTokensUsed = await TokenUsage.sum('tokens_used');
    const totalCost = await TokenUsage.sum('cost');
    
    // Get user count
    const userCount = await User.count({ where: { role: 'user' } });
    
    // Get company count
    const companyCount = await Company.count();
    
    // Get total plans created
    const planCount = await PatientPlan.count();
    
    // Get recent token usage (last 30 days)
    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
    
    const recentTokenUsage = await TokenUsage.findAll({
      attributes: [
        [TokenUsage.sequelize?.fn('date_trunc', 'day', TokenUsage.sequelize.col('timestamp')), 'date'],
        [TokenUsage.sequelize?.fn('sum', TokenUsage.sequelize.col('tokens_used')), 'tokens'],
        [TokenUsage.sequelize?.fn('sum', TokenUsage.sequelize.col('cost')), 'cost']
      ],
      where: {
        timestamp: {
          [Op.gte]: thirtyDaysAgo
        }
      },
      group: [TokenUsage.sequelize?.fn('date_trunc', 'day', TokenUsage.sequelize.col('timestamp'))],
      order: [['date', 'ASC']]
    });
    
    // Get token usage by company
    const tokenUsageByCompany = await TokenUsage.findAll({
      attributes: [
        'company_id',
        [TokenUsage.sequelize?.fn('sum', TokenUsage.sequelize.col('tokens_used')), 'tokens'],
        [TokenUsage.sequelize?.fn('sum', TokenUsage.sequelize.col('cost')), 'cost']
      ],
      include: [
        {
          model: Company,
          attributes: ['name']
        }
      ],
      group: ['company_id', 'Company.id'],
      order: [[TokenUsage.sequelize?.fn('sum', TokenUsage.sequelize.col('tokens_used')), 'DESC']]
    });
    
    return res.status(200).json({
      totalTokensUsed: totalTokensUsed || 0,
      totalCost: totalCost || 0,
      userCount,
      companyCount,
      planCount,
      recentTokenUsage,
      tokenUsageByCompany
    });
  } catch (error) {
    console.error('Error fetching dashboard data:', error);
    return res.status(500).json({ message: 'Internal server error' });
  }
};

// Company management
export const getCompanies = async (req: Request, res: Response) => {
  try {
    const companies = await Company.findAll({
      attributes: ['id', 'name', 'token_limit', 'created_at'],
      order: [['created_at', 'DESC']]
    });
    
    return res.status(200).json({ companies });
  } catch (error) {
    console.error('Error fetching companies:', error);
    return res.status(500).json({ message: 'Internal server error' });
  }
};

export const getCompanyById = async (req: Request, res: Response) => {
  const { id } = req.params;
  
  try {
    const company = await Company.findByPk(id);
    
    if (!company) {
      return res.status(404).json({ message: 'Company not found' });
    }
    
    // Get company stats
    const userCount = await User.count({ where: { company_id: id } });
    const tokensUsed = await TokenUsage.sum('tokens_used', { where: { company_id: id } }) || 0;
    const planCount = await PatientPlan.count({ where: { company_id: id } });
    
    return res.status(200).json({
      company,
      stats: {
        userCount,
        tokensUsed,
        planCount,
        tokensRemaining: company.token_limit - tokensUsed
      }
    });
  } catch (error) {
    console.error('Error fetching company:', error);
    return res.status(500).json({ message: 'Internal server error' });
  }
};

export const createCompany = async (req: Request, res: Response) => {
  const { name, token_limit } = req.body;
  
  if (!name) {
    return res.status(400).json({ message: 'Company name is required' });
  }
  
  try {
    const company = await Company.create({
      name,
      token_limit: token_limit || 10000
    });
    
    return res.status(201).json({
      message: 'Company created successfully',
      company
    });
  } catch (error) {
    console.error('Error creating company:', error);
    return res.status(500).json({ message: 'Internal server error' });
  }
};

export const updateCompany = async (req: Request, res: Response) => {
  const { id } = req.params;
  const { name, token_limit } = req.body;
  
  try {
    const company = await Company.findByPk(id);
    
    if (!company) {
      return res.status(404).json({ message: 'Company not found' });
    }
    
    await company.update({
      name: name || company.name,
      token_limit: token_limit || company.token_limit
    });
    
    return res.status(200).json({
      message: 'Company updated successfully',
      company
    });
  } catch (error) {
    console.error('Error updating company:', error);
    return res.status(500).json({ message: 'Internal server error' });
  }
};

export const deleteCompany = async (req: Request, res: Response) => {
  const { id } = req.params;
  
  try {
    const company = await Company.findByPk(id);
    
    if (!company) {
      return res.status(404).json({ message: 'Company not found' });
    }
    
    // Check if company has users
    const userCount = await User.count({ where: { company_id: id } });
    
    if (userCount > 0) {
      return res.status(400).json({ 
        message: 'Cannot delete company with associated users',
        userCount
      });
    }
    
    await company.destroy();
    
    return res.status(200).json({
      message: 'Company deleted successfully'
    });
  } catch (error) {
    console.error('Error deleting company:', error);
    return res.status(500).json({ message: 'Internal server error' });
  }
};

// User management
export const getUsers = async (req: Request, res: Response) => {
  const { company_id } = req.query;
  
  try {
    const whereClause = company_id ? { company_id } : {};
    
    const users = await User.findAll({
      where: whereClause,
      attributes: ['id', 'name', 'email', 'role', 'company_id', 'last_login', 'created_at'],
      include: [
        {
          model: Company,
          attributes: ['name']
        }
      ],
      order: [['created_at', 'DESC']]
    });
    
    return res.status(200).json({ users });
  } catch (error) {
    console.error('Error fetching users:', error);
    return res.status(500).json({ message: 'Internal server error' });
  }
};

export const getUserById = async (req: Request, res: Response) => {
  const { id } = req.params;
  
  try {
    const user = await User.findByPk(id, {
      attributes: { exclude: ['password'] },
      include: [
        {
          model: Company,
          attributes: ['id', 'name']
        }
      ]
    });
    
    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }
    
    // Get user stats
    const planCount = await PatientPlan.count({ where: { user_id: id } });
    const tokensUsed = await TokenUsage.sum('tokens_used', { where: { user_id: id } }) || 0;
    
    return res.status(200).json({
      user,
      stats: {
        planCount,
        tokensUsed
      }
    });
  } catch (error) {
    console.error('Error fetching user:', error);
    return res.status(500).json({ message: 'Internal server error' });
  }
};

export const createUser = async (req: Request, res: Response) => {
  const { name, email, password, role, company_id, curseduca_id } = req.body;
  
  if (!name || !email || !password || !company_id) {
    return res.status(400).json({ message: 'Name, email, password, and company ID are required' });
  }
  
  try {
    // Check if user already exists
    const existingUser = await User.findOne({ where: { email } });
    
    if (existingUser) {
      return res.status(409).json({ message: 'User already exists with this email' });
    }
    
    // Verify company exists
    const company = await Company.findByPk(company_id);
    
    if (!company) {
      return res.status(404).json({ message: 'Company not found' });
    }
    
    // Create user
    const user = await User.create({
      name,
      email,
      password,
      role: role || 'user',
      company_id,
      curseduca_id: curseduca_id || null
    });
    
    return res.status(201).json({
      message: 'User created successfully',
      user: {
        id: user.id,
        name: user.name,
        email: user.email,
        role: user.role,
        company_id: user.company_id,
        created_at: user.created_at
      }
    });
  } catch (error) {
    console.error('Error creating user:', error);
    return res.status(500).json({ message: 'Internal server error' });
  }
};

export const updateUser = async (req: Request, res: Response) => {
  const { id } = req.params;
  const { name, email, password, role, company_id } = req.body;
  
  try {
    const user = await User.findByPk(id);
    
    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }
    
    // If updating email, check it's not already used
    if (email && email !== user.email) {
      const existingUser = await User.findOne({ where: { email } });
      
      if (existingUser) {
        return res.status(409).json({ message: 'Email already in use' });
      }
    }
    
    // If updating company, verify it exists
    if (company_id && company_id !== user.company_id) {
      const company = await Company.findByPk(company_id);
      
      if (!company) {
        return res.status(404).json({ message: 'Company not found' });
      }
    }
    
    // Update user
    await user.update({
      name: name || user.name,
      email: email || user.email,
      password: password ? password : undefined, // Only update if provided
      role: role || user.role,
      company_id: company_id || user.company_id
    });
    
    return res.status(200).json({
      message: 'User updated successfully',
      user: {
        id: user.id,
        name: user.name,
        email: user.email,
        role: user.role,
        company_id: user.company_id,
        created_at: user.created_at
      }
    });
  } catch (error) {
    console.error('Error updating user:', error);
    return res.status(500).json({ message: 'Internal server error' });
  }
};

export const deleteUser = async (req: Request, res: Response) => {
  const { id } = req.params;
  
  try {
    const user = await User.findByPk(id);
    
    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }
    
    // Check if user has plans
    const planCount = await PatientPlan.count({ where: { user_id: id } });
    
    if (planCount > 0) {
      return res.status(400).json({ 
        message: 'Cannot delete user with associated plans. Transfer plans to another user first.',
        planCount
      });
    }
    
    await user.destroy();
    
    return res.status(200).json({
      message: 'User deleted successfully'
    });
  } catch (error) {
    console.error('Error deleting user:', error);
    return res.status(500).json({ message: 'Internal server error' });
  }
};

// Prompt management
export const getPrompts = async (req: Request, res: Response) => {
  try {
    const prompts = await Prompt.findAll({
      include: [
        {
          model: User,
          as: 'updatedBy',
          attributes: ['id', 'name', 'email']
        }
      ],
      order: [['step_key', 'ASC']]
    });
    
    return res.status(200).json({ prompts });
  } catch (error) {
    console.error('Error fetching prompts:', error);
    return res.status(500).json({ message: 'Internal server error' });
  }
};

export const getPromptById = async (req: Request, res: Response) => {
  const { id } = req.params;
  
  try {
    const prompt = await Prompt.findByPk(id, {
      include: [
        {
          model: User,
          as: 'updatedBy',
          attributes: ['id', 'name', 'email']
        }
      ]
    });
    
    if (!prompt) {
      return res.status(404).json({ message: 'Prompt not found' });
    }
    
    return res.status(200).json({ prompt });
  } catch (error) {
    console.error('Error fetching prompt:', error);
    return res.status(500).json({ message: 'Internal server error' });
  }
};

export const updatePrompt = async (req: Request, res: Response) => {
  const { id } = req.params;
  const { content, temperature, max_tokens } = req.body;
  const userId = req.user.id;
  
  if (!content) {
    return res.status(400).json({ message: 'Prompt content is required' });
  }
  
  try {
    const prompt = await Prompt.findByPk(id);
    
    if (!prompt) {
      return res.status(404).json({ message: 'Prompt not found' });
    }
    
    await prompt.update({
      content,
      temperature: temperature || prompt.temperature,
      max_tokens: max_tokens || prompt.max_tokens,
      updated_by: userId,
      updated_at: new Date()
    });
    
    return res.status(200).json({
      message: 'Prompt updated successfully',
      prompt
    });
  } catch (error) {
    console.error('Error updating prompt:', error);
    return res.status(500).json({ message: 'Internal server error' });
  }
};

// Token usage reports
export const getTokenUsage = async (req: Request, res: Response) => {
  const { start_date, end_date, company_id, user_id } = req.query;
  
  try {
    // Build where clause based on filters
    const whereClause: any = {};
    
    if (start_date && end_date) {
      whereClause.timestamp = {
        [Op.between]: [new Date(start_date as string), new Date(end_date as string)]
      };
    } else if (start_date) {
      whereClause.timestamp = {
        [Op.gte]: new Date(start_date as string)
      };
    } else if (end_date) {
      whereClause.timestamp = {
        [Op.lte]: new Date(end_date as string)
      };
    }
    
    if (company_id) {
      whereClause.company_id = company_id;
    }
    
    if (user_id) {
      whereClause.user_id = user_id;
    }
    
    // Get token usage
    const tokenUsage = await TokenUsage.findAll({
      where: whereClause,
      include: [
        {
          model: User,
          attributes: ['id', 'name', 'email']
        },
        {
          model: Company,
          attributes: ['id', 'name']
        },
        {
          model: Prompt,
          attributes: ['id', 'step_key']
        }
      ],
      order: [['timestamp', 'DESC']]
    });
    
    // Get summary stats
    const totalTokens = await TokenUsage.sum('tokens_used', { where: whereClause }) || 0;
    const totalCost = await TokenUsage.sum('cost', { where: whereClause }) || 0;
    
    return res.status(200).json({
      tokenUsage,
      summary: {
        totalTokens,
        totalCost
      }
    });
  } catch (error) {
    console.error('Error fetching token usage:', error);
    return res.status(500).json({ message: 'Internal server error' });
  }
};
