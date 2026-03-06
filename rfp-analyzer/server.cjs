const http = require('http');
const fs = require('fs');
const path = require('path');

const PORT = 3000;
const DIST_DIR = path.join(__dirname, 'dist');

// Check for debug flag in command line arguments
const IS_DEBUG = process.argv.includes('--debug');

const MIME_TYPES = {
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
  '.wasm': 'application/wasm'
};

const server = http.createServer((req, res) => {
  // Handle Logging Endpoint
  if (req.url === '/api/log' && req.method === 'POST') {
    let body = '';
    req.on('data', chunk => { body += chunk.toString(); });
    req.on('end', () => {
      if (IS_DEBUG) {
        try {
          const logData = JSON.parse(body);
          const timestamp = new Date().toLocaleTimeString();
          console.log(`[CLIENT-DEBUG] [${timestamp}] ${logData.label || 'LOG'}:`, 
            typeof logData.message === 'object' ? JSON.stringify(logData.message, null, 2) : logData.message
          );
        } catch (e) {
          if (IS_DEBUG) console.log('[CLIENT-DEBUG] Raw Log:', body);
        }
      }
      res.writeHead(200, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({ status: 'ok' }));
    });
    return;
  }

  // Serve static files
  let filePath = path.join(DIST_DIR, req.url === '/' ? 'index.html' : req.url);
  const extname = String(path.extname(filePath)).toLowerCase();
  const contentType = MIME_TYPES[extname] || 'application/octet-stream';

  fs.readFile(filePath, (error, content) => {
    if (error) {
      if (error.code === 'ENOENT') {
        fs.readFile(path.join(DIST_DIR, 'index.html'), (err, html) => {
          res.writeHead(200, { 'Content-Type': 'text/html' });
          res.end(html, 'utf-8');
        });
      } else {
        res.writeHead(500);
        res.end(`Server Error: ${error.code}`);
      }
    } else {
      res.writeHead(200, { 'Content-Type': contentType });
      res.end(content, 'utf-8');
    }
  });
});

server.listen(PORT, () => {
  console.log(`
==================================================`);
  console.log(`  RFP Analyzer is running!`);
  console.log(`  URL: http://localhost:${PORT}`);
  console.log(`  Debug Mode: ${IS_DEBUG ? 'ON' : 'OFF'}`);
  console.log(`  Press Ctrl+C to stop the server.`);
  console.log(`==================================================
`);
});
