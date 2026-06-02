const http = require('http');
const fs = require('fs');
const path = require('path');
const https = require('https');

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

  // Handle Link Validation Proxy
  if (req.url.startsWith('/api/validate-link') && req.method === 'GET') {
    const targetUrl = new URL(req.url, `http://${req.headers.host}`).searchParams.get('url');
    if (!targetUrl) {
      res.writeHead(400);
      res.end('Missing url parameter');
      return;
    }

    let hasResponded = false;
    const sendResponse = (valid, statusOrError) => {
      if (hasResponded) return;
      hasResponded = true;
      if (IS_DEBUG) {
        console.log(`[SERVER-CHECK] ${valid ? 'VALID' : 'BROKEN'} (${statusOrError}): ${targetUrl}`);
      }
      res.writeHead(200, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({ valid, status: statusOrError }));
    };

    try {
      const client = targetUrl.startsWith('https') ? https : http;
      const request = client.request(targetUrl, { method: 'HEAD', timeout: 5000 }, (proxyRes) => {
        const isValid = proxyRes.statusCode >= 200 && proxyRes.statusCode < 400;
        sendResponse(isValid, proxyRes.statusCode);
      });

      request.on('error', (e) => {
        sendResponse(false, e.message);
      });

      request.on('timeout', () => {
        request.destroy();
        sendResponse(false, 'Timeout');
      });

      request.end();
    } catch (err) {
      sendResponse(false, err.message);
    }
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
