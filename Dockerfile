# Use the official Node.js image as the base image for building
FROM node:18-alpine AS builder

# Set the working directory inside the container
WORKDIR /app

# Copy package.json and package-lock.json (if available) to the working directory
COPY package*.json ./

# Install all dependencies including devDependencies
RUN npm install

# Copy the rest of the application code to the working directory
COPY . .

# Build the application (both frontend and backend)
RUN npm run build

# Use a smaller Node.js image for the runtime
FROM node:18-alpine

# Set the working directory inside the container
WORKDIR /app

# Copy package.json and package-lock.json (if available) to the working directory
COPY package*.json ./

# Install only production dependencies
RUN npm install --production

# Copy the built files from the builder stage
COPY --from=builder /app/dist ./dist
COPY --from=builder /app/server/dist ./server/dist
COPY --from=builder /app/public ./public
COPY --from=builder /app/scripts ./scripts
COPY --from=builder /app/server/scripts ./server/scripts

# Copy the server source code (needed for the start script)
COPY --from=builder /app/server/src ./server/src

# Expose the port that the application will run on
EXPOSE 3001

# Define the command to run the application
CMD ["npm", "run", "start:prod-local"]