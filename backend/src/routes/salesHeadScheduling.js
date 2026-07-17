const express = require('express');
const router = express.Router();

const {
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
} = require('../controllers/salesHeadSchedulingController');

// ── Calendar ──────────────────────────────────────────────────────────────────
// GET  /api/scheduling/status
router.get('/status', getCalendarStatus);

// DELETE /api/scheduling/calendar
router.delete('/calendar', disconnectCalendar);

// GET  /api/scheduling/calendars (Fetch list of writable calendars from Google API)
router.get('/calendars', getCalendars);

// POST /api/scheduling/calendar (Update the selected calendar ID and name in DB)
router.post('/calendar', selectCalendar);

// POST /api/scheduling/test-event (Verify calendar access by creating a test event)
router.post('/test-event', createTestCalendarEvent);

// ── Scheduling Settings ───────────────────────────────────────────────────────
// GET  /api/scheduling/settings
router.get('/settings', getSchedulingSettings);

// POST /api/scheduling/settings
router.post('/settings', updateSchedulingSettings);

// ── Time Off ──────────────────────────────────────────────────────────────────
// GET  /api/scheduling/time-off
router.get('/time-off', getTimeOff);

// POST /api/scheduling/time-off
router.post('/time-off', addTimeOff);

// DELETE /api/scheduling/time-off/:id
router.delete('/time-off/:id', deleteTimeOff);

module.exports = router;
