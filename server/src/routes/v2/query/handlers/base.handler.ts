import { Response } from 'express';
import { logger } from '../../../../utils/logger.js';

import { QueryParams, ErrorResponse } from '../types/query.types.js';
import { buildCosmosQuery } from '../utils/query-builder.js';
import { SqlParameter, Database } from '@azure/cosmos';
import { AzureCosmosDB } from '../../../../types/azure.js';




/**
 * Base handler with shared functionality for query handlers
 */
export abstract class BaseQueryHandler {
  protected containerName: string;
  protected partitionKey: string;
  protected cosmosDb: AzureCosmosDB;
  protected database: Database;

  constructor(cosmosDb: AzureCosmosDB, database: Database, containerName: string, partitionKey: string) {
    // Log detailed information about the Cosmos DB client instance
    const logDetails = {
      containerName,
      partitionKey,
      hasCosmosDb: !!cosmosDb,
      cosmosDbType: cosmosDb ? typeof cosmosDb : 'undefined',
      cosmosDbConstructor: cosmosDb?.constructor?.name || 'unknown',
      availableMethods: cosmosDb ? Object.getOwnPropertyNames(cosmosDb) : [],
      hasContainerMethod: cosmosDb ? typeof cosmosDb.container === 'function' : false,
      hasDatabase: !!database
    };
    
    logger.debug('BaseQueryHandler constructor called', logDetails);
    
    this.containerName = containerName;
    this.partitionKey = partitionKey;
    this.cosmosDb = cosmosDb;
    this.database = database;
    
    // Log after assignment to ensure no reference issues
    logger.debug('BaseQueryHandler initialized', {
      containerName: this.containerName,
      partitionKey: this.partitionKey,
      hasCosmosDb: !!this.cosmosDb,
      cosmosDbType: this.cosmosDb ? typeof this.cosmosDb : 'undefined',
      hasContainerMethod: this.cosmosDb ? typeof this.cosmosDb.container === 'function' : false,
      hasDatabase: !!this.database
    });
  }

  /**
   * Execute a query with the given parameters
   */
  protected async executeQuery<T>(
    params: QueryParams,
    additionalWhereClauses: string[] = [],
    additionalParams: SqlParameter[] = []
  ): Promise<{ 
    items: T[]; 
    requestCharge?: number; 
    continuationToken?: string;
    hasMoreResults?: boolean;
  }> {
    // Build the base query
    const { query, parameters } = buildCosmosQuery(params);
    
    // Combine where clauses
    const allWhereClauses: string[] = [];
    const allParams = [...parameters];
    
    // Add additional where clauses if provided
    if (additionalWhereClauses.length > 0) {
      allWhereClauses.push(...additionalWhereClauses);
      allParams.push(...additionalParams);
    }
    
    // Build the final query
    let finalQuery: string = query; // Initialize with the base query

    if (allWhereClauses.length > 0) {
      const additionalConditions = allWhereClauses.map(clause => `(${clause})`).join(' AND ');
      if (query.includes('WHERE')) {
        // If the base query already has a WHERE clause, append with AND
        finalQuery = `${query} AND ${additionalConditions}`;
      } else {
        // If no WHERE clause in base query, add one
        finalQuery = `${query} WHERE ${additionalConditions}`;
      }
    }

    logger.debug('Executing Cosmos DB query', {
      query: finalQuery,
      parameters: allParams,
      containerName: this.containerName
    });

    // Get container reference using the container method from AzureCosmosDB interface
    const container = await this.cosmosDb.container(this.containerName, this.partitionKey);
    
    const queryOptions = {
      maxItemCount: params.limit,
      continuationToken: params.continuationToken
    };

    // Execute the query
    const querySpec = {
      query: finalQuery,
      parameters: allParams
    };

    logger.debug('Executing Cosmos DB query with spec', {
      querySpec,
      queryOptions,
      containerName: this.containerName,
      partitionKey: this.partitionKey
    });

    try {
      const queryIterator = container.items.query(querySpec, queryOptions);
      const response = await queryIterator.fetchNext();
      
      logger.debug('Received response from Cosmos DB', {
        requestCharge: response.requestCharge,
        hasMoreResults: response.hasMoreResults,
        itemCount: response.resources?.length || 0
      });
      
      return {
        items: response.resources as T[],
        requestCharge: response.requestCharge,
        continuationToken: response.continuationToken,
        hasMoreResults: response.hasMoreResults
      };
    } catch (error) {
      logger.error('Error executing Cosmos DB query', {
        error: error instanceof Error ? error.message : 'Unknown error',
        stack: error instanceof Error ? error.stack : undefined,
        query: finalQuery,
        parameters: allParams,
        containerName: this.containerName,
        partitionKey: this.partitionKey
      });
      throw error;
    }
  }

  /**
   * Build query parts from query parameters
   */
  protected buildQueryParts(params: QueryParams): { whereClauses: string[], parameters: SqlParameter[] } {
    const { whereClauses, parameters } = buildCosmosQuery(params);
    return { whereClauses, parameters };
  }

  /**
   * Get the total count of items matching the query
   */
  protected async getTotalCount(
    whereClauses: string[],
    parameters: SqlParameter[]
  ): Promise<number> {
    const countQuery = `
      SELECT VALUE COUNT(1)
      FROM c
      ${whereClauses.length > 0 ? 'WHERE ' + whereClauses.join(' AND ') : ''}
    `;

    // Log detailed information about the Cosmos DB client and query
    const logContext = {
      countQuery,
      parameters,
      containerName: this.containerName,
      partitionKey: this.partitionKey,
      hasCosmosDb: !!this.cosmosDb,
      cosmosDbType: this.cosmosDb ? typeof this.cosmosDb : 'undefined',
      cosmosDbConstructor: this.cosmosDb?.constructor?.name || 'unknown',
      availableMethods: this.cosmosDb ? Object.getOwnPropertyNames(this.cosmosDb) : [],
      hasContainerMethod: this.cosmosDb ? typeof this.cosmosDb.container === 'function' : false,
      hasDatabase: this.cosmosDb ? 'database' in this.cosmosDb : false,
      databaseType: this.cosmosDb && 'database' in this.cosmosDb ? typeof this.cosmosDb.database : 'n/a',
      hasDatabaseContainer: this.cosmosDb && 'database' in this.cosmosDb 
        ? 'container' in this.cosmosDb.database 
        : false
    };

    logger.debug('Executing count query', logContext);

    try {
      // Validate Cosmos DB client
      if (!this.cosmosDb) {
        logger.error('CosmosDB client is undefined in getTotalCount');
        throw new Error('CosmosDB client not properly initialized (undefined)');
      }
      
      // Check if database is available
      if (!this.cosmosDb || !this.cosmosDb.database) {
        logger.error('CosmosDB client is missing database property', {
          availableProperties: Object.getOwnPropertyNames(this.cosmosDb)
        });
        throw new Error('CosmosDB client is missing database property');
      }
      
      const { database } = this.cosmosDb;
      
      // Check if container method is available on the database
      if (typeof database.container !== 'function') {
        logger.error('Database does not have container method', {
          databaseType: typeof database,
          databaseMethods: Object.getOwnPropertyNames(database),
          hasContainer: 'container' in database,
          containerType: 'container' in database ? typeof database.container : 'n/a'
        });
        throw new Error('Database does not have container method');
      }
      
      // Get the container reference
      const container = database.container(this.containerName);
      logger.debug('Successfully accessed container in base handler', {
        containerName: this.containerName,
        containerType: typeof container,
        containerMethods: container ? Object.getOwnPropertyNames(container) : []
      });
      
      if (!container) {
        throw new Error(`Container '${this.containerName}' not found in CosmosDB`);
      }
      
      // Execute the count query
      const querySpec = {
        query: countQuery,
        parameters: parameters
      };

      logger.debug('Executing Cosmos DB query', {
        query: querySpec.query,
        parameters: querySpec.parameters
      });
      
      const result = await container.items.query(querySpec).fetchAll();
      logger.debug('Query result', {
        resourceCount: result.resources.length,
        hasResults: result.resources.length > 0,
        firstResult: result.resources[0]
      });
      
      return result.resources[0] as number || 0;
    } catch (error) {
      logger.error('Error in getTotalCount', {
        error: error instanceof Error ? error.message : 'Unknown error',
        stack: error instanceof Error ? error.stack : undefined,
        query: countQuery,
        parameters,
        containerName: this.containerName,
        partitionKey: this.partitionKey
      });
      throw error;
    }
  }

  /**
   * Handle errors consistently across all handlers
   */
  protected handleError(error: unknown, res: Response, context: Record<string, unknown> = {}): Response {
    const errorId = Math.random().toString(36).substring(2, 8);
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    const errorStack = error instanceof Error ? error.stack : undefined;
    
    logger.error('Query handler error', { 
      errorId,
      error: errorMessage,
      stack: errorStack,
      ...context,
    });
    
    const errorResponse: ErrorResponse = {
      success: false,
      error: `Query failed (ref: ${errorId})`,
      message: process.env.NODE_ENV === 'production' 
        ? 'An error occurred while processing your request.' 
        : errorMessage,
    };

    if (process.env.NODE_ENV === 'development') {
      errorResponse.details = { stack: errorStack, error: errorMessage };
    }
    
    return res.status(500).json(errorResponse);
  }
}
