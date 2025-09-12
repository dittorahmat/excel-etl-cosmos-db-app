# Configuration

This directory contains the unified configuration approach for both frontend and backend.

## Structure

- `index.ts` - Main configuration entry point
- `env.ts` - Environment variable loading and validation
- `client.ts` - Client-specific configuration
- `server.ts` - Server-specific configuration
- `shared.ts` - Shared configuration between client and server

## Environment Variables

All environment variables should be defined in the root `.env` file and will be accessible to both client and server.