# Updating Dependencies

This guide explains how to update the dependencies for the Excel to Cosmos DB Dashboard application.

## Prerequisites

Before updating dependencies, make sure you have:
1. A backup of your current working code
2. A way to test that the application still works after updates

## Checking Current Status

First, check what updates are available:

```bash
# Check root dependencies
npm outdated

# Check server dependencies
cd server
npm outdated
cd ..
```

Refer to `DEPENDENCY_UPDATE_SUMMARY.md` for a detailed analysis of available updates and potential breaking changes.

## Automated Approach

You can use the provided script to update dependencies:

```bash
# Make the script executable (if not already done)
chmod +x update-deps.sh

# Run the dependency update script
./update-deps.sh
```

This script will:
1. Backup your current package.json files
2. Run `npm update` to update dependencies to their latest patch/minor versions
3. Show you which dependencies have major updates available

## Manual Approach

### 1. Update to latest patch/minor versions

```bash
# Update root dependencies
npm update

# Update server dependencies
cd server
npm update
```

### 2. Fix security vulnerabilities

```bash
# Fix vulnerabilities that can be addressed without breaking changes
npm audit fix

# Check for remaining vulnerabilities
npm audit
```

### 3. Consider major version updates

For major updates, refer to the update summary and proceed carefully:

```bash
# Example: Update a specific dependency to the latest version
npm install dependency-name@latest

# Example: Update a specific dependency to a specific version
npm install dependency-name@4.0.0

# Example: Update a specific dependency in server
cd server
npm install dependency-name@latest
```

## Security Vulnerabilities

The application currently has some security vulnerabilities that should be addressed:

### High Severity
- **xlsx**: Prototype Pollution and ReDoS vulnerabilities with no available fix
  - Consider implementing additional input validation as a mitigation
  - Monitor for security updates or consider alternative libraries

### Moderate Severity
- **esbuild**: Enables any website to send requests to the development server
  - Can be fixed by updating vite to version 6.3.5 (breaking change)
  - Run `npm audit fix --force` to apply this update

## Important Notes

### Azure SDK Dependencies
Be careful when updating Azure SDK dependencies (@azure/*) as major version updates might include breaking changes. Check the Azure SDK release notes before updating.

### Express 5.0
Express 5.0 has significant breaking changes from Express 4.x. Update with caution and thorough testing.

### React 19
React 19 introduces new features and may have breaking changes. Update together with related dependencies.

### TypeScript
The project is using TypeScript 5.2.2. Major TypeScript updates might require code changes. Update with caution.

## After Updating

### 1. Install updated dependencies

```bash
# Install updated root dependencies
npm install

# Install updated server dependencies
cd server
npm install
```

### 2. Test the application

```bash
# Run tests to ensure nothing is broken
npm test

# Or run specific tests
npm run test:client
npm run test:server
```

### 3. Build the application

```bash
# Clean and build
npm run clean
npm run build
```

### 4. Run the application

```bash
# Start the development server
npm run dev

# Or start the production server
npm run start
```

## Dependency Update Best Practices

1. **Update regularly**: Keep dependencies up to date to benefit from security fixes and new features
2. **Test thoroughly**: Always test the application after updating dependencies
3. **Update one at a time**: For major updates, update one dependency at a time to isolate issues
4. **Check release notes**: Review release notes for breaking changes before updating
5. **Use version control**: Commit before updating so you can revert if needed
6. **Prioritize security updates**: Apply security updates as soon as possible
7. **Review DEPENDENCY_UPDATE_SUMMARY.md**: Understand the impact of major updates

## Reverting Changes

If something goes wrong, you can revert to your backup files:

```bash
# Restore package files from backups
cp package.json.backup package.json
cp server/package.json.backup server/package.json

# Reinstall original dependencies
npm install
cd server
npm install
```