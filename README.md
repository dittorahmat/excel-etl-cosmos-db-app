# Excel to Cosmos DB Dashboard

A modern React dashboard application for uploading Excel files, visualizing data, and managing Azure Cosmos DB integration. Features Azure AD authentication, real-time data visualization, and a responsive UI built with Shadcn UI components.

## Features

- **Modern React Dashboard**: Built with Vite, TypeScript, and React 18.
- **Secure Authentication**: Integrates Azure AD OAuth 2.0 with MSAL.
- **API Key Management**: Securely generate, list, and revoke API keys with IP restrictions.
- **Dynamic Query Builder**: User-friendly builder with dynamic field selection based on uploaded file schema.
- **Excel & CSV Processing**: Backend processing for dynamic schema detection and ingestion.
- **Data Ingestion**: Efficiently ingests data into Azure Cosmos DB with batching and retry logic.
- **Data Visualization**: Interactive charts (bar, line, pie) powered by Recharts.
- **Type Safety**: Full TypeScript support across the stack.

## 🚀 Getting Started

### Prerequisites

- Node.js 18+
- Azure AD App Registration
- Azure Cosmos DB account
- Azure Storage account

### Installation

1. **Clone the repository**:
   ```bash
   git clone https://github.com/your-username/excel-cosmos-dashboard.git
   cd excel-cosmos-dashboard
   ```

2. **Install dependencies**:
   > **Note**: If your local environment has `NODE_ENV=production`, ensure you include dev dependencies.
   ```bash
   npm install --include=dev
   ```

3. **Configure Environment**:
   Create a `.env` file in the root and `server/` directories based on `.env.example`.

4. **Start Development**:
   ```bash
   npm run dev
   ```
   - Frontend: [http://localhost:3000](http://localhost:3000)
   - Backend API: `http://localhost:3001`

### Production Build

```bash
npm run build
npm run start
```
The production server will serve the static frontend from `server/dist/public` on port 3000 by default.

## 🧪 Testing

```bash
npm test              # Run all tests
npm run test:server   # Server tests only
npm run test:client   # Client tests only
```

## 🔧 Project Structure

- `src/`: React frontend application.
- `server/`: Node.js Express backend (Workspace).
- `common/`: Shared TypeScript types.
- `public/`: Static assets and auto-generated `config.js`.

## API Endpoints

Refer to the original documentation for a full list of endpoints including `/api/v2/keys`, `/api/v2/query/imports`, and `/api/v2/query/rows`.

## License

MIT
