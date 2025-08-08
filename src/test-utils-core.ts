import { vi } from 'vitest';

// Suppress act() warnings globally
const originalError = console.error;
beforeAll(() => {
  vi.spyOn(console, 'error').mockImplementation((...args) => {
    if (typeof args[0] === 'string' &&
        /Warning: An update to .* inside a test was not wrapped in act/.test(args[0])) {
      return;
    }
    originalError.call(console, ...args);
  });
});

afterAll(() => {
  vi.restoreAllMocks();
});

// Export test utilities
export const waitForRender = async (ms = 0) => {
  const { act } = await import('@testing-library/react');
  await act(async () => {
    await new Promise(resolve => setTimeout(resolve, ms));
  });
};

// Cleanup function to ensure proper cleanup between tests
export const customTestCleanup = async () => {
  try {
    // Clear all mocks and reset state
    vi.clearAllMocks();
    vi.resetAllMocks();
    vi.resetModules();

    // Clear storage
    localStorage.clear();
    sessionStorage.clear();

    // Reset any timers
    vi.useRealTimers();

    // Wait for any pending promises to resolve
    await new Promise(resolve => setTimeout(resolve, 0));

    // Wait for any pending React updates to complete with act
    const { act } = await import('@testing-library/react');
    await act(async () => {
      await new Promise(resolve => setTimeout(resolve, 100));
    });
  } catch (error) {
    console.error('Error during test cleanup:', error);
  }
};

// Export cleanup as default for backward compatibility
export default customTestCleanup;
