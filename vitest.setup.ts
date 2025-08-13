// Test environment setup for Vitest
// Add type declarations for the polyfills

// Export an empty object to make this a module
export {};

// Extend the global types
declare global {
  // Extend the Element interface with our polyfilled methods
  interface Element {
    hasPointerCapture(pointerId: number): boolean;
    scrollIntoView: (arg?: boolean | ScrollIntoViewOptions) => void;
  }
  
  // Extend the Window interface
  interface Window {
    ResizeObserver: typeof ResizeObserver;
  }
}

// Define the ResizeObserver interface if it doesn't exist
type ResizeObserverBoxOptions = 'border-box' | 'content-box' | 'device-pixel-content-box';

interface ResizeObserverOptions {
  box?: ResizeObserverBoxOptions;
}

interface ResizeObserverCallback {
  (entries: ResizeObserverEntry[], observer: ResizeObserver): void;
}

// Define the ResizeObserver interface
interface ResizeObserver {
  observe(target: Element, options?: ResizeObserverOptions): void;
  unobserve(target: Element): void;
  disconnect(): void;
}

// Polyfill for hasPointerCapture
if (typeof Element !== 'undefined' && !('hasPointerCapture' in Element.prototype)) {
  const proto = Element.prototype as any;
  proto.hasPointerCapture = function(_pointerId: number): boolean {
    return false;
  };
}

// Polyfill for scrollIntoView
if (typeof Element !== 'undefined' && !('scrollIntoView' in Element.prototype)) {
  const proto = Element.prototype as any;
  proto.scrollIntoView = function() {};
}

// Polyfill for ResizeObserver
if (typeof global !== 'undefined' && typeof (global as any).ResizeObserver === 'undefined') {
  class ResizeObserverImpl implements ResizeObserver {
    constructor(private callback: ResizeObserverCallback) {}
    
    observe(_target: Element, _options?: ResizeObserverOptions): void {}
    unobserve(_target: Element): void {}
    disconnect(): void {}
  }
  
  (global as any).ResizeObserver = ResizeObserverImpl;
}
