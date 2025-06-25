// Global test setup that runs once before all tests
import { vi, beforeAll, afterAll } from 'vitest';
// Create a simple in-memory storage implementation
class MemoryStorage {
    constructor() {
        Object.defineProperty(this, "store", {
            enumerable: true,
            configurable: true,
            writable: true,
            value: {}
        });
    }
    get length() {
        return Object.keys(this.store).length;
    }
    clear() {
        this.store = {};
    }
    key(index) {
        return Object.keys(this.store)[index] ?? null;
    }
    getItem(key) {
        return this.store[key] ?? null;
    }
    setItem(key, value) {
        this.store[key] = String(value);
    }
    removeItem(key) {
        delete this.store[key];
    }
}
// Mock matchMedia
const createMatchMedia = () => ({
    matches: false,
    addListener: vi.fn(),
    removeListener: vi.fn(),
    addEventListener: vi.fn(),
    removeEventListener: vi.fn(),
    dispatchEvent: vi.fn(),
    media: '',
    onchange: null,
});
// Set up global variables before all tests
beforeAll(() => {
    // Create mock storage instances
    const mockLocalStorage = new MemoryStorage();
    const mockSessionStorage = new MemoryStorage();
    // Mock window object with all necessary properties
    const mockWindow = {
        ...global.window,
        location: {
            ...window.location,
            origin: 'http://localhost:3000',
            href: 'http://localhost:3000',
            pathname: '/',
            search: '',
            hash: '',
        },
        localStorage: mockLocalStorage,
        sessionStorage: mockSessionStorage,
        matchMedia: createMatchMedia,
        scrollTo: vi.fn(),
        alert: vi.fn(),
    };
    // Assign to global scope with proper TypeScript types
    Object.defineProperty(global, 'window', {
        value: mockWindow,
        writable: true,
        configurable: true,
    });
    Object.defineProperty(global, 'localStorage', {
        value: mockLocalStorage,
        writable: true,
    });
    Object.defineProperty(global, 'sessionStorage', {
        value: mockSessionStorage,
        writable: true,
    });
    // Set up environment variables
    process.env.VITE_AZURE_AD_CLIENT_ID = 'test-client-id';
    process.env.VITE_AZURE_AD_TENANT_ID = 'test-tenant-id';
    process.env.VITE_AZURE_AD_REDIRECT_URI = 'http://localhost:3000';
    process.env.VITE_API_SCOPE = 'api://test-api-scope';
    process.env.NODE_ENV = 'test';
});
// Clean up after all tests
afterAll(() => {
    // Clean up any global state here
    vi.clearAllMocks();
    // @ts-ignore - We know we're in a test environment
    delete global.window;
    // @ts-ignore
    delete global.localStorage;
    // @ts-ignore
    delete global.sessionStorage;
});
