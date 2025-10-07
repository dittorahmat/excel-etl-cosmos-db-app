# Plan: Moving Authentication Token from Headers to URL for `/api/query/rows-get` Endpoint

## Goal
Modify the `/api/query/rows-get` endpoint to accept the Azure AD authentication token via a URL query parameter instead of the Authorization header.

## Current State
- The `/api/query/rows-get` endpoint currently uses header-based authentication via `authMiddleware.authenticateToken`
- The authentication middleware looks for the token in the `Authorization` header in the format `Bearer {token}`
- The route is defined in `server/src/routes/query/index.ts`

## Approach
This plan outlines the changes needed to modify the `/api/query/rows-get` endpoint to extract the authentication token from a URL query parameter instead of the Authorization header.

### 1. Create a New Authentication Middleware for URL-based Tokens

**Description**: Create a new middleware function that extracts the token from a URL query parameter (e.g., `?token=...`) instead of the Authorization header.

**Location**: `server/src/middleware/auth.ts` (add new function)

**Implementation**:
- Create a new function `authenticateTokenFromUrl` that:
  - Extracts the token from the `req.query.token` parameter
  - Calls the existing `validateToken` function to verify the token
  - Attaches the user payload to `req.user` if valid
  - Returns appropriate error responses if token is missing or invalid

### 2. Update the Route Definition

**Description**: Modify the `/api/query/rows-get` route to use the new URL-based authentication middleware instead of the header-based one.

**Location**: `server/src/routes/query/index.ts`

**Changes**:
- Replace `authMiddleware.authenticateToken` with the new `authMiddleware.authenticateTokenFromUrl` for the `/rows-get` route
- Keep the same logic for other routes that should continue using header-based authentication

### 3. Security Considerations

**Important Notes**:
- URL-based tokens are visible in server logs, browser history, and referrer headers
- This approach should be carefully considered from a security standpoint
- Tokens in URLs can be cached by proxies and browsers
- Consider using HTTPS to encrypt the URL during transmission

### 4. Backward Compatibility

**Option**: 
- Keep the original header-based authentication as an alternative
- Allow the endpoint to accept tokens from either source (header OR URL parameter)

### 5. Implementation Steps

1. Add the new authentication function to the existing auth middleware
2. Update the route definition to use the new authentication method
3. Test the endpoint with tokens in the URL
4. Verify that other endpoints continue to work as before

### 6. Testing

- Verify the endpoint works with token in URL query parameter
- Ensure proper error handling when token is missing from URL
- Confirm other endpoints using header authentication still work
- Test with both valid and invalid tokens in the URL
- Test error scenarios (malformed token, expired token, etc.)

## Security Implications
Moving authentication tokens from headers to URL parameters has important security implications:

- URLs are often logged by web servers and proxies
- URLs can be stored in browser history and referrer headers
- URLs are not encrypted in HTTP URLs (though the path/query components are encrypted in HTTPS)
- Sharing URLs with tokens may expose the token unintentionally

This approach should be carefully considered against the security requirements of the application.