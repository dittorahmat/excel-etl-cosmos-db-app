import { vi, afterEach, afterAll } from 'vitest';
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
// Mock localStorage and sessionStorage
const localStorageMock = new MemoryStorage();
const sessionStorageMock = new MemoryStorage();
// Mock window.matchMedia
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
// Mock localStorage
Object.defineProperty(window, 'localStorage', {
    value: localStorageMock,
});
// Mock sessionStorage
Object.defineProperty(window, 'sessionStorage', {
    value: sessionStorageMock,
});
// Clean up after each test
afterEach(() => {
    localStorageMock.clear();
    sessionStorageMock.clear();
    vi.clearAllMocks();
});
// Clean up after all tests are done
afterAll(() => {
    vi.restoreAllMocks();
});
