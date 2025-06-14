# Migration Guide: JavaScript to TypeScript

This guide will help you migrate your existing JavaScript codebase to TypeScript. The migration process is designed to be incremental, allowing you to migrate one file at a time while keeping the application running.

## 🚀 Migration Steps

### 1. Install Required Dependencies

First, install TypeScript and related dependencies:

```bash
npm install --save-dev typescript @types/node @types/express @types/cors @types/multer @types/uuid @types/xlsx tsx vitest @vitest/coverage-v8
```

### 2. Initialize TypeScript

Create a `tsconfig.json` file in your project root:

```bash
npx tsc --init
```

### 3. Update package.json Scripts

Update your `package.json` scripts section:

```json
{
  "scripts": {
    "build": "tsc",
    "start": "node dist/server.js",
    "dev": "tsx watch src/server.ts",
    "test": "vitest run",
    "test:watch": "vitest",
    "test:coverage": "vitest run --coverage",
    "lint": "eslint . --ext .ts",
    "format": "prettier --write \"**/*.{ts,js,json,md}\"",
    "type-check": "tsc --noEmit"
  }
}
```

### 4. Migrate Configuration Files

1. Rename `config/` files from `.js` to `.ts`
2. Add type annotations to configuration objects
3. Update imports/exports to use ES modules

### 5. Migrate Middleware

1. Rename middleware files from `.js` to `.ts`
2. Add TypeScript types to request, response, and next parameters
3. Update error handling to use TypeScript types

### 6. Migrate Routes

1. Rename route files from `.js` to `.ts`
2. Add types for request/response objects
3. Update route handlers with proper types
4. Add input validation types

### 7. Migrate Tests

1. Rename test files from `.test.js` to `.test.ts`
2. Update test imports to use ES modules
3. Add types to test utilities and mocks
4. Update test assertions to work with TypeScript

## 🛠️ Migration Script

We've provided a migration script to help automate parts of this process:

```bash
node scripts/migrate-to-typescript.js
```

This script will:
- Create the new TypeScript project structure
- Move and rename JavaScript files to TypeScript
- Update package.json with TypeScript scripts
- Install required TypeScript dependencies

## 🔄 Incremental Migration

You can migrate your codebase incrementally by:

1. Setting `"allowJs": true` in `tsconfig.json`
2. Migrating one file at a time
3. Using JSDoc comments for type annotations in JavaScript files
4. Gradually enabling stricter TypeScript options

## 🧪 Testing After Migration

After migration, run the test suite to ensure everything works:

```bash
npm test
npm run test:coverage
```

## 🐛 Common Issues and Solutions

### 1. Module Resolution

**Issue**: Cannot find module or type declarations
**Solution**: Install the appropriate `@types` package or create a declaration file

### 2. Type Errors

**Issue**: Type errors after migration
**Solution**:
- Use type assertions when necessary
- Add proper type definitions
- Use `any` as a temporary workaround (but fix later)

### 3. Import/Export Syntax

**Issue**: Issues with ES modules vs CommonJS
**Solution**:
- Use ES module syntax (`import/export`)
- Set `"type": "module"` in package.json
- Update file extensions to `.mjs` or `.cjs` if needed

## 📚 Additional Resources

- [TypeScript Documentation](https://www.typescriptlang.org/docs/)
- [TypeScript Node Starter](https://github.com/microsoft/TypeScript-Node-Starter)
- [TypeScript Express Guide](https://www.typescriptlang.org/docs/handbook/typescript-in-5-minutes.html)

## 🎉 Congratulations!

You've successfully migrated your application to TypeScript! Enjoy the benefits of type safety and better developer tooling.
