# Content Security Policy (CSP) Configuration Guide

## Current State

CSP is currently disabled to allow Microsoft authentication (MSAL) to work properly. This was done by implementing middleware that blocks all CSP headers.

## Re-enabling CSP - Steps

When you're ready to re-enable CSP for better security, follow these steps:

### 1. Remove CSP Blocking Middleware

Remove the middleware that's currently blocking CSP from `server/src/config/app.ts`:

```javascript
// Remove this entire middleware block:
app.use((req: Request, res: Response, next: NextFunction) => {
  // Override setHeader to block CSP
  const originalSetHeader = res.setHeader;
  res.setHeader = function(name, value) {
    if (name && typeof name === 'string' && name.toLowerCase() === 'content-security-policy') {
      return this;
    }
    return originalSetHeader.apply(this, arguments);
  };
  
  // Override header to block CSP
  const originalHeader = res.header;
  if (originalHeader) {
    res.header = function(name, value) {
      if (name && typeof name === 'string' && name.toLowerCase() === 'content-security-policy') {
        return this;
      }
      return originalHeader.apply(this, arguments);
    };
  }
  
  // Override writeHead to remove CSP from headers object
  const originalWriteHead = res.writeHead;
  res.writeHead = function(statusCode, reasonPhrase, headers) {
    // Handle different signatures of writeHead
    let finalHeaders = headers;
    if (typeof reasonPhrase === 'object') {
      finalHeaders = reasonPhrase;
    }
    
    // Remove CSP from headers object if present
    if (finalHeaders && typeof finalHeaders === 'object') {
      for (const key in finalHeaders) {
        if (key.toLowerCase() === 'content-security-policy') {
          delete finalHeaders[key];
        }
      }
    }
    
    return originalWriteHead.apply(this, arguments);
  };
  
  next();
});
```

### 2. Update Security Middleware

Update the security middleware in `server/src/middleware/security.ts` to include proper CSP:

```typescript
/**
 * Security middleware that adds security headers and implements security best practices
 */
export const securityHeaders = () => {
  return (req: Request, res: Response, next: NextFunction): void => {
    // Set all security headers
    res.setHeader('X-XSS-Protection', '1; mode=block');
    res.setHeader('X-Content-Type-Options', 'nosniff');
    res.setHeader('X-Frame-Options', 'DENY');
    res.setHeader('Referrer-Policy', 'no-referrer');
    res.setHeader('Permissions-Policy', "geolocation=(), microphone=(), camera=()");
    
    // Content Security Policy - Properly configured for MSAL authentication
    const cspValue = 
      "default-src 'self'; " +
      "script-src 'self' 'unsafe-inline' 'unsafe-eval' https://login.microsoftonline.com https://*.microsoft.com; " +
      "style-src 'self' 'unsafe-inline'; " +
      "img-src 'self' data: https:; " +
      "font-src 'self' data:; " +
      "connect-src 'self' https://login.microsoftonline.com https://*.microsoft.com; " +
      "media-src 'self'; " +
      "object-src 'none'; " +
      "child-src 'self'; " +
      "frame-ancestors 'none'; " +
      "form-action 'self'; " +
      "base-uri 'self';";
      
    res.setHeader('Content-Security-Policy', cspValue);
    
    // Strict Transport Security (only if HTTPS is enabled)
    if (req.secure || req.headers['x-forwarded-proto'] === 'https') {
      res.setHeader('Strict-Transport-Security', 'max-age=31536000; includeSubDomains; preload');
    }
    
    next();
  };
};
```

### 3. Update Static File Middleware

Update the static file middleware in `server/src/config/app.ts` to include proper CSP:

```javascript
setHeaders: (res, filePath) => {
  const ext = path.extname(filePath);
  // Set immutable cache for hashed assets
  if (['.js', '.css', '.png', '.jpg', '.jpeg', '.gif', '.ico', '.svg', '.woff', '.woff2', '.ttf', '.eot'].includes(ext)) {
    res.setHeader('Cache-Control', 'public, max-age=31536000, immutable');
  }
  // Ensure proper MIME types
  if (ext === '.css') {
    res.setHeader('Content-Type', 'text/css');
  } else if (ext === '.js') {
    res.setHeader('Content-Type', 'application/javascript');
  } else if (ext === '.json') {
    res.setHeader('Content-Type', 'application/json');
  } else if (ext === '.html') {
    res.setHeader('Content-Type', 'text/html');
  }
  
  // Set Content Security Policy for static files
  const cspValue = 
    "default-src 'self'; " +
    "script-src 'self' 'unsafe-inline' 'unsafe-eval' https://login.microsoftonline.com https://*.microsoft.com; " +
    "style-src 'self' 'unsafe-inline'; " +
    "img-src 'self' data: https:; " +
    "font-src 'self' data:; " +
    "connect-src 'self' https://login.microsoftonline.com https://*.microsoft.com; " +
    "media-src 'self'; " +
    "object-src 'none'; " +
    "child-src 'self'; " +
    "frame-ancestors 'none'; " +
    "form-action 'self'; " +
    "base-uri 'self';";
    
  res.setHeader('Content-Security-Policy', cspValue);
}
```

### 4. Rebuild and Test

```bash
npm run build:server
NODE_ENV=production npm run start
```

## Important CSP Directives for Microsoft Authentication

To ensure Microsoft authentication works properly, these domains must be included in your CSP:

- **connect-src**: `https://login.microsoftonline.com` and `https://*.microsoft.com`
- **script-src**: `https://login.microsoftonline.com` and `https://*.microsoft.com`

## Testing CSP Configuration

After re-enabling CSP, test thoroughly:

1. Login functionality should work without errors
2. No CSP violations in browser console
3. All static assets load correctly
4. API calls work as expected

## Security Considerations

When CSP is re-enabled:

1. **Regular Review**: Periodically review and tighten CSP policies
2. **Reporting**: Consider adding CSP reporting for monitoring violations
3. **Nonce/Hash**: For better security, consider using nonces or hashes for inline scripts instead of 'unsafe-inline'
4. **Environment-Specific**: You may want different CSP policies for development vs production

## Troubleshooting

If you encounter issues after re-enabling CSP:

1. Check browser console for CSP violation reports
2. Verify all required domains are included in CSP directives
3. Temporarily loosen CSP for debugging (but tighten before production)
4. Use CSP reporting to identify missing directives