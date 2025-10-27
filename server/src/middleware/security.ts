import type { Request, Response, NextFunction } from 'express';

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
      "connect-src 'self' https://login.microsoftonline.com https://graph.microsoft.com; " +
      "media-src 'self'; " +
      "object-src 'none'; " +
      "child-src 'self'; " +
      "frame-src 'self' https://login.microsoftonline.com; " +
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

/**
 * Middleware to limit file upload size
 */
export const fileUploadLimits = () => {
  return (req: Request, res: Response, next: NextFunction): void => {
    // Set maximum file size limit (100MB)
    const maxSize = 100 * 1024 * 1024; // 100MB in bytes
    
    // Check content length header
    const contentLength = req.headers['content-length'];
    if (contentLength && parseInt(contentLength) > maxSize) {
      res.status(413).json({
        success: false,
        error: 'Payload Too Large',
        message: 'File size exceeds the maximum allowed limit of 100MB'
      });
      return;
    }
    
    next();
  };
};

/**
 * Middleware to add request ID for tracking
 */
export const requestId = () => {
  return (req: Request, res: Response, next: NextFunction): void => {
    // Generate a unique request ID
    const requestId = `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
    req.id = requestId;
    
    // Add request ID to response headers
    res.setHeader('X-Request-ID', requestId);
    
    next();
  };
};