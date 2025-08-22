# Use the official Node.js image as the base image for building
FROM node:18-alpine AS builder

# Install curl for health checks
RUN apk add --no-cache curl

# Set the working directory inside the container
WORKDIR /app

# Copy package.json and package-lock.json (if available) to the working directory
COPY package*.json ./
COPY server/package*.json ./server/

# Install all dependencies including devDependencies
RUN npm install

# Copy the rest of the application code to the working directory
COPY . .

# Build the frontend
RUN npm run build:client

# Build the backend using the server's build script
RUN cd server && npm run build

# Use a smaller Node.js image for the runtime
FROM node:18-alpine

# Set the working directory inside the container
WORKDIR /app

# Copy package.json and package-lock.json (if available) to the working directory
COPY package*.json ./
COPY server/package*.json ./server/

# Install only production dependencies
RUN npm install --production

# Copy the built files from the builder stage
COPY --from=builder /app/dist ./dist
COPY --from=builder /app/server/dist ./server/dist
COPY --from=builder /app/public ./public

# Expose the port that the application will run on
EXPOSE 3001

# Define the command to run the application
CMD ["npm", "run", "start:prod-local"]