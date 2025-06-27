interface JwtPayload {
  oid: string;
  name: string;
  email: string;
  roles: string[];
  iss: string;
  aud: string;
  iat: number;
  exp: number;
}

const jwt = {
  verify: vi.fn().mockImplementation((token: string, _getKey: any, options: any, callback: (error: Error | null, decoded?: JwtPayload) => void) => {
    // Mock valid token
    if (token === 'valid.token.here') {
      const decoded = {
        oid: 'user-123',
        name: 'Test User',
        email: 'test@example.com',
        roles: ['user'],
        iss: 'https://login.microsoftonline.com/test-tenant-id/v2.0',
        aud: 'test-client-id',
        iat: Math.floor(Date.now() / 1000) - 300, // 5 mins ago
        exp: Math.floor(Date.now() / 1000) + 3600, // 1 hour from now
      };
      return callback(null, decoded);
    }
    // Mock expired token
    if (token === 'expired.token.here') {
      const error = new Error('jwt expired');
      (error as any).name = 'TokenExpiredError';
      return callback(error, undefined);
    }
    // Mock invalid token
    return callback(new Error('invalid token'), undefined);
  })
};

export default jwt;
