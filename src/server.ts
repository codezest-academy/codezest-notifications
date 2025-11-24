import app from './app';
import { config } from './config';
import { logger } from './common/logger';
import './infrastructure/database'; // Ensure DB client is initialized
import './infrastructure/cache'; // Ensure Cache client is initialized

const startServer = async () => {
  try {
    app.listen(config.port, () => {
      logger.info(`Server running on port ${config.port}`);
    });
  } catch (error) {
    logger.error('Failed to start server', error);
    process.exit(1);
  }
};

startServer();
