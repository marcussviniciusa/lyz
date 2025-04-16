import express, { Request, Response, NextFunction } from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import sequelize from './config/database';
import { initializeBucket } from './config/minio';
import authRoutes from './routes/authRoutes';
import planRoutes from './routes/planRoutes';
import adminRoutes from './routes/adminRoutes';
import transcriptionRoutes from './routes/transcriptionRoutes';
import fs from 'fs';
import path from 'path';

// Load environment variables
dotenv.config();

// Initialize Express app
const app = express();
const PORT = parseInt(process.env.PORT || '3001', 10);

// Middleware
// Configuração CORS otimizada para ngrok
app.use(cors({
  origin: '*',
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS', 'PATCH'],
  allowedHeaders: ['Origin', 'X-Requested-With', 'Content-Type', 'Accept', 'Authorization'],
  credentials: true,
  preflightContinue: false,
  optionsSuccessStatus: 204
}));

// Express não suporta corretamente app.options('*', ...) 
// em algumas versões, então vamos remover essa linha

app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Logging middleware
app.use((req: Request, res: Response, next: NextFunction) => {
  console.log(`${new Date().toISOString()} - ${req.method} ${req.path}`);
  next();
});

// Certificar que a pasta de uploads existe
const uploadsDir = path.join(__dirname, '../uploads');
if (!fs.existsSync(uploadsDir)) {
  fs.mkdirSync(uploadsDir, { recursive: true });
}

// Routes
app.use('/api/auth', authRoutes);
app.use('/api/plans', planRoutes);
app.use('/api/admin', adminRoutes);
app.use('/api', transcriptionRoutes);

// Health check endpoint
// Rota na raiz para testar o acesso direto
app.get('/', (req: Request, res: Response) => {
  res.status(200).json({ message: 'Servidor Lyz está rodando!' });
});

// Rota de saúde padrão
app.get('/api/health', (req: Request, res: Response) => {
  res.status(200).json({ status: 'ok', timestamp: new Date() });
});

// Rota de teste sem prefixo api
app.get('/health', (req: Request, res: Response) => {
  res.status(200).json({ status: 'ok', timestamp: new Date(), note: 'Rota sem prefixo /api' });
});

// Error handling middleware
app.use((err: Error, req: Request, res: Response, next: NextFunction) => {
  console.error('Error:', err);
  res.status(500).json({ message: 'Internal server error', error: err.message });
});

// Initialize database and start server
const startServer = async () => {
  try {
    // Test database connection
    await sequelize.authenticate();
    console.log('Database connection established successfully.');
    
    // Sync models with database
    // In production, you'd use migrations instead of sync
    await sequelize.sync({ alter: true });
    console.log('Database models synchronized.');
    
    // Initialize Minio bucket
    await initializeBucket();
    console.log('Minio bucket initialized.');
    
    // Start server - escutando em todas as interfaces de rede (0.0.0.0)
    app.listen(PORT, '0.0.0.0', () => {
      console.log(`Server running on port ${PORT} and accessible from any IP`);
    });
  } catch (error) {
    console.error('Failed to start server:', error);
    process.exit(1);
  }
};

startServer();
