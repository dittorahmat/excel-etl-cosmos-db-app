import '@testing-library/jest-dom/vitest';
declare global {
    interface Window {
        ResizeObserver: typeof ResizeObserver;
        matchMedia: (query: string) => MediaQueryList;
    }
}
