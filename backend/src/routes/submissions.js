const express = require('express');
const router = express.Router();
const {
  submissionValidationRules,
  createSubmission,
  getSubmissions,
  updateSubmissionStatus,
} = require('../controllers/submissionsController');

// POST /api/submissions
router.post('/', submissionValidationRules, createSubmission);

// GET /api/submissions
router.get('/', getSubmissions);

// PATCH /api/submissions/:id/status
router.patch('/:id/status', updateSubmissionStatus);

module.exports = router;
