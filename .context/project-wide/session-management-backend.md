# Session Management & Authentication - Backend Guide (Express + TypeScript)

**Purpose**: Secure session management and authentication implementation for Express backend  
**Last Updated**: 2025-11-27  
**Status**: Official Standard

---

## 🎯 Overview

This guide defines how CodeZest Express backends handle authentication, sessions, and token management securely using **httpOnly cookies** and **CSRF protection**.

### Core Principles

1. **Never send tokens in response body** - Use Set-Cookie headers
2. **Use httpOnly cookies** - Prevent XSS attacks
3. **Implement CSRF protection** - Prevent cross-site attacks
4. **Refresh token rotation** - Limit damage from token theft
5. **Short-lived access tokens** - 15 minutes max

---

## 🏗️ Architecture

### Token Strategy

| Token Type        | Lifetime   | Storage                              | Purpose            |
| ----------------- | ---------- | ------------------------------------ | ------------------ |
| **Access Token**  | 15 minutes | httpOnly cookie                      | API authentication |
| **Refresh Token** | 7 days     | httpOnly cookie (path=/auth/refresh) | Token renewal      |
| **CSRF Token**    | 24 hours   | Regular cookie (readable by JS)      | CSRF protection    |

### Why httpOnly Cookies?

**Security Benefits**:

- ✅ **XSS Protection**: JavaScript cannot access httpOnly cookies
- ✅ **Auto-sent**: Browser automatically includes cookies in requests
- ✅ **Secure flag**: HTTPS-only transmission in production
- ✅ **SameSite**: Prevents CSRF attacks

---

## 📁 File Structure

```
src/
├── domain/
│   ├── entities/
│   │   └── user.entity.ts
│   └── repositories/
│       └── user.repository.interface.ts
│
├── application/
│   ├── services/
│   │   ├── auth.service.ts           # Auth business logic
│   │   ├── token.service.ts          # JWT generation/validation
│   │   └── csrf.service.ts           # CSRF token management
│   └── dtos/
│       ├── login.dto.ts
│       └── register.dto.ts
│
├── infrastructure/
│   ├── repositories/
│   │   └── user.repository.ts
│   └── database/
│       └── prisma.service.ts
│
├── presentation/
│   ├── controllers/
│   │   └── auth.controller.ts        # Auth endpoints
│   ├── routes/
│   │   └── auth.routes.ts
│   └── middleware/
│       ├── auth.middleware.ts        # Verify JWT from cookie
│       ├── csrf.middleware.ts        # Verify CSRF token
│       └── cookie.middleware.ts      # Cookie parser setup
│
└── config/
    ├── jwt.config.ts
    └── cookie.config.ts
```

---

## 🔧 Implementation

### 1. Configuration

#### JWT Configuration

```typescript
// src/config/jwt.config.ts
export const jwtConfig = {
  accessToken: {
    secret: process.env.JWT_ACCESS_SECRET!,
    expiresIn: '15m', // 15 minutes
  },
  refreshToken: {
    secret: process.env.JWT_REFRESH_SECRET!,
    expiresIn: '7d', // 7 days
  },
};

// Validate required env vars
if (!jwtConfig.accessToken.secret || !jwtConfig.refreshToken.secret) {
  throw new Error('JWT secrets must be defined in environment variables');
}
```

#### Cookie Configuration

```typescript
// src/config/cookie.config.ts
import { CookieOptions } from 'express';

const isProduction = process.env.NODE_ENV === 'production';

export const cookieConfig = {
  accessToken: {
    name: 'accessToken',
    options: {
      httpOnly: true, // ✅ Cannot be accessed by JavaScript
      secure: isProduction, // ✅ HTTPS only in production
      sameSite: 'strict' as const, // ✅ CSRF protection
      maxAge: 15 * 60 * 1000, // 15 minutes in milliseconds
      path: '/', // Available to all routes
    } as CookieOptions,
  },
  refreshToken: {
    name: 'refreshToken',
    options: {
      httpOnly: true,
      secure: isProduction,
      sameSite: 'strict' as const,
      maxAge: 7 * 24 * 60 * 60 * 1000, // 7 days
      path: '/auth/refresh', // ✅ Only sent to refresh endpoint
    } as CookieOptions,
  },
  csrf: {
    name: 'XSRF-TOKEN',
    options: {
      httpOnly: false, // ✅ JS needs to read this
      secure: isProduction,
      sameSite: 'strict' as const,
      maxAge: 24 * 60 * 60 * 1000, // 24 hours
      path: '/',
    } as CookieOptions,
  },
};
```

---

### 2. Token Service

```typescript
// src/application/services/token.service.ts
import jwt from 'jsonwebtoken';
import { jwtConfig } from '../../config/jwt.config';

export interface TokenPayload {
  userId: string;
  email: string;
  role: string;
}

export class TokenService {
  /**
   * Generate access token (15 minutes)
   */
  generateAccessToken(payload: TokenPayload): string {
    return jwt.sign(payload, jwtConfig.accessToken.secret, {
      expiresIn: jwtConfig.accessToken.expiresIn,
      issuer: 'codezest-auth',
      audience: 'codezest-api',
    });
  }

  /**
   * Generate refresh token (7 days)
   */
  generateRefreshToken(payload: TokenPayload): string {
    return jwt.sign(payload, jwtConfig.refreshToken.secret, {
      expiresIn: jwtConfig.refreshToken.expiresIn,
      issuer: 'codezest-auth',
      audience: 'codezest-api',
    });
  }

  /**
   * Verify access token
   */
  verifyAccessToken(token: string): TokenPayload {
    try {
      return jwt.verify(token, jwtConfig.accessToken.secret, {
        issuer: 'codezest-auth',
        audience: 'codezest-api',
      }) as TokenPayload;
    } catch (error) {
      throw new Error('Invalid or expired access token');
    }
  }

  /**
   * Verify refresh token
   */
  verifyRefreshToken(token: string): TokenPayload {
    try {
      return jwt.verify(token, jwtConfig.refreshToken.secret, {
        issuer: 'codezest-auth',
        audience: 'codezest-api',
      }) as TokenPayload;
    } catch (error) {
      throw new Error('Invalid or expired refresh token');
    }
  }
}

export const tokenService = new TokenService();
```

---

### 3. CSRF Service

```typescript
// src/application/services/csrf.service.ts
import { randomBytes } from 'crypto';

export class CsrfService {
  private tokens: Map<string, number> = new Map();
  private readonly TOKEN_LIFETIME = 24 * 60 * 60 * 1000; // 24 hours

  /**
   * Generate CSRF token
   */
  generateToken(): string {
    const token = randomBytes(32).toString('hex');
    this.tokens.set(token, Date.now());

    // Cleanup old tokens
    this.cleanup();

    return token;
  }

  /**
   * Validate CSRF token
   */
  validateToken(token: string): boolean {
    const timestamp = this.tokens.get(token);

    if (!timestamp) {
      return false;
    }

    // Check if token is expired
    if (Date.now() - timestamp > this.TOKEN_LIFETIME) {
      this.tokens.delete(token);
      return false;
    }

    return true;
  }

  /**
   * Remove expired tokens
   */
  private cleanup(): void {
    const now = Date.now();
    for (const [token, timestamp] of this.tokens.entries()) {
      if (now - timestamp > this.TOKEN_LIFETIME) {
        this.tokens.delete(token);
      }
    }
  }
}

export const csrfService = new CsrfService();
```

---

### 4. Auth Controller

```typescript
// src/presentation/controllers/auth.controller.ts
import { Request, Response } from 'express';
import { authService } from '../../application/services/auth.service';
import { tokenService } from '../../application/services/token.service';
import { csrfService } from '../../application/services/csrf.service';
import { cookieConfig } from '../../config/cookie.config';

export class AuthController {
  /**
   * POST /auth/register
   */
  async register(req: Request, res: Response): Promise<void> {
    try {
      const { email, password, firstName, lastName } = req.body;

      // Create user
      const user = await authService.register({
        email,
        password,
        firstName,
        lastName,
      });

      // Generate tokens
      const accessToken = tokenService.generateAccessToken({
        userId: user.id,
        email: user.email,
        role: user.role,
      });

      const refreshToken = tokenService.generateRefreshToken({
        userId: user.id,
        email: user.email,
        role: user.role,
      });

      // ✅ Set httpOnly cookies
      res.cookie(cookieConfig.accessToken.name, accessToken, cookieConfig.accessToken.options);

      res.cookie(cookieConfig.refreshToken.name, refreshToken, cookieConfig.refreshToken.options);

      // ❌ Do NOT send tokens in response body
      res.status(201).json({
        user: {
          id: user.id,
          email: user.email,
          firstName: user.firstName,
          lastName: user.lastName,
          role: user.role,
        },
        message: 'Registration successful',
      });
    } catch (error) {
      res.status(400).json({
        error: error instanceof Error ? error.message : 'Registration failed',
      });
    }
  }

  /**
   * POST /auth/login
   */
  async login(req: Request, res: Response): Promise<void> {
    try {
      const { email, password, remember } = req.body;

      // Validate credentials
      const user = await authService.login(email, password);

      // Generate tokens
      const accessToken = tokenService.generateAccessToken({
        userId: user.id,
        email: user.email,
        role: user.role,
      });

      const refreshToken = tokenService.generateRefreshToken({
        userId: user.id,
        email: user.email,
        role: user.role,
      });

      // ✅ Set cookies
      res.cookie(cookieConfig.accessToken.name, accessToken, cookieConfig.accessToken.options);

      // Extend refresh token if "remember me" is checked
      const refreshOptions = remember
        ? {
            ...cookieConfig.refreshToken.options,
            maxAge: 30 * 24 * 60 * 60 * 1000,
          } // 30 days
        : cookieConfig.refreshToken.options;

      res.cookie(cookieConfig.refreshToken.name, refreshToken, refreshOptions);

      res.json({
        user: {
          id: user.id,
          email: user.email,
          firstName: user.firstName,
          lastName: user.lastName,
          role: user.role,
        },
        message: 'Login successful',
      });
    } catch (error) {
      res.status(401).json({
        error: error instanceof Error ? error.message : 'Login failed',
      });
    }
  }

  /**
   * POST /auth/logout
   */
  async logout(req: Request, res: Response): Promise<void> {
    // ✅ Clear cookies
    res.clearCookie(cookieConfig.accessToken.name);
    res.clearCookie(cookieConfig.refreshToken.name);

    res.json({ message: 'Logout successful' });
  }

  /**
   * POST /auth/refresh
   */
  async refresh(req: Request, res: Response): Promise<void> {
    try {
      // ✅ Read refresh token from cookie
      const refreshToken = req.cookies[cookieConfig.refreshToken.name];

      if (!refreshToken) {
        res.status(401).json({ error: 'No refresh token' });
        return;
      }

      // Verify refresh token
      const payload = tokenService.verifyRefreshToken(refreshToken);

      // Generate new tokens (Refresh Token Rotation)
      const newAccessToken = tokenService.generateAccessToken(payload);
      const newRefreshToken = tokenService.generateRefreshToken(payload);

      // ✅ Set new cookies
      res.cookie(cookieConfig.accessToken.name, newAccessToken, cookieConfig.accessToken.options);

      res.cookie(
        cookieConfig.refreshToken.name,
        newRefreshToken,
        cookieConfig.refreshToken.options
      );

      res.json({ message: 'Tokens refreshed' });
    } catch (error) {
      res.status(401).json({
        error: error instanceof Error ? error.message : 'Token refresh failed',
      });
    }
  }

  /**
   * GET /auth/csrf-token
   */
  getCsrfToken(req: Request, res: Response): void {
    const csrfToken = csrfService.generateToken();

    // ✅ Set CSRF token in cookie (not httpOnly so JS can read it)
    res.cookie(cookieConfig.csrf.name, csrfToken, cookieConfig.csrf.options);

    res.json({ csrfToken });
  }

  /**
   * GET /auth/me
   */
  async getCurrentUser(req: Request, res: Response): Promise<void> {
    try {
      // User is already attached by auth middleware
      const userId = (req as any).user.userId;

      const user = await authService.getUserById(userId);

      res.json({
        user: {
          id: user.id,
          email: user.email,
          firstName: user.firstName,
          lastName: user.lastName,
          role: user.role,
        },
      });
    } catch (error) {
      res.status(404).json({
        error: error instanceof Error ? error.message : 'User not found',
      });
    }
  }
}

export const authController = new AuthController();
```

---

### 5. Auth Middleware

```typescript
// src/presentation/middleware/auth.middleware.ts
import { Request, Response, NextFunction } from 'express';
import { tokenService } from '../../application/services/token.service';
import { cookieConfig } from '../../config/cookie.config';

export function authMiddleware(req: Request, res: Response, next: NextFunction): void {
  try {
    // ✅ Read access token from cookie
    const accessToken = req.cookies[cookieConfig.accessToken.name];

    if (!accessToken) {
      res.status(401).json({ error: 'No access token provided' });
      return;
    }

    // Verify token
    const payload = tokenService.verifyAccessToken(accessToken);

    // Attach user to request
    (req as any).user = payload;

    next();
  } catch (error) {
    res.status(401).json({
      error: error instanceof Error ? error.message : 'Invalid token',
    });
  }
}
```

---

### 6. CSRF Middleware

```typescript
// src/presentation/middleware/csrf.middleware.ts
import { Request, Response, NextFunction } from 'express';
import { csrfService } from '../../application/services/csrf.service';
import { cookieConfig } from '../../config/cookie.config';

export function csrfMiddleware(req: Request, res: Response, next: NextFunction): void {
  // ✅ Skip CSRF check for safe methods
  if (['GET', 'HEAD', 'OPTIONS'].includes(req.method)) {
    next();
    return;
  }

  // ✅ Get CSRF token from cookie and header
  const csrfTokenFromCookie = req.cookies[cookieConfig.csrf.name];
  const csrfTokenFromHeader = req.headers['x-csrf-token'] as string;

  if (!csrfTokenFromCookie || !csrfTokenFromHeader) {
    res.status(403).json({ error: 'CSRF token missing' });
    return;
  }

  if (csrfTokenFromCookie !== csrfTokenFromHeader) {
    res.status(403).json({ error: 'CSRF token mismatch' });
    return;
  }

  // Validate token
  if (!csrfService.validateToken(csrfTokenFromCookie)) {
    res.status(403).json({ error: 'CSRF token invalid or expired' });
    return;
  }

  next();
}
```

---

### 7. Routes Setup

```typescript
// src/presentation/routes/auth.routes.ts
import { Router } from 'express';
import { authController } from '../controllers/auth.controller';
import { authMiddleware } from '../middleware/auth.middleware';
import { csrfMiddleware } from '../middleware/csrf.middleware';

const router = Router();

// Public routes (no auth required)
router.post('/register', authController.register.bind(authController));
router.post('/login', authController.login.bind(authController));
router.get('/csrf-token', authController.getCsrfToken.bind(authController));

// Token refresh (uses refresh token from cookie)
router.post('/refresh', authController.refresh.bind(authController));

// Protected routes (require auth)
router.post('/logout', authMiddleware, authController.logout.bind(authController));
router.get('/me', authMiddleware, authController.getCurrentUser.bind(authController));

export default router;
```

---

### 8. App Setup

```typescript
// src/app.ts
import express from 'express';
import cookieParser from 'cookie-parser';
import cors from 'cors';
import authRoutes from './presentation/routes/auth.routes';
import { csrfMiddleware } from './presentation/middleware/csrf.middleware';

const app = express();

// ✅ CORS Configuration (CRITICAL for cookies)
app.use(
  cors({
    origin: process.env.FRONTEND_URL, // https://admin.codezest.com
    credentials: true, // ✅ Allow cookies to be sent
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH'],
    allowedHeaders: ['Content-Type', 'Authorization', 'X-CSRF-Token'],
  })
);

// ✅ Cookie parser (must be before routes)
app.use(cookieParser());

// Body parser
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// ✅ CSRF protection (apply globally or per route)
app.use(csrfMiddleware);

// Routes
app.use('/auth', authRoutes);

export default app;
```

---

## 📊 Session Metadata & Logging

### Session Metadata (Redis)

To track user activity without modifying the immutable Session schema, store metadata in Redis:

- **Key**: `session_meta:{sessionId}`
- **TTL**: Same as session/refresh token (7 days)
- **Fields**:
  - `ip`: IP address of the client
  - `userAgent`: Browser/Device info
  - `lastLoginAt`: Timestamp of login
  - `lastUsedAt`: Timestamp of last activity
  - `loginMethod`: 'password', 'google', 'github'

### Security Event Logging

Services must log critical security events for audit trails:

```typescript
logSecurityEvent(SecurityEvent.LOGIN_SUCCESS, {
  userId: user.id,
  ip: req.ip,
  userAgent: req.headers['user-agent'],
});
```

**Critical Events to Log**:

- Login/Register (Success/Failure)
- Account Lockouts
- Token Refresh & Reuse Detection
- Password Changes
- OAuth Linking

---

## 🔒 Security Checklist

### ✅ Required Implementations

- [ ] JWT secrets stored in environment variables
- [ ] Access tokens expire in 15 minutes max
- [ ] Refresh tokens expire in 7 days max
- [ ] Cookies have `httpOnly: true` flag
- [ ] Cookies have `secure: true` in production
- [ ] Cookies have `sameSite: 'strict'`
- [ ] CORS configured with `credentials: true`
- [ ] CSRF protection on all mutations
- [ ] Refresh token rotation implemented
- [ ] No tokens sent in response body

### ❌ Never Do This

```typescript
// ❌ NEVER send tokens in response body
res.json({
  accessToken: 'eyJhbG...',
  refreshToken: 'eyJhbG...',
});

// ❌ NEVER use long-lived access tokens
expiresIn: '30d' // TOO LONG!

// ❌ NEVER skip httpOnly flag
httpOnly: false // SECURITY RISK!

// ❌ NEVER use SameSite=None without Secure
sameSite: 'none', secure: false // VULNERABLE!
```

### ✅ Always Do This

```typescript
// ✅ Set tokens in httpOnly cookies
res.cookie('accessToken', token, {
  httpOnly: true,
  secure: true,
  sameSite: 'strict',
});

// ✅ Short-lived access tokens
expiresIn: '15m';

// ✅ Verify CSRF tokens
if (csrfCookie !== csrfHeader) {
  throw new Error('CSRF mismatch');
}
```

---

## 🧪 Testing

### Unit Tests

```typescript
// tests/services/token.service.test.ts
import { tokenService } from '../../src/application/services/token.service';

describe('TokenService', () => {
  it('should generate valid access token', () => {
    const payload = {
      userId: '123',
      email: 'test@example.com',
      role: 'USER',
    };

    const token = tokenService.generateAccessToken(payload);
    const decoded = tokenService.verifyAccessToken(token);

    expect(decoded.userId).toBe(payload.userId);
    expect(decoded.email).toBe(payload.email);
  });

  it('should reject expired tokens', async () => {
    // Mock expired token
    const expiredToken = 'eyJhbG...'; // Generate with past exp

    expect(() => {
      tokenService.verifyAccessToken(expiredToken);
    }).toThrow('Invalid or expired access token');
  });
});
```

### Integration Tests

```typescript
// tests/integration/auth.test.ts
import request from 'supertest';
import app from '../../src/app';

describe('Auth Endpoints', () => {
  it('should set httpOnly cookies on login', async () => {
    const response = await request(app).post('/auth/login').send({
      email: 'test@example.com',
      password: 'password123',
    });

    expect(response.status).toBe(200);

    // ✅ Check Set-Cookie headers
    const cookies = response.headers['set-cookie'];
    expect(cookies).toBeDefined();
    expect(cookies.some((c: string) => c.includes('accessToken'))).toBe(true);
    expect(cookies.some((c: string) => c.includes('HttpOnly'))).toBe(true);
  });

  it('should reject requests without CSRF token', async () => {
    const response = await request(app).post('/auth/logout').send({});

    expect(response.status).toBe(403);
    expect(response.body.error).toContain('CSRF');
  });
});
```

---

## 📚 Environment Variables

```env
# .env.example

# JWT Secrets (MUST be different!)
JWT_ACCESS_SECRET=your-super-secret-access-key-change-this
JWT_REFRESH_SECRET=your-super-secret-refresh-key-change-this

# Environment
NODE_ENV=development

# Frontend URL (for CORS)
FRONTEND_URL=http://localhost:3000

# Database
DATABASE_URL=postgresql://user:password@localhost:5432/codezest

# Redis (for CSRF token storage in production)
REDIS_URL=redis://localhost:6379
```

---

## 🚀 Deployment Checklist

### Production Requirements

- [ ] HTTPS enabled (required for `secure: true` cookies)
- [ ] JWT secrets are strong (32+ characters, random)
- [ ] CORS origin set to production frontend URL
- [ ] `NODE_ENV=production`
- [ ] Cookie `secure` flag enabled
- [ ] Rate limiting on auth endpoints
- [ ] Logging for failed login attempts
- [ ] Token blacklist for logout (optional, use Redis)

---

## 📚 References

- [OWASP Session Management](https://cheatsheetseries.owasp.org/cheatsheets/Session_Management_Cheat_Sheet.html)
- [OWASP CSRF Prevention](https://cheatsheetseries.owasp.org/cheatsheets/Cross-Site_Request_Forgery_Prevention_Cheat_Sheet.html)
- [JWT Best Practices](https://tools.ietf.org/html/rfc8725)
- [Express Cookie Security](https://expressjs.com/en/advanced/best-practice-security.html)

---

**Last Updated**: 2025-11-27  
**Status**: Official Standard  
**Priority**: CRITICAL (Security)
