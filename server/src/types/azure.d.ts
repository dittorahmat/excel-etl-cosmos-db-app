import { Container } from '@azure/cosmos';

export interface AzureCosmosDB {
  cosmosClient: {
    database: (name: string) => any;
    container: (name: string) => any;
  };
  container: (name: string) => Container;
  getContainer: (name: string) => Container;
  query: (query: string, parameters?: any[]) => Promise<{ resources: any[] }>;
  upsert: (item: any) => Promise<any>;
  getById: (id: string) => Promise<any>;
  delete: (id: string) => Promise<boolean>;
}

export interface AzureBlobStorage {
  upload: (containerName: string, blobName: string, buffer: Buffer, contentType: string) => Promise<void>;
  download: (containerName: string, blobName: string) => Promise<Buffer>;
  delete: (containerName: string, blobName: string) => Promise<void>;
  getBlobUrl: (containerName: string, blobName: string) => string;
}
