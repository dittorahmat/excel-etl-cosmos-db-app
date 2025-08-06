import { Response } from 'express';
import { logger } from '../../../../utils/logger.js';

import { QueryParams, ErrorResponse } from '../types/query.types.js';
import { buildCosmosQuery } from '../utils/query-builder.js';
import { SqlParameter } from '@azure/cosmos';
import { AzureCosmosDB } from '../../../../types/azure.js';




/**
 * Base handler with shared functionality for query handlers
 */
export abstract class BaseQueryHandler {
  protected containerName: string;
  protected partitionKey: string;
  protected cosmosDb: AzureCosmosDB;

  constructor(cosmosDb: AzureCosmosDB, containerName: string, partitionKey: string) {
    this.containerName = containerName;
    this.partitionKey = partitionKey;
    this.cosmosDb = cosmosDb;
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
    });

    const cosmosDb = this.cosmosDb;
    const container = await cosmosDb.container(this.containerName, this.partitionKey);
    
    const queryOptions = {
      maxItemCount: params.limit,
      continuationToken: params.continuationToken
    };

    const queryIterator = container.items.query(
      { query: finalQuery, parameters: allParams },
      queryOptions
    );

    const response = await queryIterator.fetchNext();
    
    return {
      items: response.resources as T[],
      requestCharge: response.requestCharge,
      continuationToken: response.continuationToken,
      hasMoreResults: response.hasMoreResults
    };
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
    if (whereClauses.length === 0) {
      whereClauses.push('1=1');
    }

    const countQuery = `SELECT VALUE COUNT(1) FROM c WHERE ${whereClauses.join(' AND ')}`;
    
    logger.debug('Executing count query', {
      query: countQuery,
      parameters,
      containerName: this.containerName,
      partitionKey: this.partitionKey
    });

    try {
      // Log the Cosmos DB service instance details before making the call
      logger.debug('Cosmos DB service instance in getTotalCount', {
        hasCosmosDb: !!this.cosmosDb,
        cosmosDbMethods: this.cosmosDb ? Object.getOwnPropertyNames(Object.getPrototypeOf(this.cosmosDb)) : [],
        hasContainerMethod: this.cosmosDb ? typeof this.cosmosDb.container === 'function' : false,
      });

      const container = await this.cosmosDb.container(this.containerName, this.partitionKey);
      
      // Log the container instance details
      logger.debug('Container instance details', {
        containerId: container?.id,
        containerMethods: container ? Object.getOwnPropertyNames(Object.getPrototypeOf(container)) : []
      });

      const response = await container.items.query({
        query: countQuery,
        parameters: parameters as SqlParameter[]
      }).fetchAll();

      return response.resources[0] as number || 0;
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
