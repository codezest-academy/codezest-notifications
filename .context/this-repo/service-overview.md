# CodeZest Notifications Service

## 📖 Overview
The `codezest-notifications` service is responsible for managing and delivering all system notifications within the CodeZest platform. It ensures reliable delivery of emails, push notifications, and in-app alerts using a robust job queue system.

## 🏗 Architecture
This service follows the **Clean Architecture** pattern and is structured as follows:

- **Domain Layer**: Contains the `Notification` entity and provider interfaces.
- **Application Layer**: Handles business logic (`NotificationService`) and background processing (`NotificationWorker`).
- **Infrastructure Layer**: Implements external adapters (e.g., `EmailProvider`, `BullMQ`).
- **Presentation Layer**: Exposes REST API endpoints (`NotificationController`).

## 🛠 Tech Stack
- **Runtime**: Node.js (TypeScript)
- **Framework**: Express.js
- **Queue**: BullMQ (Redis-based)
- **Logging**: Winston
- **Validation**: Zod (planned)

## 🔌 API Endpoints

### Send Notification
- **URL**: `POST /notifications`
- **Body**:
  ```json
  {
    "userId": "uuid",
    "type": "EMAIL", // EMAIL, PUSH, IN_APP
    "title": "Welcome!",
    "message": "Thanks for joining.",
    "priority": "HIGH" // HIGH, MEDIUM, LOW
  }
  ```

## 📨 Event Processing
The service uses **BullMQ** to handle notifications asynchronously.
1.  **Producer**: `NotificationService` adds jobs to the `notification-queue`.
2.  **Consumer**: `NotificationWorker` processes jobs and delegates to the appropriate provider (e.g., `EmailProvider`).

## 📦 Dependencies
- `@codezest-academy/codezest-db`: Shared database schema (planned integration).
- `@codezest-academy/codezest-cache`: Shared Redis client.

## 🚀 Key Files
- `src/application/services/notification.service.ts`: Core logic for queuing.
- `src/application/workers/notification.worker.ts`: Background worker.
- `src/infrastructure/providers/email.provider.ts`: Email sending logic.
