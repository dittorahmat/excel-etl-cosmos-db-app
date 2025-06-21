import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import request from 'supertest';
import express from 'express';
import { createRateLimiter } from '../src/middleware/rateLimit.js';

// Mock the Date.now() function to control time in tests
const mockDateNow = vi.spyOn(Date, 'now');

// Helper function to advance time by ms milliseconds
const advanceTimersByTime = (ms: number) => {
  const now = Date.now();
  mockDateNow.mockReturnValue(now + ms);
};

describe('Rate Limiting Middleware', () => {
  let app: express.Express;
  let testRoute: express.RequestHandler;
  let requestCount = 0;

  beforeEach(() => {
    vi.clearAllMocks();
    requestCount = 0;
    
    // Create a test route that increments a counter
    testRoute = (req, res) => {
      requestCount++;
      res.status(200).json({ count: requestCount });
    };
    
    // Reset the mock date
    mockDateNow.mockReturnValue(0);
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('should allow requests under the limit', async () => {
    // Create a rate limiter that allows 5 requests per minute
    const rateLimiter = createRateLimiter({
      windowMs: 60000, // 1 minute
      max: 5,
    });
    
    // Create a test app with the rate limiter
    app = express();
    app.use(rateLimiter);
    app.get('/', testRoute);
    
    // Make 5 requests (all should pass)
    for (let i = 0; i < 5; i++) {
      const response = await request(app).get('/');
      expect(response.status).toBe(200);
      expect(response.body.count).toBe(i + 1);
    }
  });

  it('should block requests over the limit', async () => {
    console.log('Starting test: should block requests over the limit');
    // Create a rate limiter that allows 3 requests per minute
    const rateLimiter = createRateLimiter({
      windowMs: 60000, // 1 minute
      max: 3,
    });
    
    // Create a test app with the rate limiter
    app = express();
    app.use(rateLimiter);
    app.get('/', testRoute);
    
    // Make 3 requests (all should pass)
    for (let i = 0; i < 3; i++) {
      const response = await request(app).get('/').set('x-forwarded-for', '192.168.1.1');
      console.log(`Request ${i + 1} status:`, response.status, 'count:', response.body.count);
      expect(response.status).toBe(200);
      expect(response.body.count).toBe(i + 1);
    }
    
    // 4th request should be rate limited
    const response = await request(app).get('/').set('x-forwarded-for', '192.168.1.1');
    console.log('4th request status (should be 429):', response.status);
    expect(response.status).toBe(429);
    expect(response.body).toEqual({
      success: false,
      error: 'Too Many Requests',
      message: 'Rate limit exceeded. Please try again later.',
    });
    
    // Count should still be 3 (the 4th request was blocked)
    console.log('Final request count:', requestCount);
    expect(requestCount).toBe(3);
  });

  it('should reset the counter after the window expires', async () => {
    console.log('Starting test: should reset the counter after the window expires');
    
    // Create a rate limiter that allows 2 requests per second (for faster testing)
    const rateLimiter = createRateLimiter({
      windowMs: 1000, // 1 second for testing
      max: 2,
    });
    
    // Create a test app with the rate limiter
    app = express();
    app.use(rateLimiter);
    app.get('/', testRoute);
    
    // Make 2 requests (all should pass)
    for (let i = 0; i < 2; i++) {
      const response = await request(app).get('/').set('x-forwarded-for', '192.168.1.10');
      console.log(`Request ${i + 1} status:`, response.status, 'count:', response.body?.count);
      expect(response.status).toBe(200);
      expect(response.body.count).toBe(i + 1);
    }
    
    // 3rd request should be rate limited
    let response = await request(app).get('/').set('x-forwarded-for', '192.168.1.10');
    console.log('3rd request status (should be 429):', response.status);
    expect(response.status).toBe(429);
    
    // Wait for the window to reset (1.1 seconds to be safe)
    console.log('Waiting for rate limit window to reset...');
    await new Promise(resolve => setTimeout(resolve, 1100));
    
    // Next request should pass (new window)
    response = await request(app).get('/').set('x-forwarded-for', '192.168.1.10');
    console.log('Request after reset status:', response.status, 'count:', response.body?.count);
    expect(response.status).toBe(200);
    expect(response.body.count).toBe(3); // Count continues from previous
  });

  it('should use API key as the rate limit key when available', async () => {
    // Create a rate limiter that allows 2 requests per minute per key
    const rateLimiter = createRateLimiter({
      windowMs: 60000, // 1 minute
      max: 2,
      keyGenerator: (req: any) => {
        // Use API key from header or query param
        const apiKey = req.headers['x-api-key'] || req.query.api_key;
        return apiKey ? `key-${apiKey}` : req.ip || 'unknown-ip';
      },
    });
    
    // Create a test app with the rate limiter
    app = express();
    app.use(rateLimiter);
    app.get('/', testRoute);
    
    const apiKey1 = 'test-key-1';
    const apiKey2 = 'test-key-2';
    
    // Make 2 requests with API key 1
    for (let i = 0; i < 2; i++) {
      const response = await request(app)
        .get('/')
        .set('x-api-key', apiKey1);
      expect(response.status).toBe(200);
      expect(response.body.count).toBe(i + 1);
    }
    
    // 3rd request with same API key should be rate limited
    let response = await request(app)
      .get('/')
      .set('x-api-key', apiKey1);
    expect(response.status).toBe(429);
    
    // But a request with a different API key should work
    response = await request(app)
      .get('/')
      .set('x-api-key', apiKey2);
    expect(response.status).toBe(200);
    expect(response.body.count).toBe(3); // Count continues from previous
  });

  it('should skip rate limiting when skip function returns true', async () => {
    console.log('Starting test: should skip rate limiting when skip function returns true');
    
    // Create a rate limiter that allows 1 request per minute
    // but skips for certain IPs
    const rateLimiter = createRateLimiter({
      windowMs: 60000, // 1 minute
      max: 1,
      skip: (req: any) => {
        // Log the IP being checked
        const ip = Array.isArray(req.headers['x-forwarded-for']) 
          ? req.headers['x-forwarded-for'][0] 
          : req.headers['x-forwarded-for'] || req.ip;
        const shouldSkip = ip === '192.168.1.100';
        console.log('Checking skip for IP:', ip, 'shouldSkip:', shouldSkip);
        return shouldSkip;
      },
    });
    
    // Create a test app with the rate limiter
    app = express();
    app.use(rateLimiter);
    app.get('/', testRoute);
    
    // First request from IP 1 should pass
    console.log('Sending first request from 192.168.1.1');
    let response = await request(app)
      .get('/')
      .set('x-forwarded-for', '192.168.1.1');
    console.log('First request status:', response.status, 'count:', response.body?.count);
    expect(response.status).toBe(200);
    
    // Second request from IP 1 should be rate limited
    console.log('Sending second request from 192.168.1.1');
    response = await request(app)
      .get('/')
      .set('x-forwarded-for', '192.168.1.1');
    console.log('Second request status:', response.status);
    expect(response.status).toBe(429);
    
    // But requests from the whitelisted IP should always pass
    for (let i = 0; i < 2; i++) {
      console.log(`Sending request ${i + 1} from whitelisted IP 192.168.1.100`);
      response = await request(app)
        .get('/')
        .set('x-forwarded-for', '192.168.1.100');
      console.log(`Request ${i + 1} from whitelisted IP status:`, response.status, 'count:', response.body?.count);
      expect(response.status).toBe(200);
      expect(response.body.count).toBe(i + 2); // Count continues from previous
    }
  });
});
