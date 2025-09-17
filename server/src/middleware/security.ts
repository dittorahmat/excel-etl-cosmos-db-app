import type { Request, Response, NextFunction } from 'express';

/**
 * Security middleware that adds security headers and implements security best practices
 */
export const securityHeaders = () => {
  return (req: Request, res: Response, next: NextFunction): void => {
    // Prevent XSS attacks
    res.setHeader('X-XSS-Protection', '1; mode=block');
    
    // Prevent MIME type sniffing
    res.setHeader('X-Content-Type-Options', 'nosniff');
    
    // Prevent clickjacking
    res.setHeader('X-Frame-Options', 'DENY');
    
    // Control referrer information
    res.setHeader('Referrer-Policy', 'no-referrer');
    
    // Control features available to the page
    res.setHeader('Permissions-Policy', "geolocation=(), microphone=(), camera=()");
    
    // Content Security Policy
    res.setHeader('Content-Security-Policy', 
      "default-src 'self'; " +
      "script-src 'self' 'unsafe-inline' 'unsafe-eval'; " +
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
      "base-uri 'self';"
    );
    
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
    (req as any).id = requestId;
    
    // Add request ID to response headers
    res.setHeader('X-Request-ID', requestId);
    
    next();
  };
};