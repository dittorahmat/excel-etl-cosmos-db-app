import { Request, Response, NextFunction } from 'express';
import rateLimit from 'express-rate-limit';
import { RateLimitRequestHandler } from 'express-rate-limit';

// In-memory store for rate limiting (use Redis in production)
const rateLimitStore = new Map<string, { count: number; resetTime: number }>();

/**
 * Custom rate limit store that works with express-rate-limit
 */
const customStore: rateLimit.Store = {
  increment: (key: string, callback: (err: Error | undefined, hits: number, resetTime: Date) => void) => {
    const now = Date.now();
    const windowMs = 60 * 1000; // 1 minute window
    
    let entry = rateLimitStore.get(key);
    
    if (!entry || now > entry.resetTime) {
      // New window
      entry = {
        count: 1,
        resetTime: now + windowMs,
      };
      rateLimitStore.set(key, entry);
    } else {
      // Increment existing window
      entry.count += 1;
    }
    
    // Clean up old entries (optional, to prevent memory leaks)
    for (const [k, v] of rateLimitStore.entries()) {
      if (now > v.resetTime + windowMs) {
        rateLimitStore.delete(k);
      }
    }
    
    callback(undefined, entry.count, new Date(entry.resetTime));
  },
  decrement: () => {},
  resetKey: () => {},
  resetAll: () => {
    rateLimitStore.clear();
  },
};

/**
 * Create a rate limiter middleware
 * @param options Rate limiting options
 * @returns Rate limiting middleware
 */
export function createRateLimiter(options: {
  windowMs?: number;
  max: number;
  keyGenerator?: (req: Request) => string;
  skip?: (req: Request) => boolean;
}): RateLimitRequestHandler {
  return rateLimit({
    windowMs: options.windowMs || 15 * 60 * 1000, // 15 minutes by default
    max: options.max, // limit each IP to X requests per windowMs
    keyGenerator: options.keyGenerator || ((req) => {
      // Use API key if available, otherwise use IP
      const apiKey = req.headers['x-api-key'] || req.query.api_key;
      return apiKey ? `key-${apiKey}` : (req.ip || 'unknown-ip');
    }),
    skip: options.skip || (() => false),
    handler: (req, res) => {
      res.status(429).json({
        success: false,
        error: 'Too Many Requests',
        message: 'Rate limit exceeded. Please try again later.',
      });
    },
    store: customStore,
  });
}

// Default rate limiter for API endpoints
export const defaultRateLimiter = createRateLimiter({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 100, // limit each IP/API key to 100 requests per windowMs
});

// Strict rate limiter for authentication endpoints
export const authRateLimiter = createRateLimiter({
  windowMs: 60 * 60 * 1000, // 1 hour
  max: 10, // limit to 10 requests per hour
  // Skip rate limiting for requests with valid API keys
  skip: (req) => !!req.headers['x-api-key'] || !!req.query.api_key,
});
