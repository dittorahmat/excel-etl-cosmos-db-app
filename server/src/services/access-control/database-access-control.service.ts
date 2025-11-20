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
  [key: string]: string | string[] | number | boolean | undefined; // Allow additional properties
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
      
      // Add timeout handling - use Promise.race properly
      // Use iterator instead of fetchAll to avoid loading all results into memory
      const queryIterator = container.items.query<AuthorizationConfig>(querySpec);
      
      // Create timeout promise that rejects when time expires
      const timeoutPromise = new Promise((_, reject) => 
        setTimeout(() => reject(new Error('Cosmos DB query timeout')), 10000) // 10 second timeout
      );
      
      // Execute query with timeout protection using iterator
      const queryPromise = new Promise((resolve, reject) => {
        (async () => {
          try {
            const resources: AuthorizationConfig[] = [];
            while (queryIterator.hasMoreResults()) {
              const page = await queryIterator.fetchNext();
              if (page.resources) {
                resources.push(...page.resources);
              }
            }
            resolve({ resources });
          } catch (error) {
            reject(error);
          }
        })();
      });
      
      // Wait for either the query to complete or the timeout
      const result = await Promise.race([queryPromise, timeoutPromise]);
      
      // If we get here, the query completed within the timeout, so extract resources
      const { resources } = result as { resources: AuthorizationConfig[] };
      
      let authorizedUsers: string[] = [];
      
      if (resources.length > 0) {
        const configDoc = resources[0];
        if (configDoc && Array.isArray(configDoc.authorizedUploadUsers)) {
          authorizedUsers = configDoc.authorizedUploadUsers
            .map(email => email.trim().toLowerCase())
            .filter(email => email.length > 0);
          
          logger.info('Successfully retrieved authorized users from database', {
            userCount: authorizedUsers.length,
            users: authorizedUsers
          });
        } else if (configDoc) {
          logger.warn('Authorization config document found but authorizedUploadUsers is not an array', {
            authorizedUploadUsers: configDoc.authorizedUploadUsers
          });
        } else {
          logger.warn('Authorization config document not found in database');
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
      logger.error('Error fetching authorized users from database:', {
        error: error instanceof Error ? error.message : String(error),
        stack: error instanceof Error ? error.stack : undefined
      });
      
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
    logger.info('Starting getAuthorizedUsersWithFallback function');
    
    // First try to get from database
    let authorizedUsers = await DatabaseAccessControlService.getAuthorizedUsersFromDatabase();
    logger.info('Database query returned', { 
      userCount: authorizedUsers.length, 
      users: authorizedUsers 
    });
    
    // If database query returned empty list, fall back to environment variables
    if (authorizedUsers.length === 0) {
      logger.info('Falling back to environment variables for authorized users');
      
      const envAuthorizedEmails = process.env.AUTHORIZED_UPLOAD_USERS || '';
      logger.info('Environment variable AUTHORIZED_UPLOAD_USERS value', { envAuthorizedEmails });
      
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
    
    logger.info('Final authorized users list', { 
      userCount: authorizedUsers.length, 
      users: authorizedUsers 
    });
    
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