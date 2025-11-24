import swaggerJsdoc from 'swagger-jsdoc';
import { config } from './index';

const options: swaggerJsdoc.Options = {
  definition: {
    openapi: '3.0.0',
    info: {
      title: 'CodeZest Notifications Service',
      version: '1.0.0',
      description: 'API documentation for the CodeZest Notifications Service',
    },
    servers: [
      {
        url: `http://localhost:${config.port}`,
        description: 'Local server',
      },
    ],
    components: {
      schemas: {
        Notification: {
          type: 'object',
          properties: {
            id: { type: 'string', format: 'uuid' },
            userId: { type: 'string', format: 'uuid' },
            type: { type: 'string', enum: ['EMAIL', 'PUSH', 'IN_APP'] },
            title: { type: 'string' },
            message: { type: 'string' },
            priority: { type: 'string', enum: ['HIGH', 'MEDIUM', 'LOW'] },
            read: { type: 'boolean' },
            createdAt: { type: 'string', format: 'date-time' },
          },
        },
        CreateNotificationDto: {
          type: 'object',
          required: ['userId', 'type', 'title', 'message'],
          properties: {
            userId: { type: 'string', format: 'uuid' },
            type: { type: 'string', enum: ['EMAIL', 'PUSH', 'IN_APP'] },
            title: { type: 'string' },
            message: { type: 'string' },
            priority: { type: 'string', enum: ['HIGH', 'MEDIUM', 'LOW'], default: 'MEDIUM' },
          },
        },
      },
    },
  },
  apis: ['./src/presentation/routes/*.ts'], // Path to the API docs
};

export const swaggerSpec = swaggerJsdoc(options);
