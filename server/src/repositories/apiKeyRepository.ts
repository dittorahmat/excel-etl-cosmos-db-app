import { AzureCosmosDB } from '../config/azure.js';
import { 
  ApiKey, 
  CreateApiKeyRequest, 
  ApiKeyResponse, 
  ApiKeyListResponse, 
  RevokeApiKeyParams, 
  ValidateApiKeyParams, 
  UpdateApiKeyParams 
} from '../types/apiKey.js';
import { hashApiKey, generateApiKey, safeCompareKeys } from '../utils/apiKeyUtils.js';

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
  private containerName = 'api-keys';
  
  constructor(private cosmosDb: AzureCosmosDB) {}

  /**
   * Initialize the API keys container
   */
  private async getContainer() {
    return this.cosmosDb.container<ApiKey>(this.containerName, '/userId');
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

  /**
   * Validate an API key
   */
  async validateApiKey(params: ValidateApiKeyParams): Promise<{ isValid: boolean; key?: Omit<ApiKey, 'keyHash'> }> {
    const { key, userId, ipAddress } = params;
    const container = await this.cosmosDb.container(CONTAINER_NAME, '/userId');

    try {
      // Get all active keys for the user
      const { resources: keys } = await container.items
        .query<ApiKey>({
          query: 'SELECT * FROM c WHERE c.userId = @userId AND c.isActive = true',
          parameters: [{ name: '@userId', value: userId }],
        })
        .fetchAll();

      // Check each key for a match
      for (const apiKey of keys) {
        // Check IP restrictions if any are set
        if (ipAddress && apiKey.allowedIps && apiKey.allowedIps.length > 0) {
          if (!apiKey.allowedIps.includes(ipAddress)) {
            continue; // Skip if IP doesn't match
          }
        }

        // Check if the key is expired
        if (apiKey.expiresAt && new Date(apiKey.expiresAt) < new Date()) {
          continue; // Skip expired keys
        }

        // Compare the provided key with the stored hash
        const providedKeyHash = hashApiKey(key);
        if (safeCompareKeys(providedKeyHash, apiKey.keyHash)) {
          // Update last used timestamp
          await container.items.upsert({
            ...apiKey,
            lastUsedAt: new Date().toISOString(),
          });

          // Return the key without the hash
          const { keyHash: _, ...keyWithoutHash } = apiKey;
          return { isValid: true, key: keyWithoutHash };
        }
      }

      return { isValid: false };
    } catch (error) {
      console.error('Failed to validate API key:', error);
      return { isValid: false };
    }
  }
}

export default ApiKeyRepository;
