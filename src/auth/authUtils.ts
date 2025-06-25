import type { Configuration } from '@azure/msal-browser';

// Token refresh buffer time (5 minutes before expiration)
export const TOKEN_REFRESH_BUFFER = 5 * 60 * 1000;

// Type assertion with proper configuration check
export const assertMsalConfig = (config: unknown): config is Configuration => {
  return (
    config !== null &&
    typeof config === 'object' &&
    'auth' in (config as Configuration)
  );
};

// Helper to check if token is expired or about to expire
export const isTokenExpired = (tokenExpiresOn: number): boolean => {
  const now = new Date().getTime();
  return tokenExpiresOn - now < TOKEN_REFRESH_BUFFER;
};
