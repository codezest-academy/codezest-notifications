# 📦 Consuming @codezest-academy/codezest-cache

This guide explains how to use the `@codezest-academy/codezest-cache` library in other microservices (e.g., `codezest-auth`, `codezest-api`).

## 1. 🛠️ Configuration

To install this private package, you must configure npm to look at the GitHub Packages registry.

### Step A: Create `.npmrc`

In the **root directory** of your consuming service, ensure your `.npmrc` includes:

```ini
@codezest-academy:registry=https://npm.pkg.github.com
//npm.pkg.github.com/:_authToken=${GITHUB_TOKEN}
```

### Step B: Set Environment Variables

You need a **Personal Access Token (PAT)** with `read:packages` scope.

**Local Development:**

```bash
export GITHUB_TOKEN=your_personal_access_token
```

**CI/CD (GitHub Actions):**
Ensure `GITHUB_TOKEN` is available in your workflow.

---

## 2. 📥 Installation

```bash
npm install @codezest-academy/codezest-cache@latest
```

---

## 3. 💻 Usage in Code

### Step A: Initialize the Client

Create a singleton instance in your service's infrastructure layer (e.g., `src/infrastructure/cache/index.ts`).

```typescript
import { createCacheClient } from '@codezest-academy/codezest-cache';
import { logger } from '../../common/logger'; // Your service's logger

// Create the client with connection details and logger
export const cache = createCacheClient({
  host: process.env.REDIS_HOST,
  port: Number(process.env.REDIS_PORT),
  password: process.env.REDIS_PASSWORD,
  logger: logger, // Optional: Inject your logger (Winston/Pino)
});
```

### Step B: Use in Services

Inject or import the cache client into your application services.

```typescript
import { cache } from '../infrastructure/cache';

export class UserService {
  async getUser(userId: string) {
    const cacheKey = `user:${userId}`;

    // 1. Try cache
    const cached = await cache.get<User>(cacheKey);
    if (cached) return cached;

    // 2. Fetch from DB
    const user = await db.user.findUnique({ where: { id: userId } });

    // 3. Set cache (TTL: 1 hour)
    if (user) {
      await cache.set(cacheKey, user, 3600);
    }

    return user;
  }
}
```

---

## 4. 🧪 Mocking for Tests

Since the library exports an interface `CacheClientInterface`, you can easily mock it in your service's unit tests.

```typescript
const mockCache = {
  get: jest.fn(),
  set: jest.fn(),
  del: jest.fn(),
  delPattern: jest.fn(),
  clear: jest.fn(),
  disconnect: jest.fn(),
};

// Inject mockCache into your service
const userService = new UserService(mockCache);
```
