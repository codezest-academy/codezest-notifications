import express from 'express';
import swaggerUi from 'swagger-ui-express';
import { logger } from './common/logger';
import notificationRoutes from './presentation/routes/notification.routes';
import { swaggerSpec } from './config/swagger';

const app = express();

app.use(express.json());

app.use((req, res, next) => {
  logger.info(`${req.method} ${req.url}`);
  next();
});

app.use('/api-docs', swaggerUi.serve, swaggerUi.setup(swaggerSpec));
app.use('/notifications', notificationRoutes);

app.get('/health', (req, res) => {
  res.status(200).json({ status: 'ok' });
});

export default app;
