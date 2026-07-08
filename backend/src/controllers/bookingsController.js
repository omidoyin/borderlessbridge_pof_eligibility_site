const { pool } = require('../database/pool');
const googleCalendarService = require('../services/googleCalendarService');
const {
  sendBookingConfirmationEmail,
  sendAdminBookingAlert,
} = require('../services/emailService');

/**
 * Generates an interactive "Add to Google Calendar" link as a fallback.
 */
function generateGoogleCalendarTemplateUrl({
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
  salesHeadEmail,
}) {
  const text = encodeURIComponent(`Strategy Call: ${fullName} & BorderlessBridge`);
  
  const [hours, minutes] = bookedTime.split(':').map(Number);
  const startUtc = new Date(Date.UTC(
    ...bookedDate.split('-').map(Number).map((n, idx) => idx === 1 ? n - 1 : n),
    hours - 1, // WAT is UTC+1, so 9 AM WAT = 8 AM UTC
    minutes
  ));
  const endUtc = new Date(startUtc.getTime() + 60 * 60 * 1000); // 1 hour duration
  
  const formatDateUtc = (dateObj) => {
    return dateObj.toISOString().replace(/[-:]/g, '').split('.')[0] + 'Z';
  };
  const dates = `${formatDateUtc(startUtc)}/${formatDateUtc(endUtc)}`;
  
  const details = encodeURIComponent(
    `BorderlessBridge Strategy Call\n\n` +
    `Role in Business: ${businessRole}\n` +
    `Package describes you best: ${packageChoice}\n` +
    `When looking to start: ${startTimeline}\n` +
    `Guarantee: ${guarantee}\n` +
    `Phone: ${phone}\n` +
    `Guests: ${guests || 'None'}\n\n` +
    `Join Google Meet: https://meet.google.com/lookup/borderlessbridge`
  );
  
  const addEmailsList = [email, ...(guests ? guests.split(',') : [])];
  if (salesHeadEmail) {
    addEmailsList.push(salesHeadEmail);
  }
  const addEmails = addEmailsList.map(e => e.trim()).filter(e => !!e).join(',');
  
  return `https://calendar.google.com/calendar/render?action=TEMPLATE&text=${text}&dates=${dates}&details=${details}&add=${addEmails}`;
}

// ── Time slot configuration ───────────────────────────────────────────────────
// Mon–Sat, 9 AM – 5 PM WAT (1-hour slots)
const SLOT_HOURS = ['09:00', '10:00', '11:00', '12:00', '13:00', '14:00', '15:00', '16:00'];

/**
 * Returns the next N business days (Mon–Sat) starting from tomorrow.
 */
function getBusinessDays(count = 14) {
  const days = [];
  const now = new Date();
  // Work in WAT (UTC+1)
  let cursor = new Date(now.getTime() + 60 * 60 * 1000); // offset to WAT
  cursor.setHours(0, 0, 0, 0);
  cursor.setDate(cursor.getDate() + 1); // start from tomorrow

  while (days.length < count) {
    const dow = cursor.getDay(); // 0=Sun, 6=Sat
    if (dow !== 0) { // exclude only Sunday
      const yyyy = cursor.getFullYear();
      const mm = String(cursor.getMonth() + 1).padStart(2, '0');
      const dd = String(cursor.getDate()).padStart(2, '0');
      days.push(`${yyyy}-${mm}-${dd}`);
    }
    cursor.setDate(cursor.getDate() + 1);
  }
  return days;
}

// ── GET /api/bookings/availability ────────────────────────────────────────────
// Returns available dates + taken slots for each date
const getAvailability = async (req, res) => {
  const businessDays = getBusinessDays(14);

  try {
    // Fetch all booked slots within our window
    const { rows } = await pool.query(
      `SELECT booked_date::TEXT AS booked_date, booked_time
       FROM bookings
       WHERE status != 'cancelled'
         AND booked_date = ANY($1::DATE[])`,
      [businessDays]
    );

    // Build a map of date -> taken times
    const takenMap = {};
    for (const row of rows) {
      const dateKey = row.booked_date.split('T')[0];
      if (!takenMap[dateKey]) takenMap[dateKey] = [];
      takenMap[dateKey].push(row.booked_time);
    }

    // Build availability response
    const availability = businessDays.map((date) => ({
      date,
      allSlots: SLOT_HOURS,
      takenSlots: takenMap[date] || [],
    }));

    return res.json({ success: true, availability });
  } catch (err) {
    console.error('[DB] getAvailability error:', err.message);
    return res.status(500).json({ success: false, message: 'Internal server error.' });
  }
};

// ── POST /api/bookings ────────────────────────────────────────────────────────
const createBooking = async (req, res) => {
  const {
    submissionId,
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
  } = req.body;

  // Basic validation
  if (!fullName || !email || !phone || !bookedDate || !bookedTime) {
    return res.status(422).json({ success: false, message: 'All fields are required.' });
  }

  // Validate time slot is allowed
  if (!SLOT_HOURS.includes(bookedTime)) {
    return res.status(422).json({ success: false, message: 'Invalid time slot.' });
  }

  // Validate date is within business days
  const businessDays = getBusinessDays(14);
  if (!businessDays.includes(bookedDate)) {
    return res.status(422).json({ success: false, message: 'Invalid or unavailable date.' });
  }

  // Validate it's not Sunday
  const dayOfWeek = new Date(bookedDate + 'T00:00:00').getDay();
  if (dayOfWeek === 0) {
    return res.status(422).json({ success: false, message: 'Sundays are not available.' });
  }

  let salesHeadEmail = null;
  try {
    // Look up either format key (salesHeadEmail or sales_head_email)
    const settingsRes = await pool.query(
      "SELECT value FROM settings WHERE key IN ('salesHeadEmail', 'sales_head_email') AND value IS NOT NULL"
    );
    if (settingsRes.rows.length > 0) {
      salesHeadEmail = settingsRes.rows[0].value.trim();
    }
  } catch (dbErr) {
    console.error('[DB] Failed to fetch salesHeadEmail setting:', dbErr.message);
  }

  let googleEventId = null;
  let googleMeetLink = null;
  let inviteUrl = null;
  let calendarErrorMsg = null;

  // Attempt Google Calendar Integration using the dedicated service
  if (googleCalendarService.isConfigured()) {
    try {
      const gEventRes = await googleCalendarService.createEvent({
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
        salesHeadEmail,
      });

      googleEventId = gEventRes.googleEventId;
      googleMeetLink = gEventRes.googleMeetLink;
      inviteUrl = gEventRes.inviteUrl;
    } catch (gErr) {
      console.error('[Google Calendar API] Error inserting event:', gErr.message);
      calendarErrorMsg = gErr.message;
    }
  } else {
    calendarErrorMsg = 'Google Calendar Service is not fully configured (missing client ID, client secret, redirect URI, or refresh token).';
  }

  // Fallback to Template URL if API client was not used or failed
  if (!inviteUrl) {
    inviteUrl = generateGoogleCalendarTemplateUrl({
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
      salesHeadEmail,
    });
    if (!googleMeetLink) {
      googleMeetLink = 'https://meet.google.com/lookup/borderlessbridge';
    }
  }

  try {
    const { rows } = await pool.query(
      `INSERT INTO bookings (
        submission_id, full_name, email, phone, booked_date, booked_time,
        business_role, package_choice, start_timeline, guarantee, guests,
        google_event_id, google_meet_link
      )
      VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13)
      RETURNING id, booked_date::TEXT AS booked_date, booked_time, google_meet_link`,
      [
        submissionId || null,
        fullName,
        email,
        phone,
        bookedDate,
        bookedTime,
        businessRole || null,
        packageChoice || null,
        startTimeline || null,
        guarantee || null,
        guests || null,
        googleEventId,
        googleMeetLink,
      ]
    );

    // If submissionId is provided, mark status as 'converted' in submissions table
    if (submissionId) {
      await pool.query(
        `UPDATE submissions SET status = 'converted' WHERE id = $1`,
        [submissionId]
      );
    }

    // ── Fire-and-forget emails ────────────────────────────────────
    const booking = rows[0];

    // 1. Confirmation to client
    sendBookingConfirmationEmail({
      fullName,
      email,
      phone,
      bookedDate: booking.booked_date,
      bookedTime: booking.booked_time,
      googleMeetLink: booking.google_meet_link,
      inviteUrl,
    }).catch((err) => console.error('[Email] client booking confirmation failed:', err.message));

    // 2. Alert to admin (including potential calendar error info)
    sendAdminBookingAlert({
      fullName,
      email,
      phone,
      bookedDate: booking.booked_date,
      bookedTime: booking.booked_time,
      businessRole,
      packageChoice,
      startTimeline,
      googleMeetLink: booking.google_meet_link,
      calendarError: calendarErrorMsg,
    }).catch((err) => console.error('[Email] admin booking alert failed:', err.message));

    // 3. Alert to Sales Head (if configured)
    if (salesHeadEmail) {
      sendAdminBookingAlert({
        to: salesHeadEmail,
        fullName,
        email,
        phone,
        bookedDate: booking.booked_date,
        bookedTime: booking.booked_time,
        businessRole,
        packageChoice,
        startTimeline,
        googleMeetLink: booking.google_meet_link,
        calendarError: calendarErrorMsg,
      }).catch((err) => console.error('[Email] sales head booking alert failed:', err.message));
    }

    return res.status(201).json({
      success: true,
      message: 'Booking confirmed!',
      booking: {
        ...booking,
        invite_url: inviteUrl,
      },
    });
  } catch (err) {
    if (err.code === '23505') {
      // Unique constraint violation — slot already taken
      return res.status(409).json({
        success: false,
        message: 'This slot has just been taken. Please choose another time.',
      });
    }
    console.error('[DB] createBooking error:', err.message);
    return res.status(500).json({ success: false, message: 'Internal server error.' });
  }
};

module.exports = { getAvailability, createBooking };
