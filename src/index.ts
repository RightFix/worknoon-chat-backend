import express, { Application, Request, Response } from 'express';
import cors from 'cors';
import path from 'path';
import dotenv from 'dotenv';
import { createServer } from 'http';
import rateLimit from 'express-rate-limit';
import helmet from 'helmet';
import morgan from 'morgan';
import swaggerUi from 'swagger-ui-express';
import { specs } from './config/swagger';

dotenv.config();

import { connectDB } from './config/db';
import { initializeSocket } from './config/socket';
import authRoutes from './routes/auth';
import userRoutes from './routes/users';
import conversationRoutes from './routes/conversations';
import messageRoutes from './routes/messages';
import uploadRoutes from './routes/upload';

const app: Application = express();
const PORT = process.env.PORT || 5000;

app.set('trust proxy', 1);

const globalLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 500,
  message: { success: false, message: 'Too many requests, please try again later.' },
  standardHeaders: true,
  legacyHeaders: false,
});

const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 20,
  message: { success: false, message: 'Too many authentication attempts, please try again later.' },
  standardHeaders: true,
  legacyHeaders: false,
});


app.use(cors({
  origin: [`${process.env.CLIENT_URL}`,'http://localhost:3000'],
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH', 'OPTIONS'],
  allowedHeaders: [
    'Content-Type',
    'Authorization',
    'X-Requested-With',
    'Accept'
  ],
  exposedHeaders:['Authorization'],
  optionsSuccessStatus: 200,
}));

app.use(express.json({ limit: '10kb' }));
app.use(express.urlencoded({ extended: true, limit: '10kb' }));

app.use(globalLimiter);
app.use(helmet());
app.use(morgan('dev'));

app.use('/uploads', express.static(path.join(__dirname, '../uploads')));

app.get('/health', (req: Request, res: Response) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

app.use('/api/auth', authLimiter, authRoutes);
app.use('/api/users', userRoutes);
app.use('/api/conversations', conversationRoutes);
app.use('/api/messages', messageRoutes);
app.use('/api/upload', uploadRoutes);

app.use('/api-docs', swaggerUi.serve, swaggerUi.setup(specs, { 
  customCss: '.swagger-ui .topbar { display: none }',
  customSiteTitle: 'WorkNoon Chat API',
}));

app.use((req: Request, res: Response) => {
  res.status(404).json({
    success: false,
    message: 'Route not found',
  });
});

app.use((err: Error, req: Request, res: Response, next: () => void) => {
  console.error('Error:', err);
  res.status(500).json({
    success: false,
    message: 'Internal server error',
  });
});

const startServer = async () => {
  try {
    await connectDB();
    
    const httpServer = createServer(app);
    initializeSocket(httpServer);
    
    httpServer.listen(PORT, () => {
      console.log(`🚀 Server running on port ${PORT}`);
    });
  } catch (error) {
    console.error('Failed to start server:', error);
    process.exit(1);
  }
};

startServer();

export default app;