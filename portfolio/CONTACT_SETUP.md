# Contact form setup

The contact form sends `POST /api/submit` to a server-side handler. The browser never receives the Resend API key.

## Local development

1. Copy `.env.example` to `.env` and supply `RESEND_API_KEY` and `RECEIVER_EMAIL`.
2. For local testing without a domain, omit `RESEND_FROM_EMAIL`. The server uses Resend's onboarding sender automatically. Set `RECEIVER_EMAIL` to the address that owns the Resend account; this testing sender cannot deliver to arbitrary recipients.
3. For production, add `RESEND_FROM_EMAIL` with a domain verified in Resend. The Resend onboarding sender is only suitable for restricted testing and should not be used for public delivery.
4. Run `npm run serve` and open `http://localhost:3000`.

Do not use Live Server on port 5500 to test sends: it only serves static files and cannot run `/api/submit`.

## Vercel deployment

Deploy this repository as a Vercel project. The `api/submit.js` file is deployed as the `/api/submit` serverless function. Add these Environment Variables in the Vercel project for Production, Preview, and Development:

- `RESEND_API_KEY`
- `RECEIVER_EMAIL`
- `RESEND_FROM_EMAIL`

After changing environment variables, redeploy the project. Keep the site and API on the same Vercel project/domain so the browser can call `/api/submit` without exposing credentials or requiring CORS.
