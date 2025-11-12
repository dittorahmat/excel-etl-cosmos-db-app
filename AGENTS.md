# Excel-to-Cosmos DB Application AGENTS.md

## Project Snapshot

Full-stack application for Excel file processing with Azure Cosmos DB backend.
- **Type**: Full-stack monorepo (frontend + backend)
- **Tech Stack**: React 18, TypeScript, Node.js, Express, Azure Cosmos DB, Docker
- **Architecture**: Vite + TypeScript frontend, Express + TypeScript backend with Cosmos DB
- **Sub-packages have dedicated AGENTS.md**: See individual package directories for detailed guidance

## Root Setup Commands

### Install Dependencies
```bash
npm install                # Install root dependencies
cd server && npm install  # Install server dependencies
```

### Build & Run
```bash
npm run build             # Build both client and server
npm run dev               # Run in development mode (concurrent client/server)
npm run start             # Start production build
```

### Type Checking & Testing
```bash
npm run type-check        # Run TypeScript type checking
npm run test              # Run all tests
npm run test:server       # Run server tests only
npm run test:client       # Run client tests only
npm run lint              # Run linting
```

## Universal Conventions

### Code Style
- TypeScript strict mode with strictNullChecks
- Prettier + ESLint formatting
- TSDX-style folder structures with colocated tests

### Commit Format
- Standard conventional commits preferred
- Prefix with scope: `feat(auth):`, `fix(cosmos):`, `chore(deps):`

### Branch Strategy
- Feature branches off main
- PRs require review before merge
- Keep commits atomic and well-described

### PR Requirements
- Pass all tests
- Pass type checking
- Pass linting
- Include tests for new functionality

## Security & Secrets

### NEVER COMMIT
- Azure Cosmos DB keys, connection strings
- OAuth client secrets, API keys
- .env files with sensitive data

### Secrets Location
- Use `.env` files with proper `.gitignore` exclusions
- Store in environment variables in production
- Secrets should follow naming convention `AZURE_*`, `COSMOS_*`

### PII Handling
- Excel data with personal information should be encrypted
- Follow GDPR compliance guidelines

## JIT Index (what to open, not what to paste)

### Package Structure
- Frontend UI: `src/` → [see src/AGENTS.md](src/AGENTS.md)
- Backend API: `server/src/` → [see server/src/AGENTS.md](server/src/AGENTS.md)
- Common Code: `common/` → [see common/AGENTS.md](common/AGENTS.md)
- API Routes: `server/src/routes/` → [see server/src/routes/AGENTS.md](server/src/routes/AGENTS.md)
- Services: `server/src/services/` → [see server/src/services/AGENTS.md](server/src/services/AGENTS.md)
- UI Components: `src/components/ui/` → [see src/components/ui/AGENTS.md](src/components/ui/AGENTS.md)
- Pages: `src/pages/` → [see src/pages/AGENTS.md](src/pages/AGENTS.md)
- Hooks: `src/hooks/` → [see src/hooks/AGENTS.md](src/hooks/AGENTS.md)
- Utils: `src/utils/` → [see src/utils/AGENTS.md](src/utils/AGENTS.md)

### Quick Find Commands
```bash
# Find a component by name
rg -n "export.*ComponentName" src/

# Find API routes by HTTP verb
rg -n "router\.(get|post|put|delete)" server/src/routes/

# Find Cosmos DB usage
rg -n "container.items.query\|CosmosClient\|@azure/cosmos" server/src/

# Find environment variables
rg -n "process.env\|dotenv\|.env" server/src/
```

## Definition of Done

### Before PR
- [ ] All tests pass (`npm run test`)
- [ ] TypeScript compiles (`npm run type-check`)
- [ ] Linting passes (`npm run lint`)
- [ ] New functionality is tested
- [ ] Security scan passes (if applicable)

### Before Merge
- [ ] Code review approved
- [ ] Documentation updated if needed
- [ ] Breaking changes documented