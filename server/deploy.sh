#!/bin/bash
set -e

echo "=== Starting deployment script ==="
echo "Current directory: $(pwd)"

# Create deployment directory
DEPLOY_DIR="deploy"
echo "Creating deployment directory: $DEPLOY_DIR"
rm -rf "$DEPLOY_DIR"
mkdir -p "$DEPLOY_DIR"

# Build the project
cd ..  # Move to the project root where the build output will be created
echo "Building the project..."
npm run build --prefix server

# Verify build output
echo "=== Verifying build output ==="
if [ ! -d "dist" ]; then
  echo "Error: Build output directory 'dist' not found!"
  echo "Build output structure:"
  find . -type d | sort
  exit 1
fi

# Create deployment directory in the server folder
cd server
rm -rf "$DEPLOY_DIR"
mkdir -p "$DEPLOY_DIR"

# Create the deployment directory structure
echo "Creating deployment directory structure..."
mkdir -p "$DEPLOY_DIR/dist/server/src"

# Copy the built files to the deployment directory
echo "Copying built files..."
if [ -d "../dist/server/src" ]; then
  # If the build output is in the expected structure
  cp -r ../dist/server/src/* "$DEPLOY_DIR/dist/server/src/"
elif [ -d "../dist/server/server/src" ]; then
  # If there's an extra server directory in the path
  cp -r ../dist/server/server/src/* "$DEPLOY_DIR/dist/server/src/"
else
  echo "Error: Could not find built files in expected locations"
  echo "Build output structure:"
  find ../dist -type d | sort
  exit 1
fi

# Copy package files and environment variables
cp package*.json "$DEPLOY_DIR/"
cp .env "$DEPLOY_DIR/" 2>/dev/null || echo "No .env file found, using environment variables"

# Show the final deployment structure
echo "=== Final deployment structure ==="
find "$DEPLOY_DIR" -type f | sort

# Install production dependencies
echo "Installing production dependencies..."
cd "$DEPLOY_DIR"
npm install --omit=dev --no-package-lock --no-audit --progress=false

# Create a simple start script
echo "Creating start script..."
cat > start.sh << 'EOL'
#!/bin/bash
set -e

echo "=== Starting application ==="
echo "Node.js version: $(node -v)"
echo "NPM version: $(npm -v)"
echo "Current directory: $(pwd)"

# List files in current directory
echo "=== Directory contents ==="
ls -la

# List node_modules
echo "=== node_modules exists? ==="
if [ -d "node_modules" ]; then
  echo "node_modules directory exists"
  echo "Number of modules: $(ls -1 node_modules | wc -l)"
else
  echo "ERROR: node_modules directory is missing!"
  exit 1
fi

# Start the application
echo "=== Starting application ==="
node --enable-source-maps dist/server/src/server.js
EOL

# Make the start script executable
chmod +x start.sh

# Create a simple web.config for Azure
echo "Creating web.config for Azure..."
cat > web.config << 'EOL'
<configuration>
  <system.webServer>
    <handlers>
      <add name="iisnode" path="dist/server/src/server.js" verb="*" modules="iisnode" />
    </handlers>
    <rewrite>
      <rules>
        <rule name="DynamicContent">
          <conditions>
            <add input="{REQUEST_FILENAME}" matchType="IsFile" negate="True" />
          </conditions>
          <action type="Rewrite" url="dist/server/src/server.js" />
        </rule>
      </rules>
    </rewrite>
    <iisnode watchedFiles="web.config;*.js" nodeProcessCommandLine="%ProgramFiles%\nodejs\node.exe" />
  </system.webServer>
</configuration>
EOL

echo "=== Deployment package created successfully ==="
echo "To deploy, run: az webapp deploy --resource-group <resource-group> --name <app-name> --src-path $DEPLOY_DIR --type=zip"

# Create a zip file for deployment
if command -v zip &> /dev/null; then
  echo "Creating deployment zip file..."
  zip -r ../deployment.zip .
  echo "Deployment package created at: $(pwd)/../deployment.zip"
else
  echo "zip command not found, skipping zip creation"
fi
