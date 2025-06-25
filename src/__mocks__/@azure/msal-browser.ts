// Mock implementation of @azure/msal-browser
import { vi } from 'vitest';

export const PublicClientApplication = vi.fn().mockImplementation(() => ({
  initialize: vi.fn().mockResolvedValue(undefined),
  loginPopup: vi.fn().mockResolvedValue({
    account: { name: 'Test User', username: 'test@example.com' },
    accessToken: 'test-access-token',
    idToken: 'test-id-token',
    scopes: ['api://test-api-scope/.default'],
  }),
  logout: vi.fn().mockResolvedValue(undefined),
  acquireTokenSilent: vi.fn().mockResolvedValue({
    accessToken: 'test-access-token',
    idToken: 'test-id-token',
    expiresOn: new Date(Date.now() + 3600000),
  }),
  getAllAccounts: vi.fn().mockReturnValue([{
    homeAccountId: 'test-account-id',
    environment: 'test',
    tenantId: 'test-tenant-id',
    username: 'test@example.com',
    localAccountId: 'local-test-account-id',
    name: 'Test User',
  }]),
  handleRedirectPromise: vi.fn().mockResolvedValue(null),
  getActiveAccount: vi.fn().mockReturnValue({
    homeAccountId: 'test-account-id',
    environment: 'test',
    tenantId: 'test-tenant-id',
    username: 'test@example.com',
    localAccountId: 'local-test-account-id',
    name: 'Test User',
  }),
  addEventCallback: vi.fn().mockReturnValue('test-callback-id'),
  removeEventCallback: vi.fn(),
  addPerformanceClient: vi.fn(),
  addPerformanceCallback: vi.fn(),
  removePerformanceCallback: vi.fn(),
  enableAccountStorageEvents: vi.fn(),
  disableAccountStorageEvents: vi.fn(),
  setLogger: vi.fn(),
  initializeWrapperLibrary: vi.fn(),
  setNavigationClient: vi.fn(),
  getLogger: vi.fn().mockReturnValue({
    error: vi.fn(),
    warning: vi.fn(),
    info: vi.fn(),
    verbose: vi.fn(),
  }),
}));

export const InteractionRequiredAuthError = class extends Error {
  constructor(message: string, errorCode?: string) {
    super(message);
    this.name = 'InteractionRequiredAuthError';
    this.errorCode = errorCode || 'interaction_required';
  }
  errorCode: string;
};

export const InteractionStatus = {
  Startup: 'startup',
  Login: 'login',
  Logout: 'logout',
  AcquireToken: 'acquireToken',
  SsoSilent: 'ssoSilent',
  HandleRedirect: 'handleRedirect',
  None: 'none',
};

export const EventType = {
  LOGIN_START: 'loginStart',
  LOGIN_SUCCESS: 'loginSuccess',
  LOGIN_FAILURE: 'loginFailure',
  ACQUIRE_TOKEN_START: 'acquireTokenStart',
  ACQUIRE_TOKEN_SUCCESS: 'acquireTokenSuccess',
  ACQUIRE_TOKEN_FAILURE: 'acquireTokenFailure',
  LOGOUT_START: 'logoutStart',
  LOGOUT_END: 'logoutEnd',
  HANDLE_REDIRECT_START: 'handleRedirectStart',
  ACQUIRE_TOKEN_NETWORK_START: 'acquireTokenFromNetworkStart',
  SSO_SILENT_START: 'ssoSilentStart',
  SSO_SILENT_SUCCESS: 'ssoSilentSuccess',
  SSO_SILENT_FAILURE: 'ssoSilentFailure',
  POPUP_OPENED: 'popupOpened',
  POPUP_CLOSED: 'popupClosed',
  POPUP_BLOCKED: 'popupBlocked',
  POPUP_TIMEOUT: 'popupTimeout',
  REDIRECT_START: 'redirectStart',
  REDIRECT_END: 'redirectEnd',
  ACQUIRE_TOKEN_BY_CODE_START: 'acquireTokenByCodeStart',
  ACQUIRE_TOKEN_BY_CODE_SUCCESS: 'acquireTokenByCodeSuccess',
  ACQUIRE_TOKEN_BY_CODE_FAILURE: 'acquireTokenByCodeFailure',
  LOGOUT_SUCCESS: 'logoutSuccess',
  LOGOUT_FAILURE: 'logoutFailure',
  ACQUIRE_TOKEN_NETWORK_END: 'acquireTokenFromNetworkEnd',
};

export const EventMessageUtils = {
  getInteractionStatusFromEvent: vi.fn().mockReturnValue('none'),
  getEventType: vi.fn().mockReturnValue('none'),
};

export const EventError = {
  createNoWindowObjectError: vi.fn().mockReturnValue(new Error('No window object available')),
};

export const UrlString = {
  getHash: vi.fn().mockReturnValue(''),
  getDeserializedHash: vi.fn().mockReturnValue({}),
};
