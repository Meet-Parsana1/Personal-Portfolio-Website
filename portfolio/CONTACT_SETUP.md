# Contact form setup

The contact form sends `POST /api/submit` to a server-side handler (Node.js locally, and Vercel Serverless Function in production). The browser never receives or exposes the Resend API key.

## Local development

1. Copy `.env.example` to `.env` and supply `RESEND_API_KEY` and `RECEIVER_EMAIL`.
2. For testing without a verified custom domain, you can omit `RESEND_FROM_EMAIL` (it automatically defaults to `Portfolio Contact <onboarding@resend.dev>`). Make sure `RECEIVER_EMAIL` matches the email address that registered the Resend account.
3. Start the backend server by running:
   ```bash
   npm run serve
   # or
   npm start
   ```
4. Open `http://localhost:3000` (or if previewing via VS Code Live Server on port 5500, keep `npm run serve` running in the terminal — requests will automatically route to the local server via CORS).

## Vercel deployment

Deploy this repository to Vercel. 

- If your project root in Vercel is set to `portfolio`, `portfolio/api/submit.js` serves as `/api/submit`.
- Add these Environment Variables in your Vercel Project Settings (**Settings → Environment Variables**):
  - `RESEND_API_KEY` (Required): Your Resend API key.
  - `RECEIVER_EMAIL` (Required): The email where you want to receive messages.
  - `RESEND_FROM_EMAIL` (Optional): A sender from your verified domain (e.g. `Portfolio Contact <contact@yourdomain.com>`). If omitted, it falls back safely to Resend's onboarding sender.

After updating environment variables in Vercel, redeploy the project for the changes to take effect.
