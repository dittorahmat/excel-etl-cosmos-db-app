import '@testing-library/jest-dom';

if (!('hasPointerCapture' in Element.prototype)) {
  Element.prototype.hasPointerCapture = function(_pointerId) {
    return false;
  };
}

if (!('scrollIntoView' in Element.prototype)) {
  Element.prototype.scrollIntoView = function() {};
}

// Polyfill for ResizeObserver
global.ResizeObserver = class ResizeObserver {
  observe() {}
  unobserve() {}
  disconnect() {}
};
