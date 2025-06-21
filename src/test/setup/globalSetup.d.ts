declare global {
    interface Window {
        matchMedia: (query: string) => MediaQueryList;
    }
}
export {};
