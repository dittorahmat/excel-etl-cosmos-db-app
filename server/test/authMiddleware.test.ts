import { describe, it, expect, vi, beforeEach } from 'vitest';
import type { Request, Response, NextFunction } from 'express';
import { validateToken } from '../src/middleware/auth.js';

// Mock modules first to avoid hoisting issues
vi.mock('jsonwebtoken', () => ({
  default: {
    verify: vi.fn(),
  },
}));

// Create mock functions after mocks are set up
const mockGetSigningKey = vi.fn();

vi.mock('jwks-rsa', () => ({
  default: vi.fn(() => ({
    getSigningKey: () => mockGetSigningKey,
  })),
}));

// Import after mocks are set up
import jwt from 'jsonwebtoken';
import jwksClient from 'jwks-rsa';

// Mock environment variables
process.env.AZURE_TENANT_ID = 'test-tenant-id';
process.env.AZURE_CLIENT_ID = 'test-client-id';
process.env.AZURE_CLIENT_SECRET = 'test-client-secret';

describe('Token Validation Middleware', () => {
  let mockRequest: Partial<Request>;
  let mockResponse: Partial<Response>;
  let nextFunction: NextFunction;
  let jsonMock: ReturnType<typeof vi.fn>;
  let statusMock: ReturnType<typeof vi.fn>;

  beforeEach(() => {
    // Reset all mocks
    vi.clearAllMocks();

    // Setup mock request
    mockRequest = {
      headers: {},
      get: vi.fn()
    };

    // Setup mock response
    jsonMock = vi.fn();
    statusMock = vi.fn().mockReturnThis();
    mockResponse = {
      status: statusMock,
      json: jsonMock,
    };

    // Setup next function
    nextFunction = vi.fn();

    // Reset environment variables
    delete process.env.AUTH_ENABLED;
  });

  describe('validateToken', () => {
    it('should call next() when AUTH_ENABLED is false', async () => {
      // Arrange
      process.env.AUTH_ENABLED = 'false';

      // Act
      await validateToken(
        mockRequest as Request,
        mockResponse as Response,
        nextFunction
      );

      // Assert
      expect(nextFunction).toHaveBeenCalled();
      expect(statusMock).not.toHaveBeenCalled();
    });

    it('should return 401 when no token is provided', async () => {
      // Arrange
      mockRequest.headers = {};

      // Act
      await validateToken(
        mockRequest as Request,
        mockResponse as Response,
        nextFunction
      );

      // Assert
      expect(statusMock).toHaveBeenCalledWith(401);
      expect(jsonMock).toHaveBeenCalledWith({
        success: false,
        error: 'Unauthorized',
        message: 'No token provided',
      });
      expect(nextFunction).not.toHaveBeenCalled();
    });

    it('should return 401 when token is invalid', async () => {
      // Arrange
      mockRequest.headers = {
        authorization: 'Bearer invalid.token.here',
      };

      // Mock jwt.verify to simulate invalid token
      vi.mocked(jwt.verify).mockImplementationOnce(((_token: string, _getKey: any, _options: any, callback: any) => {
        callback(new Error('invalid token'), null);
      }) as any);

      // Act
      await validateToken(
        mockRequest as Request,
        mockResponse as Response,
        nextFunction
      );

      // Assert
      expect(statusMock).toHaveBeenCalledWith(401);
      expect(jsonMock).toHaveBeenCalledWith({
        success: false,
        error: 'Unauthorized',
        message: 'Invalid or expired token',
      });
      expect(nextFunction).not.toHaveBeenCalled();
    });

    it('should return 401 when token is expired', async () => {
      // Arrange
      mockRequest.headers = {
        authorization: 'Bearer expired.token.here',
      };

      // Mock jwt.verify to simulate expired token
      vi.mocked(jwt.verify).mockImplementationOnce(((_token: string, _getKey: any, _options: any, callback: any) => {
        const error = new Error('jwt expired');
        (error as any).name = 'TokenExpiredError';
        callback(error, null);
      }) as any);

      // Act
      await validateToken(
        mockRequest as Request,
        mockResponse as Response,
        nextFunction
      );

      // Assert
      expect(statusMock).toHaveBeenCalledWith(401);
      expect(jsonMock).toHaveBeenCalledWith({
        success: false,
        error: 'Unauthorized',
        message: 'Invalid or expired token',
      });
      expect(nextFunction).not.toHaveBeenCalled();
    });

    it('should set req.user and call next() when token is valid', async () => {
      // Arrange
      const mockUser = {
        oid: 'user-123',
        name: 'Test User',
        email: 'test@example.com',
        roles: ['user'],
      };

      // Create a fresh mock request for this test
      const testRequest = {
        ...mockRequest,
        headers: {
          ...mockRequest.headers,
          authorization: 'Bearer valid.token.here',
        },
      };

      // Mock the JWT verification to return the mock user
      vi.mocked(jwt.verify).mockImplementationOnce((_token: string, _getKey: any, _options: any, callback: any) => {
        callback(null, mockUser);
      });

      // Mock the getSigningKey implementation for this test case
      mockGetSigningKey.mockImplementationOnce((_kid, cb) => {
        cb(null, {
          getPublicKey: () => 'public-key',
          rsaPublicKey: 'public-key',
          publicKey: 'public-key'
        });
      });

      // Create a spy for the next function
      const nextSpy = vi.fn();

      // Act
      await validateToken(
        testRequest as Request,
        mockResponse as Response,
        nextSpy
      );

      // Assert
      expect(testRequest.user).toEqual(mockUser);
      expect(nextSpy).toHaveBeenCalled();
      expect(statusMock).not.toHaveBeenCalled();
      expect(jsonMock).not.toHaveBeenCalled();
    });
  });
});
