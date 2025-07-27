import { vi } from 'vitest';

export const mockAuthMiddleware = vi.fn((req, res, next) => next());

export const requireAuthOrApiKey = vi.fn(() => mockAuthMiddleware);
