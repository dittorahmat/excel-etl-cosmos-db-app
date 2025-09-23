# User Access Control Implementation Plan

## Overview
This document outlines the plan to implement user access control for the UploadPage and FileListTable components. Currently, any authenticated user can access these components, but we want to restrict access to only specific users whose email addresses are configured in an allowlist.

## Requirements
1. Restrict access to UploadPage and FileListTable components to only specific users
2. Allow configuration of authorized users via email addresses
3. Provide a clean user experience when access is denied
4. Maintain security best practices

## Implementation Options Analysis

### Option 1: Environment Variables (.env file)
**Pros:**
- Simple to implement
- No additional database queries
- Configuration is version-controlled (but can be overridden)
- Easy to deploy with Docker

**Cons:**
- Requires application restart when list changes
- Not suitable for dynamic updates
- Security concerns with storing user emails in environment variables
- Difficult to manage with multiple environments

### Option 2: Cosmos DB Storage
**Pros:**
- Dynamic updates without application restart
- Centralized user management
- Can be integrated with existing database infrastructure
- Suitable for complex access control policies

**Cons:**
- Additional database queries on each request
- More complex implementation
- Requires database schema changes
- Need to build admin interface for managing users

### Option 3: Configuration File (JSON/YAML)
**Pros:**
- Simple to implement
- No database dependencies
- Can be volume-mounted in Docker
- Easy to version control

**Cons:**
- Requires application restart or file watching
- File management in production environments

### Option 4: Hybrid Approach (Recommended)
Use environment variables for initial/simple setup, with optional Cosmos DB storage for dynamic management.

## Recommended Approach

We recommend implementing a **hybrid approach**:

1. **Primary Method**: Environment variable configuration for simplicity
2. **Secondary Method**: Optional Cosmos DB storage for dynamic management
3. **Fallback**: Default behavior (current - all authenticated users can access)

This provides flexibility for different deployment scenarios while maintaining simplicity for basic use cases.

## Implementation Plan

### Phase 1: Core Access Control Logic

#### 1. Create Access Control Service
```typescript
// src/services/access-control.service.ts
export interface AccessControlService {
  isUserAuthorized(email: string): Promise<boolean>;
  getAuthorizedUsers(): Promise<string[]>;
}
```

#### 2. Environment Variable Implementation
```typescript
// src/services/env-access-control.service.ts
export class EnvAccessControlService implements AccessControlService {
  private authorizedEmails: Set<string>;
  
  constructor() {
    const emails = process.env.AUTHORIZED_UPLOAD_USERS || '';
    this.authorizedEmails = new Set(
      emails.split(',').map(email => email.trim().toLowerCase())
    );
  }
  
  async isUserAuthorized(email: string): Promise<boolean> {
    // If no emails are configured, allow all authenticated users (backward compatibility)
    if (this.authorizedEmails.size === 0) {
      return true;
    }
    return this.authorizedEmails.has(email.toLowerCase());
  }
  
  async getAuthorizedUsers(): Promise<string[]> {
    return Array.from(this.authorizedEmails);
  }
}
```

#### 3. Cosmos DB Implementation (Optional)
```typescript
// src/services/cosmos-access-control.service.ts
export class CosmosAccessControlService implements AccessControlService {
  // Implementation that queries Cosmos DB for authorized users
}
```

### Phase 2: Authentication Integration

#### 1. User Context/Authentication Service
We need to ensure we can get the current user's email. This likely involves:
- Integrating with the existing authentication system
- Extracting user information from JWT tokens
- Handling different authentication providers (Azure AD, etc.)

#### 2. Authenticated User Hook
```typescript
// src/hooks/useCurrentUser.ts
export function useCurrentUser() {
  // Extract user information from auth context
  // Return user email and other relevant info
}
```

### Phase 3: Component Integration

#### 1. UploadPage Integration
```typescript
// src/pages/UploadPage.tsx
export function UploadPage() {
  const { user } = useAuth(); // Get current user
  const { isAuthorized, loading } = useAccessControl(user?.email);
  
  if (loading) {
    return <LoadingSpinner />;
  }
  
  if (!isAuthorized) {
    return <AccessDenied message="You don't have permission to upload files." />;
  }
  
  // Rest of the component...
}
```

#### 2. FileListTable Integration
```typescript
// src/components/FileListTable.tsx
export function FileListTable() {
  const { user } = useAuth();
  const { isAuthorized, loading } = useAccessControl(user?.email);
  
  if (loading) {
    return <LoadingSpinner />;
  }
  
  if (!isAuthorized) {
    return <AccessDenied message="You don't have permission to view uploaded files." />;
  }
  
  // Rest of the component...
}
```

### Phase 4: User Experience

#### 1. Access Denied Component
```typescript
// src/components/AccessDenied.tsx
interface AccessDeniedProps {
  message?: string;
}

export function AccessDenied({ message }: AccessDeniedProps) {
  return (
    <div className="flex flex-col items-center justify-center py-12">
      <Lock className="h-12 w-12 text-red-500 mb-4" />
      <h2 className="text-xl font-semibold text-gray-900 mb-2">Access Denied</h2>
      <p className="text-gray-500 mb-4">
        {message || "You don't have permission to access this resource."}
      </p>
      <Button onClick={() => window.history.back()}>
        Go Back
      </Button>
    </div>
  );
}
```

#### 2. Navigation Integration
Hide navigation links to restricted pages for unauthorized users:
```typescript
// src/components/Navigation.tsx
const { isAuthorized: canUpload } = useAccessControl(user?.email);

// In navigation menu:
{canUpload && (
  <NavLink to="/upload">Upload</NavLink>
)}
```

### Phase 5: Configuration

#### 1. Environment Variable Setup
Add to `.env` file:
```env
# Comma-separated list of authorized user emails
AUTHORIZED_UPLOAD_USERS=user1@example.com,user2@example.com,admin@example.com
```

#### 2. Configuration Documentation
Document how to configure access control in deployment guides.

## Security Considerations

### 1. Client-Side vs Server-Side Enforcement
**Important**: The above approach implements client-side access control for UX purposes. However, we must also implement server-side enforcement:

#### API Route Protection
```typescript
// server/src/middleware/access-control.middleware.ts
export async function accessControlMiddleware(req, res, next) {
  const user = await getUserFromToken(req.headers.authorization);
  const isAuthorized = await accessControlService.isUserAuthorized(user.email);
  
  if (!isAuthorized) {
    return res.status(403).json({ error: 'Access denied' });
  }
  
  next();
}
```

### 2. Token Validation
Ensure proper validation of authentication tokens to prevent spoofing.

### 3. Audit Logging
Log access attempts for security monitoring:
```typescript
logger.info('Access control check', {
  userEmail: user.email,
  resource: req.path,
  authorized: isAuthorized,
  timestamp: new Date().toISOString()
});
```

## Implementation Steps

### Step 1: Core Services (Backend)
1. Create access control service interface
2. Implement environment variable-based access control service
3. Create Cosmos DB implementation (optional)
4. Add service factory for choosing implementation

### Step 2: Authentication Integration (Backend)
1. Extract user email from authentication tokens
2. Create middleware for access control
3. Apply middleware to protected routes

### Step 3: Frontend Integration
1. Create React hooks for access control
2. Implement access denied components
3. Integrate with UploadPage and FileListTable
4. Update navigation components

### Step 4: Configuration
1. Add environment variables
2. Update documentation
3. Test different configuration scenarios

### Step 5: Testing
1. Unit tests for access control services
2. Integration tests for API routes
3. UI tests for component access control
4. End-to-end tests for user flows

## Configuration Examples

### Simple Setup (.env)
```env
AUTHORIZED_UPLOAD_USERS=admin@example.com,user@example.com
```

### Multiple Environments
```env
# Development
AUTHORIZED_UPLOAD_USERS=developer1@example.com,developer2@example.com

# Production
AUTHORIZED_UPLOAD_USERS=admin@company.com,manager@company.com
```

### Empty Configuration (Backward Compatibility)
```env
# No users configured - all authenticated users can access
AUTHORIZED_UPLOAD_USERS=
```

## Error Handling

### 1. Configuration Errors
- Log misconfigured environment variables
- Gracefully fall back to default behavior

### 2. Service Failures
- Handle database connection failures
- Provide clear error messages
- Implement circuit breaker patterns if needed

### 3. User Experience
- Clear access denied messages
- Provide contact information for access requests
- Graceful degradation when services are unavailable

## Future Enhancements

### 1. Role-Based Access Control
Extend the system to support roles:
```env
AUTHORIZED_UPLOAD_USERS=admin@example.com:admin,user@example.com:uploader
```

### 2. Group-Based Access
Integrate with Azure AD groups or similar:
```env
AUTHORIZED_UPLOAD_GROUPS=DataUploaders,Admins
```

### 3. API for Management
Create admin APIs for managing authorized users:
- Add/remove users
- List current authorized users
- Audit access logs

## Conclusion

This implementation plan provides a flexible, secure approach to restricting access to upload and file management features. The hybrid approach using environment variables as the primary method with optional Cosmos DB storage offers:

1. **Simplicity** for basic deployments
2. **Flexibility** for complex requirements
3. **Security** through both client and server-side enforcement
4. **Backward compatibility** to avoid breaking existing deployments

The phased implementation approach allows for incremental deployment and testing while maintaining application stability.