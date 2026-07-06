const { pool } = require('../database/pool');

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
  const { submissionId, fullName, email, phone, bookedDate, bookedTime } = req.body;

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

  try {
    const { rows } = await pool.query(
      `INSERT INTO bookings (submission_id, full_name, email, phone, booked_date, booked_time)
       VALUES ($1, $2, $3, $4, $5, $6)
       RETURNING id, booked_date::TEXT AS booked_date, booked_time`,
      [submissionId || null, fullName, email, phone, bookedDate, bookedTime]
    );

    return res.status(201).json({
      success: true,
      message: 'Booking confirmed!',
      booking: rows[0],
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
