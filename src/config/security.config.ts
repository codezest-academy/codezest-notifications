import { CorsOptions } from 'cors';
import { RateLimitRequestHandler } from 'express-rate-limit';
import rateLimit from 'express-rate-limit';
import RedisStore from 'rate-limit-redis';
import { createCacheClient } from '@codezest-academy/codezest-cache';
import Redis from 'ioredis';

// JWT Configuration
export const jwtConfig = {
  accessToken: {
    secret: process.env.JWT_ACCESS_SECRET!,
    expiresIn: '15m', // 15 minutes
  },
  issuer: 'codezest-auth',
  audience: 'codezest-api',
};

// Validate JWT secrets
if (!jwtConfig.accessToken.secret) {
  throw new Error('JWT_ACCESS_SECRET must be defined in environment variables');
}

// CORS Configuration
const isProduction = process.env.NODE_ENV === 'production';
const allowedOrigins = process.env.ALLOWED_ORIGINS?.split(',') || [
  'http://localhost:3000',
  'http://localhost:3001',
];

export const corsConfig: CorsOptions = {
  origin: (origin, callback) => {
    // Allow requests with no origin (like mobile apps or curl requests)
    if (!origin) return callback(null, true);

    if (allowedOrigins.includes(origin)) {
      callback(null, true);
    } else {
      callback(new Error('Not allowed by CORS'));
    }
  },
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH'],
  allowedHeaders: ['Content-Type', 'Authorization', 'X-CSRF-Token'],
};

// Rate Limiting Configuration
// Create Redis client for rate limiting (separate from cache client)
const redisClient = process.env.REDIS_URL ? new Redis(process.env.REDIS_URL) : null;

export const createRateLimiter = (): RateLimitRequestHandler => {
  const useRedis = redisClient && isProduction;

  const limiterConfig: any = {
    windowMs: 15 * 60 * 1000, // 15 minutes
    max: 100, // Limit each IP to 100 requests per windowMs
    message: 'Too many requests from this IP, please try again later.',
    standardHeaders: true, // Return rate limit info in the `RateLimit-*` headers
    legacyHeaders: false, // Disable the `X-RateLimit-*` headers
  };

  // Use Redis store in production for distributed rate limiting
  if (useRedis) {
    limiterConfig.store = new RedisStore({
      // @ts-expect-error - RedisStore expects different client type
      client: redisClient,
      prefix: 'rate_limit:',
    });
  }

  return rateLimit(limiterConfig);
};

// Sensitive routes rate limiter (stricter)
export const createStrictRateLimiter = (): RateLimitRequestHandler => {
  const useRedis = process.env.REDIS_URL && isProduction;

  const limiterConfig: any = {
    windowMs: 15 * 60 * 1000, // 15 minutes
    max: 20, // Limit each IP to 20 requests per windowMs
    message: 'Too many requests to this endpoint, please try again later.',
    standardHeaders: true,
    legacyHeaders: false,
  };

  if (useRedis) {
    limiterConfig.store = new RedisStore({
      // @ts-expect-error - RedisStore expects different client type
      client: redisClient,
      prefix: 'rate_limit_strict:',
    });
  }

  return rateLimit(limiterConfig);
};
