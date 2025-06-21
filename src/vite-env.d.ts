/// <reference types="vite/client" />

interface ImportMetaEnv {
  readonly VITE_AZURE_CLIENT_ID: string;
  readonly VITE_AZURE_TENANT_ID: string;
  readonly VITE_AZURE_AUTHORITY?: string;
  readonly VITE_AZURE_REDIRECT_URI?: string;
  readonly VITE_API_SCOPE?: string;
  readonly VITE_EXCEL_FILE_PATH: string;
  readonly VITE_COSMOS_DB_ENDPOINT: string;
  readonly VITE_COSMOS_DB_KEY: string;
  readonly VITE_COSMOS_DB_DATABASE_ID: string;
  readonly VITE_COSMOS_DB_CONTAINER_ID: string;
}

interface ImportMeta {
  readonly env: ImportMetaEnv;
}
