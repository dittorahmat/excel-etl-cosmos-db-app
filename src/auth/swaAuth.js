/**
 * Azure Static Web Apps Authentication Helper
 * This provides a simple interface to work with Azure SWA's built-in authentication
 */

/**
 * Check if user is authenticated
 * @returns {Promise<Object|null>} User info if authenticated, null otherwise
 */
export const getUser = async () => {
  try {
    const response = await fetch('/.auth/me');
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
  window.location.href = `/.auth/login/aad?post_login_redirect_uri=${encodeURIComponent(window.location.origin + redirectTo)}`;
};

/**
 * Logout the current user
 * @param {string} [redirectTo] - Path to redirect to after logout
 */
export const logout = (redirectTo = '/') => {
  window.location.href = `/.auth/logout?post_logout_redirect_uri=${encodeURIComponent(window.location.origin + redirectTo)}`;
};

/**
 * Get the authentication token
 * @returns {Promise<string|null>} Authentication token or null if not authenticated
 */
export const getAuthToken = async () => {
  try {
    const response = await fetch('/.auth/me');
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
