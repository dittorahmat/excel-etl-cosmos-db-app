# Data Models

This project uses Azure Cosmos DB (NoSQL), which allows for flexible schemas. However, there is a consistent structure for the documents stored.

## Cosmos DB Document Schema

Each row from an uploaded file is transformed into a document with the following structure:

### Core Metadata Fields
| Field | Type | Description |
| :--- | :--- | :--- |
| `id` | `string` | Unique identifier (UUID). |
| `fileName` | `string` | Name of the source file. |
| `filePath` | `string` | Path/URL in Blob Storage. |
| `uploadedAt` | `string` | ISO timestamp of ingestion. |
| `uploadedBy` | `object` | Metadata about the user who uploaded the file. |
| `metadata` | `object` | Processing details (e.g., version). |
| `_ts` | `number` | Internal Cosmos DB timestamp (Unix). |

### Domain Fields (Extracted from File)
The following fields are mandatory for the application's filtering logic to function correctly:
- **`Source`**: The origin of the data.
- **`Category`**: High-level classification.
- **`Sub Category`**: Detailed classification.
- **`Date`**: The temporal value of the record (normalized to ISO).

### Dynamic Fields
All other columns present in the Excel/CSV file are dynamically mapped as root-level properties on the document. The ingestion service attempts to detect:
- **Numbers**: Converted to numeric types for range filtering.
- **Dates**: Converted to ISO strings.
- **Boolean**: Converted to boolean types.

## API Key Model
Stored in a separate container/collection:
- `id`: Unique key ID.
- `userId`: Reference to the owner (Azure OID).
- `keyHash`: Hashed version of the API key.
- `prefix`: Visible part of the key.
- `name`: User-defined name.
- `createdAt`: ISO timestamp.
- `expiresAt`: Optional expiration date.
- `lastUsedAt`: Timestamp of last activity.
