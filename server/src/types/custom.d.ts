import type { Request } from 'express';
import type { Container, CosmosClient } from '@azure/cosmos';
import type { ApiKey } from './apiKey.js';
import type { TokenPayload } from '../middleware/auth.js';

declare global {
  namespace Express {
    interface Request {
      id?: string;
      user?: TokenPayload;
      apiKey?: Omit<ApiKey, 'keyHash'>;
      startTime?: [number, number];
    }
  }
}

import { CosmosClient, Container } from '@azure/cosmos';

// Base type for all Cosmos DB records
export type CosmosRecord = Record<string, unknown> & {
  id: string;
};

export interface AzureCosmosDB {
  /** The underlying CosmosClient instance */
  cosmosClient: CosmosClient;
  
  /** The Cosmos DB database instance */
  database: any;
  
  /**
   * Gets a reference to a Cosmos DB container
   * @template T - The type of records stored in the container
   * @param {string} containerName - The name of the container
   * @param {string} partitionKey - The partition key path (e.g., '/id' or '/userId')
   * @returns {Promise<Container>} A promise that resolves to the container reference
   */
  container: <T extends CosmosRecord>(
    containerName: string, 
    partitionKey: string
  ) => Promise<Container>;
  
  /**
   * Upserts a record into the container
   * @template T - The type of the record
   * @param {T} record - The record to upsert
   * @param {string} [containerName] - Optional container name (defaults to the one from config)
   * @returns {Promise<T>} The upserted record with Cosmos DB metadata stripped
   */
  upsertRecord: <T extends CosmosRecord>(
    record: T,
    containerName?: string
  ) => Promise<T>;
  
  /**
   * Executes a query against the container
   * @template T - The expected type of the query results
   * @param {string} query - The SQL query to execute
   * @param {{ name: string; value: any }[]} [parameters] - Optional query parameters
   * @param {string} [containerName] - Optional container name (defaults to the one from config)
   * @returns {Promise<T[]>} The query results with Cosmos DB metadata stripped
   */
  query: <T extends CosmosRecord>(
    query: string,
    parameters?: { name: string; value: any }[],
    containerName?: string
  ) => Promise<T[]>;
  
  /**
   * Gets a record by its ID and partition key
   * @template T - The expected type of the record
   * @param {string} id - The ID of the record to retrieve
   * @param {string} partitionKey - The partition key value
   * @param {string} [containerName] - Optional container name (defaults to the one from config)
   * @returns {Promise<T | undefined>} The record if found, or undefined if not found
   */
  getById: <T extends CosmosRecord>(
    id: string, 
    partitionKey: string, 
    containerName?: string
  ) => Promise<T | undefined>;
  
  /**
   * Deletes a record by its ID and partition key
   * @param {string} id - The ID of the record to delete
   * @param {string} partitionKey - The partition key value
   * @param {string} [containerName] - Optional container name (defaults to the one from config)
   * @returns {Promise<void>} A promise that resolves when the record is deleted
   */
  deleteRecord: (
    id: string, 
    partitionKey: string, 
    containerName?: string
  ) => Promise<void>;
}



export interface MulterError extends Error {
  code?: string;
  field?: string;
}

export interface FileTypeError extends Error {
  message: string;
  code?: string;
}
