import { CosmosRecord } from '../types/azure.js';

/**
 * Represents an API key in the system
 */
export interface ApiKey extends CosmosRecord {
  [key: string]: unknown; // This allows for dynamic properties while maintaining type safety
  /**
   * The unique identifier for the API key (not the actual key value)
   */
  id: string;

  /**
   * User ID from Azure AD (oid claim)
   */
  userId: string;

  /**
   * Hashed API key value (using SHA-256)
   */
  keyHash: string;

  /**
   * Display name for the API key (user-provided)
   */
  name: string;

  /**
   * Whether the API key is active
   */
  isActive: boolean;

  /**
   * Creation timestamp
   */
  createdAt: string;

  /**
   * Last used timestamp (updated on each successful use)
   */
  lastUsedAt?: string;

  /**
   * Expiration timestamp (optional)
   */
  expiresAt?: string;

  /**
   * List of allowed IP addresses (optional, for additional security)
   */
  allowedIps?: string[];

  /**
   * Metadata for future extensibility
   */
  metadata?: Record<string, unknown>;
}

export interface CreateApiKeyRequest {
  /**
   * Display name for the API key
   */
  name: string;

  /**
   * Optional expiration date (ISO string)
   */
  expiresAt?: string;

  /**
   * Optional list of allowed IP addresses
   */
  allowedIps?: string[];
}

export interface ApiKeyResponse {
  /**
   * The actual API key value (only shown once on creation)
   */
  key: string;

  /**
   * API key metadata
   */
  id: string;
  name: string;
  createdAt: string;
  expiresAt?: string;
  allowedIps?: string[];
}

export interface ApiKeyListResponse {
  keys: Omit<ApiKey, 'keyHash'>[];
}

export interface RevokeApiKeyParams {
  keyId: string;
  userId: string;
}

export interface ValidateApiKeyParams {
  key: string;
  ipAddress?: string;
}

export interface UpdateApiKeyParams {
  /**
   * The ID of the API key to update
   */
  id: string;

  /**
   * New name for the API key (optional)
   */
  name?: string;

  /**
   * Whether the API key is active (optional)
   */
  isActive?: boolean;

  /**
   * New expiration date (optional)
   */
  expiresAt?: string;

  /**
   * New list of allowed IPs (optional)
   */
  allowedIps?: string[];

  /**
   * Timestamp of last usage (auto-updated)
   */
  lastUsedAt?: string;

  /**
   * IP address of last usage (auto-updated)
   */
  lastUsedFromIp?: string;

  /**
   * Optional description for the API key
   */
  description?: string;
}
