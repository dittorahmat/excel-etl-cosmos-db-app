import http from 'http';
import { fileURLToPath } from 'url';
import { dirname } from 'path';
import fs from 'fs';

// Helper function to get file extension
function getExtname(path) {
    const i = path.lastIndexOf('.');
    return (i < 0) ? '' : path.substring(i);
}

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const server = http.createServer((req, res) => {
    let filePath = '.' + req.url;
    if (filePath === './') {
        filePath = './test-auth.html';
    }

    const extname = String(getExtname(filePath)).toLowerCase();
    const mimeTypes = {
        '.html': 'text/html',
        '.js': 'text/javascript',
        '.css': 'text/css',
        '.json': 'application/json',
        '.png': 'image/png',
        '.jpg': 'image/jpg',
        '.gif': 'image/gif',
        '.svg': 'image/svg+xml',
        '.wav': 'audio/wav',
        '.mp4': 'video/mp4',
        '.woff': 'application/font-woff',
        '.ttf': 'application/font-ttf',
        '.eot': 'application/vnd.ms-fontobject',
        '.otf': 'application/font-otf',
        '.wasm': 'application/wasm',
        '.mjs': 'text/javascript'
    };

    const contentType = mimeTypes[extname] || 'application/octet-stream';

    fs.readFile(filePath, (_error, _content) => {
        if (error) {
            if(error.code === 'ENOENT') {
                // Page not found
                fs.readFile('./404.html', (error, content) => {
                    res.writeHead(404, { 'Content-Type': 'text/html' });
                    res.end('404 Not Found', 'utf-8');
                });
            } else {
                // Server error
                res.writeHead(500);
                res.end('Sorry, check with the site admin for error: '+error.code+' ..\n');
            }
        } else {
            // Success
            res.writeHead(200, { 'Content-Type': contentType });
            res.end(content, 'utf-8');
        }
    });
});


const port = 3000;
server.listen(port, () => {
    console.log(`Server running at http://localhost:${port}/`);
    console.log('Open http://localhost:3000/test-auth.html in your browser');
});
