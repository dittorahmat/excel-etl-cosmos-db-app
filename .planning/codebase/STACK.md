# Technology Stack

This document outlines the technologies, frameworks, and libraries used in the Excel to Cosmos DB Dashboard project.

## Frontend
- **Framework:** React 18
- **Build Tool:** Vite
- **Language:** TypeScript
- **Styling:**
  - Tailwind CSS (Utility-first CSS)
  - Radix UI (Unstyled accessible UI primitives)
  - Lucide React (Icon set)
  - Next Themes (Light/Dark mode support)
- **Routing:** React Router DOM (v7)
- **Data Visualization:** Recharts
- **Forms & File Handling:**
  - React Dropzone (File upload UI)
  - React Day Picker (Date selection)
- **State Management:** React Hooks (Native)
- **Utilities:**
  - `date-fns` (Date manipulation)
  - `clsx` & `tailwind-merge` (Conditional class merging)

## Backend
- **Runtime:** Node.js
- **Framework:** Express
- **Language:** TypeScript
- **File Processing:**
  - `exceljs` (Excel file parsing/generation)
  - `csv-parser` (CSV stream parsing)
  - `multer` (Multipart/form-data handling for uploads)
- **Validation & Schema:**
  - `zod` (TypeScript-first schema validation)
  - `express-validator` (Middleware for request validation)
- **Security:**
  - `helmet` (Security headers)
  - `cors` (Cross-Origin Resource Sharing)
  - `express-rate-limit` (Request rate limiting)
  - `jsonwebtoken` (JWT handling)
  - `jwks-rsa` (Retrieving RSA signing keys from JWKS)
- **Logging:** `winston` (Versatile logging library)
- **Utilities:**
  - `uuid` (Unique identifier generation)
  - `dotenv` (Environment variable management)

## Infrastructure & DevOps
- **Cloud Platform:** Microsoft Azure
- **Deployment:**
  - Azure Static Web Apps (SWA)
  - Docker & Docker Compose
- **Web Server / Reverse Proxy:** Nginx
- **SSL/TLS:** Certbot / Let's Encrypt
- **Authentication:** Azure AD (Entra ID) / MSAL (Microsoft Authentication Library)

## Testing
- **Unit & Integration:** Vitest
- **E2E Testing:** Playwright
- **Utilities:**
  - `@testing-library/react` (React testing)
  - `supertest` (API testing)
  - `@faker-js/faker` (Mock data generation)
