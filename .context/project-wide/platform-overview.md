# CodeZest – Phase 1 Implementation Plan
**Coding Learning Platform with Modules, Materials, Assignments & MCQs**

---

## 🎯 Phase 1 Scope Overview

A coding learning platform where users can:

1. ✅ **Register & Login** - User authentication
2. ✅ **Browse Programming Languages** - Python, JavaScript, Java, etc.
3. ✅ **Navigate Modules** - Each language has X modules (e.g., Python Basics, Python OOP, etc.)
4. ✅ **Learn from Materials** - Read/watch learning content for each module
5. ✅ **Complete Assignments** - Coding assignments based on module syllabus
6. ✅ **Take MCQ Quizzes** - Multiple choice questions for assessment
7. ✅ **Track Progress** - See completion status per module and language

---

## 🗄️ Revised Database Schema Design

### Service Ownership Model

| Schema Namespace | Service Owner | Purpose |
|-----------------|---------------|---------|
| `auth.*` | codezest-auth | User accounts, sessions, OAuth, profiles |
| `learning.*` | codezest-api | Languages, modules, materials, assignments, MCQs, analysis |
| `payments.*` | codezest-payments | Subscriptions, transactions, invoices, payment methods |
| `notifications.*` | codezest-notifications | Notifications, email logs |
| `activity.*` | codezest-activity | Activity feeds, analytics |

---

## 📊 Complete Data Model

### 1️⃣ Auth Service Models (`auth.*`)

| Model | Description | Key Fields |
|-------|-------------|------------|
| `User` | User accounts | email, password, name, role |
| `UserProfile` | Extended user info | userId, bio, avatar, location, website, socialLinks, preferences |
| `Session` | Active sessions | token, expiresAt, userId |
| `OAuthAccount` | OAuth providers | provider (GOOGLE/GITHUB), providerId |
| `PasswordReset` | Password reset | token, expiresAt, used |
| `EmailVerification` | Email verification | token, verified |

---

### 2️⃣ Learning Service Models (`learning.*`)

#### Core Learning Structure

```
ProgrammingLanguage (Python, JavaScript, Java)
    └── Module (Python Basics, Python OOP, Python Advanced)
            └── Material (Videos, Articles, Code Examples)
            └── Assignment (Coding exercises)
            └── MCQQuiz (Multiple choice tests)
```

| Model | Description | Key Fields |
|-------|-------------|------------|
| `ProgrammingLanguage` | Languages (Python, JS, Java) | name, slug, description, icon, difficulty |
| `Module` | Learning modules | title, languageId, order, description, syllabus |
| `Material` | Learning content | moduleId, title, type (VIDEO/ARTICLE/CODE), content, order |
| `Assignment` | Coding assignments | moduleId, title, description, starterCode, testCases |
| `MCQQuiz` | MCQ quizzes | moduleId, title, passingScore, timeLimit |
| `MCQQuestion` | Quiz questions | quizId, question, order |
| `MCQOption` | Answer options | questionId, optionText, isCorrect, order |

#### User Progress & Submissions

| Model | Description | Key Fields |
|-------|-------------|------------|
| `LanguageEnrollment` | User enrolls in language | userId, languageId, enrolledAt, status |
| `ModuleProgress` | Module completion tracking | userId, moduleId, status, completedAt, progressPercent |
| `MaterialProgress` | Material view tracking | userId, materialId, completed, lastViewedAt |
| `AssignmentSubmission` | Assignment submissions | userId, assignmentId, code, status, score, feedback |
| `MCQAttempt` | Quiz attempts | userId, quizId, score, startedAt, completedAt |
| `MCQAnswer` | Individual answers | attemptId, questionId, selectedOptionId, isCorrect |

#### Analysis & Feedback (AI or Manual)

| Model | Description | Key Fields |
|-------|-------------|------------|
| `AssignmentAnalysis` | AI/manual analysis of submissions | submissionId, analysisType (AI/MANUAL), strengths, weaknesses, suggestions, score |
| `QuizAnalysis` | AI/manual analysis of quiz attempts | attemptId, analysisType, performanceBreakdown, recommendations, insights |


---

### 3️⃣ Payment Service Models (`payments.*`)

| Model | Description | Key Fields |
|-------|-------------|------------|
| `Subscription` | User subscriptions | userId, plan (FREE/PRO/ENTERPRISE), status, validUntil, stripeSubscriptionId |
| `Transaction` | Payment transactions | userId, subscriptionId, amount, currency, status, stripePaymentIntentId |
| `Invoice` | Generated invoices | subscriptionId, amount, status, paidAt, invoiceUrl |
| `PaymentMethod` | Saved payment methods | userId, type (CARD/PAYPAL), stripePaymentMethodId, isDefault, last4 |

---

### 4️⃣ Notification Service Models (`notifications.*`)

| Model | Description | Key Fields |
|-------|-------------|------------|
| `Notification` | User notifications | userId, type, title, message, priority, read |
| `NotificationPreference` | User preferences | userId, email, push, sms (enabled/disabled) |
| `EmailLog` | Email audit trail | to, subject, status, sentAt |

---

### 5️⃣ Activity Service Models (`activity.*`)

| Model | Description | Key Fields |
|-------|-------------|------------|
| `UserActivity` | Activity feed events | userId, type, description, metadata (JSONB) |
| `AnalyticsEvent` | Custom analytics | eventName, userId, properties (JSONB) |

---

## 🔗 Key Relationships

### Hierarchical Structure

```
User
  └── LanguageEnrollment (enrolls in Python)
        └── ProgrammingLanguage (Python)
              └── Module (Python Basics, Python OOP, etc.)
                    ├── Material (learning content)
                    ├── Assignment (coding exercises)
                    └── MCQQuiz (quizzes)

User Progress Tracking:
  ├── ModuleProgress (tracks each module)
  ├── MaterialProgress (tracks each material)
  ├── AssignmentSubmission (coding submissions)
  └── MCQAttempt (quiz attempts)
```

### Relationships Summary

**One-to-Many:**
- `ProgrammingLanguage` (1) → (N) `Module`
- `Module` (1) → (N) `Material`
- `Module` (1) → (N) `Assignment`
- `Module` (1) → (N) `MCQQuiz`
- `MCQQuiz` (1) → (N) `MCQQuestion`
- `MCQQuestion` (1) → (N) `MCQOption`
- `User` (1) → (N) `LanguageEnrollment`
- `User` (1) → (N) `ModuleProgress`
- `User` (1) → (N) `AssignmentSubmission`
- `User` (1) → (N) `MCQAttempt`

---

## 📝 Example Schema Snippets

### Programming Language & Modules

```prisma
model ProgrammingLanguage {
  id          String   @id @default(uuid())
  name        String   @unique // "Python", "JavaScript", "Java"
  slug        String   @unique // "python", "javascript", "java"
  description String?
  icon        String?  // URL or emoji
  difficulty  Difficulty @default(BEGINNER)
  isActive    Boolean  @default(true)
  
  modules     Module[]
  enrollments LanguageEnrollment[]
  
  createdAt   DateTime @default(now())
  updatedAt   DateTime @updatedAt
  
  @@map("learning.programming_languages")
}

model Module {
  id          String   @id @default(uuid())
  languageId  String
  language    ProgrammingLanguage @relation(fields: [languageId], references: [id])
  
  title       String   // "Python Basics", "Python OOP"
  slug        String   // "python-basics"
  description String?
  syllabus    String?  // JSON or text describing what's covered
  order       Int      // Display order
  
  materials   Material[]
  assignments Assignment[]
  mcqQuizzes  MCQQuiz[]
  progress    ModuleProgress[]
  
  createdAt   DateTime @default(now())
  updatedAt   DateTime @updatedAt
  
  @@unique([languageId, slug])
  @@map("learning.modules")
}
```

### Learning Materials

```prisma
model Material {
  id          String   @id @default(uuid())
  moduleId    String
  module      Module   @relation(fields: [moduleId], references: [id])
  
  title       String
  type        MaterialType // VIDEO, ARTICLE, CODE_EXAMPLE, INTERACTIVE
  content     String   // URL for video, markdown for article, code for examples
  duration    Int?     // minutes for video
  order       Int
  
  progress    MaterialProgress[]
  
  createdAt   DateTime @default(now())
  updatedAt   DateTime @updatedAt
  
  @@map("learning.materials")
}

enum MaterialType {
  VIDEO
  ARTICLE
  CODE_EXAMPLE
  INTERACTIVE
}
```

### Assignments

```prisma
model Assignment {
  id          String   @id @default(uuid())
  moduleId    String
  module      Module   @relation(fields: [moduleId], references: [id])
  
  title       String
  description String
  difficulty  Difficulty
  
  starterCode String?  // Initial code template
  testCases   String   // JSON array of test cases
  hints       String?  // JSON array of hints
  
  maxScore    Int      @default(100)
  timeLimit   Int?     // minutes
  
  submissions AssignmentSubmission[]
  
  createdAt   DateTime @default(now())
  updatedAt   DateTime @updatedAt
  
  @@map("learning.assignments")
}

model AssignmentSubmission {
  id           String   @id @default(uuid())
  userId       String
  assignmentId String
  assignment   Assignment @relation(fields: [assignmentId], references: [id])
  
  code         String   // User's submitted code
  language     String   // "python", "javascript"
  status       SubmissionStatus @default(PENDING)
  score        Int?
  feedback     String?  // Auto-generated or instructor feedback
  
  submittedAt  DateTime @default(now())
  gradedAt     DateTime?
  
  @@map("learning.assignment_submissions")
}

enum SubmissionStatus {
  PENDING
  RUNNING
  PASSED
  FAILED
  ERROR
}
```

### MCQ Quizzes

```prisma
model MCQQuiz {
  id           String   @id @default(uuid())
  moduleId     String
  module       Module   @relation(fields: [moduleId], references: [id])
  
  title        String
  description  String?
  passingScore Int      @default(70)
  timeLimit    Int?     // minutes
  
  questions    MCQQuestion[]
  attempts     MCQAttempt[]
  
  createdAt    DateTime @default(now())
  updatedAt    DateTime @updatedAt
  
  @@map("learning.mcq_quizzes")
}

model MCQQuestion {
  id          String   @id @default(uuid())
  quizId      String
  quiz        MCQQuiz  @relation(fields: [quizId], references: [id])
  
  question    String
  explanation String?  // Shown after answering
  order       Int
  points      Int      @default(1)
  
  options     MCQOption[]
  answers     MCQAnswer[]
  
  createdAt   DateTime @default(now())
  updatedAt   DateTime @updatedAt
  
  @@map("learning.mcq_questions")
}

model MCQOption {
  id         String   @id @default(uuid())
  questionId String
  question   MCQQuestion @relation(fields: [questionId], references: [id])
  
  optionText String
  isCorrect  Boolean
  order      Int
  
  selectedBy MCQAnswer[]
  
  @@map("learning.mcq_options")
}
```

### Progress Tracking

```prisma
model LanguageEnrollment {
  id         String   @id @default(uuid())
  userId     String
  languageId String
  language   ProgrammingLanguage @relation(fields: [languageId], references: [id])
  
  status     EnrollmentStatus @default(ACTIVE)
  enrolledAt DateTime @default(now())
  completedAt DateTime?
  
  @@unique([userId, languageId])
  @@map("learning.language_enrollments")
}

model ModuleProgress {
  id              String   @id @default(uuid())
  userId          String
  moduleId        String
  module          Module   @relation(fields: [moduleId], references: [id])
  
  status          ProgressStatus @default(NOT_STARTED)
  progressPercent Int      @default(0) // 0-100
  
  startedAt       DateTime?
  completedAt     DateTime?
  lastAccessedAt  DateTime @default(now())
  
  @@unique([userId, moduleId])
  @@map("learning.module_progress")
}

model MaterialProgress {
  id         String   @id @default(uuid())
  userId     String
  materialId String
  material   Material @relation(fields: [materialId], references: [id])
  
  completed  Boolean  @default(false)
  viewCount  Int      @default(0)
  
  lastViewedAt DateTime @default(now())
  completedAt  DateTime?
  
  @@unique([userId, materialId])
  @@map("learning.material_progress")
}

enum ProgressStatus {
  NOT_STARTED
  IN_PROGRESS
  COMPLETED
}

enum EnrollmentStatus {
  ACTIVE
  PAUSED
  COMPLETED
  DROPPED
}
```

### User Profile & Subscription

```prisma
model UserProfile {
  id          String   @id @default(uuid())
  userId      String   @unique
  
  bio         String?
  avatar      String?  // URL to profile picture
  location    String?
  website     String?
  
  // Social links
  githubUrl   String?
  linkedinUrl String?
  twitterUrl  String?
  
  // Preferences (stored as JSONB)
  preferences Json?    // { theme: "dark", language: "en", notifications: {...} }
  
  createdAt   DateTime @default(now())
  updatedAt   DateTime @updatedAt
  
  @@map("auth.user_profiles")
}

model Subscription {
  id              String   @id @default(uuid())
  userId          String   @unique
  
  plan            SubscriptionPlan @default(FREE)
  status          SubscriptionStatus @default(ACTIVE)
  
  // Billing
  stripeCustomerId     String?  @unique
  stripeSubscriptionId String?  @unique
  
  // Validity
  startedAt       DateTime @default(now())
  validUntil      DateTime?  // null for FREE plan = lifetime access
  canceledAt      DateTime?
  
  // Metadata
  metadata        Json?    // Store additional subscription data
  
  createdAt       DateTime @default(now())
  updatedAt       DateTime @updatedAt
  
  @@map("auth.subscriptions")
}

enum SubscriptionPlan {
  FREE           // Phase 1: All users get free access
  PRO            // Future: Premium features
  ENTERPRISE     // Future: Team/organization plans
}

enum SubscriptionStatus {
  ACTIVE
  CANCELED
  EXPIRED
  PAUSED
}
```

---

### Payment Service Models

```prisma
model Subscription {
  id              String   @id @default(uuid())
  userId          String   @unique
  
  plan            SubscriptionPlan @default(FREE)
  status          SubscriptionStatus @default(ACTIVE)
  
  // Stripe integration
  stripeCustomerId     String?  @unique
  stripeSubscriptionId String?  @unique
  
  // Validity
  startedAt       DateTime @default(now())
  validUntil      DateTime?  // null for FREE plan = lifetime access
  canceledAt      DateTime?
  
  // Relationships
  transactions    Transaction[]
  invoices        Invoice[]
  
  // Metadata
  metadata        Json?
  
  createdAt       DateTime @default(now())
  updatedAt       DateTime @updatedAt
  
  @@map("payments.subscriptions")
}

model Transaction {
  id              String   @id @default(uuid())
  userId          String
  subscriptionId  String?
  subscription    Subscription? @relation(fields: [subscriptionId], references: [id])
  
  amount          Int      // Amount in cents (e.g., 999 = $9.99)
  currency        String   @default("usd")
  
  status          TransactionStatus @default(PENDING)
  
  // Stripe integration
  stripePaymentIntentId String? @unique
  stripeChargeId        String? @unique
  
  // Payment details
  paymentMethod   String?  // "card", "paypal", etc.
  description     String?
  
  // Timestamps
  createdAt       DateTime @default(now())
  paidAt          DateTime?
  failedAt        DateTime?
  
  @@map("payments.transactions")
}

model Invoice {
  id              String   @id @default(uuid())
  subscriptionId  String
  subscription    Subscription @relation(fields: [subscriptionId], references: [id])
  
  invoiceNumber   String   @unique  // INV-2025-001
  
  amount          Int      // Amount in cents
  currency        String   @default("usd")
  tax             Int?     // Tax amount in cents
  total           Int      // Total amount including tax
  
  status          InvoiceStatus @default(DRAFT)
  
  // Stripe
  stripeInvoiceId String?  @unique
  invoiceUrl      String?  // PDF URL
  
  // Dates
  issuedAt        DateTime @default(now())
  dueAt           DateTime?
  paidAt          DateTime?
  
  @@map("payments.invoices")
}

model PaymentMethod {
  id              String   @id @default(uuid())
  userId          String
  
  type            PaymentMethodType
  
  // Stripe
  stripePaymentMethodId String? @unique
  
  // Card details (last 4 digits, brand)
  last4           String?
  brand           String?  // "visa", "mastercard", etc.
  expiryMonth     Int?
  expiryYear      Int?
  
  // PayPal
  paypalEmail     String?
  
  isDefault       Boolean  @default(false)
  
  createdAt       DateTime @default(now())
  updatedAt       DateTime @updatedAt
  
  @@map("payments.payment_methods")
}

enum SubscriptionPlan {
  FREE
  PRO
  ENTERPRISE
}

enum SubscriptionStatus {
  ACTIVE
  CANCELED
  EXPIRED
  PAUSED
}

enum TransactionStatus {
  PENDING
  PROCESSING
  SUCCEEDED
  FAILED
  REFUNDED
}

enum InvoiceStatus {
  DRAFT
  SENT
  PAID
  OVERDUE
  CANCELED
}

enum PaymentMethodType {
  CARD
  PAYPAL
  BANK_TRANSFER
}
```

---

### Analysis & Feedback Models

```prisma
model AssignmentAnalysis {
  id              String   @id @default(uuid())
  submissionId    String   @unique
  
  analysisType    AnalysisType @default(AI)
  
  // AI or Manual analysis
  overallScore    Int?     // 0-100
  
  // Detailed feedback
  strengths       String[] // Array of strengths
  weaknesses      String[] // Array of weaknesses
  suggestions     String[] // Improvement suggestions
  
  // Code quality metrics
  codeQuality     Json?    // { readability: 8, efficiency: 7, bestPractices: 9 }
  
  // Detailed breakdown
  detailedFeedback String? // Long-form feedback
  
  // AI metadata
  aiModel         String?  // "gpt-4", "claude-3", etc.
  aiPrompt        String?  // Prompt used for AI analysis
  
  // Manual analysis
  analyzedBy      String?  // userId of instructor (if manual)
  
  createdAt       DateTime @default(now())
  updatedAt       DateTime @updatedAt
  
  @@map("learning.assignment_analyses")
}

model QuizAnalysis {
  id              String   @id @default(uuid())
  attemptId       String   @unique
  
  analysisType    AnalysisType @default(AI)
  
  // Performance breakdown
  performanceBreakdown Json  // { "Python Basics": 80, "Functions": 90, "Loops": 70 }
  
  // Strengths and weaknesses
  strongTopics    String[] // Topics user excels at
  weakTopics      String[] // Topics needing improvement
  
  // Recommendations
  recommendations String[] // Personalized study recommendations
  
  // Insights
  insights        String?  // AI-generated insights
  
  // Time analysis
  avgTimePerQuestion Int?  // Average seconds per question
  timeManagement     String? // "Good", "Needs improvement", etc.
  
  // AI metadata
  aiModel         String?
  
  // Manual analysis
  analyzedBy      String?  // userId of instructor
  
  createdAt       DateTime @default(now())
  updatedAt       DateTime @updatedAt
  
  @@map("learning.quiz_analyses")
}

enum AnalysisType {
  AI
  MANUAL
  HYBRID  // AI + Manual review
}
```

---

## 🎨 User Journey Example

### 1. User Registers & Logs In
```typescript
// Auth service creates user
const user = await prisma.user.create({
  data: {
    email: "student@example.com",
    password: hashedPassword,
    name: "John Doe"
  }
})
```

### 2. User Enrolls in Python
```typescript
const enrollment = await prisma.languageEnrollment.create({
  data: {
    userId: user.id,
    languageId: pythonLanguageId,
    status: "ACTIVE"
  }
})
```

### 3. User Starts "Python Basics" Module
```typescript
const progress = await prisma.moduleProgress.create({
  data: {
    userId: user.id,
    moduleId: pythonBasicsModuleId,
    status: "IN_PROGRESS",
    progressPercent: 0
  }
})
```

### 4. User Views Learning Material
```typescript
await prisma.materialProgress.upsert({
  where: {
    userId_materialId: {
      userId: user.id,
      materialId: materialId
    }
  },
  update: {
    viewCount: { increment: 1 },
    lastViewedAt: new Date()
  },
  create: {
    userId: user.id,
    materialId: materialId,
    viewCount: 1
  }
})
```

### 5. User Submits Assignment
```typescript
const submission = await prisma.assignmentSubmission.create({
  data: {
    userId: user.id,
    assignmentId: assignmentId,
    code: userCode,
    language: "python",
    status: "PENDING"
  }
})
```

### 6. User Takes MCQ Quiz
```typescript
const attempt = await prisma.mCQAttempt.create({
  data: {
    userId: user.id,
    quizId: quizId,
    startedAt: new Date()
  }
})

// Record answers
await prisma.mCQAnswer.create({
  data: {
    attemptId: attempt.id,
    questionId: questionId,
    selectedOptionId: optionId,
    isCorrect: true
  }
})
```

### 7. Calculate Module Progress
```typescript
// Auto-calculate based on completed materials + assignments + quizzes
const totalItems = materials.length + assignments.length + quizzes.length
const completedItems = completedMaterials + passedAssignments + passedQuizzes
const progressPercent = (completedItems / totalItems) * 100

await prisma.moduleProgress.update({
  where: { userId_moduleId: { userId, moduleId } },
  data: {
    progressPercent,
    status: progressPercent === 100 ? "COMPLETED" : "IN_PROGRESS",
    completedAt: progressPercent === 100 ? new Date() : null
  }
})
```

---

## 📊 Database Models Summary

| Service | Models | Purpose |
|---------|--------|---------|
| **Auth** | 6 models | User accounts, profiles, sessions, OAuth |
| **Learning** | 15 models | Languages, modules, materials, assignments, MCQs, progress, analysis |
| **Payments** | 4 models | Subscriptions, transactions, invoices, payment methods |
| **Notifications** | 3 models | Notifications, preferences, email logs |
| **Activity** | 2 models | Activity feeds, analytics |
| **Total** | **30 models** | Complete Phase 1 + future-ready platform |

---

## ✅ Phase 1 Features Covered

| Feature | Database Support |
|---------|------------------|
| ✅ User Registration/Login | `User`, `Session`, `OAuthAccount` |
| ✅ User Profiles | `UserProfile` with bio, avatar, social links, preferences |
| ✅ Subscriptions & Payments | `Subscription`, `Transaction`, `Invoice`, `PaymentMethod` (Phase 1: all FREE) |
| ✅ Programming Languages | `ProgrammingLanguage` |
| ✅ Modules per Language | `Module` with `languageId` |
| ✅ Learning Materials | `Material` with type (VIDEO/ARTICLE/CODE) |
| ✅ Coding Assignments | `Assignment`, `AssignmentSubmission` |
| ✅ MCQ Quizzes | `MCQQuiz`, `MCQQuestion`, `MCQOption`, `MCQAttempt` |
| ✅ Progress Tracking | `LanguageEnrollment`, `ModuleProgress`, `MaterialProgress` |
| ✅ AI/Manual Analysis | `AssignmentAnalysis`, `QuizAnalysis` with detailed feedback |

---

## 🚀 Sample Data Structure

### Example: Python Language with 3 Modules

```
Programming Language: Python
├── Module 1: Python Basics
│   ├── Material: Introduction to Python (VIDEO)
│   ├── Material: Variables and Data Types (ARTICLE)
│   ├── Material: Code Example - Hello World (CODE_EXAMPLE)
│   ├── Assignment: Write a Calculator Program
│   └── MCQ Quiz: Python Basics Quiz (10 questions)
│
├── Module 2: Python Control Flow
│   ├── Material: If-Else Statements (VIDEO)
│   ├── Material: Loops in Python (ARTICLE)
│   ├── Assignment: FizzBuzz Challenge
│   └── MCQ Quiz: Control Flow Quiz
│
└── Module 3: Python Functions
    ├── Material: Defining Functions (VIDEO)
    ├── Material: Lambda Functions (ARTICLE)
    ├── Assignment: Create a Function Library
    └── MCQ Quiz: Functions Quiz
```

---

## 🎯 Key Enums

```prisma
enum Role {
  ADMIN
  INSTRUCTOR
  STUDENT
}

enum Difficulty {
  BEGINNER
  INTERMEDIATE
  ADVANCED
}

enum MaterialType {
  VIDEO
  ARTICLE
  CODE_EXAMPLE
  INTERACTIVE
}

enum SubmissionStatus {
  PENDING
  RUNNING
  PASSED
  FAILED
  ERROR
}

enum ProgressStatus {
  NOT_STARTED
  IN_PROGRESS
  COMPLETED
}

enum EnrollmentStatus {
  ACTIVE
  PAUSED
  COMPLETED
  DROPPED
}

enum SubscriptionPlan {
  FREE
  PRO
  ENTERPRISE
}

enum SubscriptionStatus {
  ACTIVE
  CANCELED
  EXPIRED
  PAUSED
}

enum TransactionStatus {
  PENDING
  PROCESSING
  SUCCEEDED
  FAILED
  REFUNDED
}

enum InvoiceStatus {
  DRAFT
  SENT
  PAID
  OVERDUE
  CANCELED
}

enum PaymentMethodType {
  CARD
  PAYPAL
  BANK_TRANSFER
}

enum AnalysisType {
  AI
  MANUAL
  HYBRID
}
```

---

## 📁 Updated Folder Structure

```
codezest-db/
├── package.json
├── tsconfig.json
├── .gitignore
├── .npmignore
├── .env.example
├── README.md
├── ARCHITECTURE.md
├── PLAN_OVERVIEW.md          # This file
│
├── prisma/
│   ├── schema.prisma         # Complete schema with all models
│   └── migrations/
│
├── src/
│   ├── index.ts              # Exports PrismaClient + types
│   ├── types.ts              # Custom types
│   └── mongo/
│       ├── index.ts          # MongoDB client (optional)
│       └── collections.ts
│
└── dist/                     # Build output
```

---

## 🔍 Review Checklist for Phase 1

- [ ] **User Management**: Registration, login, OAuth support ✅
- [ ] **Programming Languages**: Can add Python, JavaScript, Java, etc. ✅
- [ ] **Modules**: Each language has multiple modules ✅
- [ ] **Learning Materials**: Videos, articles, code examples ✅
- [ ] **Assignments**: Coding exercises with test cases ✅
- [ ] **MCQ Quizzes**: Multiple choice questions with scoring ✅
- [ ] **Progress Tracking**: Track completion per module and language ✅
- [ ] **Enrollment**: Users can enroll in languages ✅
- [ ] **Submissions**: Store and grade assignment submissions ✅
- [ ] **Quiz Attempts**: Track quiz attempts and scores ✅

---

## ❓ Questions Before Implementation

1. **Assignment Grading**: Should assignments be auto-graded (run code against test cases) or manually graded by instructors?
   - Current design supports both

2. **Material Content Storage**: Should we store video URLs or actual content?
   - Current design uses `content` field (flexible for URLs or markdown)

3. **Multiple Attempts**: Can users retake assignments/quizzes?
   - Current design allows multiple submissions/attempts

4. **Instructor Role**: Do you need instructors to create content in Phase 1?
   - Current design has `INSTRUCTOR` role ready

5. **Certificates**: Should we add certificate generation on module/language completion?
   - Not in current design, can add if needed

---

## 🚀 Ready to Implement?

This schema covers **100% of your Phase 1 requirements**:
- ✅ User registration & login
- ✅ Programming languages with modules
- ✅ Learning materials
- ✅ Assignments (coding exercises)
- ✅ MCQ quizzes
- ✅ Progress tracking

**Approve to proceed with implementation!** 🎉
