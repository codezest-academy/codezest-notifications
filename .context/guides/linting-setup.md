# ESLint & Prettier Setup Guide

This guide documents the linting and formatting setup for CodeZest projects.

## 1. Overview

All CodeZest services use:

- **ESLint**: For code quality and naming convention enforcement
- **Prettier**: For consistent code formatting

## 2. Dependencies

Install these packages in `devDependencies`:

```bash
npm install --save-dev \
  eslint \
  @typescript-eslint/parser \
  @typescript-eslint/eslint-plugin \
  prettier \
  eslint-config-prettier \
  eslint-plugin-prettier
```

## 3. Configuration Files

### 3.1 `.eslintrc.js`

Enforces TypeScript best practices and naming conventions:

```javascript
module.exports = {
  root: true,
  parser: "@typescript-eslint/parser",
  parserOptions: {
    ecmaVersion: 2022,
    sourceType: "module",
    project: "./tsconfig.json",
  },
  plugins: ["@typescript-eslint"],
  extends: [
    "eslint:recommended",
    "plugin:@typescript-eslint/recommended",
    "plugin:@typescript-eslint/recommended-requiring-type-checking",
    "prettier",
  ],
  rules: {
    "@typescript-eslint/naming-convention": [
      "error",
      {
        selector: "interface",
        format: ["PascalCase"],
        custom: { regex: "Interface$", match: true },
      },
      { selector: ["class", "enum", "typeAlias"], format: ["PascalCase"] },
      {
        selector: ["variable", "function"],
        format: ["camelCase"],
        leadingUnderscore: "allow",
      },
      {
        selector: "variable",
        modifiers: ["const"],
        format: ["camelCase", "UPPER_CASE"],
      },
      { selector: "enumMember", format: ["PascalCase"] },
    ],
    "no-console": "warn",
    "prefer-const": "error",
  },
  ignorePatterns: ["dist", "node_modules", "*.config.js"],
};
```

### 3.2 `.prettierrc`

```json
{
  "semi": true,
  "trailingComma": "es5",
  "singleQuote": true,
  "printWidth": 100,
  "tabWidth": 2,
  "useTabs": false,
  "arrowParens": "always",
  "endOfLine": "lf"
}
```

### 3.3 `.prettierignore`

```
dist
node_modules
coverage
*.log
.env
```

## 4. NPM Scripts

Add to `package.json`:

```json
{
  "scripts": {
    "lint": "eslint . --ext .ts",
    "lint:fix": "eslint . --ext .ts --fix",
    "format": "prettier --write \"src/**/*.ts\"",
    "format:check": "prettier --check \"src/**/*.ts\""
  }
}
```

## 5. CI/CD Integration

Add to `.github/workflows/ci-cd.yml` (before build):

```yaml
- name: Lint code
  run: npm run lint

- name: Check formatting
  run: npm run format:check
```

## 6. Usage

### Local Development

```bash
# Check for issues
npm run lint

# Auto-fix issues
npm run lint:fix

# Format code
npm run format
```

### Pre-commit Hook (Optional)

Install Husky for automatic linting:

```bash
npm install --save-dev husky lint-staged
npx husky init
```

Add to `package.json`:

```json
{
  "lint-staged": {
    "*.ts": ["eslint --fix", "prettier --write"]
  }
}
```

## 7. Naming Convention Enforcement

ESLint will automatically enforce:

- ✅ Interfaces end with `Interface`
- ✅ Classes/Enums use `PascalCase`
- ✅ Variables/Functions use `camelCase`
- ✅ Constants use `UPPER_CASE`
- ✅ Enum members use `PascalCase`

## 8. Replication for Other Services

Copy these files to `codezest-auth`, `codezest-api`, `codezest-payments`, etc.:

1. `.eslintrc.js`
2. `.prettierrc`
3. `.prettierignore`
4. Update `package.json` scripts
5. Update CI/CD workflow
