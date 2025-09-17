import express from 'express';
import path from 'path';
import { fileURLToPath } from 'url';
import fs from 'fs';

const app = express();
const port = 3002;

// Get the directory name in ES modules
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Path to the static files in the server/dist/public directory
// Calculate path relative to the project root
const projectRoot = path.join(__dirname, '.');
const staticPath = path.join(projectRoot, 'server/dist/public');
const indexPath = path.join(staticPath, 'index.html');

console.log('Project root:', projectRoot);
console.log('Static path:', staticPath);
console.log('Index path:', indexPath);
console.log('Static path exists:', fs.existsSync(staticPath));
console.log('Index path exists:', fs.existsSync(indexPath));

// Serve static files
app.use(express.static(staticPath));

// Serve index.html for all other routes
app.get('*', (req, res) => {
  console.log('Serving index.html for route:', req.path);
  res.sendFile(indexPath);
});

app.listen(port, () => {
  console.log(`Test server running at http://localhost:${port}`);
});