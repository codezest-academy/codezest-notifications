import request from 'supertest';
import jwt from 'jsonwebtoken';
import app from '../../src/app';
import { jwtConfig } from '../../src/config/security.config';

describe('Security Integration Tests', () => {
  describe('Security Headers (Helmet)', () => {
    it('should set security headers on all responses', async () => {
      const response = await request(app).get('/health');

      // Helmet sets various security headers
      expect(response.headers['x-dns-prefetch-control']).toBeDefined();
      expect(response.headers['x-frame-options']).toBeDefined();
      expect(response.headers['x-content-type-options']).toBeDefined();
    });
  });

  describe('CORS', () => {
    it('should include CORS headers for allowed origins', async () => {
      const response = await request(app).get('/health').set('Origin', 'http://localhost:3000');

      expect(response.headers['access-control-allow-origin']).toBeDefined();
    });
  });

  describe('Rate Limiting', () => {
    it('should include rate limit headers', async () => {
      const response = await request(app).get('/health');

      expect(response.headers['ratelimit-limit']).toBeDefined();
      expect(response.headers['ratelimit-remaining']).toBeDefined();
    });
  });

  describe('Authentication', () => {
    it('should reject requests without token', async () => {
      const response = await request(app).post('/notifications').send({
        userId: '123',
        type: 'EMAIL',
        title: 'Test',
        message: 'Test message',
      });

      expect(response.status).toBe(401);
      expect(response.body.error).toBe('No access token provided');
    });

    it('should reject requests with invalid token', async () => {
      const response = await request(app)
        .post('/notifications')
        .set('Authorization', 'Bearer invalid-token')
        .send({
          userId: '123',
          type: 'EMAIL',
          title: 'Test',
          message: 'Test message',
        });

      expect(response.status).toBe(401);
      expect(response.body.error).toBe('Invalid token');
    });

    it('should reject requests with expired token', async () => {
      const expiredToken = jwt.sign(
        {
          userId: '123',
          email: 'test@example.com',
          role: 'ADMIN',
        },
        jwtConfig.accessToken.secret,
        {
          expiresIn: '-1h',
          issuer: jwtConfig.issuer,
          audience: jwtConfig.audience,
        }
      );

      const response = await request(app)
        .post('/notifications')
        .set('Authorization', `Bearer ${expiredToken}`)
        .send({
          userId: '123',
          type: 'EMAIL',
          title: 'Test',
          message: 'Test message',
        });

      expect(response.status).toBe(401);
      expect(response.body.error).toBe('Token expired');
    });
  });

  describe('Authorization (RBAC)', () => {
    it('should reject USER role for protected route', async () => {
      const token = jwt.sign(
        {
          userId: '123',
          email: 'user@example.com',
          role: 'USER',
        },
        jwtConfig.accessToken.secret,
        {
          expiresIn: '15m',
          issuer: jwtConfig.issuer,
          audience: jwtConfig.audience,
        }
      );

      const response = await request(app)
        .post('/notifications')
        .set('Authorization', `Bearer ${token}`)
        .send({
          userId: '123',
          type: 'EMAIL',
          title: 'Test',
          message: 'Test message',
        });

      expect(response.status).toBe(403);
      expect(response.body.error).toBe('Forbidden');
    });

    it('should allow ADMIN role for protected route', async () => {
      const token = jwt.sign(
        {
          userId: '123',
          email: 'admin@example.com',
          role: 'ADMIN',
        },
        jwtConfig.accessToken.secret,
        {
          expiresIn: '15m',
          issuer: jwtConfig.issuer,
          audience: jwtConfig.audience,
        }
      );

      const response = await request(app)
        .post('/notifications')
        .set('Authorization', `Bearer ${token}`)
        .send({
          userId: '123',
          type: 'EMAIL',
          title: 'Test',
          message: 'Test message',
        });

      // Should pass authentication and authorization
      // May fail at business logic level (e.g., validation)
      expect(response.status).not.toBe(401);
      expect(response.status).not.toBe(403);
    });

    it('should allow INSTRUCTOR role for protected route', async () => {
      const token = jwt.sign(
        {
          userId: '123',
          email: 'instructor@example.com',
          role: 'INSTRUCTOR',
        },
        jwtConfig.accessToken.secret,
        {
          expiresIn: '15m',
          issuer: jwtConfig.issuer,
          audience: jwtConfig.audience,
        }
      );

      const response = await request(app)
        .post('/notifications')
        .set('Authorization', `Bearer ${token}`)
        .send({
          userId: '123',
          type: 'EMAIL',
          title: 'Test',
          message: 'Test message',
        });

      // Should pass authentication and authorization
      expect(response.status).not.toBe(401);
      expect(response.status).not.toBe(403);
    });
  });
});
