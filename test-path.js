import path from 'path';
import { fileURLToPath } from 'url';
import fs from 'fs';

// Get the directory name in ES modules
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

console.log('__dirname:', __dirname);

// Path to the static files in the server/dist/public directory
const staticPath = path.join(__dirname, './server/src/config/../../../server/dist/public');
const indexPath = path.join(staticPath, 'index.html');

console.log('staticPath:', staticPath);
console.log('indexPath:', indexPath);
console.log('staticPath exists:', fs.existsSync(staticPath));
console.log('indexPath exists:', fs.existsSync(indexPath));