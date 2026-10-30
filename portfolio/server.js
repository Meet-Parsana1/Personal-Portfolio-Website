const fs = require('fs');
const http = require('http');
const path = require('path');
const { MAX_BODY_BYTES, parseRequestBody, sendContactEmail, validateContactForm } = require('./lib/contact');

const rootDirectory = __dirname;
const port = Number(process.env.PORT) || 3000;

function loadEnvironment() {
      const environmentFile = path.join(rootDirectory, '.env');
      if (!fs.existsSync(environmentFile)) return;

      for (const line of fs.readFileSync(environmentFile, 'utf8').split(/\r?\n/)) {
            const text = line.trim();
            if (!text || text.startsWith('#')) continue;

            const equalsIndex = text.indexOf('=');
            if (equalsIndex === -1) continue;

            const key = text.slice(0, equalsIndex).trim();
            const value = text
                  .slice(equalsIndex + 1)
                  .trim()
                  .replace(/^['"]|['"]$/g, '');
            if (key && !process.env[key]) process.env[key] = value;
      }
}

function setCorsHeaders(response) {
      response.setHeader('Access-Control-Allow-Origin', '*');
      response.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
      response.setHeader('Access-Control-Allow-Headers', 'Content-Type, Accept');
}

function json(response, statusCode, data) {
      response.writeHead(statusCode, {
            'Content-Type': 'application/json; charset=utf-8',
            'Cache-Control': 'no-store',
            'X-Content-Type-Options': 'nosniff',
            'Access-Control-Allow-Origin': '*',
      });
      response.end(JSON.stringify(data));
}

function serveStaticFile(request, response) {
      const urlPath = request.url === '/' ? '/index.html' : decodeURIComponent(request.url.split('?')[0]);
      const filePath = path.resolve(rootDirectory, `.${urlPath}`);
      if (!filePath.startsWith(rootDirectory + path.sep)) return json(response, 403, { message: 'Forbidden' });

      fs.readFile(filePath, (error, contents) => {
            if (error) return json(response, error.code === 'ENOENT' ? 404 : 500, { message: 'File not found.' });

            const mimeTypes = {
                  '.html': 'text/html',
                  '.css': 'text/css',
                  '.js': 'application/javascript',
                  '.png': 'image/png',
                  '.jpg': 'image/jpeg',
                  '.jpeg': 'image/jpeg',
                  '.pdf': 'application/pdf',
                  '.svg': 'image/svg+xml',
            };
            response.writeHead(200, {
                  'Content-Type': mimeTypes[path.extname(filePath).toLowerCase()] || 'application/octet-stream',
            });
            response.end(contents);
      });
}

loadEnvironment();

http.createServer((request, response) => {
      const requestPath = request.url.split('?')[0];
      if (requestPath === '/api/submit') {
            setCorsHeaders(response);

            if (request.method === 'OPTIONS') {
                  response.writeHead(204);
                  response.end();
                  return;
            }

            if (request.method !== 'POST') {
                  response.setHeader('Allow', 'POST, OPTIONS');
                  return json(response, 405, { message: 'Method Not Allowed' });
            }

            let body = '';
            let bodyTooLarge = false;
            request.on('data', (chunk) => {
                  if (bodyTooLarge) return;
                  body += chunk;
                  if (Buffer.byteLength(body) > MAX_BODY_BYTES) bodyTooLarge = true;
            });
            request.on('end', async () => {
                  try {
                        if (bodyTooLarge) return json(response, 413, { message: 'Request body is too large.' });
                        const validation = validateContactForm(parseRequestBody(body));
                        if (validation.error) return json(response, 400, { message: validation.error });
                        await sendContactEmail(validation.data);
                        json(response, 200, { success: true, message: 'Message sent!' });
                  } catch (error) {
                        console.error('Contact form error:', error.message);
                        const statusCode = error instanceof SyntaxError ? 400 : 500;
                        const isLocalDevelopment = process.env.NODE_ENV !== 'production';
                        json(response, statusCode, {
                              message:
                                    statusCode === 400
                                          ? 'Invalid request body.'
                                          : isLocalDevelopment
                                            ? `Resend error: ${error.message}`
                                            : 'Unable to send the message.',
                        });
                  }
            });
            return;
      }

      if (request.method !== 'GET' && request.method !== 'HEAD')
            return json(response, 405, { message: 'Method Not Allowed' });
      serveStaticFile(request, response);
}).listen(port, '0.0.0.0', () => {
      console.log(`Portfolio running on port ${port}`);
});
