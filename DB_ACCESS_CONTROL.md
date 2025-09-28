# Database Access Control Implementation - Completed

## Overview
This document outlines the completed implementation to modify the current access control system in `server/src/middleware/access-control.middleware.ts` to use Cosmos DB as the primary source for authorized users, with environment variables as a fallback mechanism.

## Current State (Before Implementation)
The original implementation only used environment variables (`.env`) to determine authorized users:
- Reads from `AUTHORIZED_UPLOAD_USERS` environment variable
- Splits the comma-separated list of emails
- Checks if the user's email is in the list

## Final State (After Implementation)
- First check Cosmos DB for the authorized users list
- If not found in DB or DB is unavailable, fall back to environment variables
- Maintain backward compatibility
- Keep the same middleware structure and API
- Includes caching mechanism to optimize performance
- **Caching can be disabled for testing by setting CACHE_DURATION_MS to 0**

## What Has Been Implemented

### 1. DatabaseAccessControlService
- Created `/server/src/services/access-control/database-access-control.service.ts`
- Connects to Cosmos DB to query the "authorized-upload-users" document
- Extracts the `authorizedUploadUsers` array from the document
- Includes caching mechanism to reduce repeated DB queries (5-minute cache by default)
- Implements fallback to environment variables if DB is unavailable or returns empty results
- Maintains backward compatibility (allows all users when no configuration exists)

### 2. Updated Middleware
- Modified `/server/src/middleware/access-control.middleware.ts` to use the new service
- The middleware now calls `DatabaseAccessControlService.isUserAuthorized()` 
- Preserves all existing functionality and error handling

### 3. Technical Implementation Details

#### Database Query Structure
```typescript
// Query to get the authorization configuration document
const query = "SELECT * FROM c WHERE c.id = @id AND c.type = @type";
// Parameters: { name: "@id", value: "authorized-upload-users" }, { name: "@type", value: "authorization-config" }
```

Current value in Cosmos DB:
```json
{
    "id": "authorized-upload-users",
    "type": "authorization-config",
    "authorizedUploadUsers": [
        "ditto.asnar@gmail.com",
        "ruben@iesr.or.id"
    ],
    "createdAt": "2025-09-25T06:43:58.721Z",
    "updatedAt": "2025-09-25T07:17:57.731Z",
    "lastModifiedBy": "system",
    "_rid": "QBo3AN2MFANvOwAAAAAAAA==",
    "_self": "dbs/QBo3AA==/colls/QBo3AN2MFAM=/docs/QBo3AN2MFANvOwAAAAAAAA==/",
    "_etag": "\"010027b7-0000-6400-0000-68d7c02a0000\"",
    "_attachments": "attachments/",
    "_ts": 1758969898
}
```

Based on the document, the users that have access are `ditto.asnar@gmail.com` and `ruben@iesr.or.id`.

## Caching Configuration

### Default Caching Behavior
- Cache duration: 5 minutes (300,000 milliseconds)
- Cache key: 'authorized-upload-users'
- Cached data: List of authorized users with timestamp

### How to Disable/Enable Caching

#### To Disable Caching (for testing):
1. Edit `/server/src/services/access-control/database-access-control.service.ts`
2. Change the CACHE_DURATION_MS value:
   ```typescript
   private static readonly CACHE_DURATION_MS = 0; // Set to 0 to disable caching
   ```
   
#### To Enable/Adjust Caching:
1. Edit `/server/src/services/access-control/database-access-control.service.ts`
2. Set the CACHE_DURATION_MS to desired value in milliseconds:
   ```typescript
   private static readonly CACHE_DURATION_MS = 5 * 60 * 1000; // 5 minutes (default)
   // or for other durations:
   // 1 minute: 60 * 1000
   // 10 minutes: 10 * 60 * 1000
   // 30 minutes: 30 * 60 * 1000
   ```

#### To Clear Cache Programmatically:
- Call `DatabaseAccessControlService.clearCache()` to clear the cache immediately

## Fallback Logic Flow
1. Attempt to fetch authorized users from Cosmos DB (with caching)
2. If successful and result contains users, use that list
3. If DB query fails or returns empty, use environment variable `AUTHORIZED_UPLOAD_USERS`
4. If environment variable is also empty, allow all authenticated users (backward compatibility)

## Error Handling
- Log all database errors with appropriate error messages
- Log which source (DB or .env) was used for access control
- Continue operation with fallback even when primary source fails
- Include error metrics for monitoring
- Properly handles network timeouts and connection failures

## Migration Path
1. ~Deploy the updated middleware with fallback logic~ (COMPLETED)
2. ~Verify that existing environment variable configuration continues to work~ (VERIFIED)
3. ~Test that new Cosmos DB configuration works properly~ (VERIFIED)
4. ~Update documentation to reflect new dual-source configuration~ (COMPLETED)

## Security Considerations
- Cosmos DB connection uses secure authentication from existing configuration
- Cache does not expose sensitive data
- Error logs do not reveal authorized user lists
- Maintains same security level as current implementation
- Proper validation for user emails and input sanitization

## Testing & Verification
The implementation has been thoroughly tested and verified to:
- Successfully retrieve authorized users from Cosmos DB document
- Properly fall back to environment variables when DB is unavailable
- Maintain backward compatibility when no configuration exists
- Handle error conditions gracefully
- Work with the existing middleware structure