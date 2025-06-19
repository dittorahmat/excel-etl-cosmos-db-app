/**
 * Base interface for Cosmos DB records
 * All documents in Cosmos DB must have an 'id' field
 */
export interface CosmosRecord {
  /**
   * The unique identifier for the document
   * @pattern ^[\w-]+$
   */
  id: string;

  /**
   * The time to live in seconds for the document
   * @minimum 0
   * @default undefined (no TTL)
   */
  ttl?: number;

  /**
   * Additional properties that may be present on the document
   */
  [key: string]: unknown;
}

/**
 * Represents a query parameter for Cosmos DB
 */
export interface CosmosQueryParameter {
  /**
   * The name of the parameter (including the @ prefix)
   * @pattern ^@[\w]+$
   * @example "@userId"
   */
  name: string;

  /**
   * The value of the parameter
   */
  value: unknown;
}

/**
 * Represents the result of a Cosmos DB query
 */
export interface CosmosQueryResult<T> {
  /**
   * The items returned by the query
   */
  resources: T[];

  /**
   * The request charge for the query
   */
  requestCharge: number;

  /**
   * The activity ID for the request
   */
  activityId: string;

  /**
   * The continuation token for paginated results
   */
  continuationToken?: string;
}

/**
 * Represents options for a Cosmos DB query
 */
export interface CosmosQueryOptions {
  /**
   * The maximum number of items to return
   * @minimum 1
   * @default 100
   */
  maxItemCount?: number;

  /**
   * The continuation token for paginated results
   */
  continuationToken?: string;

  /**
   * Whether to enable cross-partition query
   * @default true
   */
  enableCrossPartition?: boolean;

  /**
   * The partition key value for the query
   */
  partitionKey?: string | number | boolean | null;
}

/**
 * Represents the result of an operation that returns a single item
 */
export interface CosmosItemResponse<T> {
  /**
   * The resource returned by the operation
   */
  resource?: T;

  /**
   * The request charge for the operation
   */
  requestCharge: number;

  /**
   * The activity ID for the request
   */
  activityId: string;

  /**
   * The entity tag for the resource
   */
  etag?: string;

  /**
   * The resource ID of the item
   */
  resourceId?: string;
}
