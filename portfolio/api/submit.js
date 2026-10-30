const { parseRequestBody, sendContactEmail, validateContactForm } = require('../lib/contact');

function setCorsHeaders(res) {
      res.setHeader('Access-Control-Allow-Origin', '*');
      res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
      res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Accept');
}

function sendJson(response, statusCode, data) {
      response.statusCode = statusCode;
      response.setHeader('Content-Type', 'application/json; charset=utf-8');
      response.setHeader('Cache-Control', 'no-store');
      response.setHeader('X-Content-Type-Options', 'nosniff');
      setCorsHeaders(response);
      response.end(JSON.stringify(data));
}

module.exports = async function handler(req, res) {
      setCorsHeaders(res);

      if (req.method === 'OPTIONS') {
            res.statusCode = 204;
            return res.end();
      }

      if (req.method !== 'POST') {
            res.setHeader('Allow', 'POST, OPTIONS');
            return sendJson(res, 405, { message: 'Method Not Allowed' });
      }

      try {
            let rawBody = req.body;
            if (rawBody === undefined && typeof req.on === 'function') {
                  rawBody = await new Promise((resolve, reject) => {
                        let chunks = '';
                        req.on('data', (chunk) => { chunks += chunk; });
                        req.on('end', () => resolve(chunks));
                        req.on('error', reject);
                  });
            }

            const validation = validateContactForm(parseRequestBody(rawBody));
            if (validation.error) return sendJson(res, 400, { message: validation.error });

            await sendContactEmail(validation.data);
            return sendJson(res, 200, { success: true, message: 'Message sent!' });
      } catch (error) {
            console.error('Contact form error:', error.message);
            const statusCode = error instanceof SyntaxError ? 400 : 500;
            const message = statusCode === 400 ? 'Invalid request body.' : 'Unable to send the message.';
            return sendJson(res, statusCode, { message });
      }
};
