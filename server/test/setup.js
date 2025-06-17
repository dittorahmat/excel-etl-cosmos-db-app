import { vi } from 'vitest';
import { config } from 'dotenv';
// Load environment variables from .env file
config({ path: '../../.env' });
// Mock global objects for Node.js environment
globalThis.URL = {
    createObjectURL: vi.fn(),
    revokeObjectURL: vi.fn()
};
// Mock localStorage and sessionStorage
const localStorageMock = (() => {
    let store = {};
    return {
        getItem: (key) => store[key] || null,
        setItem: (key, value) => {
            store[key] = String(value);
        },
        removeItem: (key) => {
            delete store[key];
        },
        clear: () => {
            store = {};
        },
    };
})();
const sessionStorageMock = (() => {
    let store = {};
    return {
        getItem: (key) => store[key] || null,
        setItem: (key, value) => {
            store[key] = String(value);
        },
        removeItem: (key) => {
            delete store[key];
        },
        clear: () => {
            store = {};
        },
    };
})();
// Only define window and document in Node.js environment
if (typeof window === 'undefined') {
    // @ts-ignore
    global.window = {
        localStorage: localStorageMock,
        sessionStorage: sessionStorageMock,
        addEventListener: vi.fn(),
        removeEventListener: vi.fn(),
        // Add other window properties as needed
    };
    // @ts-ignore
    global.document = {
        addEventListener: vi.fn(),
        removeEventListener: vi.fn(),
        // Add other document properties as needed
    };
}
// Assign mocks to global object
Object.defineProperty(global, 'localStorage', {
    value: localStorageMock,
    configurable: true,
    enumerable: true,
    writable: true,
});
Object.defineProperty(window, 'sessionStorage', {
    value: sessionStorageMock,
    configurable: true,
    enumerable: true,
    writable: true,
});
// Mock matchMedia
Object.defineProperty(window, 'matchMedia', {
    writable: true,
    value: vi.fn().mockImplementation(query => ({
        matches: false,
        media: query,
        onchange: null,
        addListener: vi.fn(),
        removeListener: vi.fn(),
        addEventListener: vi.fn(),
        removeEventListener: vi.fn(),
        dispatchEvent: vi.fn(),
    })),
});
// Mock ResizeObserver
class ResizeObserverMock {
    constructor() {
        this.observe = vi.fn();
        this.unobserve = vi.fn();
        this.disconnect = vi.fn();
    }
}
window.ResizeObserver = ResizeObserverMock;
