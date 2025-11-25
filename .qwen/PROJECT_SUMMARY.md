# Project Summary

## Overall Goal
Implement a major change to the QueryBuilder filter logic so that filter values come from the fields of the selected file in FileSelector, excluding the four special filters (Source, Category, Sub Category, Year), while also implementing proper field type detection to show appropriate operators in the UI, and fixing existing lint and type errors throughout the codebase.

## Key Knowledge
- **Technology Stack**: React/TypeScript frontend with Node.js/Express backend, Cosmos DB as data store, Vite as build tool
- **Architecture**: The QueryBuilder component uses FileSelector to select files and FilterControls for filters, with special filters (Source, Category, Sub Category, Year) handled separately
- **Build Commands**: `npm run build:client`, `npm run build:server`, `npm run lint`, `npm run type-check`
- **Key Components**: FileSelector.tsx, FilterControls.tsx, QueryBuilder.tsx, and server route file.route.ts
- **API Endpoints**: `/api/query/file` endpoint receives filters as JSON string in URL parameters and parses them server-side
- **Field Type System**: Field types are detected during ingestion and stored in import metadata, enabling proper operator selection in the UI

## Recent Actions
- **[DONE]** Modified QueryBuilder to use dynamic fields based on selected file using the useFields hook with special filters
- **[DONE]** Updated server route to properly parse JSON filters parameter and apply individual filter conditions to Cosmos DB query
- **[DONE]** Fixed QueryBuilderPage to make actual API calls with filters instead of just showing alerts
- **[DONE]** Fixed lint error in server code by properly typing the multer fileFilter callback
- **[DONE]** Addressed multiple type errors in FieldSelector.tsx and FileSelector.tsx related to special field handling and year checkbox logic
- **[DONE]** Fixed type errors in API client (api.ts) related to boolean comparisons
- **[DONE]** Corrected global Window interface declaration conflicts in main.tsx
- **[NEW]** Implemented field type detection during ingestion by adding `detectFieldTypes` function in `ingestion.service.ts`
- **[NEW]** Extended ImportMetadata interface to include `fieldTypes` property to store type information for each field
- **[NEW]** Updated processImport method in `ingestion.service.ts` to detect and store field types when files are imported
- **[NEW]** Updated fields API to retrieve field types from import metadata instead of inefficiently sampling data rows
- **[NEW]** Modified FilterControls to utilize the proper field types which now correctly show numerical operators for number fields like MW
- **[NEW]** Fixed lint, type-check and build errors by resolving FileFilterCallback type conflicts in upload.route.queue.ts
- **[NEW]** Updated type definitions in fields.route.ts to properly use Cosmos Container type
- **[NEW]** Improved field type detection logic with proper TypeScript types in ingestion.service.ts
- **[NEW]** Enhanced useFields hook with cache-while-fetching strategy to maintain previous fields while loading new ones
- **[NEW]** Updated QueryBuilder loading condition to prevent disruptive loading states during cascading filter changes
- **[NEW]** Added React.memo to FilterControls to prevent unnecessary re-renders
- **[NEW]** Fixed closure issue in QueryBuilder handleSpecialFiltersChange callback using functional updates
- **[NEW]** Removed complex field preservation logic that was causing React error #310 while maintaining core functionality
- **[NEW]** Added isValidDateString utility function to properly validate dates in formatters.ts
- **[NEW]** Fixed incorrect date formatting in DashboardPage that was causing "Unit" field to show "Invalid Date"
- **[NEW]** Updated date detection logic in DashboardPage to use proper validation instead of simple "T" character check
- **[NEW]** Applied correct date formatting logic to table display and export functions (CSV/Excel)
- **[NEW]** Updated Navbar banner header image from iesr-header-new.jpg to iesr-header-cityscape.jpg
- **[NEW]** Fixed multi-select checkbox issue in FilterControls by replacing CommandItem with div elements to resolve conflicts between CommandItem selection behavior and Checkbox state management
- **[NEW]** Ensured proper checkbox functionality for 'in'/'notIn' operators in QueryBuilder filter controls
- **[NEW]** Disabled rate limiting by commenting out rateLimit middleware in server/src/config/app.ts and server/src/routes/apiKey.route.ts with explanatory notes for future re-enablement
- **[NEW]** Removed unused rateLimit import from server/src/config/app.ts after disabling rate limiting
- **[NEW]** Verified that lint, type-check, and build processes pass successfully after rate limiting changes
- **[NEW]** Fixed field sanitization issue in distinct-values endpoints to preserve special characters like forward slashes in field names
- **[NEW]** Updated regex in server/src/routes/distinct-values.route.ts from `/[^a-zA-Z0-9 _-]/g` to `/[^a-zA-Z0-9 _/-]/g` to preserve forward slashes in field names like "PLN Operational Unit/Province"
- **[NEW]** Updated regex in server/src/routes/query/file.route.ts to maintain consistent field sanitization that preserves special characters
- **[NEW]** Verified that lint, type-check, and build processes pass successfully after field sanitization fixes

## Current Plan
- **[DONE]** Major filter logic implementation completed - filters now use fields from selected file, excluding special filters
- **[DONE]** Server-side filter parsing implemented to handle JSON filters parameter correctly
- **[DONE]** Type safety improvements in multiple components
- **[DONE]** Lint and build compatibility maintained
- **[DONE]** Field type detection implemented during import process to show appropriate operators in UI
- **[DONE]** Cascading filter performance improved with cache-while-fetching strategy
- **[DONE]** React error #310 resolved by simplifying field handling logic
- **[DONE]** Date formatting issue resolved by implementing proper date validation in DashboardPage
- **[DONE]** Multi-select checkbox functionality fixed for 'in'/'notIn' operators by replacing CommandItem with regular div elements
- **[DONE]** Rate limiting successfully disabled with preserved functionality for future re-enablement
- **[DONE]** Field sanitization fixed to preserve special characters like forward slashes in field names
- The implementation is complete and builds successfully, with only pre-existing errors remaining in auth/msalInstance.ts (unrelated to filtering feature)
