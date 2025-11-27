import { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';
import { jwtConfig } from '../../config/security.config';

export interface TokenPayload {
  userId: string;
  email: string;
  role: string;
  iat?: number;
  exp?: number;
  iss?: string;
  aud?: string;
}

// Extend Express Request to include user
declare global {
  namespace Express {
    interface Request {
      user?: TokenPayload;
    }
  }
}

/**
 * Authentication middleware - Verifies JWT Access Token
 *
 * This middleware:
 * 1. Extracts the Bearer token from Authorization header
 * 2. Verifies the token signature and claims
 * 3. Attaches the decoded payload to req.user
 *
 * Usage: Apply to protected routes
 * @example
 * router.get('/protected', authMiddleware, controller.method);
 */
export function authMiddleware(req: Request, res: Response, next: NextFunction): void {
  try {
    // Extract token from Authorization header
    const authHeader = req.headers.authorization;

    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      res.status(401).json({
        error: 'No access token provided',
        message: 'Authorization header must be in format: Bearer <token>',
      });
      return;
    }

    const token = authHeader.substring(7); // Remove 'Bearer ' prefix

    // Verify token
    const payload = jwt.verify(token, jwtConfig.accessToken.secret, {
      issuer: jwtConfig.issuer,
      audience: jwtConfig.audience,
    }) as TokenPayload;

    // Attach user to request
    req.user = payload;

    next();
  } catch (error) {
    if (error instanceof jwt.TokenExpiredError) {
      res.status(401).json({
        error: 'Token expired',
        message: 'Please refresh your access token',
      });
      return;
    }

    if (error instanceof jwt.JsonWebTokenError) {
      res.status(401).json({
        error: 'Invalid token',
        message: error.message,
      });
      return;
    }

    res.status(401).json({
      error: 'Authentication failed',
      message: 'Unable to verify access token',
    });
  }
}
