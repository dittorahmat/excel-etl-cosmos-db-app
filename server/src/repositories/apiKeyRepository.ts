import type { AzureCosmosDB } from '../types/azure.js';
import type {
  ApiKey,
  CreateApiKeyRequest,
  ApiKeyResponse,
  ApiKeyListResponse,
  RevokeApiKeyParams,
  ValidateApiKeyParams,
  UpdateApiKeyParams
} from '../types/apiKey.js';
import { generateApiKey } from '../utils/apiKeyUtils.js';
import { hashApiKey, compareApiKey } from '../utils/crypto.js';

const CONTAINER_NAME = 'api-keys';

export interface UpdateApiKeyData {
  lastUsedAt?: string;
  lastUsedFromIp?: string;
  isActive?: boolean;
  name?: string;
  expiresAt?: string;
  allowedIps?: string[];
  description?: string;
}

export class ApiKeyRepository {
  private readonly containerName = 'api-keys';

  constructor(private readonly cosmosDb: AzureCosmosDB) {}
  
  /**
   * Validates an API key
   * @param params Parameters for validation
   * @returns Validation result with key information if valid
   */
  async validateApiKey(params: { 
    key: string; 
    ipAddress?: string 
  }): Promise<{ 
    isValid: boolean; 
    key?: Omit<ApiKey, 'keyHash'>;
    error?: string 
  }> {
    try {
      const { key, ipAddress } = params;
      
      // Basic validation
      if (!key) {
        return { isValid: false, error: 'API key is required' };
      }
      
      // Get the container
      const container = await this.getContainer();
      
      // Query for the key (hash the key for lookup)
      const keyHash = hashApiKey(key);
      const querySpec = {
        query: 'SELECT * FROM c WHERE c.keyHash = @keyHash AND c.isActive = true',
        parameters: [{ name: '@keyHash', value: keyHash }]
      };
      
      const { resources } = await container.items.query(querySpec).fetchAll();
      
      // Check if key exists
      if (!resources || resources.length === 0) {
        return { isValid: false, error: 'Invalid API key' };
      }
      
      const apiKey = resources[0] as ApiKey;
      
      // Check if key is expired
      if (apiKey.expiresAt && new Date(apiKey.expiresAt) < new Date()) {
        return { isValid: false, error: 'API key has expired' };
      }
      
      // Check IP restrictions if any
      if (ipAddress && apiKey.allowedIps && apiKey.allowedIps.length > 0) {
        if (!apiKey.allowedIps.includes(ipAddress)) {
          return { isValid: false, error: 'IP address not allowed' };
        }
      }
      
      // Update last used timestamp
      try {
        await this.update({
          id: apiKey.id,
          lastUsedAt: new Date().toISOString(),
          lastUsedFromIp: ipAddress
        });
      } catch (updateError) {
        console.error('Failed to update last used timestamp:', updateError);
        // Don't fail the request if we can't update the timestamp
      }
      
      // Don't return the key hash in the response
      const { keyHash: _, ...keyWithoutHash } = apiKey;
      return { isValid: true, key: keyWithoutHash };
    } catch (error) {
      console.error('Error validating API key:', error);
      return { 
        isValid: false, 
        error: error instanceof Error ? error.message : 'Error validating API key' 
      };
    }
  }

  /**
   * Initialize the API keys container
   */
  private async getContainer() {
    return this.cosmosDb.container(this.containerName, '/userId');
  }

  async initialize(): Promise<void> {
    try {
      // The container will be created automatically on first use if it doesn't exist
      await this.getContainer();
    } catch (error) {
      console.error('Failed to initialize API key repository:', error);
      throw new Error('Failed to initialize API key repository');
    }
  }

  /**
   * Update an existing API key
   */
  async update(params: UpdateApiKeyParams): Promise<void> {
    const container = await this.getContainer();
    const { id, ...updates } = params;

    try {
      // Get the existing key
      const { resource: existingKey } = await container.item(id, id).read<ApiKey>();

      if (!existingKey) {
        throw new Error('API key not found');
      }

      // Merge updates with existing key
      const updatedKey: ApiKey = {
        ...existingKey,
        ...updates,
        updatedAt: new Date().toISOString()
      };

      await container.items.upsert(updatedKey);
    } catch (error) {
      console.error('Failed to update API key:', error);
      throw new Error('Failed to update API key');
    }
  }

  /**
   * Create a new API key for a user
   */
  async createApiKey(userId: string, request: CreateApiKeyRequest): Promise<ApiKeyResponse> {
    const container = await this.cosmosDb.container(CONTAINER_NAME, '/userId');

    // Generate a new API key
    const apiKeyValue = await generateApiKey();
    const keyHash = hashApiKey(apiKeyValue);
    const now = new Date().toISOString();
    const expiresAt = request.expiresAt ? new Date(request.expiresAt).toISOString() : undefined;

    const apiKey: ApiKey = {
      id: `key_${Date.now()}_${Math.random().toString(36).substring(2, 10)}`,
      userId,
      keyHash,
      name: request.name,
      isActive: true,
      createdAt: now,
      lastUsedAt: undefined,
      expiresAt,
      allowedIps: request.allowedIps,
    };

    try {
      await container.items.upsert(apiKey);

      // Return the API key value only once (it won't be stored in plain text)
      return {
        key: apiKeyValue,
        id: apiKey.id,
        name: apiKey.name,
        createdAt: apiKey.createdAt,
        expiresAt: apiKey.expiresAt,
        allowedIps: apiKey.allowedIps,
      };
    } catch (error) {
      console.error('Failed to create API key:', error);
      throw new Error('Failed to create API key');
    }
  }

  /**
   * Revoke an API key
   */
  async revokeApiKey(params: RevokeApiKeyParams): Promise<boolean> {
    const { keyId, userId } = params;
    const container = await this.cosmosDb.container(CONTAINER_NAME, '/userId');

    try {
      // Find the key by ID and user ID
      const { resource: key } = await container.item(keyId, userId).read<ApiKey>();

      if (!key || key.userId !== userId) {
        return false;
      }

      // Update the key to mark it as inactive
      await container.items.upsert({
        ...key,
        isActive: false,
      });

      return true;
    } catch (error) {
      console.error('Failed to revoke API key:', error);
      return false;
    }
  }

  /**
   * List all API keys for a user
   */
  async listApiKeys(userId: string): Promise<ApiKeyListResponse> {
    const container = await this.getContainer();

    try {
      const { resources } = await container.items
        .query<ApiKey>({
          query: 'SELECT * FROM c WHERE c.userId = @userId',
          parameters: [{ name: '@userId', value: userId }]
        })
        .fetchAll();

      // Don't return the key hash
      const keys = resources.map(({ keyHash, ...rest }) => rest as Omit<ApiKey, 'keyHash'>);

      return { keys };
    } catch (error) {
      console.error('Failed to list API keys:', error);
      throw new Error('Failed to list API keys');
    }
  }
}

export default ApiKeyRepository;
