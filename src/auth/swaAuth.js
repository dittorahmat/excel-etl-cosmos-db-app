/**
 * Azure Static Web Apps Authentication Helper
 * This provides a simple interface to work with Azure SWA's built-in authentication
 */

const isLocalDevelopment = process.env.NODE_ENV === 'development';

// Mock user for local development
const mockUser = {
  clientPrincipal: {
    identityProvider: 'aad',
    userId: 'dummy-user-id',
    userDetails: 'user@example.com',
    userRoles: ['authenticated'],
    claims: [
      { typ: 'name', val: 'Test User' },
      { typ: 'preferred_username', val: 'user@example.com' }
    ]
  }
};

/**
 * Check if user is authenticated
 * @returns {Promise<Object|null>} User info if authenticated, null otherwise
 */
export const getUser = async () => {
  if (isLocalDevelopment) {
    return mockUser.clientPrincipal;
  }

  try {
    const response = await fetch('/.auth/me');
    if (!response.ok) {
      throw new Error(`Auth request failed with status ${response.status}`);
    }
    const payload = await response.json();
    return payload.clientPrincipal || null;
  } catch (error) {
    console.error('Failed to get user:', error);
    return null;
  }
};

/**
 * Redirect to login page
 * @param {string} [redirectTo] - Path to redirect to after login
 */
export const login = (redirectTo = window.location.pathname) => {
  if (isLocalDevelopment) {
    // In local development, just redirect to home after "login"
    window.location.href = redirectTo;
    return;
  }
  
  const redirectUri = window.location.origin + redirectTo;
  window.location.href = `/.auth/login/aad?post_login_redirect_uri=${encodeURIComponent(redirectUri)}`;
};

/**
 * Logout the current user
 * @param {string} [redirectTo] - Path to redirect to after logout
 */
export const logout = (redirectTo = '/') => {
  if (isLocalDevelopment) {
    // In local development, just redirect to login page
    window.location.href = '/login';
    return;
  }
  
  const redirectUri = window.location.origin + redirectTo;
  window.location.href = `/.auth/logout?post_logout_redirect_uri=${encodeURIComponent(redirectUri)}`;
};

/**
 * Get the authentication token
 * @returns {Promise<string|null>} Authentication token or null if not authenticated
 */
export const getAuthToken = async () => {
  if (isLocalDevelopment) {
    return 'dummy-auth-token';
  }

  try {
    const response = await fetch('/.auth/me');
    if (!response.ok) {
      throw new Error(`Auth request failed with status ${response.status}`);
    }
    const payload = await response.json();
    return payload.clientPrincipal?.accessToken || null;
  } catch (error) {
    console.error('Failed to get auth token:', error);
    return null;
  }
};

/**
 * Check if user has a specific role
 * @param {string} role - Role to check
 * @returns {Promise<boolean>} True if user has the role
 */
export const hasRole = async (role) => {
  const user = await getUser();
  return user?.userRoles?.includes(role) || false;
};

/**
 * Check if user is authenticated
 * @returns {Promise<boolean>} True if user is authenticated
 */
export const isAuthenticated = async () => {
  const user = await getUser();
  return !!user;
};
