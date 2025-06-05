# Developer-Ready Specification for Internal Web App  

---

## **1. Overview**  
This document outlines a comprehensive specification for building an internal web app for **iesr.or.id**, leveraging Azure services for scalability and security. The app enables users to upload Excel files, query data via a dashboard, and generate secure API links. Key requirements include Azure AD authentication, serverless architecture, and minimal manual configuration .  

---

## **2. Requirements**  
### **Functional**  
- **User Authentication**:  
  - Azure AD OAuth 2.0 (Office 365) for login, with no custom RBAC initially.  
  - Future RBAC toggle via environment variables (e.g., `ENABLE_RBAC=true`).  
- **Excel Upload**:  
  - Parse and validate Excel files dynamically (no fixed schema).  
  - Store raw files in Azure Blob Storage and structured data in Azure Cosmos DB.  
- **Dashboard**:  
  - Filter data via Cosmos DB SQL API.  
  - Pre-built UI components (cards, tables, charts) using [Shadcn UI Admin Dashboard Template](https://ui.shadcn.dev/).  
- **API Generator**:  
  - Generate secure `GET` endpoints with Azure AD token + API key authentication.  
  - Allow revocation of API keys via a user-facing dashboard.  
- **Audit Logging**:  
  - Track file uploads/deletions and API access in Cosmos DB with configurable retention (`AUDIT_LOG_RETENTION_DAYS`).  

### **Non-Functional**  
- **Azure Services**:  
  - **Frontend**: Azure Static Web Apps (Free Tier).  
  - **Backend**: Azure Functions (Linux Free Tier).  
  - **Database**: Cosmos DB (Serverless, 400 RU minimum).  
  - **Storage**: Blob Storage (Standard Performance, LRS redundancy).  
- **Deployment**:  
  - GitHub Actions for CI/CD.  
  - No Bicep/ARM templates due to limited RBAC permissions.  
- **Security**:  
  - HTTPS enforcement, hashed API keys, and Azure AD token validation.  

---

## **3. Architecture**  
### **Tech Stack**  
| Layer          | Technology                          | Reason                                                                 |  
|----------------|-------------------------------------|------------------------------------------------------------------------|  
| **Frontend**   | React.js + Shadcn UI                | Lightweight, Azure AD integration, pre-built UI components .    |  
| **Backend**    | Node.js + Express.js                | Seamless Azure Functions integration and RESTful API support .   |  
| **Database**   | Azure Cosmos DB                     | Serverless NoSQL with dynamic schema support.                         |  
| **Storage**    | Azure Blob Storage                  | Cost-effective for raw Excel files with lifecycle policies.           |  
| **Auth**       | Azure AD OAuth 2.0 + API Keys       | Hybrid security model for defense-in-depth .               |  

### **High-Level Flow**  
```plaintext  
1. User uploads Excel → Azure Function parses data → Stores raw file in Blob Storage and JSON in Cosmos DB.  
2. Dashboard queries Cosmos DB via SQL API → Renders filtered data.  
3. API Generator creates `GET` endpoints → Secured by Azure AD tokens and revocable API keys.  
4. All actions logged in Cosmos DB audit logs.  
```  

---

## **4. Data Flow & Handling**  
### **Excel Upload**  
- **Parsing**: Use `SheetJS` (Node.js) to dynamically parse Excel files into JSON.  
- **Validation**: No schema enforcement; store raw data as-is.  
- **Storage**:  
  - **Blob Storage**: Retain raw files with lifecycle policies (`BLOB_RETENTION_DAYS`).  
  - **Cosmos DB**: Structured data with automatic indexing for dashboard filters.  

### **API Generator**  
- **Endpoint**: `/api/data?filter=date=2025-06`  
- **Security**:  
  - Validate Azure AD token in header (`Authorization: Bearer <token>`).  
  - Optional API key in query parameter (`api_key=uuid`), stored hashed in Cosmos DB.  
- **Revocation**: Users revoke keys via a dashboard (sets `active=false` in Cosmos DB).  

### **Audit Logging**  
- **Fields Logged**:  
  - User ID (`azure_ad_oid`), action type (`upload`, `delete`, `api_access`), timestamp, and metadata.  
- **Retention**: Configurable via `AUDIT_LOG_RETENTION_DAYS` (default: 1,000 days).  

---

## **5. Error Handling**  
- **Token Expiry**:  
  - Use MSAL libraries to automatically refresh Azure AD tokens. Prompt re-authentication if refresh fails.  
- **File Upload Failures**:  
  - Return user-friendly errors (e.g., "File too large", "Invalid format").  
  - Retry transient Cosmos DB writes using Azure Functions’ retry policies.  
- **API Throttling**:  
  - Limit API requests per user/key using Azure API Management or Redis caching.  
- **Cosmos DB Throttling**:  
  - Monitor RU/s consumption via Azure Monitor. Scale RU/s or optimize queries if throttled (status code `429`).  

---

## **6. Testing Plan**  
### **Unit Testing**  
- **Frontend**: Jest + React Testing Library for UI components.  
- **Backend**: Mocha/Chai for API routes and file parsing logic.  

### **Integration Testing**  
- **End-to-End Flows**:  
  - Upload Excel → Verify Blob/Cosmos DB entries.  
  - Generate API link → Test filtered queries with audit logging.  
- **Security**:  
  - Mock expired Azure AD tokens and revoked API keys.  

### **Load Testing**  
- **Tools**: Apache JMeter or Azure Load Testing.  
- **Scenarios**: Simulate concurrent Excel uploads/API requests to validate Cosmos DB RU/s limits.  

### **Manual Testing Guidance**  
- **Postman**: Test API endpoints with Azure AD tokens and API keys.  
- **MSAL Python**: Validate token acquisition and expiration:  
  ```python  
  result = app.acquire_token_interactive(scopes=["User.Read"])  
  print(result["expires_in"])  # Should show ~3600 seconds (1 hour)  
  ```  

---

## **7. Deployment**  
### **GitHub Actions Workflow**  
```yaml  
name: Deploy App  
on: [push]  
jobs:  
  build_and_deploy:  
    runs-on: ubuntu-latest  
    steps:  
      - name: Checkout Code  
        uses: actions/checkout@v3  
      - name: Deploy Static Web App  
        uses: Azure/static-web-apps-deploy@v1  
      - name: Deploy Azure Function  
        run: az functionapp deployment source config-zip [...]  
```  

### **CLI Commands for Setup**  
```bash  
# Create Resource Group  
az group create --name my-rg --location eastus  

# Deploy Cosmos DB  
az cosmosdb create --name my-cosmos --resource-group my-rg --server-version Serverless  

# Deploy Azure Function App  
az functionapp create --name my-func --resource-group my-rg --consumption-plan-location eastus --runtime node --functions-version 4  
```  

### **Monitoring & Alerts**  
- **Azure Monitor**:  
  - Alert for Cosmos DB throttling (status code `429`).  
  - Email notifications via Action Groups.  

---

## **8. Future Enhancements**  
- **RBAC Expansion**: Define roles in Azure AD app registration (e.g., `Uploader`, `Admin`) and validate claims in backend logic.  
- **Custom Domains**: Add SSL certs via Azure Key Vault once default domains are validated.  
- **Disaster Recovery**: Enable Cosmos DB backups or Point-in-Time Restore.  

---

## **9. References**  
- [Azure AD Token Lifetimes](https://learn.microsoft.com/en-us/azure/active-directory/develop/refresh-tokens) .  
- [MSAL Python Documentation](https://github.com/AzureAD/microsoft-authentication-library-for-python) .  
- [Azure Monitor Alerts](https://learn.microsoft.com/en-us/azure/monitor/alerts/alerts-overview) .  

This specification provides a clear roadmap for developers to implement the app, ensuring alignment with Azure best practices and scalability requirements. 🚀
