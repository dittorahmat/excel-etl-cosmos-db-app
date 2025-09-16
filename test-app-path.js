import path from 'path';
import { fileURLToPath } from 'url';
import fs from 'fs';

// Simulate the path calculation from app.ts
// Get the directory name in ES modules
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

console.log('Current working directory:', process.cwd());
console.log('__filename:', __filename);
console.log('__dirname:', __dirname);

// Path to the static files in the server/dist/public directory
const staticPath = path.join(__dirname, '../../../server/dist/public');
const indexPath = path.join(staticPath, 'index.html');

console.log('Calculated staticPath:', staticPath);
console.log('Calculated indexPath:', indexPath);
console.log('staticPath exists:', fs.existsSync(staticPath));
console.log('indexPath exists:', fs.existsSync(indexPath));

// List files in the staticPath
if (fs.existsSync(staticPath)) {
  console.log('Files in staticPath:', fs.readdirSync(staticPath));
}