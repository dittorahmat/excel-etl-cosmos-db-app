declare global {
    interface Window {
        ResizeObserver: typeof ResizeObserver;
    }
}
export {};
