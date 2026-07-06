const express = require('express');
const rateLimit = require('express-rate-limit');
const router = express.Router();
const { getAvailability, createBooking } = require('../controllers/bookingsController');

// Strict limiter for bookings: 10 per 15 minutes per IP
const bookingLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 10,
  standardHeaders: true,
  legacyHeaders: false,
  message: { success: false, message: 'Too many booking attempts. Please wait before trying again.' },
});

// GET /api/bookings/availability
router.get('/availability', getAvailability);

// POST /api/bookings
router.post('/', bookingLimiter, createBooking);

module.exports = router;
