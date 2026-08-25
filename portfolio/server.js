const fs = require('fs');
const http = require('http');
const https = require('https');
const path = require('path');

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

function json(response, statusCode, data) {
      response.writeHead(statusCode, { 'Content-Type': 'application/json; charset=utf-8' });
      response.end(JSON.stringify(data));
}

function escapeHtml(value) {
      const entities = { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' };
      return String(value).replace(/[&<>"']/g, (character) => entities[character]);
}

function validateContactForm({ name, email, message }) {
      const cleanedName = String(name || '')
            .trim()
            .replace(/\s+/g, ' ');
      const cleanedEmail = String(email || '')
            .trim()
            .toLowerCase();
      const cleanedMessage = String(message || '').trim();

      if (cleanedName.length < 2 || cleanedName.length > 60 || !/^[\p{L}][\p{L}\s.'-]*$/u.test(cleanedName)) {
            return { error: 'Enter a valid name.', data: null };
      }
      if (cleanedEmail.length > 254 || !/^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(cleanedEmail)) {
            return { error: 'Enter a valid email address.', data: null };
      }
      if (cleanedMessage.length < 20 || cleanedMessage.length > 2000) {
            return { error: 'Message must contain 20 to 2,000 characters.', data: null };
      }
      return { data: { name: cleanedName, email: cleanedEmail, message: cleanedMessage } };
}

function sendContactEmail({ name, email, message }) {
      const apiKey = process.env.RESEND_API_KEY;
      const receiverEmail = process.env.RECEIVER_EMAIL;
      if (!apiKey || !receiverEmail) {
            return Promise.reject(new Error('Add RESEND_API_KEY and RECEIVER_EMAIL to .env.'));
      }

      const payload = JSON.stringify({
            from: 'Portfolio Contact <onboarding@resend.dev>',
            to: [receiverEmail],
            reply_to: email,
            subject: `New Portfolio Message from ${name}`,
            html: `<h3>New Contact Form Submission</h3><p><strong>Name:</strong> ${escapeHtml(name)}</p><p><strong>Email:</strong> ${escapeHtml(email)}</p><p><strong>Message:</strong><br>${escapeHtml(message).replace(/\n/g, '<br>')}</p>`,
      });

      return new Promise((resolve, reject) => {
            const request = https.request(
                  {
                        hostname: 'api.resend.com',
                        path: '/emails',
                        method: 'POST',
                        headers: {
                              Authorization: `Bearer ${apiKey}`,
                              'Content-Type': 'application/json',
                              'Content-Length': Buffer.byteLength(payload),
                        },
                  },
                  (response) => {
                        let body = '';
                        response.on('data', (chunk) => {
                              body += chunk;
                        });
                        response.on('end', () => {
                              if (response.statusCode === 200 || response.statusCode === 201) return resolve();
                              reject(new Error(`Resend returned ${response.statusCode}: ${body}`));
                        });
                  },
            );
            request.on('error', reject);
            request.end(payload);
      });
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
      if (request.method === 'POST' && request.url === '/api/submit') {
            let body = '';
            request.on('data', (chunk) => {
                  body += chunk;
                  if (body.length > 10_000) request.destroy();
            });
            request.on('end', async () => {
                  try {
                        const validation = validateContactForm(JSON.parse(body));
                        if (validation.error) return json(response, 400, { message: validation.error });
                        await sendContactEmail(validation.data);
                        json(response, 200, { success: true, message: 'Message sent!' });
                  } catch (error) {
                        console.error('Contact form error:', error.message);
                        json(response, 500, { message: 'Unable to send the message. Check the terminal for details.' });
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
