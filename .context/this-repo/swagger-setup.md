# Swagger API Documentation Setup

## 📖 Overview

The `codezest-notifications` service uses **Swagger (OpenAPI 3.0)** to provide interactive API documentation. This allows developers to explore and test endpoints directly from the browser.

## ⚙️ Configuration

- **Library**: `swagger-jsdoc` (generates spec) and `swagger-ui-express` (serves UI).
- **Config File**: `src/config/swagger.ts`
  - Defines the OpenAPI version, server details, and component schemas.
  - Automatically discovers docs in `src/presentation/routes/*.ts`.

## 🚀 Accessing Documentation

Once the server is running, access the Swagger UI at:
**[http://localhost:3004/api-docs](http://localhost:3004/api-docs)**

## 📝 How to Document New Endpoints

We use **JSDoc comments** directly in the route files.

### Example

In `src/presentation/routes/your.routes.ts`:

```typescript
/**
 * @swagger
 * /your-endpoint:
 *   get:
 *     summary: Retrieve data
 *     tags: [YourTag]
 *     responses:
 *       200:
 *         description: Success
 */
router.get('/', controller.method);
```

### Defining Schemas

Define reusable schemas in `src/config/swagger.ts` under `components.schemas` to keep route comments clean.

```typescript
// src/config/swagger.ts
components: {
  schemas: {
    YourModel: {
      type: 'object',
      properties: { ... }
    }
  }
}
```
