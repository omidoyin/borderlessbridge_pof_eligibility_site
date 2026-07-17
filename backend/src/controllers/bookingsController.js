/**
 * bookingsController.js
 *
 * Dynamic scheduling engine powered by the Sales Head scheduling settings
 * and Google Calendar freebusy queries.
 *
 * Falls back to the legacy env-var GoogleCalendarService if no Sales Head
 * calendar is connected.
 */

const { pool } = require('../database/pool');
const salesHeadCalendarService = require('../services/salesHeadCalendarService');
const googleCalendarService = require('../services/googleCalendarService');
const {
  sendBookingConfirmationEmail,
  sendAdminBookingAlert,
} = require('../services/emailService');

// ── Helpers ───────────────────────────────────────────────────────────────────

/**
 * Load scheduling settings from DB. Returns defaults if table is empty.
 */
async function loadSchedulingSettings() {
  try {
    const { rows } = await pool.query('SELECT * FROM scheduling_settings WHERE id = 1');
    if (rows.length > 0) return rows[0];
  } catch (_) { /* table may not exist yet on cold start — use defaults */ }

  return {
    working_days: '1,2,3,4,5',
    working_hours_start: '09:00',
    working_hours_end: '17:00',
    meeting_duration: 60,
    buffer_before: 0,
    buffer_after: 0,
    min_notice_hours: 0,
    max_booking_days: 14,
    max_meetings_per_day: 8,
    timezone: 'Africa/Lagos',
  };
}

/**
 * Load all active time-off entries from DB.
 */
async function loadTimeOff() {
  try {
    const { rows } = await pool.query(
      `SELECT start_date::TEXT AS start_date, end_date::TEXT AS end_date FROM time_off`
    );
    return rows;
  } catch (_) {
    return [];
  }
}

/**
 * Returns true if the given date string (YYYY-MM-DD) falls within any
 * time-off block.
 */
function isDateOnTimeOff(dateStr, timeOffBlocks) {
  const d = new Date(dateStr + 'T00:00:00Z');
  return timeOffBlocks.some((block) => {
    const start = new Date(block.start_date + 'T00:00:00Z');
    const end   = new Date(block.end_date   + 'T23:59:59Z');
    return d >= start && d <= end;
  });
}

/**
 * Generate candidate business dates within `maxDays` days from now,
 * filtered by the configured working days.
 *
 * @param {number[]} workingDayNums  Array of JS day-of-week numbers (0=Sun, 6=Sat)
 * @param {number}   minNoticeHours  Minimum hours from now before a slot can start
 * @param {number}   maxDays         How far into the future to look
 * @param {string}   timezone        IANA timezone string
 */
function generateCandidateDates(workingDayNums, minNoticeHours, maxDays) {
  const dates = [];
  const now = new Date();

  // Earliest allowed booking start (for min notice)
  const minStart = new Date(now.getTime() + minNoticeHours * 60 * 60 * 1000);

  // Window end: maxDays from today midnight
  const windowEnd = new Date(now);
  windowEnd.setDate(windowEnd.getDate() + maxDays);
  windowEnd.setHours(23, 59, 59, 999);

  const cursor = new Date(now);
  cursor.setDate(cursor.getDate() + 1); // start from tomorrow
  cursor.setHours(0, 0, 0, 0);

  while (cursor <= windowEnd) {
    const dow = cursor.getDay();
    if (workingDayNums.includes(dow)) {
      const yyyy = cursor.getFullYear();
      const mm   = String(cursor.getMonth() + 1).padStart(2, '0');
      const dd   = String(cursor.getDate()).padStart(2, '0');
      dates.push(`${yyyy}-${mm}-${dd}`);
    }
    cursor.setDate(cursor.getDate() + 1);
  }

  return dates;
}

/**
 * Generate all slot start times for a day, given working hours and duration/buffers.
 * Returns array of 'HH:MM' strings (24h, local to the Sales Head's timezone).
 */
function generateDaySlots(startTime, endTime, durationMin, bufferBefore, bufferAfter) {
  const slots = [];
  const [sh, sm] = startTime.split(':').map(Number);
  const [eh, em] = endTime.split(':').map(Number);

  let cursor = sh * 60 + sm;
  const endMinutes = eh * 60 + em;
  const stepMinutes = durationMin + bufferAfter; // total block per meeting (buffer before applies to the next slot)

  while (cursor + durationMin <= endMinutes) {
    const slotStart = cursor + bufferBefore;
    if (slotStart + durationMin <= endMinutes) {
      const h = Math.floor(slotStart / 60);
      const m = slotStart % 60;
      slots.push(`${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}`);
    }
    cursor += stepMinutes + bufferBefore;
  }

  return slots;
}

/**
 * Parse a slot time string and date to a UTC Date, given a timezone.
 * Uses the Intl API approach (same as salesHeadCalendarService).
 */
function slotToUTC(dateStr, timeStr, timezone) {
  const [year, month, day] = dateStr.split('-').map(Number);
  const [hours, minutes] = timeStr.split(':').map(Number);

  const utcMidnight = Date.UTC(year, month - 1, day, 0, 0, 0);
  const fmt = new Intl.DateTimeFormat('en-US', {
    timeZone: timezone,
    hour: '2-digit', minute: '2-digit',
    hour12: false,
  });
  const parts = fmt.formatToParts(new Date(utcMidnight));
  const p = {};
  parts.forEach(({ type, value }) => { p[type] = value; });

  const localHourAtMidnightUTC = parseInt(p.hour === '24' ? '0' : p.hour, 10);
  const localMinuteAtMidnightUTC = parseInt(p.minute, 10);
  const offsetMinutes = localHourAtMidnightUTC * 60 + localMinuteAtMidnightUTC;

  return new Date(utcMidnight + (hours * 60 + minutes - offsetMinutes) * 60 * 1000);
}

/**
 * Check if a slot overlaps with any busy interval.
 */
function slotOverlapsBusy(slotStartUTC, slotEndUTC, busyIntervals) {
  return busyIntervals.some((b) => {
    const busyStart = new Date(b.start);
    const busyEnd   = new Date(b.end);
    return slotStartUTC < busyEnd && slotEndUTC > busyStart;
  });
}

/**
 * Generates an interactive "Add to Google Calendar" link as a fallback.
 */
function generateGoogleCalendarTemplateUrl({
  fullName, email, phone, bookedDate, bookedTime,
  businessRole, startTimeline, guests, salesHeadEmail,
  meetingDurationMinutes = 60, timezone = 'Africa/Lagos',
}) {
  const firstName = fullName.trim().split(/\s+/)[0] || fullName.trim();
  const text = encodeURIComponent(`${firstName} & BorderlessBridge: Proof of Funds (POF) Strategy Call`);

  const slotStart = slotToUTC(bookedDate, bookedTime, timezone);
  const slotEnd = new Date(slotStart.getTime() + meetingDurationMinutes * 60 * 1000);

  const formatDateUtc = (d) => d.toISOString().replace(/[-:]/g, '').split('.')[0] + 'Z';
  const dates = `${formatDateUtc(slotStart)}/${formatDateUtc(slotEnd)}`;

  const details = encodeURIComponent(
    `BorderlessBridge Proof of Funds (POF) Strategy Call\n\n` +
    `Who needs this POF: ${businessRole || 'Not specified'}\n` +
    `When looking to start: ${startTimeline}\n` +
    `Phone: ${phone}\n` +
    `Guests: ${guests || 'None'}\n\n` +
    `Join Google Meet: https://meet.google.com/lookup/borderlessbridge`
  );

  const addEmailsList = [email, ...(guests ? guests.split(',') : [])];
  if (salesHeadEmail) addEmailsList.push(salesHeadEmail);
  const adminEmail = process.env.ADMIN_EMAIL;
  if (adminEmail && !addEmailsList.includes(adminEmail)) addEmailsList.push(adminEmail);

  const addEmails = addEmailsList.map((e) => e.trim()).filter(Boolean).join(',');

  return `https://calendar.google.com/calendar/render?action=TEMPLATE&text=${text}&dates=${dates}&details=${details}&add=${addEmails}`;
}

// ── GET /api/bookings/availability ────────────────────────────────────────────
const getAvailability = async (req, res) => {
  try {
    const settings = await loadSchedulingSettings();
    const timeOffBlocks = await loadTimeOff();

    // Parse working days (stored as "0,1,2,3,4,5,6" with JS day-of-week numbering)
    const workingDayNums = settings.working_days
      .split(',')
      .map((d) => parseInt(d.trim(), 10))
      .filter((d) => !isNaN(d));

    const meetingDuration = parseInt(settings.meeting_duration, 10) || 60;
    const bufferBefore    = parseInt(settings.buffer_before, 10)    || 0;
    const bufferAfter     = parseInt(settings.buffer_after, 10)     || 0;
    const minNoticeHours  = parseInt(settings.min_notice_hours, 10) || 0;
    const maxBookingDays  = parseInt(settings.max_booking_days, 10) || 14;
    const maxMeetingsPerDay = parseInt(settings.max_meetings_per_day, 10) || 8;
    const timezone        = settings.timezone || 'Africa/Lagos';

    const candidateDates = generateCandidateDates(
      workingDayNums,
      minNoticeHours,
      maxBookingDays
    );

    // Generate all possible slots for every day
    const allSlots = generateDaySlots(
      settings.working_hours_start,
      settings.working_hours_end,
      meetingDuration,
      bufferBefore,
      bufferAfter
    );

    // Fetch DB bookings for the candidate dates
    const { rows: dbBookings } = await pool.query(
      `SELECT booked_date::TEXT AS booked_date, booked_time
       FROM bookings
       WHERE status != 'cancelled'
         AND booked_date = ANY($1::DATE[])`,
      [candidateDates]
    );

    const dbTakenMap = {};
    for (const row of dbBookings) {
      const dateKey = row.booked_date.split('T')[0];
      if (!dbTakenMap[dateKey]) dbTakenMap[dateKey] = [];
      dbTakenMap[dateKey].push(row.booked_time);
    }

    // Fetch Google Calendar freebusy if Sales Head is connected
    let busyIntervals = [];
    const calendarConnected = await salesHeadCalendarService.isConnected();
    if (calendarConnected && candidateDates.length > 0) {
      try {
        const windowStart = new Date(candidateDates[0] + 'T00:00:00Z').toISOString();
        const windowEnd   = new Date(candidateDates[candidateDates.length - 1] + 'T23:59:59Z').toISOString();
        busyIntervals = await salesHeadCalendarService.getFreeBusy(windowStart, windowEnd);
      } catch (calErr) {
        console.error('[Availability] Google Calendar freebusy failed:', calErr.message);
        // Continue without freebusy — DB bookings still block slots
      }
    }

    const now = new Date();
    const minStart = new Date(now.getTime() + minNoticeHours * 60 * 60 * 1000);

    // Build availability for each candidate date
    const availability = candidateDates
      .filter((date) => !isDateOnTimeOff(date, timeOffBlocks))
      .map((date) => {
        const takenSlots = [];

        let meetingsBooked = 0;

        const availableSlots = allSlots.filter((slot) => {
          // Already fully booked for the day?
          if (meetingsBooked >= maxMeetingsPerDay) return false;

          // Check min notice
          const slotStart = slotToUTC(date, slot, timezone);
          if (slotStart <= minStart) return false;

          // Check if already taken in DB
          if ((dbTakenMap[date] || []).includes(slot)) {
            takenSlots.push(slot);
            meetingsBooked++;
            return false;
          }

          // Check Google Calendar busy
          const slotEnd = new Date(slotStart.getTime() + meetingDuration * 60 * 1000);
          if (slotOverlapsBusy(slotStart, slotEnd, busyIntervals)) {
            takenSlots.push(slot);
            meetingsBooked++;
            return false;
          }

          meetingsBooked++;
          return true;
        });

        return {
          date,
          allSlots,
          takenSlots,
          availableCount: availableSlots.length,
        };
      })
      // Only include dates that have at least some slots (even if all taken — UI shows "Full")
      .filter((d) => d.allSlots.length > 0);

    return res.json({
      success: true,
      availability,
      meta: {
        meetingDuration,
        timezone,
        maxBookingDays,
      },
    });
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

  // Load scheduling settings to validate against them
  const settings = await loadSchedulingSettings();
  const meetingDuration = parseInt(settings.meeting_duration, 10) || 60;
  const timezone        = settings.timezone || 'Africa/Lagos';
  const minNoticeHours  = parseInt(settings.min_notice_hours, 10) || 0;
  const maxBookingDays  = parseInt(settings.max_booking_days, 10) || 14;

  const workingDayNums = settings.working_days
    .split(',')
    .map((d) => parseInt(d.trim(), 10))
    .filter((d) => !isNaN(d));

  // Validate date is a working day
  const dow = new Date(bookedDate + 'T00:00:00').getDay();
  if (!workingDayNums.includes(dow)) {
    return res.status(422).json({ success: false, message: 'That day is not a working day.' });
  }

  // Validate min notice
  const now = new Date();
  const slotStartUTC = slotToUTC(bookedDate, bookedTime, timezone);
  const minStart = new Date(now.getTime() + minNoticeHours * 60 * 60 * 1000);
  if (slotStartUTC <= minStart) {
    return res.status(422).json({ success: false, message: 'Slot is within minimum notice period.' });
  }

  // Validate within max booking window
  const windowEnd = new Date(now);
  windowEnd.setDate(windowEnd.getDate() + maxBookingDays);
  if (slotStartUTC > windowEnd) {
    return res.status(422).json({ success: false, message: 'Date is beyond maximum booking window.' });
  }

  // Validate time-off
  const timeOffBlocks = await loadTimeOff();
  if (isDateOnTimeOff(bookedDate, timeOffBlocks)) {
    return res.status(422).json({ success: false, message: 'That date is blocked (time off).' });
  }

  // Validate the slot exists in the generated slot list
  const allSlots = generateDaySlots(
    settings.working_hours_start,
    settings.working_hours_end,
    meetingDuration,
    parseInt(settings.buffer_before, 10) || 0,
    parseInt(settings.buffer_after, 10) || 0
  );
  if (!allSlots.includes(bookedTime)) {
    return res.status(422).json({ success: false, message: 'Invalid time slot.' });
  }

  // Look up Sales Head email for legacy fallback
  let salesHeadEmail = null;
  try {
    const status = await salesHeadCalendarService.getStatus();
    salesHeadEmail = status.connected ? status.email : null;
    if (!salesHeadEmail) {
      const settingsRes = await pool.query(
        "SELECT value FROM settings WHERE key IN ('salesHeadEmail', 'sales_head_email') AND value IS NOT NULL"
      );
      if (settingsRes.rows.length > 0) salesHeadEmail = settingsRes.rows[0].value.trim();
    }
  } catch (_) {}

  let googleEventId = null;
  let googleMeetLink = null;
  let inviteUrl = null;
  let calendarErrorMsg = null;

  // ── Attempt Google Calendar event creation ────────────────────────────────
  const calendarConnected = await salesHeadCalendarService.isConnected();

  if (calendarConnected) {
    // Use Sales Head calendar (primary path)
    try {
      const gEventRes = await salesHeadCalendarService.createEvent({
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
        meetingDurationMinutes: meetingDuration,
        timezone,
      });
      googleEventId  = gEventRes.googleEventId;
      googleMeetLink = gEventRes.googleMeetLink;
      inviteUrl      = gEventRes.inviteUrl;
    } catch (gErr) {
      console.error('[Google Calendar API] Sales Head event creation failed:', gErr.message);
      calendarErrorMsg = gErr.message;
    }
  } else if (googleCalendarService.isConfigured()) {
    // Fall back to legacy env-var calendar
    try {
      const gEventRes = await googleCalendarService.createEvent({
        fullName, email, phone, bookedDate, bookedTime,
        businessRole, packageChoice, startTimeline, guarantee, guests, salesHeadEmail,
      });
      googleEventId  = gEventRes.googleEventId;
      googleMeetLink = gEventRes.googleMeetLink;
      inviteUrl      = gEventRes.inviteUrl;
    } catch (gErr) {
      console.error('[Google Calendar API] Legacy event creation failed:', gErr.message);
      calendarErrorMsg = gErr.message;
    }
  } else {
    calendarErrorMsg = 'No Google Calendar configured. Connect a Sales Head calendar in the admin dashboard.';
  }

  // Fallback template URL if API call failed or wasn't attempted
  if (!inviteUrl) {
    inviteUrl = generateGoogleCalendarTemplateUrl({
      fullName, email, phone, bookedDate, bookedTime,
      businessRole, startTimeline, guests, salesHeadEmail,
      meetingDurationMinutes: meetingDuration,
      timezone,
    });
    if (!googleMeetLink) {
      googleMeetLink = 'https://meet.google.com/lookup/borderlessbridge';
    }
  }

  // ── Persist booking to DB ─────────────────────────────────────────────────
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
        fullName, email, phone,
        bookedDate, bookedTime,
        businessRole || null, packageChoice || null,
        startTimeline || null, guarantee || null, guests || null,
        googleEventId, googleMeetLink,
      ]
    );

    if (submissionId) {
      await pool.query(
        `UPDATE submissions SET status = 'converted' WHERE id = $1`,
        [submissionId]
      );
    }

    const booking = rows[0];

    // ── Fire-and-forget emails ────────────────────────────────────────────
    sendBookingConfirmationEmail({
      fullName, email, phone,
      bookedDate: booking.booked_date,
      bookedTime: booking.booked_time,
      googleMeetLink: booking.google_meet_link,
      inviteUrl,
    }).catch((err) => console.error('[Email] client confirmation failed:', err.message));

    sendAdminBookingAlert({
      fullName, email, phone,
      bookedDate: booking.booked_date,
      bookedTime: booking.booked_time,
      businessRole, packageChoice, startTimeline,
      googleMeetLink: booking.google_meet_link,
      calendarError: calendarErrorMsg,
    }).catch((err) => console.error('[Email] admin alert failed:', err.message));

    if (salesHeadEmail) {
      sendAdminBookingAlert({
        to: salesHeadEmail,
        fullName, email, phone,
        bookedDate: booking.booked_date,
        bookedTime: booking.booked_time,
        businessRole, packageChoice, startTimeline,
        googleMeetLink: booking.google_meet_link,
        calendarError: calendarErrorMsg,
      }).catch((err) => console.error('[Email] sales head alert failed:', err.message));
    }

    return res.status(201).json({
      success: true,
      message: 'Booking confirmed!',
      booking: {
        ...booking,
        invite_url: inviteUrl,
        meetingDuration,
        timezone,
      },
    });
  } catch (err) {
    if (err.code === '23505') {
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
