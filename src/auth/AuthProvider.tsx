import { MsalProvider, useMsal } from '@azure/msal-react';
import type { Configuration } from '@azure/msal-browser';
import { PublicClientApplication } from '@azure/msal-browser';
import { createContext, useContext, useEffect, useState } from 'react';
import type { ReactNode } from 'react';
import { msalConfig } from '../authConfig';

export const msalInstance = new PublicClientApplication(msalConfig as Configuration);

interface AuthContextType {
  isAuthenticated: boolean;
  user: any;
  login: () => Promise<void>;
  logout: () => Promise<void>;
  getAccessToken: () => Promise<string | null>;
}

const AuthContext = createContext<AuthContextType | null>(null);

export const AuthProvider = ({ children }: { children: ReactNode }) => {
  const [isAuthenticated, setIsAuthenticated] = useState<boolean>(false);
  const [user, setUser] = useState<any>(null);
  const { instance, accounts } = useMsal();

  useEffect(() => {
    const checkAuth = async () => {
      try {
        const activeAccount = accounts[0];
        if (activeAccount) {
          setUser(activeAccount);
          setIsAuthenticated(true);
          // Store token in localStorage
          const tokenResponse = await instance.acquireTokenSilent({
            scopes: ['User.Read'],
            account: activeAccount
          });
          localStorage.setItem('msalToken', tokenResponse.accessToken);
        }
      } catch (error) {
        console.error('Auth check error:', error);
        setIsAuthenticated(false);
        setUser(null);
        localStorage.removeItem('msalToken');
      }
    };

    checkAuth();
  }, [accounts, instance]);

  const login = async () => {
    try {
      await instance.loginPopup({
        scopes: ['User.Read'],
        prompt: 'select_account',
      });
    } catch (error) {
      console.error('Login error:', error);
    }
  };

  const logout = async () => {
    try {
      await instance.logoutPopup();
      setUser(null);
      setIsAuthenticated(false);
      localStorage.removeItem('msalToken');
    } catch (error) {
      console.error('Logout error:', error);
    }
  };

  const getAccessToken = async (): Promise<string | null> => {
    try {
      if (!accounts[0]) return null;
      const tokenResponse = await instance.acquireTokenSilent({
        scopes: ['User.Read'],
        account: accounts[0],
      });
      localStorage.setItem('msalToken', tokenResponse.accessToken);
      return tokenResponse.accessToken;
    } catch (error) {
      console.error('Failed to get access token:', error);
      return null;
    }
  };

  return (
    <AuthContext.Provider value={{ isAuthenticated, user, login, logout, getAccessToken }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = (): AuthContextType => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};

export const AuthWrapper = ({ children }: { children: ReactNode }) => (
  <MsalProvider instance={msalInstance}>
    <AuthProvider>{children}</AuthProvider>
  </MsalProvider>
);
