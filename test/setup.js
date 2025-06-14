// Polyfill for fetch in Node.js
import { fetch, Headers, Request, Response } from 'node-fetch';
import { TextEncoder, TextDecoder } from 'util';

// Add fetch to global
if (!globalThis.fetch) {
  globalThis.fetch = fetch;
  globalThis.Headers = Headers;
  globalThis.Request = Request;
  globalThis.Response = Response;
}

// Add TextEncoder and TextDecoder
if (!globalThis.TextEncoder) {
  globalThis.TextEncoder = TextEncoder;
  globalThis.TextDecoder = TextDecoder;
}

// Add FormData
if (!globalThis.FormData) {
  const { FormData } = await import('undici');
  globalThis.FormData = FormData;
}

// Add Blob
if (!globalThis.Blob) {
  const { Blob } = await import('buffer');
  globalThis.Blob = Blob;
}
