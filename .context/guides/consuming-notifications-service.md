# Consuming the Notifications Service - Integration Guide

**Purpose**: Guide for integrating with the `codezest-notifications` service from other microservices  
**Last Updated**: 2025-11-27  
**Status**: Official Guide

---

## 🎯 Overview

The `codezest-notifications` service is a **Resource Server** that handles notification delivery across multiple channels (Email, SMS, Push, In-App). Other microservices can integrate with it using two approaches:

1. **Synchronous (HTTP API)** - Direct REST API calls
2. **Asynchronous (Events)** - Publish events to a message queue (Recommended)

---

## 🔐 Authentication Requirements

All API requests **MUST** include a valid JWT access token in the `Authorization` header.

### Token Requirements

- **Format**: `Bearer <token>`
- **Issuer**: `codezest-auth`
- **Audience**: `codezest-api`
- **Required Role**: `ADMIN` or `INSTRUCTOR`

### How to Get a Token

#### Option 1: User Context (Recommended)

When acting on behalf of a user, forward the user's JWT token:

```typescript
// In your service
const userToken = req.headers.authorization; // From incoming request

await axios.post('http://notifications-service/notifications', payload, {
  headers: {
    Authorization: userToken, // Forward user's token
  },
});
```

#### Option 2: Service-to-Service Token

For system-level operations, create a service token:

```typescript
import jwt from 'jsonwebtoken';

const serviceToken = jwt.sign(
  {
    userId: 'system',
    email: 'system@codezest.com',
    role: 'ADMIN', // Required for notifications
  },
  process.env.JWT_ACCESS_SECRET!, // Must match auth service
  {
    expiresIn: '15m',
    issuer: 'codezest-auth',
    audience: 'codezest-api',
  }
);
```

---

## 📡 API Integration (Synchronous)

### Endpoint

```
POST /notifications
```

### Request Format

```typescript
interface SendNotificationRequest {
  userId: string; // Target user ID
  type: NotificationType; // EMAIL | SMS | PUSH | IN_APP
  title: string; // Notification title
  message: string; // Notification content
  priority?: NotificationPriority; // LOW | MEDIUM | HIGH | URGENT
}

type NotificationType = 'EMAIL' | 'SMS' | 'PUSH' | 'IN_APP';
type NotificationPriority = 'LOW' | 'MEDIUM' | 'HIGH' | 'URGENT';
```

### Example: TypeScript/Node.js

```typescript
import axios from 'axios';

async function sendNotification(
  userToken: string,
  userId: string,
  type: 'EMAIL' | 'SMS' | 'PUSH' | 'IN_APP',
  title: string,
  message: string,
  priority: 'LOW' | 'MEDIUM' | 'HIGH' | 'URGENT' = 'MEDIUM'
) {
  try {
    const response = await axios.post(
      `${process.env.NOTIFICATIONS_SERVICE_URL}/notifications`,
      {
        userId,
        type,
        title,
        message,
        priority,
      },
      {
        headers: {
          Authorization: userToken,
          'Content-Type': 'application/json',
        },
      }
    );

    return response.data;
  } catch (error) {
    if (axios.isAxiosError(error)) {
      console.error('Notification failed:', error.response?.data);
      throw new Error(`Failed to send notification: ${error.response?.status}`);
    }
    throw error;
  }
}

// Usage
await sendNotification(
  req.headers.authorization!, // User's token
  'user-123',
  'EMAIL',
  'Welcome to CodeZest',
  'Your account has been created successfully!',
  'HIGH'
);
```

### Response Format

**Success (201 Created):**

```json
{
  "id": "550e8400-e29b-41d4-a716-446655440000",
  "userId": "user-123",
  "type": "EMAIL",
  "title": "Welcome to CodeZest",
  "message": "Your account has been created successfully!",
  "priority": "HIGH",
  "status": "PENDING",
  "createdAt": "2025-11-27T17:45:00.000Z"
}
```

**Error Responses:**

| Status | Error                 | Description                                     |
| ------ | --------------------- | ----------------------------------------------- |
| 400    | Bad Request           | Missing required fields                         |
| 401    | Unauthorized          | Invalid or missing token                        |
| 403    | Forbidden             | Insufficient permissions (not ADMIN/INSTRUCTOR) |
| 500    | Internal Server Error | Service error                                   |

---

## 🚀 Event-Based Integration (Asynchronous) - Recommended

For better decoupling and reliability, use event-based communication.

### Architecture

```
[Your Service] → [Message Queue] → [Notifications Service]
                  (RabbitMQ/Redis)
```

### Event Schema

```typescript
interface NotificationEvent {
  eventType: 'notification.send';
  timestamp: string;
  payload: {
    userId: string;
    type: 'EMAIL' | 'SMS' | 'PUSH' | 'IN_APP';
    title: string;
    message: string;
    priority?: 'LOW' | 'MEDIUM' | 'HIGH' | 'URGENT';
    metadata?: Record<string, any>; // Optional context
  };
}
```

### Example: Publishing Events

```typescript
import { Queue } from 'bullmq';
import Redis from 'ioredis';

const redis = new Redis(process.env.REDIS_URL);
const notificationQueue = new Queue('notifications', { connection: redis });

async function publishNotificationEvent(
  userId: string,
  type: 'EMAIL' | 'SMS' | 'PUSH' | 'IN_APP',
  title: string,
  message: string,
  priority: 'LOW' | 'MEDIUM' | 'HIGH' | 'URGENT' = 'MEDIUM'
) {
  await notificationQueue.add('send', {
    userId,
    type,
    title,
    message,
    priority,
  });
}

// Usage
await publishNotificationEvent(
  'user-123',
  'EMAIL',
  'Course Enrollment Confirmed',
  'You have been enrolled in "Advanced TypeScript"'
);
```

### Benefits of Event-Based Approach

- ✅ **Decoupling**: Services don't need to know about each other
- ✅ **Reliability**: Messages are persisted in the queue
- ✅ **Retry Logic**: Automatic retries on failure
- ✅ **No Auth Required**: Internal queue, no JWT needed
- ✅ **Better Performance**: Non-blocking, async processing

---

## 🔧 Common Use Cases

### 1. User Registration (Auth Service)

```typescript
// After successful registration
await sendNotification(
  serviceToken,
  newUser.id,
  'EMAIL',
  'Welcome to CodeZest Academy',
  `Hi ${newUser.firstName}, your account has been created!`,
  'HIGH'
);
```

### 2. Course Enrollment (Learning Service)

```typescript
// After enrollment
await publishNotificationEvent(
  userId,
  'IN_APP',
  'Enrollment Successful',
  `You are now enrolled in "${course.title}"`,
  'MEDIUM'
);
```

### 3. Payment Confirmation (Payments Service)

```typescript
// After payment success
await sendNotification(
  userToken,
  payment.userId,
  'EMAIL',
  'Payment Received',
  `Your payment of $${payment.amount} has been processed.`,
  'HIGH'
);
```

### 4. Assignment Deadline Reminder (Activity Service)

```typescript
// Scheduled job
await publishNotificationEvent(
  student.id,
  'PUSH',
  'Assignment Due Soon',
  `"${assignment.title}" is due in 24 hours`,
  'URGENT'
);
```

---

## 🛠️ Setup in Your Service

### 1. Install Dependencies

```bash
npm install axios jsonwebtoken
# For event-based
npm install bullmq ioredis
```

### 2. Environment Variables

```bash
# .env
NOTIFICATIONS_SERVICE_URL=http://localhost:3003
JWT_ACCESS_SECRET=<same-as-auth-service>
REDIS_URL=redis://localhost:6379
```

### 3. Create Notification Client

```typescript
// src/clients/notification.client.ts
import axios, { AxiosInstance } from 'axios';

export class NotificationClient {
  private client: AxiosInstance;

  constructor() {
    this.client = axios.create({
      baseURL: process.env.NOTIFICATIONS_SERVICE_URL,
      timeout: 5000,
    });
  }

  async send(
    token: string,
    userId: string,
    type: 'EMAIL' | 'SMS' | 'PUSH' | 'IN_APP',
    title: string,
    message: string,
    priority: 'LOW' | 'MEDIUM' | 'HIGH' | 'URGENT' = 'MEDIUM'
  ) {
    const response = await this.client.post(
      '/notifications',
      { userId, type, title, message, priority },
      { headers: { Authorization: token } }
    );
    return response.data;
  }
}

export const notificationClient = new NotificationClient();
```

### 4. Usage in Your Service

```typescript
import { notificationClient } from './clients/notification.client';

// In your controller/service
await notificationClient.send(
  req.headers.authorization!,
  user.id,
  'EMAIL',
  'Action Required',
  'Please verify your email address'
);
```

---

## 📋 Best Practices

### 1. Error Handling

Always handle notification failures gracefully:

```typescript
try {
  await notificationClient.send(...);
} catch (error) {
  // Log error but don't fail the main operation
  logger.error('Failed to send notification', error);
  // Main operation continues
}
```

### 2. Token Management

- **User Context**: Always forward user's token when available
- **System Operations**: Use service token with ADMIN role
- **Token Expiry**: Handle 401 errors and refresh tokens

### 3. Rate Limiting Awareness

The notifications service has rate limits:

- **Global**: 100 requests per 15 minutes per IP
- **Plan accordingly** for bulk operations

### 4. Async for Non-Critical Notifications

Use event-based approach for:

- Welcome emails
- Reminders
- Status updates
- Bulk notifications

Use HTTP API for:

- Critical notifications requiring immediate confirmation
- User-triggered notifications
- Real-time alerts

### 5. Idempotency

For HTTP requests, implement retry logic with exponential backoff:

```typescript
async function sendWithRetry(maxRetries = 3) {
  for (let i = 0; i < maxRetries; i++) {
    try {
      return await notificationClient.send(...);
    } catch (error) {
      if (i === maxRetries - 1) throw error;
      await sleep(Math.pow(2, i) * 1000); // Exponential backoff
    }
  }
}
```

---

## 🔍 Troubleshooting

### 401 Unauthorized

**Cause**: Invalid or missing JWT token

**Solution**:

- Verify `JWT_ACCESS_SECRET` matches auth service
- Check token format: `Bearer <token>`
- Ensure token is not expired (15 min lifetime)

### 403 Forbidden

**Cause**: User role is not ADMIN or INSTRUCTOR

**Solution**:

- Use service token with ADMIN role for system operations
- Verify user role in JWT payload

### 429 Too Many Requests

**Cause**: Rate limit exceeded

**Solution**:

- Implement exponential backoff
- Use event-based approach for bulk operations
- Distribute requests over time

### 500 Internal Server Error

**Cause**: Service error (queue, database, etc.)

**Solution**:

- Check notifications service logs
- Verify Redis/Queue is running
- Implement retry logic

---

## 📚 Additional Resources

- [Security Standardization Guide](file:///Volumes/CVS%20Sandisk%201TB%20Black/Dev/Quiz/codezest-workspace/codezest-notifications/.context/project-wide/security-standardization-guide.md)
- [Session Management Backend](file:///Volumes/CVS%20Sandisk%201TB%20Black/Dev/Quiz/codezest-workspace/codezest-notifications/.context/project-wide/session-management-backend.md)
- [API Documentation](http://localhost:3003/api-docs) (Swagger)

---

**Questions?** Contact the Platform Team or check the service logs for debugging.
