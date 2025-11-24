# Schema Update Guide: Role to UserRole Migration

## Overview

This document describes the schema changes applied to the `@codezest-academy/db` package, specifically the migration from the `Role` enum to the `UserRole` enum and the extension of the `UserProfile` model.

## Changes Summary

### 1. Enum Rename: `Role` → `UserRole`

**Before:**

```prisma
enum Role {
  ADMIN
  INSTRUCTOR
  STUDENT
}
```

**After:**

```prisma
enum UserRole {
  USER
  ADMIN
}
```

**Rationale:** Simplified the role system to two core roles:

- `USER` - Regular users (replaces `STUDENT` and `INSTRUCTOR`)
- `ADMIN` - Administrators

### 2. User Model Update

**Before:**

```prisma
model User {
  // ...
  role Role @default(STUDENT)
  // ...
}
```

**After:**

```prisma
model User {
  // ...
  role UserRole @default(USER)
  // ...
}
```

### 3. UserProfile Model Extension

**New Fields Added:**

```prisma
model UserProfile {
  // ... existing fields ...

  // NEW FIELDS
  occupation  String?
  company     String?
  phone       String?
  address     String?
  socials     Json?    // { github: string, linkedin: string, twitter: string, etc. }
}
```

## Database Migration

### Migration File

- **Name:** `20251122202150_apply_schema_changes`
- **Location:** `prisma/migrations/20251122202150_apply_schema_changes/migration.sql`

### What the Migration Does

1. **Creates new enum:**

   ```sql
   CREATE TYPE "UserRole" AS ENUM ('USER', 'ADMIN');
   ```

2. **Updates UserProfile table:**

   ```sql
   ALTER TABLE "auth.user_profiles"
   ADD COLUMN "address" TEXT,
   ADD COLUMN "company" TEXT,
   ADD COLUMN "occupation" TEXT,
   ADD COLUMN "phone" TEXT,
   ADD COLUMN "socials" JSONB;
   ```

3. **Updates User table:**

   ```sql
   ALTER TABLE "auth.users"
   DROP COLUMN "role",
   ADD COLUMN "role" "UserRole" NOT NULL DEFAULT 'USER';
   ```

4. **Removes old enum:**
   ```sql
   DROP TYPE "Role";
   ```

### ⚠️ Breaking Changes

> **WARNING:** This migration drops and recreates the `role` column, which results in **data loss** for existing user roles. All existing users will be assigned the default role of `USER`.

## Code Changes

### Type Guards Updated

**Removed:**

- `isInstructor(user)` - No longer needed
- `isStudent(user)` - No longer needed

**Added:**

- `isUser(user)` - Checks if user has `USER` role

**Kept:**

- `isAdmin(user)` - Checks if user has `ADMIN` role

### Usage Example

```typescript
import { prisma, UserRole, isUser, isAdmin } from "@codezest-academy/db";

// Create a user with the new enum
const user = await prisma.user.create({
  data: {
    email: "user@example.com",
    name: "John Doe",
    role: UserRole.USER,
    profile: {
      create: {
        bio: "Software Developer",
        occupation: "Full Stack Developer",
        company: "Tech Corp",
        phone: "+1234567890",
        socials: {
          github: "johndoe",
          linkedin: "john-doe",
          twitter: "@johndoe",
        },
      },
    },
  },
  include: { profile: true },
});

// Use type guards
if (isAdmin(user)) {
  console.log("User is an admin");
} else if (isUser(user)) {
  console.log("User is a regular user");
}
```

## Package Publishing Journey

### Version History

| Version | Status         | Notes                                     |
| ------- | -------------- | ----------------------------------------- |
| 1.0.0   | Initial        | Original package with `Role` enum         |
| 1.0.1   | ❌ Failed      | Authentication issue + old enum values    |
| 1.0.2   | ❌ Failed      | Fixed auth, but stale dist folder         |
| 1.0.3   | ❌ Failed      | Updated type guards, but still stale dist |
| 1.0.4   | ✅ **SUCCESS** | Clean rebuild with correct enum           |

### Issues Encountered & Solutions

#### Issue 1: Authentication Error (401 Unauthorized)

**Problem:** GitHub Actions workflow couldn't publish to GitHub Packages.

**Root Cause:** `.npmrc` file referenced `${GITHUB_TOKEN}` but workflow set `NODE_AUTH_TOKEN`.

**Solution:** Updated `.npmrc` to use `${NODE_AUTH_TOKEN}`:

```
//npm.pkg.github.com/:_authToken=${NODE_AUTH_TOKEN}
```

#### Issue 2: Published Package Had Old Enum Values

**Problem:** Published packages (v1.0.1-1.0.3) contained old `Role` enum despite schema being updated.

**Root Cause:** The `dist/` folder contained stale compiled JavaScript from before the schema changes. npm packages the `dist/` folder, not the source.

**Solution:** Clean rebuild process:

```bash
rm -rf dist/
npx prisma generate
npm run build
```

## Database Verification

### Verification Commands

Check enum values in database:

```typescript
const { PrismaClient } = require("@prisma/client");
const prisma = new PrismaClient();

// Check UserRole enum values
const result = await prisma.$queryRaw`
  SELECT enumlabel 
  FROM pg_enum 
  WHERE enumtypid = (SELECT oid FROM pg_type WHERE typname = 'UserRole')
`;
console.log(result);
// Output: [{ enumlabel: 'USER' }, { enumlabel: 'ADMIN' }]
```

### Verification Results

✅ **Database is correct:**

- `UserRole` enum exists with `USER` and `ADMIN` values
- Old `Role` enum has been dropped
- No `STUDENT` or `INSTRUCTOR` values exist
- Migration status: **Up to date**

## Installation & Usage

### Installing the Package

```bash
npm install @codezest-academy/db@1.0.4
```

### Running Migrations

If you're setting up a new database:

```bash
npx prisma migrate deploy
```

If you're developing locally:

```bash
npx prisma migrate dev
```

## Best Practices

### 1. Always Use Clean Builds for Publishing

```bash
# Before publishing
rm -rf dist/
npx prisma generate
npm run build
```

### 2. Verify Enum Values Locally

```bash
node -e "const { UserRole } = require('./dist/index.js'); console.log(JSON.stringify(UserRole, null, 2))"
```

### 3. Check Migration Status

```bash
npx prisma migrate status
```

## Rollback Strategy

If you need to rollback this migration:

1. **Create a new migration** that reverses the changes
2. **Update the schema** back to the old `Role` enum
3. **Run migration:** `npx prisma migrate dev`

> **Note:** Rollback will require manual data migration if you have existing users with `USER` role.

## Support

For issues or questions:

- **Repository:** https://github.com/codezest-academy/codezest-db
- **Issues:** https://github.com/codezest-academy/codezest-db/issues

## Changelog

### v1.0.4 (2025-11-23)

- ✅ Renamed `Role` enum to `UserRole` (USER, ADMIN)
- ✅ Updated `User.role` field to use `UserRole` with default `USER`
- ✅ Extended `UserProfile` with `occupation`, `company`, `phone`, `address`, `socials`
- ✅ Updated type guards (`isUser`, `isAdmin`)
- ✅ Fixed package publishing with clean rebuild
- ✅ Database migration applied successfully
