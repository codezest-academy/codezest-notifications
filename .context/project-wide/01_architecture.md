# CodeZest System Architecture & Design

## 1. Executive Summary

This document outlines the production-ready architecture for the CodeZest platform. The system follows a **Microservices Architecture** pattern, emphasizing **SOLID principles**, **Clean Architecture**, and **Event-Driven Communication**.

The goal is to build a scalable, maintainable, and robust platform that supports web and mobile clients, with clear separation of concerns and high cohesion within services.

---

## 2. System Overview

The system is composed of **5 Core Backend Services**, **3 Frontend Applications**, and **Shared Infrastructure Libraries**.

### 2.1 Repository Landscape

| Repository               | Type       | Tech Stack          | Responsibility                    |
| ------------------------ | ---------- | ------------------- | --------------------------------- |
| **Frontends**            |            |                     |                                   |
| `codezest-web`           | Web App    | Next.js / React     | Student learning portal           |
| `codezest-admin`         | Web App    | Next.js / React     | Admin & Instructor dashboard      |
| `codezest-mobile`        | Mobile App | React Native        | Mobile learning experience        |
| **Backend Services**     |            |                     |                                   |
| `codezest-auth`          | Service    | Node.js / Express   | Identity, Auth, Profiles          |
| `codezest-api`           | Service    | Node.js / Express   | Core Learning Domain (LMS)        |
| `codezest-payments`      | Service    | Node.js / Express   | Subscriptions, Billing, Invoices  |
| `codezest-notifications` | Service    | Node.js / Express   | Email, Push, In-app notifications |
| `codezest-activity`      | Service    | Node.js / Express   | Analytics, Activity Feeds         |
| **Shared Libs**          |            |                     |                                   |
| `codezest-db`            | Library    | Prisma / TypeScript | Shared Database Schema & Client   |
| `codezest-cache`         | Library    | Redis / TypeScript  | Shared Caching Logic              |

> **Note**: Subscription logic is fully encapsulated within `codezest-payments`. There is no separate repository for subscriptions.

---

## 3. Architecture Principles

We will strictly adhere to the following principles to ensure a "Solid" foundation.

### 3.1 SOLID Principles (Applied to Microservices)

- **Single Responsibility Principle (SRP)**: Each service has one clear domain (e.g., Auth handles _only_ identity, not billing).
- **Open/Closed Principle (OCP)**: Services are open for extension (via events/plugins) but closed for modification (core logic stable).
- **Liskov Substitution Principle (LSP)**: API contracts must be respected. Replacing a service version shouldn't break clients.
- **Interface Segregation Principle (ISP)**: Client-specific APIs (BFF pattern) or GraphQL to avoid over-fetching.
- **Dependency Inversion Principle (DIP)**: High-level modules (Domain) should not depend on low-level modules (DB/Infrastructure).

### 3.2 Project Structure & Clean Architecture

This project follows **Clean Architecture** principles (also known as Hexagonal or Onion Architecture).

#### Directory Layout

```
.
├── src/
│   ├── common/             # Shared utilities, constants, and types used across layers
│   ├── config/             # Environment variables and configuration setup
│   ├── domain/             # Enterprise business rules (The "Heart" of the app)
│   ├── application/        # Application business rules (Use Cases)
│   ├── infrastructure/     # External interfaces (Database, Cache, 3rd Party APIs)
│   ├── presentation/       # Entry points (REST API Controllers, Routes)
│   ├── middleware/         # Express middleware (Auth, Logging, Validation)
│   ├── app.ts              # Express app setup
│   ├── server.ts           # Server entry point
│   └── index.ts            # Main entry point
├── tests/                  # Test suites
├── scripts/                # Utility scripts (e.g., seeding, verification)
└── docker-compose.yml      # Local development infrastructure
```

#### Detailed Layer Breakdown

**1. Domain Layer (`src/domain`)**
_Dependency Rule_: Depends on _nothing_.

- **Entities**: Core business objects (e.g., `User`, `Course`).
- **Repository Interfaces**: Definitions of how to access data (e.g., `UserRepositoryInterface`).
- **Errors**: Domain-specific errors.

**2. Application Layer (`src/application`)**
_Dependency Rule_: Depends only on _Domain_.

- **Services**: Orchestrate data flow. Implement business use cases.
- **DTOs**: Data Transfer Objects (e.g., `CreateUserDto`).
- **Mappers**: Convert between DTOs and Entities.

**3. Infrastructure Layer (`src/infrastructure`)**
_Dependency Rule_: Depends on _Domain_ and _Application_.

- **Database**: `PrismaService` singleton.
- **Repositories**: Concrete implementations (e.g., `UserRepository`).
- **External Services**: Payment gateways, Email providers.

**4. Presentation Layer (`src/presentation`)**
_Dependency Rule_: Depends on _Application_.

- **Controllers**: Handle HTTP requests (e.g., `UserController`).
- **Routes**: Define API endpoints.

**5. Common & Config**

- **`src/config`**: Centralized config. No direct `process.env` access.
- **`src/common`**: Helper functions, logger, utils.

#### Flow of Control

1. **Request** -> **Route** (`src/presentation/routes`)
2. -> **Controller** (`src/presentation/controllers`)
3. -> **Application Service** (`src/application/services`)
4. -> **Repository Interface** (`src/domain/repositories`)
5. -> **Infrastructure Repository** (`src/infrastructure/repositories`) -> **Database**
6. Data flows back up: Entity -> Service -> Controller -> **Response**

#### Naming Conventions

- **Files and Folders**:
  - Use `dot-case` for file names (e.g., `user.profile.ts`, `auth.service.ts`).
  - Use `kebab-case` for folder names (e.g., `user-profile`, `auth-service`).
  - `index.ts` files are used for barrel exports within directories.
- **Classes**: `PascalCase` (e.g., `UserService`).
- **Interfaces**: `PascalCase` (e.g., `UserRepository`).
- **Functions/Methods/Vars**: `camelCase` (e.g., `getUserById`, `userName`).
- **Constants**: `camelCase` (e.g., `jwtSecret`, `maxLoginAttempts`).
- **Enums**: `PascalCase` (e.g., `UserRole.Admin`).
- **DTOs**: `PascalCase` + `Dto` suffix (e.g., `CreateUserDto`).
- **Mappers**: `PascalCase` + `Mapper` suffix (e.g., `UserMapper`).
- **Services**: `PascalCase` + `Service` suffix (e.g., `AuthService`).
- **Controllers**: `PascalCase` + `Controller` suffix (e.g., `AuthController`).
- **Repositories**: `PascalCase` + `Repository` suffix (e.g., `UserRepository`).
- **Entities**: `PascalCase` (e.g., `User`).

### 3.3 12-Factor App

- **Config**: Stored in environment variables.
- **Backing Services**: Treated as attached resources (DB, Redis).
- **Processes**: Stateless and share-nothing.
- **Disposability**: Fast startup and graceful shutdown.

---

## 4. Communication Strategy

A hybrid approach using **Synchronous** for reads/critical writes and **Asynchronous** for side effects.

### 4.1 Synchronous Communication (Request/Response)

- **Protocol**: REST (JSON) or GraphQL.
- **Usage**:
  - Frontend -> Backend (API Gateway / Load Balancer).
  - Service -> Service (Only when data is strictly required immediately, e.g., Auth check).
- **Pattern**: API Gateway acts as the single entry point, routing requests to appropriate services.

### 4.2 Asynchronous Communication (Event-Driven)

- **Protocol**: Message Queue (RabbitMQ) or Event Stream (Redis Streams / Kafka).
- **Usage**: Decoupling services.
- **Example Flow**:
  1.  User pays for subscription (`codezest-payments`).
  2.  `PaymentSucceeded` event published.
  3.  `codezest-auth` consumes event -> Updates user role to PRO.
  4.  `codezest-notifications` consumes event -> Sends "Welcome to Pro" email.
  5.  `codezest-activity` consumes event -> Logs "User upgraded".

### 4.3 Shared Data Strategy

- **`codezest-db`**: A shared library containing the Prisma Schema.
- **Database**: Single physical DB with logical separation (schemas: `auth`, `learning`, etc.) OR separate DBs per service.
  - _Recommendation_: **Separate Schemas** within one Postgres cluster (easier management, strict boundaries enforced by user permissions).

---

## 5. Detailed Service Architecture

### 5.1 `codezest-auth` (Identity Provider)

- **Responsibilities**: Registration, Login, OAuth, Token Management, User Profile Management.
- **Tech**: Express, Passport.js/Lucia, JWT.
- **Events Published**: `UserCreated`, `UserLoggedIn`, `ProfileUpdated`.
- **Events Consumed**: `SubscriptionUpdated` (to update roles).

### 5.2 `codezest-api` (Learning Core)

- **Responsibilities**: Managing Languages, Modules, Materials, Assignments, Quizzes.
- **Tech**: Express, complex aggregation queries.
- **Events Published**: `AssignmentSubmitted`, `QuizCompleted`, `CourseStarted`.
- **Events Consumed**: `UserCreated` (create default enrollments).

### 5.3 `codezest-payments`

- **Responsibilities**: Stripe/PayPal integration, Webhook handling, Invoice generation.
- **Tech**: Express, Stripe SDK.
- **Events Published**: `PaymentSucceeded`, `PaymentFailed`, `SubscriptionCanceled`.

### 5.4 `codezest-notifications`

- **Responsibilities**: Sending Emails (SendGrid/AWS SES), Push Notifications, In-App Alerts.
- **Tech**: BullMQ (Job Queue) for reliable delivery.
- **Events Consumed**: Listens to _all_ relevant business events (`UserCreated`, `PaymentSucceeded`, etc.).

### 5.5 `codezest-activity`

- **Responsibilities**: Analytics, User Activity Feed, Gamification (XP/Badges).
- **Tech**: TimescaleDB or similar for time-series data (optional), or just Postgres.
- **Events Consumed**: All user action events.

---

## 6. Infrastructure & Deployment

### 6.1 Containerization

- **Docker**: Each service has its own `Dockerfile`.
- **Docker Compose**: For local development, spinning up all services + DB + Redis.

### 6.2 CI/CD Pipeline

- **GitHub Actions**:
  - Linting & Testing (Unit/Integration).
  - Build Docker Images.
  - Publish Shared Libs (`codezest-db`) to GitHub Packages.

### 6.3 API Gateway (Optional but Recommended)

- Use **Nginx** or a dedicated Gateway service (e.g., Kong, or a simple Express Gateway) to route `/auth/*` to Auth Service, `/api/*` to Learning Service, etc.

---

## 7. Implementation Roadmap

1.  **Foundation**: Finalize `codezest-db` (Shared Schema).
2.  **Core Services**: Build `auth` and `api` (Learning) first.
3.  **Communication**: Set up Redis/RabbitMQ for event bus.
4.  **Frontend Integration**: Connect `web` to `auth` and `api`.
5.  **Expansion**: Add `payments`, `notifications`, `activity`.

## 8. Design Patterns to Use

- **Repository Pattern**: Abstract DB access.
- **Factory Pattern**: Creating complex objects (e.g., different types of Quiz Questions).
- **Strategy Pattern**: Different payment providers (Stripe, PayPal).
- **Observer/Pub-Sub**: Handling domain events.
- **Adapter Pattern**: Integrating third-party services (Email, Payment Gateways).

---

## 9. Code Style Enforcement

### ESLint Naming Convention Rules

To enforce the naming conventions outlined above, the following ESLint rules are applied:

```json
[
  "error",

  // ──────────────────────────────────────────────────────────────
  // 1. General PascalCase for types, classes, enums, etc.
  // ──────────────────────────────────────────────────────────────
  {
    "selector": ["class", "interface", "typeAlias", "enum", "typeParameter"],
    "format": ["PascalCase"],
    "leadingUnderscore": "forbid",
    "trailingUnderscore": "forbid"
  },

  // ──────────────────────────────────────────────────────────────
  // 2. Block I-prefix and "Interface" suffix on interfaces
  // ──────────────────────────────────────────────────────────────
  {
    "selector": "interface",
    "format": ["PascalCase"],
    "custom": {
      "regex": "^(I[^a-z]|.*Interface$)",
      "match": false
    }
  },

  // ──────────────────────────────────────────────────────────────
  // 3. Specific suffixes we DO want (DTO, Service, Controller, etc.)
  // ──────────────────────────────────────────────────────────────
  {
    "selector": "class",
    "suffix": ["Dto"],
    "format": ["PascalCase"],
    "custom": {
      "regex": "Dto$",
      "match": true
    }
  },
  {
    "selector": "class",
    "suffix": [
      "Service",
      "Controller",
      "Repository",
      "Mapper",
      "Guard",
      "Interceptor",
      "Filter",
      "Provider"
    ],
    "format": ["PascalCase"]
  },

  // ──────────────────────────────────────────────────────────────
  // 4. Variables & functions → camelCase (const allowed UPPER too)
  // ──────────────────────────────────────────────────────────────
  {
    "selector": ["variable", "function", "parameter"],
    "format": ["camelCase", "PascalCase"], // PascalCase allowed for React components, etc.
    "leadingUnderscore": "allow"
  },

  // Allow UPPER_CASE only for const variables (classic constants)
  {
    "selector": "variable",
    "modifiers": ["const"],
    "format": ["camelCase", "UPPER_CASE"],
    "leadingUnderscore": "allow"
  },

  // Exported const variables (config objects, etc.) → usually camelCase
  {
    "selector": "variable",
    "modifiers": ["const", "exported"],
    "format": ["camelCase", "UPPER_CASE"]
  },

  // ──────────────────────────────────────────────────────────────
  // 5. Enum members → PascalCase (UserRole.Admin)
  // ──────────────────────────────────────────────────────────────
  {
    "selector": "enumMember",
    "format": ["PascalCase"]
  },

  // ──────────────────────────────────────────────────────────────
  // 6. Properties & methods → camelCase
  // ──────────────────────────────────────────────────────────────
  {
    "selector": [
      "objectLiteralProperty",
      "classProperty",
      "classMethod",
      "objectLiteralMethod",
      "parameterProperty"
    ],
    "format": ["camelCase", "UPPER_CASE"],
    "leadingUnderscore": "allow"
  },

  // ──────────────────────────────────────────────────────────────
  // 7. Optional: Allow _id style private fields (common in Prisma entities)
  // ──────────────────────────────────────────────────────────────
  {
    "selector": "classProperty",
    "modifiers": ["private"],
    "format": ["camelCase"],
    "leadingUnderscore": "require"
  }
]
```

---

# Payments Architecture

# CodeZest Payments Service Architecture

## 1. Overview

The `codezest-payments` service is the centralized financial engine of the CodeZest platform. It is responsible for all monetary transactions, subscription lifecycle management, and coupon/discount logic.

> **Decision**: There is NO separate `subscriptions` repository. All subscription logic is encapsulated within this service to ensure strong consistency between payments and access rights.

---

## 2. Core Responsibilities

1.  **Payment Processing**: Securely handling charges via Stripe (and potentially PayPal).
2.  **Subscription Management**: Creating, updating, canceling, and renewing user subscriptions.
3.  **Coupon & Discount Logic**: Validating and applying promo codes.
4.  **Invoicing**: Generating and storing transaction records.
5.  **Webhooks**: Listening to gateway events to update local state.

---

## 3. Architecture Layers (Clean Architecture)

The service follows the standard project structure:

### 3.1 Domain Layer (`src/domain`)

_Pure business logic. No dependencies on frameworks or DB._

- **Entities** (`src/domain/entities`):
  - `Subscription`: Rules for state transitions.
  - `Plan`: Definitions of tiers.
  - `Coupon`: Rules for discount validity.
- **Interfaces** (`src/domain/repositories`):
  - `PaymentGatewayInterface`: Abstract contract for charging cards.
  - `SubscriptionRepositoryInterface`: Abstract contract for saving state.

### 3.2 Application Layer (`src/application`)

_Orchestrates domain objects to perform tasks._

- **Services** (`src/application/services`):
  - `CheckoutService`: Handles `createCheckoutSession`.
  - `WebhookService`: Handles `handlePaymentSuccess`.
  - `SubscriptionService`: Handles `cancelSubscription`.
- **DTOs** (`src/application/dtos`):
  - `CreateCheckoutSessionDto`
  - `WebhookEventDto`

### 3.3 Infrastructure Layer (`src/infrastructure`)

_External tools and implementations._

- **Database** (`src/infrastructure/database`): `PrismaService` singleton.
- **Repositories** (`src/infrastructure/repositories`): Concrete `SubscriptionRepository` implementing `SubscriptionRepositoryInterface`.
- **External** (`src/infrastructure/external`): `StripePaymentGateway` implementing `PaymentGatewayInterface`.

### 3.4 Presentation Layer (`src/presentation`)

_Entry points._

- **Controllers** (`src/presentation/controllers`): `PaymentController`, `WebhookController`.
- **Routes** (`src/presentation/routes`): Define endpoints like `POST /checkout/session`.

---

## 4. Data Model (Prisma)

This schema lives in `codezest-db` but is primarily managed by this service.

```prisma
// Managed by codezest-payments

model Subscription {
  id              String   @id @default(uuid())
  userId          String   @unique

  plan            SubscriptionPlan @default(FREE) // ENUM: FREE, PRO, TEAM
  status          SubscriptionStatus // ENUM: ACTIVE, CANCELED, PAST_DUE

  // Billing Cycle
  currentPeriodStart DateTime
  currentPeriodEnd   DateTime

  // Stripe Mapping
  stripeCustomerId     String? @unique
  stripeSubscriptionId String? @unique

  createdAt       DateTime @default(now())
  updatedAt       DateTime @updatedAt
}

model Coupon {
  id              String   @id @default(uuid())
  code            String   @unique // "SAVE20"
  stripeCouponId  String   // "co_123"

  discountType    DiscountType // PERCENTAGE, FIXED
  value           Int      // 20 or 1000 ($10)

  isActive        Boolean  @default(true)
  maxRedemptions  Int?
  redemptionCount Int      @default(0)
}

model CouponRedemption {
  id        String   @id @default(uuid())
  userId    String
  couponId  String
  coupon    Coupon   @relation(fields: [couponId], references: [id])
  timestamp DateTime @default(now())
}
```

---

## 5. Key Workflows

### 5.1 Purchasing a Subscription (with Coupon)

1.  **Client**: User selects "Pro Plan" and enters code "LEARN2025".
2.  **API**: `POST /checkout/session`
    - Service validates coupon "LEARN2025".
    - Service calls `Stripe.checkout.sessions.create` with:
      - `customer`: `stripeCustomerId`
      - `line_items`: Pro Plan Price
      - `discounts`: `[{ coupon: stripeCouponId }]`
3.  **Response**: Return `sessionId` to client.
4.  **Client**: Redirects to Stripe Hosted Checkout.

### 5.2 Handling Success (Webhook)

1.  **Stripe**: Sends `checkout.session.completed` webhook.
2.  **Service**:
    - Verifies webhook signature.
    - Extracts `userId` (from metadata) and `subscriptionId`.
    - **Transaction**:
      - Updates `Subscription` status to `ACTIVE`.
      - Records `CouponRedemption` (if coupon was used).
      - Creates `Transaction` record (invoice).
    - Publishes `PaymentSucceeded` event.

### 5.3 Subscription Renewal

1.  **Stripe**: Automatically charges card at end of period.
2.  **Stripe**: Sends `invoice.payment_succeeded`.
3.  **Service**:
    - Updates `Subscription.currentPeriodEnd`.
    - Creates new `Transaction` record.

---

## 6. Coupon Management Strategy

### 6.1 "Stripe-First" Logic

We mirror Stripe's coupon system to avoid calculation errors.

- **Creation**: Admin creates coupon in Stripe Dashboard -> Webhook syncs to our DB.
- **Validation**:
  - **Fast**: Check local DB for existence and `isActive`.
  - **Deep**: Check `redemptionCount` vs `maxRedemptions`.
- **Application**: We pass the _Stripe Coupon ID_ to the checkout session, letting Stripe handle the final math.

### 6.2 Anti-Abuse

- **One-per-user**: Check `CouponRedemption` table before allowing a code.
- **First-time only**: Check if user has _ever_ had a paid subscription before applying "New User" coupons.

---

## 7. Integration Events

**Published Events:**

- `Payment.Succeeded` -> `auth` (Update Role), `notifications` (Send Receipt).
- `Payment.Failed` -> `notifications` (Send "Update Card" email).
- `Subscription.Canceled` -> `auth` (Downgrade Role at period end).

**Consumed Events:**

- `User.Created` -> Create Stripe Customer ID (optional, can be done lazily at checkout).

---

# Subscription and Coupon Design

# Subscription & Coupon System Design

## 1. EdTech Subscription Strategy

For an EdTech platform like CodeZest, the subscription model should balance accessibility (to grow the user base) with monetization (to sustain the business).

### 1.1 Recommended Tiers

| Tier              | Target Audience     | Features                                                                                                                                   | Pricing Model                             |
| ----------------- | ------------------- | ------------------------------------------------------------------------------------------------------------------------------------------ | ----------------------------------------- |
| **Free / Basic**  | Students exploring  | - Access to "Basics" modules<br>- Limited daily quizzes<br>- Community support                                                             | **$0 / month**                            |
| **Pro / Learner** | Serious students    | - **Unlimited** access to all modules<br>- **Certificates** of completion<br>- **AI Code Analysis** (Costly feature)<br>- Priority support | **$15/mo** or **$150/yr** (2 months free) |
| **Team / Class**  | Schools & Bootcamps | - Bulk seat management<br>- Instructor dashboard<br>- Progress reporting                                                                   | **Per Seat** (e.g., $10/student/mo)       |

### 1.2 "Seat" vs "Site" Licensing

For the **Team** plan, use a **Seat-based** model.

- An admin buys X seats.
- They generate "Invite Links" or upload CSV emails.
- This logic lives in `codezest-payments` (billing) and `codezest-auth` (access control).

---

## 2. Coupon System Architecture

A robust coupon system drives marketing campaigns (e.g., "Back to School Sale", "Black Friday").

### 2.1 Best Practice: "Stripe-First" Logic

Instead of building a custom coupon engine that calculates math (which is error-prone), **mirror Stripe's Coupon & Promotion Code system**.

1.  **Create Coupon in Stripe**: Define logic (ID: `BLACKFRIDAY50`, 50% off, Duration: Once).
2.  **Sync to DB (Optional)**: You can cache valid codes in your DB for faster validation UI, OR just validate directly against Stripe API when the user types it.
3.  **Apply at Checkout**: Pass the `promotion_code` ID to the Stripe Checkout Session.

### 2.2 Coupon Types & Use Cases

| Coupon Type         | Use Case               | Configuration                                                              |
| ------------------- | ---------------------- | -------------------------------------------------------------------------- |
| **Launch Discount** | Early adopters         | **Type**: Percentage (50% off)<br>**Duration**: Forever (Grandfathering)   |
| **Seasonal Sale**   | Black Friday           | **Type**: Percentage (30% off)<br>**Duration**: First 3 months (Recurring) |
| **Referral Bonus**  | User invites friend    | **Type**: Fixed Amount ($10 off)<br>**Duration**: Once                     |
| **B2B Custom Deal** | University partnership | **Type**: 100% off (Free access)<br>**Duration**: 1 Year                   |

### 2.3 Coupon Data Model (Prisma)

Even if Stripe handles the math, you need to track _who_ used _what_ for analytics.

```prisma
// In codezest-payments service

model Coupon {
  id              String   @id @default(uuid())
  code            String   @unique // "SAVE20"
  stripeCouponId  String   // "co_123xyz"

  discountType    DiscountType // PERCENTAGE, FIXED
  discountValue   Int      // 20 (for 20%) or 1000 (for $10.00)

  validFrom       DateTime
  validUntil      DateTime?
  maxRedemptions  Int?
  redemptionCount Int      @default(0)

  isActive        Boolean  @default(true)

  redemptions     CouponRedemption[]
}

model CouponRedemption {
  id        String   @id @default(uuid())
  userId    String
  couponId  String
  coupon    Coupon   @relation(fields: [couponId], references: [id])

  redeemedAt DateTime @default(now())

  // Link to the transaction where it was used
  transactionId String
}
```

---

## 3. Implementation Workflow

### 3.1 Applying a Coupon (Frontend -> Backend)

1.  **User Input**: User types `LEARN2025` in the checkout modal.
2.  **Validation API**: Frontend calls `GET /api/payments/coupons/validate?code=LEARN2025`.
    - Backend checks DB: Is it active? Is `redemptionCount < maxRedemptions`? Has this user already used it (if one-per-user)?
    - _Optimization_: If valid in DB, optionally verify with Stripe API to ensure it's still valid there.
3.  **Response**: Return `{ valid: true, discount: "20% off", newPrice: $12.00 }`.
4.  **Checkout**: User clicks "Pay". Frontend sends `couponId` to `POST /create-checkout-session`.
5.  **Stripe Handoff**: Backend creates Stripe Session with `discounts: [{ coupon: stripeCouponId }]`.

### 3.2 Handling "Double Dipping"

- **Rule**: Prevent users from using a "First Month Free" coupon multiple times by cancelling and resubscribing.
- **Solution**:
  - Track `CouponRedemption` by `userId`.
  - If `coupon.limitPerUser` is 1, reject the validation request if a record exists.

---

## 4. Advanced Features (Phase 2)

### 4.1 Dynamic Coupons (Referrals)

- When User A invites User B, generate a unique code `REF-USERA-123`.
- When User B subscribes with this code, User A gets a credit.
- **Implementation**: Use Stripe "Promotion Codes" API to generate unique codes programmatically.

### 4.2 Geo-Pricing (Parity Purchasing Power)

- Automatically apply a coupon based on IP address.
- Example: Users in India get a 60% off "PPP" coupon automatically applied to the checkout session.
- **Logic**: Middleware in `codezest-payments` detects country -> looks up PPP discount -> applies coupon.

---

# Implementation Plan

# Implementation Plan: CodeZest Microservices Architecture

## Goal Description

Implement a robust, scalable microservices architecture for the CodeZest learning platform, adhering to SOLID principles and Clean Architecture. This plan breaks down the development into logical phases to ensure stability and efficient delivery.

## User Review Required

> [!IMPORTANT] > **Database Strategy**: We are proceeding with a **Shared Schema Library** (`codezest-db`) approach. This simplifies type sharing but requires strict discipline to avoid tight coupling.
> **Communication**: We are using **Redis Pub/Sub** (via `codezest-cache` or a new lib) for event-driven communication initially. RabbitMQ can be introduced later if durability requirements increase.

## Proposed Changes

### Phase 1: Foundation & Shared Infrastructure

Establish the core libraries that all services will depend on.

#### [codezest-db]

- [ ] Finalize Prisma Schema (Auth, Learning, Payments models).
- [ ] Generate and publish TypeScript client.
- [ ] Implement database migration scripts.

#### [codezest-cache]

- [ ] Implement Redis client wrapper.
- [ ] Add Pub/Sub utility classes for event bus.

### Phase 2: Core Identity & Learning Services

Build the essential backend services required for the platform to function.

#### [codezest-auth]

- [ ] Implement Clean Architecture layers (Domain, Data, API).
- [ ] Setup Authentication (JWT/Session).
- [ ] Integrate `codezest-db` and `codezest-cache`.
- [ ] Publish `UserCreated` events.

#### [codezest-api] (Learning Service)

- [ ] Implement Course/Module management APIs.
- [ ] Implement Assignment submission logic.
- [ ] Consume `UserCreated` events to initialize user progress.

### Phase 3: Support Services & Monetization

Add billing, notifications, and analytics.

#### [codezest-payments]

- [ ] Integrate Stripe SDK.
- [ ] Implement Webhook handlers.
- [ ] Publish `PaymentSucceeded` events.

#### [codezest-notifications]

- [ ] Setup Email provider (SendGrid/AWS SES).
- [ ] Listen for `UserCreated`, `PaymentSucceeded` events.

#### [codezest-activity]

- [ ] Implement Activity Feed API.
- [ ] Listen for all domain events to log activity.

### Phase 4: Frontend Integration

Connect the user interfaces to the backend services.

#### [codezest-web]

- [ ] Integrate Auth flows.
- [ ] Connect to Learning APIs.

#### [codezest-admin]

- [ ] Build dashboards for content management and user oversight.

## Verification Plan

### Automated Tests

- **Unit Tests**: Jest for domain logic in each service.
- **Integration Tests**: Supertest for API endpoints, using a test database.
- **Contract Tests**: Ensure services adhere to agreed API schemas.

### Manual Verification

- **End-to-End Flow**:
  1.  Register a new user (Auth).
  2.  Verify "Welcome" email received (Notifications).
  3.  Purchase a subscription (Payments).
  4.  Verify access to Pro content (API).
  5.  Check Activity Feed for "Upgraded to Pro" (Activity).
