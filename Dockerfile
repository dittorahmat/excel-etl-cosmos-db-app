# Use the official Node.js image as the base image
FROM node:18-alpine

# Set the working directory inside the container
WORKDIR /app

# Copy package.json and package-lock.json (if available) to the working directory
COPY package*.json ./

# Install dependencies
RUN npm install

# Copy the rest of the application code to the working directory
COPY . .

# Build the application (both frontend and backend)
RUN npm run build

# Expose the port that the application will run on
EXPOSE 3001

# Define the command to run the application
CMD ["npm", "run", "start:prod-local"]