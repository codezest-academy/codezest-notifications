# 📦 Consuming @codezest-academy/db

This guide explains how to use the private `@codezest-academy/db` package in other microservices (e.g., `codezest-auth`, `codezest-api`).

## 1. 🔍 Locate the Package

1.  Go to the repository: **[codezest-academy/codezest-db](https://github.com/codezest-academy/codezest-db)**
2.  On the right sidebar, look for the **Packages** section.
3.  Click on **@codezest-academy/db** to view versions and installation details.

---

## 2. 🛠️ Configure Your Service

To install this private package, you must configure npm to look at the GitHub Packages registry.

### Step A: Create `.npmrc`

In the **root directory** of your consuming service (e.g., `codezest-auth/`), create a file named `.npmrc`:

```ini
@codezest-academy:registry=https://npm.pkg.github.com
//npm.pkg.github.com/:_authToken=${GITHUB_TOKEN}
```

### Step B: Set Environment Variable

You need a **Personal Access Token (PAT)** with `read:packages` scope.

**Local Development:**
Export the token in your terminal before installing:

```bash
export GITHUB_TOKEN=ghp_your_personal_access_token
```

_(Tip: Add this to your shell profile `~/.zshrc` or `~/.bashrc` to persist it)_

**CI/CD (GitHub Actions):**
Add `GITHUB_TOKEN` to your workflow's environment variables (GitHub provides this automatically):

```yaml
- name: Install dependencies
  run: npm ci
  env:
    GITHUB_TOKEN: ${{ secrets.GITHUB_TOKEN }}
```

---

## 3. 📥 Install the Package

Once configured, install the package just like any other dependency:

```bash
npm install @codezest-academy/db@latest
```

---

## 4. 💻 Usage in Code

Import the shared `prisma` client and types directly:

```typescript
import { prisma, User, Role } from "@codezest-academy/db";

async function getUser(email: string) {
  const user = await prisma.user.findUnique({
    where: { email },
    include: { profile: true },
  });
  return user;
}
```

---

## 5. 🗄️ Database Migrations

Your consuming service needs the database tables to exist. You should run the migrations **from the package** during deployment.

### Local Development

```bash
npx prisma migrate deploy --schema=node_modules/@codezest-academy/db/prisma/schema.prisma
```

### Production (Dockerfile)

Add this step to your startup script or Dockerfile:

```dockerfile
# Run migrations before starting the app
CMD npx prisma migrate deploy --schema=node_modules/@codezest-academy/db/prisma/schema.prisma && node dist/index.js
```
