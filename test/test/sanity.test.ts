// No need to import from 'vitest' as we're using global types
// import { describe, it, expect } from 'vitest';

describe('Sanity Test', () => {
  it('should pass a basic test', () => {
    // Basic assertion
    expect(true).toBe(true);
  });

  it('should have access to global test utilities', () => {
    // Test that we have access to global test utilities
    expect(vi).toBeDefined();
    expect(expect).toBeDefined();
    expect(describe).toBeDefined();
    expect(it).toBeDefined();
    expect(beforeEach).toBeDefined();
    expect(afterEach).toBeDefined();
    expect(beforeAll).toBeDefined();
    expect(afterAll).toBeDefined();
  });

  it('should have access to Node.js globals', () => {
    // Test that we have access to Node.js globals
    expect(process).toBeDefined();
    expect(process.env).toBeDefined();
    expect(global).toBeDefined();
  });

  it('should have access to test environment variables', () => {
    // Test that our test environment variables are set
    expect(process.env.NODE_ENV).toBe('test');
    expect(process.env.AZURE_CLIENT_ID).toBeDefined();
    expect(process.env.COSMOS_DB_ENDPOINT).toBeDefined();
  });
});
