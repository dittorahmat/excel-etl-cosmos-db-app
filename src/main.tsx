import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import App from './App';
import './index.css';
import './App.css';

// Extend the Window interface to add our custom properties
declare global {
  interface Window {
    isAuthenticated?: boolean;
    ENV?: Record<string, string>;
    APP_CONFIG?: {
      auth?: {
        useDummyAuth?: boolean;
      };
    };
    USE_DUMMY_AUTH?: boolean;
    FORCE_DUMMY_AUTH?: boolean;
    SKIP_MSAL_INIT?: boolean;
    authEnabled?: boolean;
  }
}

// Wait for app initialization to complete before rendering
function renderApp() {
  // Check if authentication is disabled
  const windowEnvViteAuthEnabled = window.ENV?.VITE_AUTH_ENABLED || (window as any).__APP_CONFIG__?.VITE_AUTH_ENABLED;
  const windowEnvAuthEnabled = window.ENV?.AUTH_ENABLED || (window as any).__APP_CONFIG__?.AUTH_ENABLED;

  // Check if auth is explicitly enabled in any of the possible sources
  const authExplicitlyEnabled = 
    import.meta.env.VITE_AUTH_ENABLED === 'true' || 
    import.meta.env.AUTH_ENABLED === 'true' ||
    windowEnvViteAuthEnabled === 'true' || 
    windowEnvAuthEnabled === 'true' ||
    windowEnvViteAuthEnabled === true || 
    windowEnvAuthEnabled === true;

  // Check if auth is explicitly disabled
  const authExplicitlyDisabled = 
    import.meta.env.VITE_AUTH_ENABLED === 'false' || 
    import.meta.env.AUTH_ENABLED === 'false' ||
    windowEnvViteAuthEnabled === 'false' || 
    windowEnvAuthEnabled === 'false' ||
    windowEnvViteAuthEnabled === false || 
    windowEnvAuthEnabled === false;
                   
  const isDevelopment = import.meta.env.DEV;

  // Use dummy auth only if:
  // 1. Auth is explicitly disabled, OR
  // 2. We're in development and auth is not explicitly enabled
  const useDummyAuth = 
    authExplicitlyDisabled || 
    (!authExplicitlyEnabled && isDevelopment);

  // Log environment variables for debugging
  console.log('Environment variables:', {
    VITE_AUTH_ENABLED: import.meta.env.VITE_AUTH_ENABLED,
    AUTH_ENABLED: import.meta.env.AUTH_ENABLED,
    NODE_ENV: import.meta.env.NODE_ENV,
    MODE: import.meta.env.MODE,
    isDevelopment,
    useDummyAuth
  });

  // Log the authentication mode for debugging
  console.log(`Authentication mode: ${useDummyAuth ? 'MOCK (development or disabled)' : 'AZURE AD'}`);

  // Create a simple app wrapper that skips auth when disabled
  const AppWrapper = () => {
    if (useDummyAuth) {
      // Set a flag in localStorage to indicate dummy auth is being used
      localStorage.setItem('useDummyAuth', 'true');
      
      // Add a global function to check auth status
      window.isAuthenticated = true;
      
      // Mock user data
      const mockUser = {
        name: isDevelopment ? 'Development User' : 'User',
        username: isDevelopment ? 'dev@example.com' : 'user@example.com',
        roles: ['user', ...(isDevelopment ? ['admin'] : [])]
      };
      
      // Store user data in localStorage
      localStorage.setItem('user', JSON.stringify(mockUser));
    } else {
      localStorage.removeItem('useDummyAuth');
    }
    
    return <App />;
  };

  // Render the app
  createRoot(document.getElementById('root')!).render(
    <StrictMode>
      <AppWrapper />
    </StrictMode>
  );
}

// Always wait for the app to be initialized before rendering
// This ensures the config.js file is loaded before the app starts
window.addEventListener('appInitialized', renderApp);
