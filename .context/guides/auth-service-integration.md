# Notifications Integration - CodeZest Auth Service

**Purpose**: How `codezest-auth` integrates with `codezest-notifications` for sending user notifications  
**Last Updated**: 2025-11-27  
**Status**: Implementation Guide

---

## 🎯 Overview

The `codezest-auth` service integrates with `codezest-notifications` to send automated notifications for key authentication events:

1. **Welcome Email** - Sent when a new user registers
2. **Login Alert** - (Optional) Security notification for new logins
3. **Email Verification** - Confirmation emails for email verification
4. **Password Reset** - Password reset confirmation emails

---

## 🏗️ Architecture: Event-Based Integration

We use **asynchronous event-driven communication** via Redis/BullMQ instead of direct HTTP calls.

### Communication Flow

```
┌─────────────────┐
│  codezest-auth  │
│                 │
│  register()     │──┐
│  login()        │  │ Publish Event
└─────────────────┘  │
                     ↓
              ┌──────────────┐
              │ Redis Queue  │
              │ "notifications"
              └──────────────┘
                     │
                     │ Consume Event
                     ↓
         ┌──────────────────────┐
         │ codezest-notifications│
         │                       │
         │ Process & Send        │
         └──────────────────────┘
                     │
                     ↓
              ┌──────────┐
              │   User   │
              │  Email   │
              └──────────┘
```

### Why Event-Based?

| Aspect          | Event-Based ✅                  | HTTP API ❌                  |
| --------------- | ------------------------------- | ---------------------------- |
| **Coupling**    | Loose - services independent    | Tight - direct dependency    |
| **Auth**        | None needed (internal queue)    | JWT required                 |
| **Blocking**    | Non-blocking, async             | Blocking, synchronous        |
| **Reliability** | Messages persisted, auto-retry  | Manual retry logic needed    |
| **Performance** | Fast, doesn't slow registration | Adds latency to registration |

---

## 📦 Dependencies

### Required Packages

```json
{
  "dependencies": {
    "bullmq": "^5.0.0",
    "ioredis": "^5.3.2"
  }
}
```

### Installation

```bash
npm install bullmq ioredis
```

---

## 🔧 Implementation

### 1. Queue Infrastructure

**File**: `src/infrastructure/queue/notification.queue.ts`

```typescript
import { Queue } from 'bullmq';
import { createClient } from 'redis';
import { config } from '../../config';
import { logger } from '../../config/logger';

interface NotificationPayload {
  userId: string;
  type: 'EMAIL' | 'SMS' | 'PUSH' | 'IN_APP';
  title: string;
  message: string;
  priority?: 'LOW' | 'MEDIUM' | 'HIGH' | 'URGENT';
  metadata?: Record<string, unknown>;
}

class NotificationQueue {
  private queue: Queue | null = null;

  async initialize(): Promise<void> {
    try {
      const redisClient = createClient({
        socket: {
          host: config.redis.host,
          port: config.redis.port,
        },
        password: config.redis.password || undefined,
      });

      await redisClient.connect();

      this.queue = new Queue('notifications', {
        connection: redisClient,
      });

      logger.info('Notification queue initialized');
    } catch (error) {
      logger.error('Failed to initialize notification queue:', error);
      // Graceful degradation - service continues without notifications
    }
  }

  async publish(payload: NotificationPayload): Promise<void> {
    if (!this.queue) {
      logger.warn('Notification queue not initialized, skipping notification');
      return;
    }

    try {
      await this.queue.add('send', payload, {
        attempts: 3,
        backoff: {
          type: 'exponential',
          delay: 2000,
        },
      });

      logger.info('Notification event published', {
        userId: payload.userId,
        type: payload.type,
      });
    } catch (error) {
      logger.error('Failed to publish notification event:', error);
      // Don't throw - notifications are non-critical
    }
  }
}

export const notificationQueue = new NotificationQueue();
```

---

### 2. Notification Service

**File**: `src/application/services/notification.service.ts`

```typescript
import { notificationQueue } from '../../infrastructure/queue/notification.queue';
import { logger } from '../../config/logger';

export class NotificationService {
  /**
   * Send welcome email to newly registered user
   */
  async sendWelcomeEmail(userId: string, email: string, firstName: string): Promise<void> {
    try {
      await notificationQueue.publish({
        userId,
        type: 'EMAIL',
        title: 'Welcome to CodeZest Academy',
        message: `Hi ${firstName}, welcome to CodeZest! Your account has been created successfully. Start exploring our courses today!`,
        priority: 'HIGH',
        metadata: {
          email,
          template: 'welcome',
          firstName,
        },
      });
    } catch (error) {
      logger.error('Failed to send welcome email:', error);
      // Don't throw - registration should succeed even if email fails
    }
  }

  /**
   * Send login notification for security monitoring
   */
  async sendLoginNotification(
    userId: string,
    email: string,
    ip?: string,
    userAgent?: string
  ): Promise<void> {
    try {
      await notificationQueue.publish({
        userId,
        type: 'EMAIL',
        title: 'New Login Detected',
        message: `A new login was detected on your CodeZest account from IP: ${ip || 'unknown'}. If this wasn't you, please secure your account immediately.`,
        priority: 'MEDIUM',
        metadata: {
          email,
          ip,
          userAgent,
          template: 'login-alert',
          timestamp: new Date().toISOString(),
        },
      });
    } catch (error) {
      logger.error('Failed to send login notification:', error);
      // Don't throw - login should succeed even if notification fails
    }
  }

  /**
   * Send email verification link
   */
  async sendEmailVerification(
    userId: string,
    email: string,
    verificationToken: string
  ): Promise<void> {
    try {
      await notificationQueue.publish({
        userId,
        type: 'EMAIL',
        title: 'Verify Your Email Address',
        message: `Please verify your email address to complete your registration.`,
        priority: 'HIGH',
        metadata: {
          email,
          template: 'email-verification',
          verificationToken,
          verificationLink: `${process.env.FRONTEND_URL}/verify-email?token=${verificationToken}`,
        },
      });
    } catch (error) {
      logger.error('Failed to send email verification:', error);
    }
  }

  /**
   * Send password reset link
   */
  async sendPasswordReset(userId: string, email: string, resetToken: string): Promise<void> {
    try {
      await notificationQueue.publish({
        userId,
        type: 'EMAIL',
        title: 'Reset Your Password',
        message: `You requested to reset your password. Click the link to continue.`,
        priority: 'HIGH',
        metadata: {
          email,
          template: 'password-reset',
          resetToken,
          resetLink: `${process.env.FRONTEND_URL}/reset-password?token=${resetToken}`,
        },
      });
    } catch (error) {
      logger.error('Failed to send password reset email:', error);
    }
  }
}
```

---

### 3. Integration in AuthService

**File**: `src/application/services/auth.service.ts`

#### Import NotificationService

```typescript
import { NotificationService } from './notification.service';
```

#### Add to Constructor

```typescript
private notificationService: NotificationService;

constructor(
  userRepository: UserRepository,
  sessionRepository: SessionRepository,
  emailVerificationRepository: EmailVerificationRepository,
  passwordResetRepository: PasswordResetRepository,
  emailService: EmailService
) {
  this.userRepository = userRepository;
  this.sessionRepository = sessionRepository;
  this.emailVerificationRepository = emailVerificationRepository;
  this.passwordResetRepository = passwordResetRepository;
  this.emailService = emailService;
  this.notificationService = new NotificationService();
}
```

#### In `register()` Method

```typescript
async register(
  data: RegisterDto,
  ip?: string,
  userAgent?: string
): Promise<{ user: User; tokens: AuthTokens }> {
  // ... existing registration logic ...

  // Send welcome email (non-blocking)
  await this.notificationService.sendWelcomeEmail(user.id, user.email, user.firstName);

  return { user, tokens };
}
```

#### In `login()` Method (Optional)

```typescript
async login(
  data: LoginDto,
  ip?: string,
  userAgent?: string
): Promise<{ user: User; tokens: AuthTokens }> {
  // ... existing login logic ...

  // Send login notification (optional security feature)
  await this.notificationService.sendLoginNotification(user.id, user.email, ip, userAgent);

  return { user, tokens };
}
```

---

### 4. Server Initialization

**File**: `src/server.ts`

```typescript
import { notificationQueue } from './infrastructure/queue/notification.queue';

export const startServer = async (server: http.Server): Promise<void> => {
  try {
    // Initialize database connection
    const prisma = PrismaService.getInstance();
    await prisma.connect();

    // Initialize rate limiters
    const { initializeRateLimiters } =
      await import('./presentation/middleware/rateLimit.middleware');
    await initializeRateLimiters();

    // Initialize notification queue
    await notificationQueue.initialize();

    server.listen(config.port, () => {
      // ... banner ...
    });
  } catch (error) {
    logger.error('Failed to start server:', error);
    process.exit(1);
  }
};
```

---

## 🔒 Error Handling & Resilience

### Graceful Degradation

If the notification queue fails to initialize or Redis is unavailable:

- ✅ **Service continues to operate** - Registration/login still work
- ✅ **Errors are logged** - For monitoring and debugging
- ✅ **No user-facing errors** - Users don't see notification failures

### Retry Logic

BullMQ automatically retries failed jobs:

- **Attempts**: 3 retries
- **Backoff**: Exponential (2s, 4s, 8s)
- **Dead Letter Queue**: Failed jobs moved to failed queue for manual review

### Non-Blocking Operations

All notification calls are wrapped in try-catch:

```typescript
try {
  await notificationService.sendWelcomeEmail(...);
} catch (error) {
  logger.error('Failed to send welcome email:', error);
  // Continue - don't fail registration
}
```

---

## 📊 Monitoring & Debugging

### Check Queue Status

```bash
# Connect to Redis
redis-cli

# View pending notifications
LRANGE bull:notifications:wait 0 -1

# View active jobs
LRANGE bull:notifications:active 0 -1

# View failed jobs
LRANGE bull:notifications:failed 0 -1
```

### Logs to Monitor

```typescript
// Queue initialization
logger.info('Notification queue initialized');

// Event published
logger.info('Notification event published', { userId, type });

// Failures
logger.error('Failed to publish notification event:', error);
```

---

## 🧪 Testing

### Unit Test: NotificationService

```typescript
import { NotificationService } from './notification.service';
import { notificationQueue } from '../../infrastructure/queue/notification.queue';

jest.mock('../../infrastructure/queue/notification.queue');

describe('NotificationService', () => {
  let service: NotificationService;

  beforeEach(() => {
    service = new NotificationService();
  });

  it('should publish welcome email event', async () => {
    const publishSpy = jest.spyOn(notificationQueue, 'publish');

    await service.sendWelcomeEmail('user-123', 'test@example.com', 'John');

    expect(publishSpy).toHaveBeenCalledWith({
      userId: 'user-123',
      type: 'EMAIL',
      title: 'Welcome to CodeZest Academy',
      message: expect.stringContaining('John'),
      priority: 'HIGH',
      metadata: expect.objectContaining({
        email: 'test@example.com',
        template: 'welcome',
      }),
    });
  });
});
```

### Integration Test

```typescript
describe('Auth Registration with Notifications', () => {
  it('should send welcome email after registration', async () => {
    const publishSpy = jest.spyOn(notificationQueue, 'publish');

    await authService.register({
      email: 'newuser@example.com',
      password: 'password123',
      firstName: 'Jane',
      lastName: 'Doe',
    });

    expect(publishSpy).toHaveBeenCalledWith(
      expect.objectContaining({
        type: 'EMAIL',
        title: 'Welcome to CodeZest Academy',
      })
    );
  });
});
```

---

## 🚀 Deployment Checklist

- [ ] Redis is running and accessible
- [ ] `codezest-notifications` service is deployed and consuming the queue
- [ ] Environment variables configured (REDIS_HOST, REDIS_PORT, REDIS_PASSWORD)
- [ ] Queue monitoring dashboard set up (optional: Bull Board)
- [ ] Email templates configured in notifications service
- [ ] Test registration flow end-to-end
- [ ] Monitor failed jobs queue

---

## 📚 Related Documentation

- [Consuming Notifications Service](./consuming-notifications-service.md) - General integration guide
- [Security Standardization Guide](../project-wide/security-standardization-guide.md)

---

## ❓ FAQ

**Q: What happens if Redis is down?**  
A: The service continues to operate. Notifications are skipped and errors are logged. No user-facing impact.

**Q: Can I disable notifications temporarily?**  
A: Yes, add a feature flag in config:

```typescript
if (!config.features.notifications) return;
```

**Q: How do I know if a notification was sent?**  
A: Check the `codezest-notifications` service logs or query the notifications database.

**Q: Can I send custom notifications?**  
A: Yes, use `notificationQueue.publish()` with your custom payload.

---

**Last Updated**: 2025-11-27  
**Maintained By**: Platform Team
