# Project Summary

## Overall Goal
Implement a file-based query system that replaces the current field-based approach with cascading filters (Source → Category → Sub Category → File Selection → Year) and fix rate limiting/authentication issues that prevent proper file selection and query execution.

## Key Knowledge
- Technology stack: React frontend with TypeScript, Node.js/Express backend with Cosmos DB
- Authentication: Azure AD with MSAL for production, dummy auth for development
- File-based query flow: Source → Category → Sub Category → File Selection → Year
- Backend endpoints: 
  - `/api/query/file` - Execute file-based queries
  - `/api/query/file-get` - GET endpoint for API links
  - `/api/distinct-file-values` - Get distinct values for cascading filters
  - `/api/query/files-by-filters` - Get files matching filter criteria
- Rate limiting: Previously causing 429 errors during cascading filter operations
- Authentication issues: 401 errors on `/api/query/file` endpoint

## Recent Actions
1. [DONE] Fixed syntax error in `useDashboardData.ts` that was preventing builds
2. [DONE] Implemented FileSelector component with cascading filter functionality
3. [DONE] Updated backend API endpoints for file-based queries
4. [DONE] Added request debouncing and cancellation to prevent rate limiting
5. [DONE] Fixed backend query issues where `c._partitionKey` was used instead of `c._importId`
6. [DONE] Implemented proper authentication headers for all API calls
7. [DONE] Updated rate limiting configuration to be more lenient for development
8. [DONE] Fixed Year dropdown population by correcting Cosmos DB field references

## Current Plan
1. [IN PROGRESS] Testing the complete file-based query flow with all cascading filters
2. [TODO] Verify query execution works correctly with selected file and filters
3. [TODO] Ensure API generation works with file-based parameters
4. [TODO] Validate data display in DashboardPage with file-based results
5. [TODO] Test export functionality with file-based data
6. [TODO] Document the complete implementation for future reference

---

## Summary Metadata
**Update time**: 2025-11-01T08:38:30.246Z 
