# Project Overview: Excel-to-Cosmos ETL & Dashboard

## Purpose
This application is a full-stack ETL (Extract, Transform, Load) pipeline designed to simplify the ingestion of large Excel and CSV datasets into Azure Cosmos DB. It provides a user-friendly dashboard for non-technical users to visualize, filter, and export data without needing to write SQL queries.

## Core Features
- **Smart Ingestion**: Automatic detection of data types and validation of mandatory columns.
- **Dynamic Query Builder**: A powerful UI that adapts to the available fields in the database, allowing for complex multi-field filtering.
- **Secure Access**: Integrated with Microsoft Identity (Azure AD) for enterprise-grade authentication.
- **Data Export**: Export filtered results back to Excel or CSV format.
- **Programmatic Access**: Managed API keys for third-party integrations.

## Target Audience
- Data analysts who need to process Excel reports.
- Developers who need a clean API on top of raw spreadsheet data.
- Organizations looking to migrate legacy Excel workflows to a scalable cloud database.

## High-Level Workflow
1. **Upload**: User uploads a file via the "Edit Database" page.
2. **Process**: Backend parses the file, normalizes data, and stores it in Cosmos DB.
3. **Explore**: User uses the Dashboard to build queries and see results.
4. **Export/Integrate**: User downloads data or uses an API key to fetch data into other tools.
