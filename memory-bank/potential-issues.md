# Architecture Analysis: Potential Issues

## 🚨 Security Vulnerabilities

1.  **Authentication Bypass in Test Environment**:
    *   **Issue**: Authentication is intentionally disabled/mocked in dev/test.
    *   **Recommendation**: Strictly enforce `AUTH_ENABLED=true` in production builds via CI/CD pipelines.
    *   **Status**: **Acknowledged** (By Design for Dev)

2.  **SQL Injection / NoSQL Injection**:
    *   **Issue**: Dynamic queries in Query Builder.
    *   **Recommendation**: Ensure all user inputs in `query-rows-get.handler.ts` are parameterized (Cosmos DB `@parameter` syntax).
    *   **Status**: **ADDRESSED** (Code uses parameterization)

## 🏗️ Architectural Issues

1.  **Monorepo Complexity**:
    *   **Issue**: Managing dependencies between root and `server` workspace can be tricky (hoisting, version conflicts).
    *   **Recommendation**: Run `npm install` from root. Use specific build scripts that account for path differences.
    *   **Status**: **MITIGATED** (Restored workspaces, fixed install scripts)

## ⚡ Performance Issues

1.  **Large File Ingestion**:
    *   **Issue**: In-memory parsing of large Excel files.
    *   **Recommendation**: Use streaming parsing where possible or increase server memory. Current implementation uses `exceljs` which can be memory intensive.
    *   **Status**: **MONITOR**

2.  **Cosmos DB Throughput**:
    *   **Issue**: Bulk inserts might exceed RUs.
    *   **Recommendation**: Batching is implemented (`BATCH_SIZE`). Adjust based on Cosmos DB capacity.
    *   **Status**: **ADDRESSED**

## 🧪 Code Quality

1.  **Test Coverage**:
    *   **Issue**: Server-side logic coverage could be improved.
    *   **Status**: **PENDING**

2.  **Legacy Code**:
    *   **Issue**: `v1` API endpoints still exist alongside `v2`.
    *   **Recommendation**: Deprecate and remove `v1` when possible to reduce maintenance surface.
    *   **Status**: **OPEN**