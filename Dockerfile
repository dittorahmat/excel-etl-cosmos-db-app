# Use an official Node runtime as the base image
FROM node:18-alpine

# Set the working directory
WORKDIR /app

# Install system dependencies
RUN apk add --no-cache curl gnupg ca-certificates

# Copy package files
COPY package*.json ./
COPY server/package*.json ./server/

# Install dependencies
RUN npm install
RUN cd server && npm install

# Copy the rest of the application code
COPY . .

# Build the frontend and backend
RUN npm run build:client
RUN cd server && npm run build

# Expose the port the app runs on
EXPOSE 3000

# Install serve globally
RUN npm install -g serve

# Start the application
CMD ["sh", "start-for-easypanel.sh"]