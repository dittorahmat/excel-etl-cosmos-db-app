import { Response } from 'express';
import { logger } from '../../../../utils/logger.js';
import { getOrInitializeCosmosDB } from '../../../../services/cosmos-db/cosmos-db.service.js';
import { QueryParams, ErrorResponse } from '../types/query.types.js';
import { buildCosmosQuery } from '../utils/query-builder.js';
import { SqlParameter } from '@azure/cosmos';

/**
 * Base handler with shared functionality for query handlers
 */
export abstract class BaseQueryHandler {
  protected containerName: string;
  protected partitionKey: string;

  constructor(containerName: string, partitionKey: string) {
    this.containerName = containerName;
    this.partitionKey = partitionKey;
  }

  /**
   * Execute a query with the given parameters
   */
  protected async executeQuery<T>(
    params: QueryParams,
    additionalWhereClauses: string[] = [],
    additionalParams: SqlParameter[] = []
  ): Promise<{ items: T[]; requestCharge?: number }> {
    const { query, parameters } = buildCosmosQuery(params);
    
    // Add additional where clauses and parameters if provided
    const whereClause = additionalWhereClauses.length > 0 
      ? ` AND ${additionalWhereClauses.join(' AND ')}` 
      : '';
    
    const finalQuery = query.replace('WHERE', `WHERE 1=1${whereClause} AND`);
    const finalParams = [...parameters, ...additionalParams];
    
    logger.debug('Executing Cosmos DB query', {
      query: finalQuery,
      parameters: finalParams,
    });

    const cosmosDb = await getOrInitializeCosmosDB();
    const container = await cosmosDb.container(this.containerName, this.partitionKey);
    
    const response = await container.items
      .query({
        query: finalQuery,
        parameters: finalParams,
      })
      .fetchAll();

    return {
      items: response.resources as T[],
      requestCharge: response.requestCharge
    };
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
    });

    const cosmosDb = await getOrInitializeCosmosDB();
    const container = await cosmosDb.container(this.containerName, this.partitionKey);
    
    const response = await container.items
      .query({
        query: countQuery,
        parameters,
      })
      .fetchAll();

    return response.resources[0] as number || 0;
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
