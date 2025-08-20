# Multi-stage Dockerfile for Excel to Cosmos DB Dashboard
# This Dockerfile is used for direct container deployment, not for Nixpacks

# Build stage
FROM node:18-alpine AS builder

# Set working directory
WORKDIR /app

# Install system dependencies
RUN apk add --no-cache curl bash

# Copy package files
COPY package*.json ./
COPY server/package*.json ./server/

# Install all dependencies
RUN npm ci
RUN cd server && npm ci

# Copy source code
COPY . .

# Build frontend and backend
RUN npm run build:client
RUN cd server && npm run build

# Production stage
FROM node:18-alpine

# Set working directory
WORKDIR /app

# Install system dependencies
RUN apk add --no-cache curl bash

# Copy package files for production dependencies
COPY package*.json ./
COPY server/package*.json ./server/

# Install production dependencies only
RUN npm ci --only=production
RUN cd server && npm ci --only=production

# Copy built files from builder stage
COPY --from=builder /app/dist ./dist
COPY --from=builder /app/server/dist ./server/dist

# Copy startup scripts
COPY start-for-easypanel.sh ./
COPY build-for-easypanel.sh ./

# Make scripts executable
RUN chmod +x ./start-for-easypanel.sh
RUN chmod +x ./build-for-easypanel.sh

# Install serve globally
RUN npm install -g serve

# Expose port
EXPOSE 3000

# Health check
HEALTHCHECK --interval=30s --timeout=3s --start-period=5s --retries=3 \
  CMD curl -f http://localhost:3000/health || exit 1

# Start command
CMD ["bash", "start-for-easypanel.sh"]