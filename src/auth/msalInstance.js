import { PublicClientApplication } from '@azure/msal-browser';
import { msalConfig } from './authConfig.ts';
import { assertMsalConfig } from './authUtils';
// Create MSAL instance
export const msalInstance = new PublicClientApplication(assertMsalConfig(msalConfig) ? msalConfig : { auth: { clientId: '' } });
