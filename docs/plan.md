# Step-by-Step Blueprint & Chunked Implementation Plan  

---

## **Phase 1: Foundation Setup**  
### **Goal**: Establish core infrastructure and authentication  

#### **Step 1.1: Azure Resource Creation**  
- Use Azure CLI to create:  
  - Resource group (`az group create`)  
  - Cosmos DB (serverless, 400 RU)  
  - Blob Storage (standard, LRS)  
  - Function App (Linux Free Tier)  
  - Static Web App (Free Tier)  
- **Reference**: CLI commands from   

#### **Step 1.2: Azure AD App Registration**  
- Register app in Azure AD:  
  - Set redirect URI (`http://localhost`)  
  - Grant `User.Read` permission  
  - Enable public client flows  
- **Reference**: Azure AD docs   

#### **Step 1.3: Environment Variables**  
- Define in `.env`:  
  ```env  
  COSMOS_DB_CONN_STRING=...  
  BLOB_STORAGE_CONN_STRING=...  
  ENABLE_RBAC=false  
  BLOB_RETENTION_DAYS=1000  
  ```  

---

## **Phase 2: Frontend Core**  
### **Goal**: Build React app with Shadcn UI and authentication  

#### **Step 2.1: Scaffold React App**  
- Use Vite or CRA:  
  ```bash  
  npm create vite@latest my-app --template react-ts  
  ```  
- **Reference**: React setup   

#### **Step 2.2: Integrate Shadcn UI**  
- Install dependencies:  
  ```bash  
  npx shadcn-ui@latest init  
  ```  
- Add dashboard layout with cards/tables   

#### **Step 2.3: Add MSAL Authentication**  
- Use `@azure/msal-react`:  
  ```tsx  
  import { useMsal } from "@azure/msal-react";  
  const { instance } = useMsal();  
  ```  
- Add login button and token acquisition   

---

## **Phase 3: Backend Core**  
### **Goal**: Build Express API for file upload and API generation  

#### **Step 3.1: Setup Azure Function Project**  
- Initialize with Azure Functions Core Tools:  
  ```bash  
  func init --worker-runtime node  
  ```  
- **Reference**: Azure Function setup   

#### **Step 3.2: Create Upload Endpoint**  
- Build `/upload` route:  
  - Parse Excel with `SheetJS`  
  - Store raw file in Blob Storage  
  - Save JSON to Cosmos DB  
- **Reference**: File handling   

#### **Step 3.3: Validate Azure AD Tokens**  
- Use `passport-azure-ad`:  
  ```js  
  const bearerStrategy = new BearerStrategy(options, (token, done) => { ... });  
  ```  
- **Reference**: Token validation   

---

## **Phase 4: Data Handling**  
### **Goal**: Implement dynamic data parsing and filtering  

#### **Step 4.1: Dynamic Excel Parser**  
- Add `SheetJS` to handle any schema:  
  ```js  
  const workbook = XLSX.read(data, { type: "binary" });  
  const json = XLSX.utils.sheet_to_json(workbook.Sheets[0]);  
  ```  
- **Reference**: Dynamic parsing   

#### **Step 4.2: Cosmos DB Query Endpoint**  
- Build `/api/data` with filters:  
  ```sql  
  SELECT * FROM c WHERE c.date BETWEEN @start AND @end  
  ```  
- **Reference**: SQL API   

#### **Step 4.3: Add Audit Logging**  
- Log actions to Cosmos DB:  
  ```json  
  { "user_id": "oid", "action": "upload", "timestamp": "..." }  
  ```  
- **Reference**: Audit logging   

---

## **Phase 5: Security Features**  
### **Goal**: Implement API keys and revocation  

#### **Step 5.1: API Key Model**  
- Define schema in Cosmos DB:  
  ```json  
  { "key_id": "uuid", "hashed_key": "...", "active": true }  
  ```  
- **Reference**: Key management   

#### **Step 5.2: Generate API Keys**  
- Add `/api/generate-key` endpoint:  
  - Use `crypto.randomBytes` for key generation  
  - Hash with SHA-256 before storage   

#### **Step 5.3: Revoke Keys via Dashboard**  
- Build UI to set `active=false` in Cosmos DB  
- **Reference**: Revocation logic   

---

## **Phase 6: UI Integration**  
### **Goal**: Connect frontend to backend services  

#### **Step 6.1: File Upload Component**  
- Add file input with Axios:  
  ```tsx  
  const uploadFile = async (file) => {  
    const formData = new FormData();  
    formData.append("file", file);  
    await axios.post("/api/upload", formData);  
  };  
  ```  
- **Reference**: React file handling   

#### **Step 6.2: Dashboard Filters**  
- Connect filters to `/api/data`  
- Use Chart.js for visualizations   

#### **Step 6.3: API Generator UI**  
- Build form to generate links:  
  ```tsx  
  const generateLink = (filters) => {  
    return `/api/data?api_key=${key}&filter=${filters}`;  
  };  
  ```  

---

## **Phase 7: Testing & Monitoring**  
### **Goal**: Ensure reliability and observability  

#### **Step 7.1: Unit Tests**  
- Use Jest for frontend/backend:  
  ```bash  
  npm test  
  ```  
- Test token validation, file parsing, and key revocation   

#### **Step 7.2: Integration Tests**  
- Use Cypress for end-to-end testing:  
  - Upload → Verify Cosmos DB  
  - Generate API link → Test filtered queries   

#### **Step 7.3: Monitoring Setup**  
- Configure Azure Monitor alerts:  
  ```bash  
  az monitor alert create --name "CosmosDBThrottling" ...  
  ```  
- **Reference**: Monitoring   

---

## **Phase 8: Deployment**  
### **Goal**: Automate CI/CD and finalize  

#### **Step 8.1: GitHub Actions Workflow**  
- Define `.github/workflows/deploy.yml`:  
  ```yaml  
  - name: Deploy Static Web App  
    uses: Azure/static-web-apps-deploy@v1  
  - name: Deploy Function App  
    run: az functionapp deployment source config-zip [...]  
  ```  
- **Reference**: CI/CD   

#### **Step 8.2: Lifecycle Policy**  
- Apply Blob Storage retention:  
  ```bash  
  az storage account management-policy create --policy @lifecycle.json  
  ```  
- **Reference**: Lifecycle policies   

#### **Step 8.3: Documentation**  
- Write README.md with:  
  - Setup instructions  
  - RBAC expansion guidance  
  - Disaster recovery steps   

---

# Code-Generation Prompts  

```text
[Prompt 1]  
Create Azure CLI script to provision resource group, Cosmos DB, Blob Storage, and Function App.  
Include error handling for existing resources.  
Use environment variables for naming consistency.  
```  

```text
[Prompt 2]  
Build React component with MSAL authentication.  
Add login button that acquires Azure AD token.  
Store token in localStorage for API requests.  
```  

```text
[Prompt 3]  
Implement Express endpoint for Excel upload:  
1. Parse file with SheetJS  
2. Store raw file in Blob Storage  
3. Save structured data to Cosmos DB  
Return 200 OK with file metadata.  
```  

```text
[Prompt 4]  
Create Cosmos DB query endpoint with dynamic filters.  
Validate Azure AD token in Authorization header.  
Support query parameters for date/category filters.  
```  

```text
[Prompt 5]  
Design API key generation system:  
1. Store hashed keys in Cosmos DB  
2. Add endpoint to revoke keys  
3. Validate keys in API requests  
Use SHA-256 for secure storage.  
```  

```text
[Prompt 6]  
Build React dashboard with Shadcn UI:  
1. Table to list uploaded files  
2. Filters for Cosmos DB queries  
3. Chart component for visualizing results  
Connect to backend endpoints.  
```  

```text
[Prompt 7]  
Write Jest unit tests for:  
1. Excel parser logic  
2. Token validation middleware  
3. API key revocation  
Ensure 100% branch coverage.  
```  

```text
[Prompt 8]  
Configure GitHub Actions workflow for CI/CD:  
1. Lint and test on PR  
2. Deploy frontend/backend on merge to main  
3. Monitor deployment status with Azure Monitor  
```  

Each prompt builds on the previous one, ensuring integration and testability. 🚀
