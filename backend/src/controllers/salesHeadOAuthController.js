/**
 * salesHeadOAuthController.js
 *
 * Handles the OAuth2 flow that allows the Sales Head to connect
 * their own Google Calendar. Tokens are stored encrypted in the DB.
 */

const { google } = require('googleapis');
const salesHeadCalendarService = require('../services/salesHeadCalendarService');

// The redirect URI specifically for the Sales Head OAuth flow.
// Must be registered in Google Cloud Console.
function getSalesHeadRedirectUri() {
  return process.env.GOOGLE_SALESHEAD_REDIRECT_URI || process.env.GOOGLE_REDIRECT_URI;
}

function buildOAuth2Client() {
  return new google.auth.OAuth2(
    process.env.GOOGLE_CLIENT_ID,
    process.env.GOOGLE_CLIENT_SECRET,
    getSalesHeadRedirectUri()
  );
}

// ── GET /api/google/saleshead/auth ────────────────────────────────────────────
// Redirect to Google OAuth consent screen
const initiateOAuth = (req, res) => {
  try {
    const oauth2Client = buildOAuth2Client();
    const url = oauth2Client.generateAuthUrl({
      access_type: 'offline',
      prompt: 'consent',   // Always return a refresh token
      scope: [
        'https://www.googleapis.com/auth/calendar',
        'https://www.googleapis.com/auth/calendar.events',
        'https://www.googleapis.com/auth/userinfo.email',
      ],
    });
    return res.redirect(url);
  } catch (err) {
    console.error('[SalesHead OAuth] Error generating auth URL:', err.message);
    return res.status(500).send('Failed to generate Google consent URL.');
  }
};

// ── GET /api/google/saleshead/callback ────────────────────────────────────────
// Google redirects here after the user grants consent.
// Exchange code for tokens, fetch email, save to DB, redirect admin back.
const handleCallback = async (req, res) => {
  const { code, error } = req.query;

  if (error) {
    console.error('[SalesHead OAuth] User denied access:', error);
    const frontendUrl = process.env.FRONTEND_URL || 'http://localhost:3000';
    return res.redirect(`${frontendUrl}/comfortbridge?calendarError=access_denied`);
  }

  if (!code) {
    return res.status(400).send('Authorization code is missing.');
  }

  try {
    const oauth2Client = buildOAuth2Client();
    const { tokens } = await oauth2Client.getToken(code);

    if (!tokens.refresh_token) {
      const frontendUrl = process.env.FRONTEND_URL || 'http://localhost:3000';
      return res.redirect(
        `${frontendUrl}/comfortbridge?calendarError=no_refresh_token&hint=revoke_and_retry`
      );
    }

    // Fetch the Google account email using the access token
    let googleEmail = 'unknown@google.com';
    try {
      oauth2Client.setCredentials(tokens);
      const oauth2 = google.oauth2({ version: 'v2', auth: oauth2Client });
      const userInfo = await oauth2.userinfo.get();
      googleEmail = userInfo.data.email || googleEmail;
    } catch (emailErr) {
      console.error('[SalesHead OAuth] Could not fetch user email:', emailErr.message);
    }

    // Save encrypted tokens to DB
    await salesHeadCalendarService.saveConnection({
      googleEmail,
      refreshToken: tokens.refresh_token,
      accessToken: tokens.access_token || null,
      tokenExpiry: tokens.expiry_date || null,
      calendarId: 'primary',
    });

    console.log(`[SalesHead OAuth] Connected: ${googleEmail}`);

    // Redirect back to the admin scheduling tab with success signal
    const frontendUrl = process.env.FRONTEND_URL || 'http://localhost:3000';
    return res.redirect(`${frontendUrl}/comfortbridge?calendarConnected=true&email=${encodeURIComponent(googleEmail)}`);
  } catch (err) {
    console.error('[SalesHead OAuth] Callback error:', err.message);
    const frontendUrl = process.env.FRONTEND_URL || 'http://localhost:3000';
    return res.redirect(`${frontendUrl}/comfortbridge?calendarError=callback_failed`);
  }
};

module.exports = { initiateOAuth, handleCallback };
