import { Request, Response, NextFunction } from 'express';
import { vi } from 'vitest';
import * as authMiddleware from '../../../server/src/middleware/auth.js';
import jwt from 'jsonwebtoken';

describe('Auth Middleware', () => {
  let mockRequest: Partial<Request>;
  let mockResponse: Partial<Response>;
  let nextFunction: NextFunction;

  beforeEach(() => {
    mockRequest = {};
    mockResponse = {
      status: vi.fn().mockReturnThis(),
      json: vi.fn(),
    };
    nextFunction = vi.fn();

    // Clear all mocks before each test
    vi.clearAllMocks();

    // Mock process.env.AZURE_TENANT_ID and AZURE_CLIENT_ID for consistent testing
    process.env.AZURE_TENANT_ID = 'mock-tenant-id';
    process.env.AZURE_CLIENT_ID = 'mock-client-id';
  });

  describe('authenticateToken', () => {
    it('should bypass authentication if NODE_ENV is test', async () => {
      process.env.NODE_ENV = 'test';
      mockRequest.headers = { authorization: 'Bearer some-token' };

      await authMiddleware.authenticateToken(mockRequest as Request, mockResponse as Response, nextFunction);

      expect(nextFunction).toHaveBeenCalledTimes(1);
      expect(mockRequest.user).toBeDefined();
      expect(mockRequest.user).toHaveProperty('oid', 'test-user-oid');
      expect(mockResponse.status).not.toHaveBeenCalled();
      expect(mockResponse.json).not.toHaveBeenCalled();
    });

    it('should return 401 if no token is provided and not in test environment', async () => {
      process.env.NODE_ENV = 'development'; // Or 'production'
      mockRequest.headers = {};

      await authMiddleware.authenticateToken(mockRequest as Request, mockResponse as Response, nextFunction);

      expect(nextFunction).not.toHaveBeenCalled();
      expect(mockResponse.status).toHaveBeenCalledWith(401);
      expect(mockResponse.json).toHaveBeenCalledWith({ message: 'Access Denied: No token provided' });
    });

    it('should return 403 if token is invalid and not in test environment', async () => {
      process.env.NODE_ENV = 'development';
      mockRequest.headers = { authorization: 'Bearer invalid-token' };

      // Mock jwt.verify to throw an error for invalid token
      vi.spyOn(jwt, 'verify').mockImplementation((token, secretOrPublicKey, options, callback) => {
        if (callback) {
          callback(new Error('invalid token'), undefined);
        }
      });

      await authMiddleware.authenticateToken(mockRequest as Request, mockResponse as Response, nextFunction);

      expect(nextFunction).not.toHaveBeenCalled();
      expect(mockResponse.status).toHaveBeenCalledWith(403);
      expect(mockResponse.json).toHaveBeenCalledWith({ message: 'Access Denied: Invalid token' });
    });

    it('should attach decoded token to request and call next if token is valid', async () => {
      process.env.NODE_ENV = 'development';
      const validToken = 'valid-jwt-token';
      const decodedPayload = {
        oid: 'user123',
        name: 'Test User',
        email: 'test@example.com',
        roles: ['user'],
        scp: 'user_impersonation',
      };
      mockRequest.headers = { authorization: `Bearer ${validToken}` };

      // Mock jwt.verify to return a decoded payload
      vi.spyOn(jwt, 'verify').mockImplementation((token, secretOrPublicKey, options, callback) => {
        if (callback) {
          callback(null, decodedPayload);
        }
      });

      await authMiddleware.authenticateToken(mockRequest as Request, mockResponse as Response, nextFunction);

      expect(nextFunction).toHaveBeenCalledTimes(1);
      expect(mockRequest.user).toEqual(decodedPayload);
      expect(mockResponse.status).not.toHaveBeenCalled();
      expect(mockResponse.json).not.toHaveBeenCalled();
    });
  });

  describe('checkRole', () => {
    it('should bypass role check if NODE_ENV is test', () => {
      process.env.NODE_ENV = 'test';
      mockRequest.user = { oid: 'test-user-oid', roles: ['user'] };

      const middleware = authMiddleware.checkRole(['admin']);
      middleware(mockRequest as Request, mockResponse as Response, nextFunction);

      expect(nextFunction).toHaveBeenCalledTimes(1);
      expect(mockResponse.status).not.toHaveBeenCalled();
      expect(mockResponse.json).not.toHaveBeenCalled();
    });

    it('should return 403 if user has no roles', () => {
      process.env.NODE_ENV = 'development';
      mockRequest.user = { oid: 'user123' }; // No roles property

      const middleware = authMiddleware.checkRole(['admin']);
      middleware(mockRequest as Request, mockResponse as Response, nextFunction);

      expect(nextFunction).not.toHaveBeenCalled();
      expect(mockResponse.status).toHaveBeenCalledWith(403);
      expect(mockResponse.json).toHaveBeenCalledWith({ message: 'Access Denied: No roles found for user' });
    });

    it('should return 403 if user does not have required role', () => {
      process.env.NODE_ENV = 'development';
      mockRequest.user = { oid: 'user123', roles: ['user'] };

      const middleware = authMiddleware.checkRole(['admin']);
      middleware(mockRequest as Request, mockResponse as Response, nextFunction);

      expect(nextFunction).not.toHaveBeenCalled();
      expect(mockResponse.status).toHaveBeenCalledWith(403);
      expect(mockResponse.json).toHaveBeenCalledWith({ message: 'Access Denied: Insufficient role' });
    });

    it('should call next if user has required role', () => {
      process.env.NODE_ENV = 'development';
      mockRequest.user = { oid: 'user123', roles: ['admin'] };

      const middleware = authMiddleware.checkRole(['admin']);
      middleware(mockRequest as Request, mockResponse as Response, nextFunction);

      expect(nextFunction).toHaveBeenCalledTimes(1);
      expect(mockResponse.status).not.toHaveBeenCalled();
      expect(mockResponse.json).not.toHaveBeenCalled();
    });

    it('should call next if no roles are required', () => {
      process.env.NODE_ENV = 'development';
      mockRequest.user = { oid: 'user123', roles: [] };

      const middleware = authMiddleware.checkRole([]);
      middleware(mockRequest as Request, mockResponse as Response, nextFunction);

      expect(nextFunction).toHaveBeenCalledTimes(1);
      expect(mockResponse.status).not.toHaveBeenCalled();
      expect(mockResponse.json).not.toHaveBeenCalled();
    });
  });
});
