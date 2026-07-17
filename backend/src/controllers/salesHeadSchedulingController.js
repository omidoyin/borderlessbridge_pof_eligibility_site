/**
 * salesHeadSchedulingController.js
 *
 * CRUD endpoints for:
 *  - Calendar connection status
 *  - Scheduling settings (working days, hours, duration, buffers, etc.)
 *  - Time off management
 */

const { pool } = require('../database/pool');
const salesHeadCalendarService = require('../services/salesHeadCalendarService');

// ── GET /api/scheduling/status ────────────────────────────────────────────────
const getCalendarStatus = async (req, res) => {
  try {
    const status = await salesHeadCalendarService.getStatus();
    return res.json({ success: true, ...status });
  } catch (err) {
    console.error('[Scheduling] getCalendarStatus error:', err.message);
    return res.status(500).json({ success: false, message: 'Internal server error.' });
  }
};

// ── DELETE /api/scheduling/calendar ──────────────────────────────────────────
const disconnectCalendar = async (req, res) => {
  try {
    await salesHeadCalendarService.disconnect();
    return res.json({ success: true, message: 'Calendar disconnected.' });
  } catch (err) {
    console.error('[Scheduling] disconnectCalendar error:', err.message);
    return res.status(500).json({ success: false, message: 'Internal server error.' });
  }
};

// ── GET /api/scheduling/settings ─────────────────────────────────────────────
const getSchedulingSettings = async (req, res) => {
  try {
    const { rows } = await pool.query('SELECT * FROM scheduling_settings WHERE id = 1');
    if (rows.length === 0) {
      return res.json({
        success: true,
        settings: {
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
        },
      });
    }
    return res.json({ success: true, settings: rows[0] });
  } catch (err) {
    console.error('[Scheduling] getSchedulingSettings error:', err.message);
    return res.status(500).json({ success: false, message: 'Internal server error.' });
  }
};

// ── POST /api/scheduling/settings ────────────────────────────────────────────
const updateSchedulingSettings = async (req, res) => {
  const {
    working_days,
    working_hours_start,
    working_hours_end,
    meeting_duration,
    buffer_before,
    buffer_after,
    min_notice_hours,
    max_booking_days,
    max_meetings_per_day,
    timezone,
  } = req.body;

  // Validate required fields
  if (!working_days || !working_hours_start || !working_hours_end) {
    return res.status(422).json({
      success: false,
      message: 'working_days, working_hours_start, and working_hours_end are required.',
    });
  }

  try {
    await pool.query(
      `INSERT INTO scheduling_settings
         (id, working_days, working_hours_start, working_hours_end,
          meeting_duration, buffer_before, buffer_after,
          min_notice_hours, max_booking_days, max_meetings_per_day, timezone, updated_at)
       VALUES (1, $1, $2, $3, $4, $5, $6, $7, $8, $9, $10, NOW())
       ON CONFLICT (id) DO UPDATE SET
         working_days         = EXCLUDED.working_days,
         working_hours_start  = EXCLUDED.working_hours_start,
         working_hours_end    = EXCLUDED.working_hours_end,
         meeting_duration     = EXCLUDED.meeting_duration,
         buffer_before        = EXCLUDED.buffer_before,
         buffer_after         = EXCLUDED.buffer_after,
         min_notice_hours     = EXCLUDED.min_notice_hours,
         max_booking_days     = EXCLUDED.max_booking_days,
         max_meetings_per_day = EXCLUDED.max_meetings_per_day,
         timezone             = EXCLUDED.timezone,
         updated_at           = NOW()`,
      [
        working_days,
        working_hours_start,
        working_hours_end,
        parseInt(meeting_duration, 10) || 60,
        parseInt(buffer_before, 10) || 0,
        parseInt(buffer_after, 10) || 0,
        parseInt(min_notice_hours, 10) || 0,
        parseInt(max_booking_days, 10) || 14,
        parseInt(max_meetings_per_day, 10) || 8,
        timezone || 'Africa/Lagos',
      ]
    );
    return res.json({ success: true, message: 'Scheduling settings saved.' });
  } catch (err) {
    console.error('[Scheduling] updateSchedulingSettings error:', err.message);
    return res.status(500).json({ success: false, message: 'Internal server error.' });
  }
};

// ── GET /api/scheduling/time-off ─────────────────────────────────────────────
const getTimeOff = async (req, res) => {
  try {
    const { rows } = await pool.query(
      `SELECT id, label, start_date::TEXT AS start_date, end_date::TEXT AS end_date, reason, created_at
       FROM time_off
       ORDER BY start_date ASC`
    );
    return res.json({ success: true, timeOff: rows });
  } catch (err) {
    console.error('[Scheduling] getTimeOff error:', err.message);
    return res.status(500).json({ success: false, message: 'Internal server error.' });
  }
};

// ── POST /api/scheduling/time-off ────────────────────────────────────────────
const addTimeOff = async (req, res) => {
  const { label, start_date, end_date, reason } = req.body;

  if (!label || !start_date || !end_date) {
    return res.status(422).json({
      success: false,
      message: 'label, start_date, and end_date are required.',
    });
  }

  if (new Date(start_date) > new Date(end_date)) {
    return res.status(422).json({
      success: false,
      message: 'start_date must be on or before end_date.',
    });
  }

  try {
    const { rows } = await pool.query(
      `INSERT INTO time_off (label, start_date, end_date, reason)
       VALUES ($1, $2, $3, $4)
       RETURNING id, label, start_date::TEXT AS start_date, end_date::TEXT AS end_date, reason, created_at`,
      [label, start_date, end_date, reason || null]
    );
    return res.status(201).json({ success: true, timeOff: rows[0] });
  } catch (err) {
    console.error('[Scheduling] addTimeOff error:', err.message);
    return res.status(500).json({ success: false, message: 'Internal server error.' });
  }
};

// ── DELETE /api/scheduling/time-off/:id ──────────────────────────────────────
const deleteTimeOff = async (req, res) => {
  const { id } = req.params;
  try {
    const { rowCount } = await pool.query('DELETE FROM time_off WHERE id = $1', [id]);
    if (rowCount === 0) {
      return res.status(404).json({ success: false, message: 'Time-off entry not found.' });
    }
    return res.json({ success: true, message: 'Time-off entry deleted.' });
  } catch (err) {
    console.error('[Scheduling] deleteTimeOff error:', err.message);
    return res.status(500).json({ success: false, message: 'Internal server error.' });
  }
};

// ── GET /api/scheduling/calendars ────────────────────────────────────────────
const getCalendars = async (req, res) => {
  try {
    const calendars = await salesHeadCalendarService.getWritableCalendars();
    return res.json({ success: true, calendars });
  } catch (err) {
    console.error('[Scheduling] getCalendars error:', err.message);
    return res.status(500).json({ success: false, message: err.message || 'Internal server error.' });
  }
};

// ── POST /api/scheduling/calendar ────────────────────────────────────────────
const selectCalendar = async (req, res) => {
  const { calendarId, calendarName } = req.body;

  if (!calendarId || !calendarName) {
    return res.status(422).json({
      success: false,
      message: 'calendarId and calendarName are required.',
    });
  }

  try {
    await salesHeadCalendarService.saveCalendarSelection(calendarId, calendarName);
    return res.json({ success: true, message: 'Calendar selection saved.' });
  } catch (err) {
    console.error('[Scheduling] selectCalendar error:', err.message);
    return res.status(500).json({ success: false, message: 'Internal server error.' });
  }
};

// ── POST /api/scheduling/test-event ──────────────────────────────────────────
const createTestCalendarEvent = async (req, res) => {
  try {
    const result = await salesHeadCalendarService.createTestEvent();
    return res.json({ success: true, message: 'Test event created successfully!', link: result.htmlLink });
  } catch (err) {
    console.error('[Scheduling] createTestCalendarEvent error:', err.message);
    return res.status(500).json({ success: false, message: err.message || 'Internal server error.' });
  }
};

module.exports = {
  getCalendarStatus,
  disconnectCalendar,
  getSchedulingSettings,
  updateSchedulingSettings,
  getTimeOff,
  addTimeOff,
  deleteTimeOff,
  getCalendars,
  selectCalendar,
  createTestCalendarEvent,
};
