# Stage 1: Build the application
FROM node:18 as builder

# Set working directory
WORKDIR /app

# Install build dependencies
RUN apt-get update && apt-get install -y \
    python3 \
    make \
    g++ \
    && rm -rf /var/lib/apt/lists/*

# Copy package files
COPY package*.json ./
COPY server/package*.json ./server/

# Install root dependencies
RUN npm install

# Install server dependencies
RUN cd server && npm install --include=dev

# Copy application files
COPY . .

# Build the application
RUN npm run build

# Stage 2: Create the production image
FROM node:18-slim

# Set working directory
WORKDIR /app

# Install production dependencies only
COPY --from=builder /app/package*.json ./
COPY --from=builder /app/server/package*.json ./server/

# Install only production dependencies
RUN npm install --only=production
RUN cd server && npm install --only=production

# Copy built application
COPY --from=builder /app/server/dist ./server/dist
COPY --from=builder /app/server/package.json ./server/

# Copy start script and make it executable
COPY start-for-easypanel.sh .
RUN chmod +x /app/start-for-easypanel.sh

# Set environment variables
ENV NODE_ENV=production
ENV PORT=3000

# Expose the port the app runs on
EXPOSE 3000

# Command to run the application
CMD ["./start-for-easypanel.sh"]
