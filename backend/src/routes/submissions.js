const express = require('express');
const rateLimit = require('express-rate-limit');
const router = express.Router();
const {
  submissionValidationRules,
  createSubmission,
  getSubmissions,
  updateSubmissionStatus,
} = require('../controllers/submissionsController');

// Strict limiter for client form submissions: 5 per 15 minutes per IP
const submissionLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 5,
  standardHeaders: true,
  legacyHeaders: false,
  message: { success: false, message: 'Too many submissions. Please wait before trying again.' },
});

// POST /api/submissions
router.post('/', submissionLimiter, submissionValidationRules, createSubmission);

// GET /api/submissions
router.get('/', getSubmissions);

// PATCH /api/submissions/:id/status
router.patch('/:id/status', updateSubmissionStatus);

module.exports = router;
