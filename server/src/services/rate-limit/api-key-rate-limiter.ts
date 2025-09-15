import { logger } from '../../utils/logger.js';

/**
 * Simple in-memory rate limiting for API keys
 */
class ApiKeyRateLimiter {
  private requests: Map<string, { count: number; resetTime: number }> = new Map();
  private windowMs: number = 15 * 60 * 1000; // 15 minutes
  private maxRequests: number = 1000; // Max requests per window

  /**
   * Check if an API key has exceeded its rate limit
   */
  async isRateLimited(apiKeyId: string): Promise<{ 
    isLimited: boolean; 
    limit?: number; 
    remaining?: number; 
    resetTime?: number 
  }> {
    try {
      const now = Date.now();
      const window = this.requests.get(apiKeyId);

      // If no record exists or the window has expired, create a new one
      if (!window || window.resetTime <= now) {
        this.requests.set(apiKeyId, {
          count: 1,
          resetTime: now + this.windowMs
        });
        
        return {
          isLimited: false,
          limit: this.maxRequests,
          remaining: this.maxRequests - 1,
          resetTime: now + this.windowMs
        };
      }

      // Increment the request count
      window.count++;

      // Check if the limit has been exceeded
      if (window.count > this.maxRequests) {
        return {
          isLimited: true,
          limit: this.maxRequests,
          remaining: 0,
          resetTime: window.resetTime
        };
      }

      // Update the record
      this.requests.set(apiKeyId, window);

      return {
        isLimited: false,
        limit: this.maxRequests,
        remaining: this.maxRequests - window.count,
        resetTime: window.resetTime
      };
    } catch (error) {
      logger.error('Error checking rate limit', { error });
      // Fail open - don't block requests if there's an error
      return {
        isLimited: false
      };
    }
  }

  /**
   * Get rate limit headers for a response
   */
  getRateLimitHeaders(apiKeyId: string): Record<string, string> {
    const window = this.requests.get(apiKeyId);
    
    if (!window) {
      return {
        'X-RateLimit-Limit': this.maxRequests.toString(),
        'X-RateLimit-Remaining': this.maxRequests.toString(),
        'X-RateLimit-Reset': Math.ceil((Date.now() + this.windowMs) / 1000).toString()
      };
    }

    return {
      'X-RateLimit-Limit': this.maxRequests.toString(),
      'X-RateLimit-Remaining': Math.max(0, this.maxRequests - window.count).toString(),
      'X-RateLimit-Reset': Math.ceil(window.resetTime / 1000).toString()
    };
  }

  /**
   * Set custom rate limits for a specific API key
   */
  setCustomLimit(apiKeyId: string, maxRequests: number, windowMs: number): void {
    // Note: This sets the global limits, not per-key limits
    this.maxRequests = maxRequests;
    this.windowMs = windowMs;
  }

  /**
   * Reset rate limit for an API key
   */
  resetRateLimit(apiKeyId: string): void {
    this.requests.delete(apiKeyId);
  }

  /**
   * Clean up old rate limit records
   */
  cleanup(): void {
    const now = Date.now();
    for (const [key, window] of this.requests.entries()) {
      if (window.resetTime <= now) {
        this.requests.delete(key);
      }
    }
  }
}

// Export a singleton instance
export const apiKeyRateLimiter = new ApiKeyRateLimiter();