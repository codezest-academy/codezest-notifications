import { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';
import { authMiddleware, TokenPayload } from '../../../src/presentation/middleware/auth.middleware';
import { jwtConfig } from '../../../src/config/security.config';

describe('authMiddleware', () => {
  let mockRequest: Partial<Request>;
  let mockResponse: Partial<Response>;
  let nextFunction: NextFunction;

  beforeEach(() => {
    mockRequest = {
      headers: {},
    };
    mockResponse = {
      status: jest.fn().mockReturnThis(),
      json: jest.fn().mockReturnThis(),
    };
    nextFunction = jest.fn();
  });

  it('should reject request without Authorization header', () => {
    authMiddleware(mockRequest as Request, mockResponse as Response, nextFunction);

    expect(mockResponse.status).toHaveBeenCalledWith(401);
    expect(mockResponse.json).toHaveBeenCalledWith({
      error: 'No access token provided',
      message: 'Authorization header must be in format: Bearer <token>',
    });
    expect(nextFunction).not.toHaveBeenCalled();
  });

  it('should reject request with invalid Authorization format', () => {
    mockRequest.headers = {
      authorization: 'InvalidFormat token123',
    };

    authMiddleware(mockRequest as Request, mockResponse as Response, nextFunction);

    expect(mockResponse.status).toHaveBeenCalledWith(401);
    expect(nextFunction).not.toHaveBeenCalled();
  });

  it('should reject request with expired token', () => {
    // Create an expired token
    const expiredToken = jwt.sign(
      {
        userId: '123',
        email: 'test@example.com',
        role: 'USER',
      },
      jwtConfig.accessToken.secret,
      {
        expiresIn: '-1h', // Expired 1 hour ago
        issuer: jwtConfig.issuer,
        audience: jwtConfig.audience,
      }
    );

    mockRequest.headers = {
      authorization: `Bearer ${expiredToken}`,
    };

    authMiddleware(mockRequest as Request, mockResponse as Response, nextFunction);

    expect(mockResponse.status).toHaveBeenCalledWith(401);
    expect(mockResponse.json).toHaveBeenCalledWith({
      error: 'Token expired',
      message: 'Please refresh your access token',
    });
    expect(nextFunction).not.toHaveBeenCalled();
  });

  it('should accept valid token and attach user to request', () => {
    const payload: TokenPayload = {
      userId: '123',
      email: 'test@example.com',
      role: 'USER',
    };

    const validToken = jwt.sign(payload, jwtConfig.accessToken.secret, {
      expiresIn: '15m',
      issuer: jwtConfig.issuer,
      audience: jwtConfig.audience,
    });

    mockRequest.headers = {
      authorization: `Bearer ${validToken}`,
    };

    authMiddleware(mockRequest as Request, mockResponse as Response, nextFunction);

    expect(mockRequest.user).toBeDefined();
    expect(mockRequest.user?.userId).toBe(payload.userId);
    expect(mockRequest.user?.email).toBe(payload.email);
    expect(mockRequest.user?.role).toBe(payload.role);
    expect(nextFunction).toHaveBeenCalled();
    expect(mockResponse.status).not.toHaveBeenCalled();
  });

  it('should reject token with wrong issuer', () => {
    const invalidToken = jwt.sign(
      {
        userId: '123',
        email: 'test@example.com',
        role: 'USER',
      },
      jwtConfig.accessToken.secret,
      {
        expiresIn: '15m',
        issuer: 'wrong-issuer',
        audience: jwtConfig.audience,
      }
    );

    mockRequest.headers = {
      authorization: `Bearer ${invalidToken}`,
    };

    authMiddleware(mockRequest as Request, mockResponse as Response, nextFunction);

    expect(mockResponse.status).toHaveBeenCalledWith(401);
    expect(nextFunction).not.toHaveBeenCalled();
  });

  it('should reject token with wrong secret', () => {
    const invalidToken = jwt.sign(
      {
        userId: '123',
        email: 'test@example.com',
        role: 'USER',
      },
      'wrong-secret',
      {
        expiresIn: '15m',
        issuer: jwtConfig.issuer,
        audience: jwtConfig.audience,
      }
    );

    mockRequest.headers = {
      authorization: `Bearer ${invalidToken}`,
    };

    authMiddleware(mockRequest as Request, mockResponse as Response, nextFunction);

    expect(mockResponse.status).toHaveBeenCalledWith(401);
    expect(mockResponse.json).toHaveBeenCalledWith(
      expect.objectContaining({
        error: 'Invalid token',
      })
    );
    expect(nextFunction).not.toHaveBeenCalled();
  });
});
