# Azure AD Authentication Guide

This document provides a comprehensive guide to the Azure AD authentication setup for the Excel to Cosmos DB ETL application.

## Table of Contents
- [Overview](#overview)
- [Authentication Flow](#authentication-flow)
- [Environment Variables](#environment-variables)
- [Frontend Setup](#frontend-setup)
- [Backend Setup](#backend-setup)
- [Testing Authentication](#testing-authentication)
- [Troubleshooting](#troubleshooting)
- [Security Best Practices](#security-best-practices)

## Overview

The application uses Azure Active Directory (Azure AD) for authentication, providing secure access to protected API endpoints. The authentication flow follows the OAuth 2.0 protocol with PKCE (Proof Key for Code Exchange) for enhanced security.

## Authentication Flow

1. **User Login**: User logs in via the React frontend using MSAL.js
2. **Token Acquisition**: MSAL acquires an access token from Azure AD
3. **API Request**: The access token is included in the `Authorization` header of API requests
4. **Token Validation**: Backend validates the token using the `jsonwebtoken` and `jwks-rsa` libraries
5. **Access Control**: The request is authorized based on the token claims and user roles

## Environment Variables

### Frontend (.env)
```env
VITE_AZURE_CLIENT_ID=your_client_id
VITE_AZURE_TENANT_ID=your_tenant_id
VITE_AZURE_AUTHORITY=https://login.microsoftonline.com/your_tenant_id
VITE_API_SCOPE=api://your_client_id/access_as_user
VITE_API_ENDPOINT=https://your-api.azurewebsites.net/api
```

### Backend (.env)
```env
# Authentication
AUTH_ENABLED=true
AZURE_TENANT_ID=your_tenant_id
AZURE_CLIENT_ID=your_client_id
AZURE_CLIENT_SECRET=your_client_secret
AZURE_AUDIENCE=api://your_client_id
AZURE_SCOPE=api://your_client_id/.default

# CORS
ALLOWED_ORIGINS=http://localhost:3000,http://localhost:3001
```

## Frontend Setup

The frontend uses `@azure/msal-browser` and `@azure/msal-react` for authentication. Key components:

1. **MSAL Provider** - Wraps the application to provide authentication context
2. **Login/Logout** - Components for user authentication
3. **Protected Routes** - Components that require authentication

## Backend Setup

The backend uses `jsonwebtoken` and `jwks-rsa` for token validation. Key components:

1. **Authentication Middleware** - Validates JWT tokens in incoming requests
2. **Protected Routes** - Routes that require authentication
3. **Role-based Access Control** - Optional role-based authorization

## Testing Authentication

### Test Script
Run the test script to verify authentication:
```bash
cd server
npx tsx scripts/test-auth.ts
```

### Manual Testing
1. Log in via the frontend
2. Check browser's developer tools > Network tab for API requests
3. Verify the `Authorization` header contains a valid token
4. Test protected endpoints with and without a valid token

## Troubleshooting

### Common Issues
1. **Invalid Token**
   - Verify token audience and issuer
   - Check token expiration
   - Ensure correct tenant ID and client ID

2. **CORS Errors**
   - Verify `ALLOWED_ORIGINS` includes your frontend URL
   - Check for typos in the origin URLs

3. **Insufficient Permissions**
   - Verify the required API permissions are granted admin consent
   - Check the token claims for expected roles/scopes

## Security Best Practices

1. **Secrets Management**
   - Never commit secrets to version control
   - Use Azure Key Vault for production secrets
   - Rotate client secrets regularly

2. **Token Validation**
   - Always validate token signature, audience, and issuer
   - Implement proper token expiration handling
   - Use short-lived access tokens with refresh tokens

3. **Monitoring**
   - Monitor authentication failures
   - Set up alerts for suspicious activities
   - Log authentication events for auditing

## Support

For issues not covered in this guide, please contact the development team or refer to the [Azure AD Documentation](https://learn.microsoft.com/en-us/azure/active-directory/develop/).
