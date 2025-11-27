# Security Standardization Guide for CodeZest Microservices

## 🎯 Purpose

This document defines the security standards that **MUST** be implemented across all microservices in the CodeZest platform. While `codezest-auth` handles identity management, all other services ("Resource Servers") must implement robust security measures to protect data and ensure consistent enforcement of access controls.

---

## 🏗️ Service Classification & Responsibilities

### 1. Identity Provider (IdP)

**Service**: `codezest-auth`

- **Responsibilities**:
  - User Registration & Login.
  - Password Hashing & Storage.
  - Token Generation (Access & Refresh Tokens).
  - Session Management (Redis-backed).
  - OAuth Integration.
  - Account Lockout & Security Events.

### 2. Resource Servers

**Services**: `codezest-api`, `codezest-payments`, `codezest-notifications`, `codezest-activity`

- **Responsibilities**:
  - **Verify Identity**: Validate JWT Access Tokens on every protected request.
  - **Enforce Permissions**: Check User Roles (RBAC) before allowing actions.
  - **Protect Resources**: Implement Rate Limiting, CORS, and Input Validation.

---

## 🛡️ Security Standards for Resource Servers

All Resource Servers must implement the following security layers.

### 1. Authentication (JWT Verification)

Resource servers **DO NOT** handle login or sessions. They rely on the Access Token issued by `codezest-auth`.

- **Mechanism**: Extract `Authorization: Bearer <token>` header.
- **Validation**:
  - Verify signature using the shared `JWT_ACCESS_SECRET` (formerly `JWT_SECRET`).
  - Verify `issuer` (`codezest-auth`) and `audience` (`codezest-api`).
  - Verify `expiration` (reject expired tokens).
- **Implementation**: Use a shared middleware (e.g., `authMiddleware`) similar to `codezest-auth` but without the refresh logic.

### 2. Authorization (RBAC)

Authentication identifies _who_ the user is; Authorization determines _what_ they can do.

- **Source**: Use the `role` claim from the JWT payload.
- **Enforcement**: Apply middleware on routes.
  ```typescript
  // Example
  router.post('/courses', authenticate, authorize('INSTRUCTOR', 'ADMIN'), createCourse);
  ```
- **Granularity**:
  - **Service-Level**: Block unauthorized roles globally if needed.
  - **Resource-Level**: Verify ownership (e.g., "Can this user edit _this_ specific course?").

### 3. Infrastructure Security

Every service must implement baseline defense mechanisms.

- **Helmet**: Use `helmet()` middleware to set secure HTTP headers (HSTS, X-Frame-Options, etc.).
- **CORS**: Configure Cross-Origin Resource Sharing to allow only trusted domains (`codezest-web`, `codezest-admin`).
  - _Note_: Ensure `X-CSRF-Token` is allowed if the service accepts state-changing requests directly from the browser (though typically CSRF is handled by the Gateway/Auth service for sessions).
- **Rate Limiting**: Implement `express-rate-limit` to prevent abuse.
  - **Distributed**: Use `rate-limit-redis` for clustered environments (Standard).
  - **Global Limit**: e.g., 100 requests/15min per IP.
  - **Sensitive Routes**: Stricter limits for high-cost operations.

### 4. Security Event Logging

All services must log critical security events for audit trails.

- **Events**: Login success/fail, account lockouts, token reuse, permission denials.
- **Format**: Structured JSON with timestamp, event type, user ID, IP, and metadata.
- **Tool**: Use a shared `security-logger` utility.

- **Tool**: Use `Zod` for all DTOs.
- **Rule**: Never trust client input. Validate types, formats, and lengths at the Controller level before passing data to the Service layer.

### 5. Inter-Service Communication

When services communicate (e.g., `payments` -> `notifications`):

- **Asynchronous (Preferred)**: Use Events (RabbitMQ/Redis). This implicitly trusts the publisher.
- **Synchronous**:
  - If acting on behalf of a user, forward the **User's JWT**.
  - If acting as a system process, use a **Service-to-Service Token** (signed with a separate internal secret) or **mTLS**.

---

## 📋 Implementation Checklist for New Services

When creating or auditing a service (e.g., `codezest-learning`), ensure:

- [ ] **Dependencies**: `helmet`, `cors`, `jsonwebtoken`, `zod`, `express-rate-limit` are installed.
- [ ] **Env Vars**: `JWT_ACCESS_SECRET` is set (matching `codezest-auth`).
- [ ] **Middleware**:
  - [ ] `helmet()` is active.
  - [ ] `cors()` is configured.
  - [ ] `rateLimit()` is active.
  - [ ] `authenticate()` middleware is verifying tokens.
- [ ] **Routes**: Protected routes have `authenticate` and `authorize(...)` guards.
- [ ] **Validation**: All POST/PUT endpoints validate body with Zod schemas.

---

## ❓ FAQ

**Q: Do all services need the `Session` table?**
A: **No.** Only `codezest-auth` manages sessions. Other services should be stateless and rely solely on the JWT Access Token.

**Q: Should `codezest-payments` implement CSRF protection?**
A: If it accepts direct form posts from the browser, **Yes**. If it only accepts JSON API calls from the frontend (which uses the Auth service's session/token), standard CORS + Bearer Token is usually sufficient, but Double Submit Cookie (CSRF Token) is recommended for all state-changing endpoints if cookies are used. Since we moved to a Header-based CSRF token in Auth, other services can validate this header if they share the Redis store, or rely on the Gateway to enforce it.

**Q: How do I get the User ID in `codezest-activity`?**
A: It's in the JWT payload (`req.user.userId`). Do not query the User database unless absolutely necessary.
