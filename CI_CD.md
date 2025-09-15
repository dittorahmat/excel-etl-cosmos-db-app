# Continuous Integration and Deployment

This document describes the CI/CD workflows for the Excel ETL Cosmos DB application.

## Workflows

### 1. CI/CD Pipeline (`ci.yml`)

This is the main workflow that runs on every push and pull request to the main branch. It includes:

1. **Code Quality Checks**:
   - Linting with ESLint
   - Type checking with TypeScript

2. **Testing**:
   - Unit and integration tests
   - Client tests
   - Server tests
   - Contract tests
   - End-to-end tests
   - Coverage reporting

3. **Building**:
   - Client build
   - Server build

4. **Deployment**:
   - Deployment to staging environment (only on main branch)

### 2. Performance Testing (`performance.yml`)

Runs scheduled performance tests to ensure the application maintains good performance:

- Runs every Sunday at 2 AM UTC
- Can be triggered manually
- Uses Artillery or other performance testing tools
- Generates performance reports

### 3. Security Scan (`security.yml`)

Runs security scans to identify vulnerabilities:

- Runs on every push and pull request to main
- Runs daily scheduled scans
- Can be triggered manually
- Uses npm audit and Snyk for security scanning

### 4. Dependency Updates (`dependency-update.yml`)

Automatically updates project dependencies:

- Runs every Monday at 6 AM UTC
- Can be triggered manually
- Creates pull requests for dependency updates

## Scheduled Workflows

The following workflows run on a schedule:

1. **Performance Testing**: Every Sunday at 2 AM UTC
2. **Security Scanning**: Every day at midnight
3. **Dependency Updates**: Every Monday at 6 AM UTC
4. **Mutation Testing**: Part of CI workflow when triggered manually

## Manual Workflows

All workflows can be triggered manually through the GitHub Actions interface.

## Environment Variables

The workflows require the following secrets to be configured in the GitHub repository:

- `AZURE_STATIC_WEB_APPS_API_TOKEN_GRAY_FLOWER_09B086C00`: Azure Static Web Apps API token
- `VITE_AZURE_CLIENT_ID`: Azure AD client ID
- `VITE_AZURE_TENANT_ID`: Azure AD tenant ID
- `VITE_AZURE_REDIRECT_URI`: Azure AD redirect URI
- `VITE_API_BASE_URL`: API base URL
- `VITE_API_SCOPE`: API scope
- `SNYK_TOKEN`: Snyk token for security scanning (optional)

## Artifacts

Workflows generate and upload the following artifacts:

1. **Coverage Reports**: Test coverage reports from unit and integration tests
2. **Mutation Reports**: Mutation testing reports
3. **Build Artifacts**: Compiled client and server code
4. **Performance Reports**: Performance test results