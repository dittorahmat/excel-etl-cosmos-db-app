import { Request, Response } from 'express';
import { SqlParameter } from '@azure/cosmos';

/**
 * Field specification for query
 */
export interface FieldSpec {
  name: string;
  type?: string;
  label?: string;
}

/**
 * Query parameters for the query endpoints
 */
export interface QueryParams {
  filter?: Record<string, unknown>;
  limit: number;
  offset: number;
  sort?: string;
  fields?: string | FieldSpec[];
  continuationToken?: string;
  hasMoreResults?: boolean;
}

/**
 * Request handler type for query routes
 */
export type QueryRequestHandler = (
  req: Request,
  res: Response
) => Promise<void>;

/**
 * Query result with pagination
 */
export interface QueryResult<T> {
  success: boolean;
  data: {
    items: T[];
    fields?: string[];
    total: number;
    page: number;
    pageSize: number;
    totalPages: number;
  };
  pagination: {
    total: number;
    limit: number;
    offset: number;
  };
}

/**
 * Error response type
 */
export interface ErrorResponse {
  success: boolean;
  error: string;
  message?: string;
  details?: unknown;
  issues?: Array<{
    code: string;
    path: string[];
    message: string;
  }>;
}

/**
 * Cosmos DB query result
 */
export interface CosmosQueryResult<T> {
  query: string;
  parameters: SqlParameter[];
  items?: T[];
  requestCharge?: number;
}
