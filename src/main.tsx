import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import './index.css';
import App from './App';

// Check if authentication is disabled
const windowEnvViteAuthEnabled = window.ENV?.VITE_AUTH_ENABLED || (window as any).__APP_CONFIG__?.VITE_AUTH_ENABLED;
const windowEnvAuthEnabled = window.ENV?.AUTH_ENABLED || (window as any).__APP_CONFIG__?.AUTH_ENABLED;

const authEnabled = import.meta.env.VITE_AUTH_ENABLED !== 'false' && 
                   import.meta.env.AUTH_ENABLED !== 'false' && 
                   windowEnvViteAuthEnabled !== 'false' && 
                   windowEnvAuthEnabled !== 'false';
                   
const isDevelopment = import.meta.env.DEV;
const useDummyAuth = !authEnabled || isDevelopment;

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
