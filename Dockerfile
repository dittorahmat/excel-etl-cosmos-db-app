# Multi-stage Dockerfile for Excel to Cosmos DB Dashboard
# This Dockerfile installs all dependencies for building, then cleans up dev dependencies for production

# Build stage
FROM node:18-alpine AS builder

# Set working directory
WORKDIR /app

# Install system dependencies
RUN apk add --no-cache curl bash

# Copy package files for dependency installation
COPY package*.json ./
COPY server/package*.json ./server/
COPY common ./common

# Install all dependencies
RUN npm install && cd server && npm install

# Copy source code
COPY src ./src
COPY server/src ./server/src
COPY index.html vite.config.ts tsconfig.json tsconfig.node.json ./
COPY server/tsconfig*.json ./server/
COPY common ./common
COPY scripts ./scripts

# Build frontend and backend
RUN npm run build

# Production stage
FROM node:18-alpine

# Install system dependencies and create log directory
RUN apk add --no-cache curl bash \
    && mkdir -p /app/LogFiles

# Set working directory
WORKDIR /app

# Copy package files for production dependency installation
COPY package*.json ./
COPY server/package*.json ./server/

# Install production dependencies only
RUN npm ci --only=production && cd server && npm ci --only=production

# Copy built files from builder stage
COPY --from=builder /app/dist ./dist
COPY --from=builder /app/server/dist ./server/dist

# Copy necessary runtime files and make start script executable
COPY start-for-easypanel.sh /start-for-easypanel.sh
RUN chmod +x /start-for-easypanel.sh

# Copy common directory (referenced in tsconfig)
COPY common ./common

# Expose port for the unified server
EXPOSE 3000

# Health check
HEALTHCHECK --interval=30s --timeout=3s --start-period=5s --retries=3 \
    CMD curl -f http://localhost:3000/health || exit 1

# Start command using the easypanel start script
ENTRYPOINT ["/start-for-easypanel.sh"]