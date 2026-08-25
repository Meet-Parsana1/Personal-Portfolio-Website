const https = require('https');

function escapeHtml(value) {
      const entities = {
            '&': '&amp;',
            '<': '&lt;',
            '>': '&gt;',
            '"': '&quot;',
            "'": '&#39;',
      };

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
            return {
                  error: 'Enter a valid name.',
                  data: null,
            };
      }

      if (cleanedEmail.length > 254 || !/^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(cleanedEmail)) {
            return {
                  error: 'Enter a valid email address.',
                  data: null,
            };
      }

      if (cleanedMessage.length < 20 || cleanedMessage.length > 2000) {
            return {
                  error: 'Message must contain 20 to 2,000 characters.',
                  data: null,
            };
      }

      return {
            data: {
                  name: cleanedName,
                  email: cleanedEmail,
                  message: cleanedMessage,
            },
      };
}

function sendContactEmail({ name, email, message }) {
      const apiKey = process.env.RESEND_API_KEY;
      const receiverEmail = process.env.RECEIVER_EMAIL;

      if (!apiKey || !receiverEmail) {
            return Promise.reject(new Error('RESEND_API_KEY or RECEIVER_EMAIL is missing.'));
      }

      const payload = JSON.stringify({
            from: 'Portfolio Contact <onboarding@resend.dev>',
            to: [receiverEmail],
            reply_to: email,
            subject: `New Portfolio Message from ${name}`,
            html: `
            <h3>New Contact Form Submission</h3>

            <p>
                <strong>Name:</strong>
                ${escapeHtml(name)}
            </p>

            <p>
                <strong>Email:</strong>
                ${escapeHtml(email)}
            </p>

            <p>
                <strong>Message:</strong><br>
                ${escapeHtml(message).replace(/\n/g, '<br>')}
            </p>
        `,
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
                              if (response.statusCode === 200 || response.statusCode === 201) {
                                    return resolve();
                              }

                              reject(new Error(`Resend returned ${response.statusCode}: ${body}`));
                        });
                  },
            );

            request.on('error', reject);
            request.end(payload);
      });
}

module.exports = async function handler(req, res) {
      if (req.method !== 'POST') {
            res.writeHead(405, {
                  'Content-Type': 'application/json; charset=utf-8',
            });

            return res.end(
                  JSON.stringify({
                        message: 'Method Not Allowed',
                  }),
            );
      }

      try {
            const requestBody = typeof req.body === 'string' ? JSON.parse(req.body) : req.body || {};

            const validation = validateContactForm(requestBody);

            if (validation.error) {
                  res.writeHead(400, {
                        'Content-Type': 'application/json; charset=utf-8',
                  });

                  return res.end(
                        JSON.stringify({
                              message: validation.error,
                        }),
                  );
            }

            await sendContactEmail(validation.data);

            res.writeHead(200, {
                  'Content-Type': 'application/json; charset=utf-8',
            });

            return res.end(
                  JSON.stringify({
                        success: true,
                        message: 'Message sent!',
                  }),
            );
      } catch (error) {
            console.error('Contact form error:', error.message);

            res.writeHead(500, {
                  'Content-Type': 'application/json; charset=utf-8',
            });

            return res.end(
                  JSON.stringify({
                        message: 'Unable to send the message.',
                  }),
            );
      }
};
