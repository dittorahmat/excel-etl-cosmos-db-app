# Deployment Options: EasyPanel vs Docker vs CI/CD

## 1. Deploying with EasyPanel

EasyPanel is a modern server control panel that simplifies the deployment and management of web applications. Here's how you can deploy your full-stack application using EasyPanel:

### Prerequisites
- A VPS with EasyPanel installed
- The `excel-etl-fullstack-vps-deployment.tar.gz` file

### Deployment Steps

1. **Access EasyPanel Dashboard**
   - Open your web browser and navigate to `https://your-vps-ip:3000`
   - Log in with your EasyPanel credentials

2. **Create a New Project**
   - In the EasyPanel dashboard, click on "New Project"
   - Choose "Node.js" as the project type
   - Give your project a name (e.g., "excel-etl-app")

3. **Upload and Extract Your Application**
   - In the project settings, look for "Deploy" or "Deployment" section
   - Choose to upload your files via:
     - Direct upload (drag and drop the tar.gz file)
     - Git repository (if you've uploaded it to a repository)
     - Or use the file manager to upload and extract the tar.gz file manually

4. **Configure Environment Variables**
   - In the project settings, find the "Environment Variables" section
   - Add all required environment variables:
     - `PORT` (e.g., 3001)
     - `NODE_ENV` (e.g., "production")
     - `AZURE_COSMOS_ENDPOINT`
     - `AZURE_COSMOS_KEY`
     - `AZURE_COSMOS_DATABASE`
     - `AZURE_COSMOS_CONTAINER`
     - `AZURE_STORAGE_ACCOUNT`
     - `AZURE_STORAGE_KEY`
     - `AZURE_STORAGE_CONTAINER`
     - Any other variables your application requires

5. **Set Up the Start Command**
   - In the project settings, find the "Start Command" or "Process" section
   - Set the start command to: `npm start`
   - Ensure the working directory is set to where your `package.json` is located

6. **Configure Networking**
   - In the project settings, find the "Network" or "Ports" section
   - Set the container port to match your application's port (3001 by default)
   - If you want to expose it publicly, set up a domain or subdomain through EasyPanel's proxy feature

7. **Deploy and Start the Application**
   - Save all settings
   - Click "Deploy" or "Build" to build and deploy your application
   - Once deployment is complete, click "Start" to run your application

8. **Monitor and Manage**
   - Use the EasyPanel dashboard to monitor logs, restart the application, or view resource usage

## 2. Deploying with Docker

Docker can provide a more consistent and isolated environment for your application. Here's how you can deploy using Docker:

### Prerequisites
- Docker installed on your VPS
- The application source code or deployment package

### Steps

1. **Create a Dockerfile**
   Create a `Dockerfile` in your project root with the following content:
   ```dockerfile
   # Use the official Node.js runtime as the base image
   FROM node:16

   # Set the working directory in the container
   WORKDIR /usr/src/app

   # Copy package files
   COPY package*.json ./

   # Install dependencies
   RUN npm ci --only=production

   # Copy the rest of the application code
   COPY . .

   # Expose the port the app runs on
   EXPOSE 3001

   # Define the command to run the application
   CMD ["npm", "start"]
   ```

2. **Create a docker-compose.yml (Optional but Recommended)**
   Create a `docker-compose.yml` file for easier management:
   ```yaml
   version: '3.8'
   services:
     excel-etl-app:
       build: .
       ports:
         - "3001:3001"
       environment:
         - PORT=3001
         - NODE_ENV=production
         - AZURE_COSMOS_ENDPOINT=${AZURE_COSMOS_ENDPOINT}
         - AZURE_COSMOS_KEY=${AZURE_COSMOS_KEY}
         - AZURE_COSMOS_DATABASE=${AZURE_COSMOS_DATABASE}
         - AZURE_COSMOS_CONTAINER=${AZURE_COSMOS_CONTAINER}
         - AZURE_STORAGE_ACCOUNT=${AZURE_STORAGE_ACCOUNT}
         - AZURE_STORAGE_KEY=${AZURE_STORAGE_KEY}
         - AZURE_STORAGE_CONTAINER=${AZURE_STORAGE_CONTAINER}
       env_file:
         - .env
       restart: unless-stopped
       volumes:
         - ./logs:/usr/src/app/logs
   ```

3. **Build and Run the Docker Container**
   ```bash
   # Build the Docker image
   docker build -t excel-etl-app .

   # Run the container
   docker run -d \
     --name excel-etl-app \
     -p 3001:3001 \
     --env-file .env \
     excel-etl-app

   # Or, if using docker-compose
   docker-compose up -d
   ```

4. **Set Up Reverse Proxy**
   - Configure Nginx or Apache to proxy requests to your Docker container
   - If using EasyPanel, you can set up a proxy through its interface

### Which is Easier: EasyPanel or Docker?

- **EasyPanel**: 
  - Pros: User-friendly interface, simplified management, built-in features for domains, SSL, etc.
  - Cons: Less flexibility, tied to EasyPanel's ecosystem

- **Docker**:
  - Pros: More portable, consistent across environments, better for complex deployments
  - Cons: Steeper learning curve, requires more manual setup

For your use case, if you're already invested in EasyPanel and want a straightforward deployment, EasyPanel might be easier. If you want more control and portability, Docker would be a better choice.

## 3. CI/CD in VPS

Yes, it's definitely possible to set up CI/CD on your VPS. Here are a few approaches:

### Option 1: GitHub Actions with Self-hosted Runner
1. Set up a self-hosted runner on your VPS
2. Configure your GitHub Actions workflow to deploy to the VPS using the self-hosted runner
3. This allows you to keep your CI/CD pipeline in GitHub while deploying directly to your VPS

### Option 2: Git Hooks
1. Set up a bare Git repository on your VPS
2. Configure post-receive hooks to automatically deploy when you push to the repository
3. This is a simple but effective approach for basic deployments

### Option 3: Using a CI/CD Tool
1. Install a tool like Jenkins, GitLab CI, or Drone on your VPS
2. Configure pipelines to build and deploy your application
3. This provides the most features but requires more setup

### Recommendation for Your Case
Given that you're using EasyPanel, I'd recommend:
1. For simplicity: Use EasyPanel's deployment features with manual updates
2. For automation: Set up GitHub Actions with a self-hosted runner on your VPS
3. For maximum flexibility: Use Docker with a simple CI/CD script that builds and deploys the container when you push to your repository

The choice depends on your comfort level with each technology and how much automation you want.

## 4. Manual Deployment Steps

If you prefer to deploy manually, here are the steps:

1. **Prepare Your VPS**
   - Ensure Node.js (version 16 or higher) is installed
   - Ensure NPM is installed

2. **Transfer Files**
   - Transfer the `excel-etl-fullstack-vps-deployment.tar.gz` file to your VPS
   - Extract it:
     ```bash
     tar -xzvf excel-etl-fullstack-vps-deployment.tar.gz
     ```

3. **Install Dependencies**
   ```bash
   cd vps-deployment
   npm install
   ```

4. **Configure Environment Variables**
   - Edit the `.env` file with your specific configuration
   - Make sure to update all Azure credentials and other settings

5. **Start the Application**
   ```bash
   npm start
   ```

6. **Set Up Process Manager (Optional but Recommended)**
   - Install PM2 globally:
     ```bash
     npm install -g pm2
     ```
   - Start the application with PM2:
     ```bash
     pm2 start ecosystem.config.cjs
     ```
   - Save the PM2 configuration:
     ```bash
     pm2 save
     ```
   - Set up PM2 to start on boot:
     ```bash
     pm2 startup
     ```

7. **Set Up Reverse Proxy (Optional but Recommended)**
   - Install Nginx:
     ```bash
     sudo apt install nginx
     ```
   - Configure Nginx to proxy requests to your application
   - Set up SSL with Let's Encrypt (optional but recommended)

## 5. Troubleshooting

- **Port Conflicts**: Make sure the port specified in your `.env` file is not already in use
- **Permission Issues**: Ensure the user running the application has read/write permissions to the application directory
- **Missing Environment Variables**: Check that all required environment variables are set in the `.env` file
- **Azure Credentials**: Verify that all Azure credentials are correct and have the necessary permissions
- **Firewall**: Ensure your VPS firewall allows traffic on the ports you're using

If you encounter any issues, check the log files in the `logs` directory for error messages.