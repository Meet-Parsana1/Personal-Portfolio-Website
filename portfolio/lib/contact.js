const https = require('https');

const MAX_BODY_BYTES = 10_000;

function escapeHtml(value) {
      const entities = { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' };
      return String(value).replace(/[&<>"']/g, (character) => entities[character]);
}

function validateContactForm({ name, email, message } = {}) {
      const cleanedName = String(name || '').trim().replace(/\s+/g, ' ');
      const cleanedEmail = String(email || '').trim().toLowerCase();
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

function getResendConfiguration(environment = process.env) {
      const apiKey = environment.RESEND_API_KEY;
      const receiverEmail = environment.RECEIVER_EMAIL;
      const isProduction = environment.NODE_ENV === 'production' || environment.VERCEL_ENV === 'production';
      const fromEmail = environment.RESEND_FROM_EMAIL || 'Portfolio Contact <onboarding@resend.dev>';
      if (!apiKey || !receiverEmail) {
            const missing = [!apiKey && 'RESEND_API_KEY', !receiverEmail && 'RECEIVER_EMAIL'].filter(Boolean);
            throw new Error(`Missing contact environment variable(s): ${missing.join(', ')}`);
      }
      return { apiKey, receiverEmail, fromEmail, isProduction };
}

function sendContactEmail({ name, email, message }, environment = process.env) {
      const { apiKey, receiverEmail, fromEmail } = getResendConfiguration(environment);
      const payload = JSON.stringify({
            from: fromEmail,
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
                              Accept: 'application/json',
                              'Content-Type': 'application/json',
                              'Content-Length': Buffer.byteLength(payload),
                              'User-Agent': 'Meet-Portfolio-Contact/1.0',
                        },
                  },
                  (response) => {
                        let body = '';
                        response.setEncoding('utf8');
                        response.on('data', (chunk) => { body += chunk; });
                        response.on('end', () => {
                              if (response.statusCode >= 200 && response.statusCode < 300) return resolve();
                              reject(new Error(`Resend returned ${response.statusCode}: ${body}`));
                        });
                  },
            );
            request.setTimeout(12_000, () => request.destroy(new Error('Resend request timed out.')));
            request.on('error', reject);
            request.end(payload);
      });
}

function parseRequestBody(body) {
      if (!body) return {};
      if (Buffer.isBuffer(body)) body = body.toString('utf8');
      if (typeof body === 'string') {
            const trimmed = body.trim();
            if (!trimmed) return {};
            return JSON.parse(trimmed);
      }
      return typeof body === 'object' ? body : {};
}

module.exports = { MAX_BODY_BYTES, getResendConfiguration, parseRequestBody, sendContactEmail, validateContactForm };
