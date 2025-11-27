import express from 'express';
import helmet from 'helmet';
import cors from 'cors';
import swaggerUi from 'swagger-ui-express';
import { logger } from './common/logger';
import notificationRoutes from './presentation/routes/notification.routes';
import { swaggerSpec } from './config/swagger';
import { corsConfig, createRateLimiter } from './config/security.config';

const app = express();

// ✅ Security: Set secure HTTP headers
app.use(helmet());

// ✅ Security: Configure CORS with credentials support
app.use(cors(corsConfig));

// ✅ Security: Rate limiting (global)
const rateLimiter = createRateLimiter();
app.use(rateLimiter);

// Body parser
app.use(express.json());

// Request logging
app.use((req, res, next) => {
  logger.info(`${req.method} ${req.url}`);
  next();
});

// API Documentation
app.use('/api-docs', swaggerUi.serve, swaggerUi.setup(swaggerSpec));

// Routes
app.use('/notifications', notificationRoutes);

// Health check (public, no auth required)
app.get('/health', (req, res) => {
  res.status(200).json({ status: 'ok' });
});

export default app;
