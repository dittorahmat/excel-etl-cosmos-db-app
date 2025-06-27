// Mock the authentication middleware
export const mockAuthenticateToken = vi.fn((req: any, _res: any, next: any) => {
  req.user = { oid: 'user-123' };
  next();
});

// Mock the auth module
const authMocks = {
  authenticateToken: mockAuthenticateToken,
};

export default authMocks;
