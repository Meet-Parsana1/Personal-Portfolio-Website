const { parseRequestBody, sendContactEmail, validateContactForm } = require('../lib/contact');

function sendJson(response, statusCode, data) {
      response.statusCode = statusCode;
      response.setHeader('Content-Type', 'application/json; charset=utf-8');
      response.setHeader('Cache-Control', 'no-store');
      response.setHeader('X-Content-Type-Options', 'nosniff');
      response.end(JSON.stringify(data));
}

module.exports = async function handler(req, res) {
      if (req.method !== 'POST') {
            res.setHeader('Allow', 'POST');
            return sendJson(res, 405, { message: 'Method Not Allowed' });
      }

      try {
            const validation = validateContactForm(parseRequestBody(req.body));
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
