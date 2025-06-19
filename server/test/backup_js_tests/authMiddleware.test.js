import jwt from 'jsonwebtoken';
import jwksClient from 'jwks-rsa';
import { validateToken } from '../src/middleware/auth';
// Mock the modules
jest.mock('jsonwebtoken');
jest.mock('jwks-rsa');
// Mock environment variables
process.env.AZURE_TENANT_ID = 'test-tenant-id';
process.env.AZURE_CLIENT_ID = 'test-client-id';
process.env.AZURE_CLIENT_SECRET = 'test-client-secret';
describe('Token Validation Middleware', () => {
    let mockRequest;
    let mockResponse;
    let nextFunction;
    let jsonMock;
    let statusMock;
    beforeEach(() => {
        // Reset all mocks
        jest.clearAllMocks();
        // Setup mock request
        mockRequest = {
            headers: {},
        };
        // Setup mock response
        jsonMock = jest.fn();
        statusMock = jest.fn().mockReturnThis();
        mockResponse = {
            status: statusMock,
            json: jsonMock,
        };
        // Setup next function
        nextFunction = jest.fn();
        // Reset environment variables
        delete process.env.AUTH_ENABLED;
    });
    describe('validateToken', () => {
        it('should call next() when AUTH_ENABLED is false', async () => {
            // Arrange
            process.env.AUTH_ENABLED = 'false';
            // Act
            await validateToken(mockRequest, mockResponse, nextFunction);
            // Assert
            expect(nextFunction).toHaveBeenCalled();
            expect(statusMock).not.toHaveBeenCalled();
        });
        it('should return 401 when no token is provided', async () => {
        // Arrange
        mockRequest.headers = {};
        
        // Act
        await validateToken(mockRequest, mockResponse, nextFunction);
        
        // Assert
        expect(mockResponse.status).toHaveBeenCalledWith(401);
        expect(mockResponse.json).toHaveBeenCalledWith({
            error: 'No token provided',
            message: 'Authentication token is missing',
        });
        expect(nextFunction).not.toHaveBeenCalled();
    });
    
    it('should return 401 when token is invalid', async () => {
        // Arrange
        mockRequest.headers = {
            authorization: 'Bearer invalid-token',
        };
        
        // Mock JWT verification to throw an error
        mockVerify.mockImplementationOnce(() => {
            throw new Error('Invalid token');
        });
        
        // Act
        await validateToken(mockRequest, mockResponse, nextFunction);
        
        // Assert
        expect(mockResponse.status).toHaveBeenCalledWith(401);
        expect(mockResponse.json).toHaveBeenCalledWith({
            error: 'Invalid token',
            message: 'Failed to authenticate token',
        });
        expect(nextFunction).not.toHaveBeenCalled();
    });
    
    it('should call next() when token is valid', async () => {
        // Arrange
        const testToken = 'valid-test-token';
        const testUser = {
            oid: 'test-oid',
            name: 'Test User',
            email: 'test@example.com',
            roles: ['user'],
            scp: 'user.read',
        };
        
        mockRequest.headers = {
            authorization: `Bearer ${testToken}`,
        };
        
        // Act
        await validateToken(mockRequest, mockResponse, nextFunction);
        
        // Assert
        expect(nextFunction).toHaveBeenCalled();
        expect(mockRequest.user).toEqual(testUser);
        expect(mockResponse.status).not.toHaveBeenCalled();
    });
            // Assert
            expect(statusMock).toHaveBeenCalledWith(401);
            expect(jsonMock).toHaveBeenCalledWith({
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
            jwt.verify.mockImplementationOnce((_token, _getKey, _options, callback) => {
                callback(new Error('invalid token'), null);
            });
            // Act
            await validateToken(mockRequest, mockResponse, nextFunction);
            // Assert
            expect(statusMock).toHaveBeenCalledWith(401);
            expect(jsonMock).toHaveBeenCalledWith({
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
            jwt.verify.mockImplementationOnce((_token, _getKey, _options, callback) => {
                const error = new Error('jwt expired');
                error.name = 'TokenExpiredError';
                callback(error, null);
            });
            // Act
            await validateToken(mockRequest, mockResponse, nextFunction);
            // Assert
            expect(statusMock).toHaveBeenCalledWith(401);
            expect(jsonMock).toHaveBeenCalledWith({
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
            mockRequest.headers = {
                authorization: 'Bearer valid.token.here',
            };
            // Mock jwt.verify to simulate valid token
            jwt.verify.mockImplementationOnce((_token, _getKey, _options, callback) => {
                callback(null, mockUser);
            });
            // Mock jwksClient.getSigningKey
            const mockGetSigningKey = jest.fn();
            jwksClient.mockImplementation(() => ({
                getSigningKey: mockGetSigningKey,
            }));
            // Act
            await validateToken(mockRequest, mockResponse, nextFunction);
            // Assert
            expect(mockRequest.user).toEqual(mockUser);
            expect(nextFunction).toHaveBeenCalled();
            expect(statusMock).not.toHaveBeenCalled();
        });
    });
});
