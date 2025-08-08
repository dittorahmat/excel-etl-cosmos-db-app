import { jsx as _jsx } from "react/jsx-runtime";
import { MsalProvider } from '@azure/msal-react';
import { msalInstance } from './msalInstance';
import { AuthProvider } from './AuthProvider';
const AuthWrapper = ({ children }) => (_jsx(MsalProvider, { instance: msalInstance, children: _jsx(AuthProvider, { children: children }) }));
export { AuthWrapper };
