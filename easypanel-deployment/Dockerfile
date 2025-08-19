# Use the official Node.js runtime as the base image
FROM node:18-alpine

# Set the working directory in the container
WORKDIR /app

# Copy the vps-deployment package contents
COPY . .

# Install production dependencies for the backend
RUN cd backend && npm ci --only=production

# Install production dependencies for the frontend server
RUN npm ci --only=production

# Create a non-root user and group
RUN addgroup -g 1001 -S nodejs && \
    adduser -S nextjs -u 1001

# Change ownership of the app directory to the nodejs user
RUN chown -R nextjs:nodejs /app

# Switch to the non-root user
USER nextjs

# Expose the port the app runs on
EXPOSE 3001

# Define the command to run the application
CMD ["npm", "start"]