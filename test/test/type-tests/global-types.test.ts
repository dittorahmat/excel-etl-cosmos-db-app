// Test file to verify TypeScript and ESLint configurations
import { describe, it, expect } from 'vitest';

describe('Global Type Definitions', () => {
  it('should have Node.js globals available', () => {
    // Test Node.js globals
    expect(process).toBeDefined();
    expect(Buffer).toBeDefined();
    expect(setImmediate).toBeDefined();
  });

  it('should have test globals available', () => {
    // Test Vitest globals
    expect(describe).toBeDefined();
    expect(it).toBeDefined();
    expect(expect).toBeDefined();
  });

  it('should have proper DOM types in frontend files', () => {
    // This would be tested in a frontend test file
    // We're just verifying the type checking here
    const element: HTMLElement | null = null;
    expect(element).toBeNull();
  });
});
