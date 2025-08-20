import http from 'http';
import { createProxyServer } from 'http-proxy';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

// Helper function to get file extension
function getExtname(path) {
    const i = path.lastIndexOf('.');
    return (i < 0) ? '' : path.substring(i);
}

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Create a proxy server
const proxy = createProxyServer({});

// Handle proxy errors
proxy.on('error', (err, req, res) => {
    console.error('Proxy error:', err);
    res.writeHead(500, {
        'Content-Type': 'text/plain'
    });
    res.end('Proxy error: ' + err.message);
});

// Create the main server
const server = http.createServer((req, res) => {
    // Check if the request is for API endpoints
    if (req.url.startsWith('/api/') || req.url.startsWith('/v2/') || req.url.startsWith('/fields') || req.url.startsWith('/auth') || req.url.startsWith('/keys')) {
        // Proxy API requests to the backend (port 3001)
        console.log(`Proxying ${req.method} ${req.url} to backend`);
        proxy.web(req, res, { target: 'http://localhost:3001' });
        return;
    }

    // Serve static files for frontend
    let filePath = '.' + req.url;
    if (filePath === './') {
        filePath = './dist/index.html'; // Serve the built React app
    } else if (filePath.startsWith('./dist/')) {
        // If the path already includes /dist/, use it directly
    } else {
        // Otherwise, assume it's a static asset from the build output
        filePath = './dist' + req.url;
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

    fs.readFile(filePath, (error, content) => {
        if (error) {
            if (error.code === 'ENOENT') {
                // Page not found
                fs.readFile('./dist/index.html', (_error, _content) => {
                    res.writeHead(200, { 'Content-Type': 'text/html' });
                    res.end(_content, 'utf-8');
                });
            } else {
                // Server error
                res.writeHead(500);
                res.end('Server Error: ' + error.code);
            }
        } else {
            // Success
            res.writeHead(200, { 'Content-Type': contentType });
            res.end(content, 'utf-8');
        }
    });
});

const port = 80;
server.listen(port, () => {
    console.log(`Reverse proxy server running at http://localhost:${port}/`);
    console.log('Frontend served from ./dist');
    console.log('Backend API proxied to http://localhost:3001');
});