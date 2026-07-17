/**
 * salesHeadCalendarService.js
 *
 * Manages Google Calendar operations using the Sales Head's OAuth tokens,
 * which are stored AES-256-CBC encrypted in the sales_head_calendar table.
 *
 * Token refresh is handled automatically and the new access token is persisted.
 */

const { google } = require('googleapis');
const crypto = require('crypto');
const { pool } = require('../database/pool');

// ── Encryption helpers ────────────────────────────────────────────────────────
const ALGORITHM = 'aes-256-cbc';
const IV_LENGTH = 16;

function getEncryptionKey() {
  const key = process.env.ENCRYPTION_KEY;
  if (!key || key.length < 32) {
    throw new Error('ENCRYPTION_KEY env var must be at least 32 characters.');
  }
  return Buffer.from(key.slice(0, 32), 'utf8');
}

function encrypt(text) {
  if (!text) return null;
  const iv = crypto.randomBytes(IV_LENGTH);
  const cipher = crypto.createCipheriv(ALGORITHM, getEncryptionKey(), iv);
  const encrypted = Buffer.concat([cipher.update(text, 'utf8'), cipher.final()]);
  return iv.toString('hex') + ':' + encrypted.toString('hex');
}

function decrypt(text) {
  if (!text) return null;
  const [ivHex, encHex] = text.split(':');
  if (!ivHex || !encHex) return null;
  const iv = Buffer.from(ivHex, 'hex');
  const encrypted = Buffer.from(encHex, 'hex');
  const decipher = crypto.createDecipheriv(ALGORITHM, getEncryptionKey(), iv);
  const decrypted = Buffer.concat([decipher.update(encrypted), decipher.final()]);
  return decrypted.toString('utf8');
}

// ── Core service ──────────────────────────────────────────────────────────────

/**
 * Fetch the connected Sales Head record from DB (with decrypted tokens).
 * Returns null if no calendar is connected.
 */
async function getConnectedRecord() {
  const { rows } = await pool.query(
    'SELECT * FROM sales_head_calendar ORDER BY id DESC LIMIT 1'
  );
  if (rows.length === 0) return null;
  const row = rows[0];
  return {
    ...row,
    refresh_token: decrypt(row.refresh_token),
    access_token: row.access_token ? decrypt(row.access_token) : null,
  };
}

/**
 * Returns true if a Sales Head calendar is connected.
 */
async function isConnected() {
  const { rows } = await pool.query(
    'SELECT id FROM sales_head_calendar LIMIT 1'
  );
  return rows.length > 0;
}

/**
 * Returns public-safe status info (no tokens).
 */
async function getStatus() {
  const { rows } = await pool.query(
    `SELECT id, google_email, calendar_id, connected_at, last_synced_at
     FROM sales_head_calendar ORDER BY id DESC LIMIT 1`
  );
  if (rows.length === 0) return { connected: false };
  return {
    connected: true,
    email: rows[0].google_email,
    calendarId: rows[0].calendar_id,
    connectedAt: rows[0].connected_at,
    lastSyncedAt: rows[0].last_synced_at,
  };
}

/**
 * Build an authenticated OAuth2 client using stored tokens.
 * Automatically refreshes access token if expired and saves the new one.
 */
async function buildAuthClient(record) {
  const oauth2Client = new google.auth.OAuth2(
    process.env.GOOGLE_CLIENT_ID,
    process.env.GOOGLE_CLIENT_SECRET,
    process.env.GOOGLE_SALESHEAD_REDIRECT_URI || process.env.GOOGLE_REDIRECT_URI
  );

  const credentials = { refresh_token: record.refresh_token };
  if (record.access_token) {
    credentials.access_token = record.access_token;
  }
  if (record.token_expiry) {
    credentials.expiry_date = new Date(record.token_expiry).getTime();
  }

  oauth2Client.setCredentials(credentials);

  // Listen for token refresh and persist the new access token
  oauth2Client.on('tokens', async (tokens) => {
    try {
      await pool.query(
        `UPDATE sales_head_calendar
         SET access_token = $1, token_expiry = $2, last_synced_at = NOW()
         WHERE id = $3`,
        [
          tokens.access_token ? encrypt(tokens.access_token) : null,
          tokens.expiry_date ? new Date(tokens.expiry_date) : null,
          record.id,
        ]
      );
    } catch (err) {
      console.error('[SalesHead] Failed to persist refreshed token:', err.message);
    }
  });

  return oauth2Client;
}

/**
 * Store or replace the connected Sales Head calendar.
 * Encrypts tokens before saving.
 */
async function saveConnection({ googleEmail, refreshToken, accessToken, tokenExpiry, calendarId }) {
  // Delete any existing connection first (single-connection model)
  await pool.query('DELETE FROM sales_head_calendar');

  await pool.query(
    `INSERT INTO sales_head_calendar
       (google_email, refresh_token, access_token, token_expiry, calendar_id, connected_at, last_synced_at)
     VALUES ($1, $2, $3, $4, $5, NOW(), NOW())`,
    [
      googleEmail,
      encrypt(refreshToken),
      accessToken ? encrypt(accessToken) : null,
      tokenExpiry ? new Date(tokenExpiry) : null,
      calendarId || 'primary',
    ]
  );
}

/**
 * Disconnect the Sales Head calendar (remove from DB).
 */
async function disconnect() {
  await pool.query('DELETE FROM sales_head_calendar');
}

/**
 * Query Google Calendar freebusy for the Sales Head's calendar.
 *
 * @param {string} timeMin  ISO 8601 string (start of range)
 * @param {string} timeMax  ISO 8601 string (end of range)
 * @returns {Array<{start:string, end:string}>} Array of busy intervals
 */
async function getFreeBusy(timeMin, timeMax) {
  const record = await getConnectedRecord();
  if (!record) throw new Error('No Sales Head calendar connected.');

  const auth = await buildAuthClient(record);
  const calendar = google.calendar({ version: 'v3', auth });

  const res = await calendar.freebusy.query({
    requestBody: {
      timeMin,
      timeMax,
      items: [{ id: record.calendar_id }],
    },
  });

  const busyData = res.data.calendars[record.calendar_id];
  if (!busyData) return [];

  return (busyData.busy || []).map((b) => ({ start: b.start, end: b.end }));
}

/**
 * Create a calendar event on the Sales Head's Google Calendar.
 *
 * @param {Object} params  All booking details
 * @returns {{ googleEventId, googleMeetLink, inviteUrl }}
 */
async function createEvent({
  fullName,
  email,
  phone,
  bookedDate,
  bookedTime,
  businessRole,
  packageChoice,
  startTimeline,
  guarantee,
  guests,
  meetingDurationMinutes = 60,
  timezone = 'Africa/Lagos',
}) {
  const record = await getConnectedRecord();
  if (!record) throw new Error('No Sales Head calendar connected.');

  const auth = await buildAuthClient(record);
  const calendar = google.calendar({ version: 'v3', auth });

  const guestEmails = guests ? guests.split(',').map((e) => e.trim()).filter(Boolean) : [];
  const [hours, minutes] = bookedTime.split(':').map(Number);

  // Build start/end times. bookedTime is in the configured timezone — convert to UTC.
  // We use a simple ISO string approach: Intl can give us the offset.
  const startISO = buildISOInTimezone(bookedDate, hours, minutes, timezone);
  const endISO = new Date(new Date(startISO).getTime() + meetingDurationMinutes * 60 * 1000).toISOString();

  // Build attendee list
  const attendees = [
    { email },
    ...guestEmails.map((gEmail) => ({ email: gEmail })),
  ];

  // Always invite the Sales Head themselves
  if (record.google_email) {
    attendees.push({ email: record.google_email });
  }

  // Always invite admin email (owner)
  const adminEmail = process.env.ADMIN_EMAIL;
  if (adminEmail && adminEmail !== record.google_email && adminEmail !== email) {
    attendees.push({ email: adminEmail });
  }

  const firstName = fullName.trim().split(/\s+/)[0] || fullName.trim();
  const event = {
    summary: `${firstName} & BorderlessBridge: Proof of Funds (POF) Strategy Call`,
    description:
      `BorderlessBridge Proof of Funds (POF) Strategy Call\n\n` +
      `Who needs this POF: ${businessRole || 'Not specified'}\n` +
      `Timeline to Start: ${startTimeline}\n` +
      `WhatsApp: ${phone}\n` +
      `Guests: ${guestEmails.join(', ') || 'None'}`,
    start: { dateTime: startISO, timeZone: timezone },
    end:   { dateTime: endISO,   timeZone: timezone },
    attendees,
    conferenceData: {
      createRequest: {
        requestId: `meet-saleshead-${Date.now()}`,
        conferenceSolutionKey: { type: 'hangoutsMeet' },
      },
    },
  };

  const gEventRes = await calendar.events.insert({
    calendarId: record.calendar_id,
    resource: event,
    conferenceDataVersion: 1,
    sendUpdates: 'all',
  });

  // Update last_synced_at
  await pool.query(
    'UPDATE sales_head_calendar SET last_synced_at = NOW() WHERE id = $1',
    [record.id]
  );

  const googleEventId = gEventRes.data.id;
  const googleMeetLink =
    gEventRes.data.conferenceData?.entryPoints?.find((ep) => ep.entryPointType === 'video')?.uri ||
    null;
  const inviteUrl = gEventRes.data.htmlLink || null;

  return { googleEventId, googleMeetLink, inviteUrl };
}

// ── Helpers ────────────────────────────────────────────────────────────────────

/**
 * Build an ISO 8601 datetime string for a given local time in a specific timezone.
 * Uses the Intl API to determine the UTC offset at that moment.
 */
function buildISOInTimezone(dateStr, hours, minutes, timezone) {
  // Parse local date parts
  const [year, month, day] = dateStr.split('-').map(Number);

  // Construct a Date assuming the time is local to the given timezone.
  // We do this by finding the UTC offset for that timezone on that date.
  // Step 1: Make a UTC date at midnight, then adjust.
  const utcMidnight = Date.UTC(year, month - 1, day, 0, 0, 0);

  // Step 2: Get what the local time reads in the target timezone at UTC midnight.
  const fmt = new Intl.DateTimeFormat('en-US', {
    timeZone: timezone,
    year: 'numeric', month: '2-digit', day: '2-digit',
    hour: '2-digit', minute: '2-digit', second: '2-digit',
    hour12: false,
  });

  // Build the target local datetime string and use it to compute offset.
  // We try to construct the exact UTC instant for the desired local time.
  // Simple approach: offset = localTime - utcTime, computed from a sample.
  const sampleDate = new Date(utcMidnight);
  const parts = fmt.formatToParts(sampleDate);
  const p = {};
  parts.forEach(({ type, value }) => { p[type] = value; });
  const localHourAtMidnightUTC = parseInt(p.hour === '24' ? '0' : p.hour, 10);
  const localMinuteAtMidnightUTC = parseInt(p.minute, 10);

  // Offset in minutes: localTime - UTCTime = offsetMinutes
  const offsetMinutes = localHourAtMidnightUTC * 60 + localMinuteAtMidnightUTC;

  // The UTC instant for the desired local time:
  // targetUTC = desiredLocalTime (in minutes from epoch midnight) - offsetMinutes
  const targetUTC = utcMidnight + (hours * 60 + minutes - offsetMinutes) * 60 * 1000;

  return new Date(targetUTC).toISOString();
}

module.exports = {
  isConnected,
  getStatus,
  saveConnection,
  disconnect,
  getFreeBusy,
  createEvent,
};
