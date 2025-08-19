# Use an official Node.js runtime as the base image
FROM node:18-alpine

# Set the working directory
WORKDIR /app

# Copy package files
COPY package*.json ./
COPY server/package*.json ./server/

# Install dependencies
RUN npm install
RUN cd server && npm install

# Copy the rest of the application code
COPY . .

# Build the application
RUN npm run build:client
RUN cd server && npm run build

# Expose the port the app runs on
EXPOSE 3000

# Start the application
CMD ["bash", "start-for-easypanel.sh"]