# Lazy Access Control Implementation Plan for Upload Page

## Overview
This document outlines the plan to modify the UploadPage component to implement lazy access control. Instead of eager/automatic access control middleware, users will see a login/authorization check when visiting the `/upload` route, with access granted or denied based on the database access control system.

## Current State
- Access control is currently implemented in `server/src/middleware/access-control.middleware.ts`
- The middleware is applied to the upload API endpoint: `/api/v2/upload` (POST request)
- The middleware is NOT applied to frontend routes like `/upload`
- Users visiting the `/upload` frontend route are NOT automatically checked against the authorized users list
- The frontend `UploadPage.tsx` component currently has no access control logic
- Users are authenticated via Azure AD but authorization is checked against Cosmos DB configuration when making API calls to `/api/v2/upload`
- The access control middleware is imported but NOT applied to any query API endpoints

## Desired State
- Users visiting `/upload` route see a login button initially
- When clicked, the button triggers authorization check using the database access control system
- If user is authorized, they proceed to the UploadPage
- If user is not authorized, they see an "Access Denied" message
- User email is retrieved from Azure AD authentication context (no need to re-enter)

## Implementation Plan

### Phase 1: Create Authorization Component
1. Create a new `AuthorizationGate` component that:
   - Shows a login/authorization button initially
   - When clicked, checks the user's authorization status
   - Has states for: initial, checking, authorized, unauthorized
   - Displays appropriate UI for each state

### Phase 2: Implement Authorization API Endpoint
1. Create a new API endpoint in the backend (e.g., `/api/check-authorization`) that:
   - Verifies the user's authentication token
   - Extracts the user email from the token
   - Uses the existing `DatabaseAccessControlService.isUserAuthorized()` method
   - Returns whether the user is authorized

### Phase 3: Update Upload Page Component
1. Modify `src/pages/UploadPage.tsx` to:
   - Show the `AuthorizationGate` component instead of the upload interface initially
   - Only render the actual upload functionality if the user is authorized
   - Handle the different authorization states appropriately

### Phase 4: Integration & Testing
1. Connect all components and verify the flow
2. Test both authorized and unauthorized user scenarios
3. Ensure error handling works properly

## Technical Details

### Authorization Gate Component Structure
```typescript
interface AuthorizationGateProps {
  onAuthorized: () => void;
}

enum AuthState {
  INITIAL = 'initial',
  CHECKING = 'checking',
  AUTHORIZED = 'authorized',
  UNAUTHORIZED = 'unauthorized',
  ERROR = 'error'
}
```

### User Email Retrieval
- Use the `useAuth()` hook to get user information from Azure AD
- Extract email from `user.username` or `user.idTokenClaims.preferred_username`
- Send this email to the backend for authorization check

### API Endpoint Implementation
```typescript
// Backend endpoint
POST /api/check-authorization
{
  // Token in Authorization header
}
// Response:
{
  authorized: boolean,
  email: string
}
```

## User Flow

1. User navigates to `/upload`
2. Sees "Login & Check Authorization" button
3. Clicks button -> authentication happens via Azure AD (if not already authenticated)
4. App gets user email from authentication context
5. App calls backend to check authorization status
6. If authorized → show UploadPage content
7. If not authorized → show "Access Denied" message
8. If error → show appropriate error message

## Error Handling
- Handle cases where user authentication fails
- Handle cases where authorization check fails
- Handle network errors during authorization check
- Provide clear feedback to users in all scenarios

## Security Considerations
- The backend authorization check still uses the same secure DatabaseAccessControlService
- User email is extracted from authenticated token context (secure)
- Authorization is still checked against Cosmos DB configuration
- Frontend only renders content after successful authorization check

## Fallback Behavior
- If authorization API is unavailable, show appropriate error message
- Maintain backward compatibility with existing authentication flow
- If both auth and authz are disabled, allow access (as per current fallback logic)