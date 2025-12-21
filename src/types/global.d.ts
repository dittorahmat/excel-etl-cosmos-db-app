import { PublicClientApplication } from '@azure/msal-browser';

declare global {
  interface Window {
    msalInstance: PublicClientApplication;
    ENV?: {
      VITE_AUTH_ENABLED?: string | boolean;
      AUTH_ENABLED?: string | boolean;
    };
    USE_DUMMY_AUTH?: boolean;
    FORCE_DUMMY_AUTH?: boolean;
    SKIP_MSAL_INIT?: boolean;
    APP_CONFIG?: {
      VITE_AUTH_ENABLED?: string | boolean;
      AUTH_ENABLED?: string | boolean;
    };
    __APP_CONFIG__?: {
      VITE_AUTH_ENABLED?: string | boolean;
      AUTH_ENABLED?: string | boolean;
    };
  }
}

export {};