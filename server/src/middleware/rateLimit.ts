import { Request, Response, NextFunction } from 'express';
import rateLimit from 'express-rate-limit';
import type { RateLimitRequestHandler, Options, Store, ClientRateLimitInfo } from 'express-rate-limit';
import { IncomingHttpHeaders } from 'http';

// Define the shape of our internal store entries
interface RateLimitEntry {
  totalHits: number;
  resetTime: number;
}

// In-memory store for rate limiting (use Redis in production)
interface RateLimitStoreEntry {
  totalHits: number;
  resetTime: number; // Stored as timestamp (number) for internal use
  resetTimeMs: number; // Alias for resetTime to match ClientRateLimitInfo
}

// Store for rate limit entries (one per MemoryStore instance)
const rateLimitStores = new Map<MemoryStore, Map<string, RateLimitStoreEntry>>();

/**
 * Creates a new rate limit store entry
 * @param resetTime Timestamp in milliseconds when the rate limit will reset
 */
function createRateLimitEntry(resetTime: number): RateLimitStoreEntry {
  return {
    totalHits: 0,
    resetTime,
    resetTimeMs: resetTime
  };
}

// Clean up old entries periodically to prevent memory leaks
const cleanupOldEntries = () => {
  const now = Date.now();
  
  for (const [store, entries] of rateLimitStores.entries()) {
    for (const [key, entry] of entries.entries()) {
      if (now > entry.resetTime) {
        console.log(`Cleaning up expired rate limit entry for key: ${key}`);
        entries.delete(key);
      }
    }
  }
};

// Run cleanup every minute (more frequent for testing)
setInterval(cleanupOldEntries, 60 * 1000);

/**
 * Custom rate limit store that implements the Store interface from express-rate-limit v7.2.0
 */
class MemoryStore implements Store {
  private windowMs: number;
  private store: Map<string, RateLimitStoreEntry>;

  constructor(windowMs: number) {
    this.windowMs = windowMs;
    this.store = new Map<string, RateLimitStoreEntry>();
    rateLimitStores.set(this, this.store);
  }

  /**
   * Method to increment a client's hit counter.
   */
  async increment(key: string): Promise<ClientRateLimitInfo> {
    const now = Date.now();
    
    let entry = this.store.get(key);
    
    if (!entry || now >= entry.resetTime) {
      // Create a new entry with the current time as the reset time
      const resetTime = now + this.windowMs;
      entry = createRateLimitEntry(resetTime);
      entry.totalHits = 1; // Start counting from 1 for new entries
      this.store.set(key, entry);
    } else {
      // Increment the hit counter for existing active window
      entry.totalHits += 1;
    }
    
    // Return the ClientRateLimitInfo compatible object
    return {
      totalHits: entry.totalHits,
      resetTime: new Date(entry.resetTime)
    };
  }
  
  /**
   * Method to decrement a client's hit counter.
   */
  async decrement(key: string): Promise<void> {
    const entry = this.store.get(key);
    if (entry && entry.totalHits > 0) {
      entry.totalHits -= 1;
    }
  }
  
  /**
   * Method to reset a client's hit counter.
   */
  async resetKey(key: string): Promise<void> {
    this.store.delete(key);
  }
  
  /**
   * For testing: Manually clear the store
   */
  clear(): void {
    this.store.clear();
  }
  
  /**
   * For testing: Get the current state of the store
   */
  getStore() {
    return this.store;
  }
  
  /**
   * Method to get a value from the store.
   */
  async get(key: string): Promise<ClientRateLimitInfo | undefined> {
    const entry = this.store.get(key);
    if (!entry) return undefined;
    
    // Convert our internal store entry to ClientRateLimitInfo
    return {
      totalHits: entry.totalHits,
      resetTime: new Date(entry.resetTime)
      // Note: resetTimeMs is not part of the ClientRateLimitInfo type
    };
  }
  
  /**
   * Method to set a value in the store.
   */
  async set(key: string, value: ClientRateLimitInfo): Promise<void> {
    // Convert ClientRateLimitInfo to our internal store format
    const resetTime = value.resetTime instanceof Date ? value.resetTime.getTime() : 
                     typeof value.resetTime === 'number' ? value.resetTime :
                     Date.now() + this.windowMs;
    
    const entry: RateLimitStoreEntry = {
      totalHits: value.totalHits,
      resetTime,
      resetTimeMs: resetTime
    };
    
    this.store.set(key, entry);
  }
  
  /**
   * Method to reset all counters in the store.
   */
  async resetAll(): Promise<void> {
  }
}

interface RateLimiterOptions {
  windowMs?: number;
  max: number;
  keyGenerator?: (req: Request) => string;
  skip?: (req: Request) => boolean;
  message?: string;
}

/**
 * Create a rate limiter middleware
 * @param options Rate limiting options
 * @returns Rate limiting middleware
 */
export function createRateLimiter(options: RateLimiterOptions): RateLimitRequestHandler {
  const windowMs = options.windowMs || 15 * 60 * 1000; // 15 minutes by default
  
  const rateLimitOptions: Partial<Options> = {
    windowMs,
    max: options.max, // limit each IP to X requests per windowMs
    standardHeaders: true, // Return rate limit info in the `RateLimit-*` headers
    legacyHeaders: false, // Disable the `X-RateLimit-*` headers
    store: new MemoryStore(windowMs),
    keyGenerator: options.keyGenerator || ((req) => {
      // Use API key if available, otherwise use IP
      const headers = req.headers as IncomingHttpHeaders;
      const apiKey = headers['x-api-key'] || 
                   (req.query && typeof req.query.api_key === 'string' ? req.query.api_key : undefined);
      return apiKey ? `key-${apiKey}` : (req.ip || 'unknown-ip');
    }),
    skip: options.skip || (() => false),
    handler: (req, res) => {
      console.log('Rate limit exceeded for request');
      res.status(429).json({
        success: false,
        error: 'Too Many Requests',
        message: options.message || 'Rate limit exceeded. Please try again later.',
      });
    },
    getStore: () => (rateLimitOptions.store as MemoryStore).getStore(),
  };
  
  return rateLimit(rateLimitOptions);
}

// Default rate limiter for API endpoints
export const defaultRateLimiter: RateLimitRequestHandler = createRateLimiter({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 100, // limit each IP/API key to 100 requests per windowMs
  message: 'Too many requests from this IP, please try again after 15 minutes.'
});

// Stricter rate limiter for authentication endpoints
export const authRateLimiter: RateLimitRequestHandler = createRateLimiter({
  windowMs: 60 * 60 * 1000, // 1 hour
  max: 10, // limit to 10 requests per hour
  message: 'Too many login attempts, please try again after an hour.',
  // Skip rate limiting for requests with valid API keys
  skip: (req) => {
    const headers = req.headers as IncomingHttpHeaders;
    return !!headers['x-api-key'] || !!req.query.api_key;
  },
});
