import { Container } from '@azure/cosmos';
import { initializeCosmosDB } from '../cosmos-db/cosmos-db.service.js';
import { AZURE_CONFIG } from '../../config/azure-config.js';
import { logger } from '../../utils/logger.js';

// Define the structure for the authorization configuration document
interface AuthorizationConfig {
  id: string;
  type: string;
  authorizedUploadUsers: string[];
  createdAt: string;
  updatedAt: string;
  lastModifiedBy: string;
  [key: string]: any; // Allow additional properties
}

// Cache for authorized users with timestamp
interface CacheEntry {
  authorizedUsers: string[];
  timestamp: number;
}

export class DatabaseAccessControlService {
  private static cache: Map<string, CacheEntry> = new Map();
  private static readonly CACHE_DURATION_MS = parseInt(process.env.ACCESS_CONTROL_CACHE_DURATION_MS || '300000', 10); // 5 minutes by default (300000 ms), set to 0 to disable caching

  /**
   * Get the container for authorization configuration
   * Uses the default Cosmos DB container
   */
  private static async getAuthContainer(): Promise<Container> {
    const cosmosDb = await initializeCosmosDB();
    // Use the default container since the configuration document should be in the main container
    return cosmosDb.cosmosClient
      .database(AZURE_CONFIG.cosmos.databaseName)
      .container(AZURE_CONFIG.cosmos.containerName);
  }

  /**
   * Get authorized users from Cosmos DB
   * Returns the list of authorized emails from the configuration document
   */
  public static async getAuthorizedUsersFromDatabase(): Promise<string[]> {
    const cacheKey = 'authorized-upload-users';
    const now = Date.now();
    
    // Check if we have a valid cached entry (respect cache duration setting)
    if (DatabaseAccessControlService.CACHE_DURATION_MS > 0) {
      const cached = DatabaseAccessControlService.cache.get(cacheKey);
      if (cached && (now - cached.timestamp) < DatabaseAccessControlService.CACHE_DURATION_MS) {
        logger.debug('Using cached authorized users from database');
        return cached.authorizedUsers;
      }
    }

    try {
      logger.info('Fetching authorized users from Cosmos DB');
      
      const container = await DatabaseAccessControlService.getAuthContainer();
      
      // Query for the authorization configuration document
      const querySpec = {
        query: "SELECT * FROM c WHERE c.id = @id AND c.type = @type",
        parameters: [
          { name: "@id", value: "authorized-upload-users" },
          { name: "@type", value: "authorization-config" }
        ]
      };
      
      const { resources } = await container.items.query<AuthorizationConfig>(querySpec).fetchAll();
      
      let authorizedUsers: string[] = [];
      
      if (resources.length > 0) {
        const configDoc = resources[0];
        if (Array.isArray(configDoc.authorizedUploadUsers)) {
          authorizedUsers = configDoc.authorizedUploadUsers
            .map(email => email.trim().toLowerCase())
            .filter(email => email.length > 0);
          
          logger.info('Successfully retrieved authorized users from database', {
            userCount: authorizedUsers.length,
            users: authorizedUsers
          });
        } else {
          logger.warn('Authorization config document found but authorizedUploadUsers is not an array', {
            authorizedUploadUsers: configDoc.authorizedUploadUsers
          });
        }
      } else {
        logger.warn('Authorization config document not found in database');
      }

      // Cache the result only if caching is enabled
      if (DatabaseAccessControlService.CACHE_DURATION_MS > 0) {
        DatabaseAccessControlService.cache.set(cacheKey, {
          authorizedUsers,
          timestamp: now
        });
      }

      return authorizedUsers;
    } catch (error) {
      logger.error('Error fetching authorized users from database:', error);
      
      // If DB query fails, remove any cached value and return empty array
      if (DatabaseAccessControlService.CACHE_DURATION_MS > 0) {
        DatabaseAccessControlService.cache.delete(cacheKey);
      }
      return [];
    }
  }

  /**
   * Get authorized users with fallback to environment variables
   * First tries to get from database, falls back to environment variables if DB is unavailable or returns empty
   */
  public static async getAuthorizedUsersWithFallback(): Promise<string[]> {
    // First try to get from database
    let authorizedUsers = await DatabaseAccessControlService.getAuthorizedUsersFromDatabase();
    
    // If database query returned empty list, fall back to environment variables
    if (authorizedUsers.length === 0) {
      logger.info('Falling back to environment variables for authorized users');
      
      const envAuthorizedEmails = process.env.AUTHORIZED_UPLOAD_USERS || '';
      
      if (envAuthorizedEmails.trim()) {
        authorizedUsers = envAuthorizedEmails
          .split(',')
          .map(email => email.trim().toLowerCase())
          .filter(email => email.length > 0);
        
        logger.info('Using authorized users from environment variables', {
          userCount: authorizedUsers.length,
          users: authorizedUsers
        });
      } else {
        logger.info('No authorized users configured in database or environment variables, allowing all users');
        return []; // Return empty array to indicate all users are allowed (backward compatibility)
      }
    } else {
      logger.info('Using authorized users from database', {
        source: 'database',
        userCount: authorizedUsers.length,
        users: authorizedUsers
      });
    }
    
    return authorizedUsers;
  }

  /**
   * Check if a user is authorized by checking database first, then environment variables
   */
  public static async isUserAuthorized(userEmail?: string): Promise<boolean> {
    if (!userEmail) {
      return false;
    }

    const authorizedUsers = await DatabaseAccessControlService.getAuthorizedUsersWithFallback();
    
    // If authorizedUsers is empty (no configuration exists), allow all users (backward compatibility)
    if (authorizedUsers.length === 0) {
      return true;
    }
    
    return authorizedUsers.includes(userEmail.toLowerCase());
  }

  /**
   * Clear the cache (useful for testing or when configuration is updated)
   */
  public static clearCache(): void {
    DatabaseAccessControlService.cache.clear();
    logger.debug('Authorized users cache cleared');
  }

  /**
   * Get cache size for monitoring
   */
  public static getCacheSize(): number {
    return DatabaseAccessControlService.cache.size;
  }
}