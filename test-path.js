import { fileURLToPath } from 'url';
import { dirname, join } from 'path';
import { existsSync } from 'fs';

// Get the directory name in ES modules
const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// Path to the static files in the server/dist/public directory
const staticPath = join(__dirname, '../../public');
const indexPath = join(staticPath, 'index.html');

console.log('__dirname:', __dirname);
console.log('staticPath:', staticPath);
console.log('indexPath:', indexPath);
console.log('staticPath exists:', existsSync(staticPath));
console.log('indexPath exists:', existsSync(indexPath));