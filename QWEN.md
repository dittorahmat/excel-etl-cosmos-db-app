# Excel to Cosmos DB Dashboard - Developer Documentation

## Project Overview

Excel to Cosmos DB Dashboard is a modern, full-stack application built with React and TypeScript for the frontend, and Node.js/Express for the backend. The application allows users to upload Excel files, process the data, store it in Azure Cosmos DB, and visualize it through a responsive dashboard. Key features include Azure AD authentication, API key management, dynamic query builder, and data visualization tools.

### Key Technologies

- **Frontend**: React 18, TypeScript, Vite, Tailwind CSS
- **UI Components**: Shadcn UI, Radix UI, Recharts for data visualization
- **Authentication**: Azure AD with MSAL (Microsoft Authentication Library)
- **Backend**: Node.js, Express, TypeScript
- **Database**: Azure Cosmos DB (SQL API)
- **File Storage**: Azure Blob Storage
- **Build Tool**: Vite
- **Testing**: Vitest, React Testing Library, Playwright for E2E tests
- **Deployment**: Docker, Docker Compose with Nginx reverse proxy

### Architecture

The application follows a client-server architecture:

1. **Frontend** (React/Vite): Handles user interface, authentication, API key management, file uploads, and data visualization
2. **Backend** (Node.js/Express): Manages file processing, Cosmos DB interactions, and API endpoints
3. **Azure Services**: Cosmos DB for data storage, Blob Storage for file uploads
4. **Authentication**: Azure AD OAuth 2.0 for secure access

## Project Structure

```
excel-etl-cosmos-db-app/
├── src/                      # Frontend source code
│   ├── components/          # React UI components
│   ├── pages/               # Page components
│   ├── hooks/               # Custom React hooks
│   ├── auth/                # Authentication logic
│   ├── utils/               # Utility functions
│   ├── lib/                 # External library wrappers
│   ├── types/               # TypeScript type definitions
│   ├── test/                # Frontend test utilities
│   └── assets/              # Static assets
├── server/                   # Backend source code
│   ├── src/
│   │   ├── config/          # Server configuration
│   │   ├── middleware/      # Express middleware
│   │   ├── routes/          # API route handlers
│   │   ├── services/        # Business logic
│   │   ├── controllers/     # Request handlers
│   │   └── utils/           # Server utilities
│   └── test/                # Backend tests
├── public/                  # Static public assets
├── scripts/                 # Build/deployment scripts
├── docs/                    # Documentation
├── .qwen/                   # Project summary and context
├── test-files/              # Test data files
├── tmp_uploads/             # Temporary upload directory
└── ...
```

## Building and Running

### Prerequisites

- Node.js 18+
- npm or yarn
- Azure AD App Registration
- Azure Cosmos DB account
- Azure Storage account

### Installation

1. Clone the repository:
   ```bash
   git clone <repository-url>
   cd excel-etl-cosmos-db-app
   ```

2. Install dependencies:
   ```bash
   npm install
   ```

3. Set up environment variables (copy from `.env.example`):
   ```bash
   cp .env.example .env
   # Edit .env with your Azure credentials
   ```

### Development

To run in development mode with both frontend and backend:

```bash
npm run dev
```

This starts:
- Frontend on `http://localhost:3000`
- Backend API on `http://localhost:3001`

### Production Build

To build for production:

```bash
npm run build
```

This creates production builds for both client and server in their respective `dist` directories.

### Starting Production Server

```bash
npm start
```

## Key Commands

- `npm run dev` - Start development server (frontend + backend)
- `npm run dev:client` - Start frontend development server only
- `npm run dev:server` - Start backend development server only
- `npm run build` - Build for production
- `npm run build:client` - Build frontend only
- `npm run build:server` - Build backend only
- `npm run preview` - Preview production build locally
- `npm run test` - Run all tests
- `npm run test:watch` - Run tests in watch mode
- `npm run test:coverage` - Generate test coverage report
- `npm run test:client` - Run client tests only
- `npm run test:server` - Run server tests only
- `npm run test:e2e` - Run end-to-end tests
- `npm run lint` - Run ESLint
- `npm run type-check` - Run TypeScript type checking
- `npm run format` - Format code with Prettier

## Configuration

### Environment Variables

The application uses environment variables for configuration, defined in a `.env` file:

**Frontend (VITE_ prefixed):**
- `VITE_AZURE_AD_CLIENT_ID` - Azure AD client ID
- `VITE_AZURE_AD_TENANT_ID` - Azure AD tenant ID
- `VITE_AZURE_AD_REDIRECT_URI` - Redirect URI for auth
- `VITE_API_SCOPE` - API scope for auth
- `VITE_API_URL` - Backend API URL

**Backend:**
- `PORT` - Server port (default: 3001)
- `NODE_ENV` - Environment (development/production)
- `AZURE_STORAGE_CONNECTION_STRING` - Blob storage connection
- `AZURE_COSMOS_ENDPOINT` - Cosmos DB endpoint
- `AZURE_COSMOS_KEY` - Cosmos DB access key
- `AZURE_CLIENT_ID`, `AZURE_CLIENT_SECRET` - Azure AD credentials
- Various other configuration options

### API Endpoints Overview

#### Authentication
- `GET /api/auth/status` - Check authentication status

#### API Key Management
- `POST /api/keys` - Create new API key
- `GET /api/keys` - List user's API keys
- `DELETE /api/keys/:keyId` - Revoke API key

#### Data Operations
- `POST /api/v2/query/imports` - Upload and process file
- `GET /api/v2/query/imports` - List imported files
- `GET /api/v2/query/imports/:importId/rows` - Query specific import
- `POST /api/v2/query/rows` - Query across all imports
- `GET /api/fields` - Get available fields
- `GET /api/health` - Health check endpoint

## Development Conventions

### Code Style
- TypeScript with strict mode enabled
- ESLint with custom rules and Prettier for formatting
- React best practices with hooks and functional components
- Component-based architecture with proper separation of concerns

### Testing
- Unit tests with Vitest for both frontend and backend
- Integration tests for API endpoints
- Component tests with React Testing Library
- End-to-end tests with Playwright
- Test coverage reports to maintain quality

### Security
- Azure AD authentication with MSAL
- API key management with expiration and IP restrictions
- Input validation and sanitization
- Rate limiting to prevent abuse
- Secure headers with Helmet
- Environment-based configuration

### Performance
- Code splitting with Vite's manual chunking
- React.memo for component optimization
- Efficient data fetching with custom hooks
- Pagination for large datasets
- Caching strategies where appropriate

## Deployment

The application is designed for Docker-based deployment:

1. **Docker Compose**: Multi-stage Dockerfile with separate build and production stages
2. **Reverse Proxy**: Nginx configured for HTTPS with Let's Encrypt certificates
3. **Environment Configuration**: Docker Compose supports environment-specific configurations
4. **Health Checks**: Built-in health check endpoints for monitoring

To deploy:
```bash
docker-compose up -d
```

The application will be accessible via HTTPS with automatic HTTP to HTTPS redirection.

## Key Features

### File Processing
- Upload Excel and CSV files
- Automatic schema detection
- Data ingestion to Cosmos DB
- Import metadata tracking

### Data Visualization
- Interactive charts with Recharts
- Dynamic query builder
- Table views with sorting and filtering
- Export functionality (CSV, Excel)

### Authentication & Authorization
- Azure AD integration
- Role-based access control
- Secure API key management
- Session management

### Query Builder
- Dynamic field selection based on uploaded data
- Multiple filter types with proper operators
- Special handling for common fields (Source, Category, etc.)
- API generation for programmatic access

### Monitoring & Logging
- Request logging with detailed metrics
- API key usage tracking
- Error logging and monitoring
- Health check endpoints

This application serves as a robust solution for Excel data processing and visualization with enterprise-grade authentication and security features.