import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import https from 'https'
import { GoogleGenAI } from '@google/genai'

// https://vite.dev/config/
export default defineConfig({
  plugins: [
    react(),
    {
      name: 'api-middleware',
      configureServer(server) {
        server.middlewares.use((req, res, next) => {
          // 1. Handle Logging
          if (req.url === '/api/log' && req.method === 'POST') {
            let body = '';
            req.on('data', chunk => { body += chunk.toString(); });
            req.on('end', () => {
              try {
                const logData = JSON.parse(body);
                const timestamp = new Date().toLocaleTimeString();
                console.log(`[CLIENT-DEBUG] [${timestamp}] ${logData.label || 'LOG'}:`, 
                  (logData.message !== null && typeof logData.message === 'object') ? JSON.stringify(logData.message, null, 2) : logData.message
                );
              } catch (error) { // eslint-disable-line no-unused-vars
                console.log('[CLIENT-DEBUG] Raw Log:', body);
              }
              if (!res.writableEnded) {
                res.statusCode = 200;
                res.setHeader('Content-Type', 'application/json');
                res.end(JSON.stringify({ status: 'ok' }));
              }
            });
            return;
          }

          // 3. Handle Google AI Model Fetch Proxy
          if (req.url && req.url.startsWith('/api/proxy/google-models') && req.method === 'GET') {
            const apiKey = new URL(req.url, `http://${req.headers.host}`).searchParams.get('key');
            if (!apiKey) {
              res.statusCode = 400;
              res.setHeader('Content-Type', 'application/json');
              res.end(JSON.stringify({ error: 'Missing key parameter' }));
              return;
            }

            let responseSent = false;
            const sendError = (status, message) => {
              if (responseSent) return;
              responseSent = true;
              res.statusCode = status;
              res.setHeader('Content-Type', 'application/json');
              res.end(JSON.stringify({ error: message }));
            };

            const request = https.get(`https://generativelanguage.googleapis.com/v1beta/models?key=${apiKey}`, (googleRes) => {
              let data = '';
              googleRes.on('data', chunk => { data += chunk; });
              googleRes.on('end', () => {
                if (responseSent) return;
                responseSent = true;
                res.statusCode = googleRes.statusCode;
                res.setHeader('Content-Type', 'application/json');
                
                if (googleRes.statusCode !== 200) {
                  try {
                    const parsed = JSON.parse(data);
                    const msg = parsed.error?.message || 'Google API Permission Denied';
                    res.end(JSON.stringify({ error: msg }));
                  } catch (error) { // eslint-disable-line no-unused-vars
                    res.end(JSON.stringify({ error: `API Error ${googleRes.statusCode}: ${data.substring(0, 100)}` }));
                  }
                } else {
                  res.end(data);
                }
              });
            });

            request.on('error', (_) => {
              sendError(500, `Proxy Error: ${_.message}`);
            });
            return;
          }

          // 4. Handle Stateful AI Interaction (Server-side execution)
          if (req.url === '/api/ai/interaction' && req.method === 'POST') {
            let body = '';
            req.on('data', chunk => { body += chunk.toString(); });
            req.on('end', async () => {
              try {
                const { apiKey, apiVersion, config } = JSON.parse(body);
                console.log(`[SERVER-AI] Creating interaction for model: ${config.model}`);
                console.log(`[SERVER-AI] Payload:`, JSON.stringify(config, null, 2));
                
                const client = new GoogleGenAI({ 
                  apiKey, 
                  apiVersion: apiVersion || 'v1beta' 
                });

                const interaction = await client.interactions.create(config);
                
                if (!res.writableEnded) {
                  res.statusCode = 200;
                  res.setHeader('Content-Type', 'application/json');
                  res.end(JSON.stringify({
                    id: interaction.id,
                    status: interaction.status,
                    output_text: interaction.output_text
                  }));
                }
              } catch (e) {
                console.error('[SERVER-AI-ERROR]:', e.message);
                if (!res.writableEnded) {
                  res.statusCode = 500;
                  res.setHeader('Content-Type', 'application/json');
                  res.end(JSON.stringify({ error: e.message }));
                }
              }
            });
            return;
          }

          next();
        });
      }
    }
  ],
  build: {
    rollupOptions: {
      output: {
        manualChunks(id) {
          if (id.includes('exceljs')) return 'vendor-excel';
          if (id.includes('@google/genai')) return 'vendor-ai';
          if (id.includes('crypto-js')) return 'vendor-crypto';
        }
      }
    }
  }
})
