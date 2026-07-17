const express = require('express');
const { google } = require('googleapis');
const { initiateOAuth, handleCallback } = require('../controllers/salesHeadOAuthController');

const router = express.Router();

// Instantiate OAuth2 client locally using the current environment variables.
const oauth2Client = new google.auth.OAuth2(
  process.env.GOOGLE_CLIENT_ID,
  process.env.GOOGLE_CLIENT_SECRET,
  process.env.GOOGLE_REDIRECT_URI
);

// STEP 1: Redirect user to Google Consent Screen
router.get('/auth', (req, res) => {
  try {
    const url = oauth2Client.generateAuthUrl({
      access_type: 'offline',
      prompt: 'consent', // guarantees that a refresh token is returned on every authorization
      scope: [
        'https://www.googleapis.com/auth/calendar',
        'https://www.googleapis.com/auth/calendar.events'
      ],
    });
    return res.redirect(url);
  } catch (err) {
    console.error('[Google Auth] Error generating redirect URL:', err.message);
    return res.status(500).send('Failed to generate Google consent URL.');
  }
});

// STEP 2: Google redirects here with an authorization code
router.get('/callback', async (req, res) => {
  try {
    const { code } = req.query;
    if (!code) {
      return res.status(400).send('Authorization code is missing.');
    }

    const { tokens } = await oauth2Client.getToken(code);

    console.log('\n========== GOOGLE TOKENS ==========');
    console.log(tokens);
    console.log('Refresh Token:', tokens.refresh_token);
    console.log('===================================\n');

    // Display a beautiful and secure admin page to copy the refresh token
    res.setHeader('Content-Type', 'text/html');
    return res.send(`
      <!DOCTYPE html>
      <html lang="en">
      <head>
        <meta charset="utf-8">
        <title>Google Connection Successful</title>
        <style>
          body {
            font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif;
            background-color: #0f172a;
            color: #e2e8f0;
            display: flex;
            align-items: center;
            justify-content: center;
            height: 100vh;
            margin: 0;
          }
          .card {
            background-color: #1e293b;
            border: 1px solid #334155;
            border-radius: 12px;
            padding: 36px;
            max-width: 600px;
            width: 90%;
            box-shadow: 0 10px 25px -5px rgba(0,0,0,0.3);
          }
          h1 {
            color: #10b981;
            margin-top: 0;
            font-size: 24px;
            display: flex;
            align-items: center;
            gap: 8px;
          }
          p {
            line-height: 1.6;
            font-size: 15px;
            color: #94a3b8;
          }
          .token-container {
            background-color: #0f172a;
            border: 1px solid #1e293b;
            border-radius: 8px;
            padding: 16px;
            margin: 20px 0;
            position: relative;
          }
          code {
            color: #f43f5e;
            font-family: SFMono-Regular, Consolas, Liberation Mono, Menlo, monospace;
            font-size: 14px;
            word-break: break-all;
            display: block;
            margin-bottom: 12px;
            user-select: all;
          }
          button {
            background-color: #3b82f6;
            color: white;
            border: none;
            padding: 8px 16px;
            border-radius: 6px;
            cursor: pointer;
            font-weight: 600;
            font-size: 13px;
            transition: background-color 0.2s;
          }
          button:hover {
            background-color: #2563eb;
          }
          .alert {
            background-color: rgba(245, 158, 11, 0.1);
            border-left: 4px solid #f59e0b;
            padding: 12px 16px;
            border-radius: 0 6px 6px 0;
            margin-top: 20px;
            font-size: 14px;
            color: #fef08a;
          }
        </style>
        <script>
          function copyToClipboard() {
            const tokenElement = document.getElementById('refresh-token');
            const range = document.createRange();
            range.selectNode(tokenElement);
            window.getSelection().removeAllRanges();
            window.getSelection().addRange(range);
            document.execCommand('copy');
            alert('Refresh Token copied to clipboard!');
          }
        </script>
      </head>
      <body>
        <div class="card">
          <h1>Google Connected Successfully ✅</h1>
          <p>You have successfully authenticated the application. Copy the refresh token below and add it to your environment variables as <code>GOOGLE_REFRESH_TOKEN</code>.</p>
          
          <div class="token-container">
            <code id="refresh-token">${tokens.refresh_token || 'Warning: No refresh token returned. Revoke application access in Google settings and retry if you did not get one.'}</code>
            ${tokens.refresh_token ? '<button onclick="copyToClipboard()">Copy Token</button>' : ''}
          </div>
          
          <div class="alert">
            <strong>Note:</strong> If the token was not displayed, make sure you revoked access in your Google Account security permissions before authorizing again, or that you used <code>prompt: consent</code>.
          </div>
        </div>
      </body>
      </html>
    `);
  } catch (err) {
    console.error('[Google Auth] Error exchanging code for tokens:', err);
    return res.status(500).send('Authentication failed: ' + err.message);
  }
});

// ── Sales Head Calendar OAuth ─────────────────────────────────────────────────
// GET /api/google/saleshead/auth  — initiate OAuth for Sales Head calendar
router.get('/saleshead/auth', initiateOAuth);

// GET /api/google/saleshead/callback  — OAuth callback (exchange code for tokens)
router.get('/saleshead/callback', handleCallback);

module.exports = router;
