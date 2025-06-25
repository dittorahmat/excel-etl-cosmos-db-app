import { PublicClientApplication } from '@azure/msal-browser';

declare global {
  interface Window {
    msalInstance: PublicClientApplication;
  }
}