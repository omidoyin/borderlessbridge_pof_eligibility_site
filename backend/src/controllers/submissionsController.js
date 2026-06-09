const { body, validationResult } = require('express-validator');
const db = require('../database');

// Validation rules
const submissionValidationRules = [
  body('fullName')
    .trim()
    .notEmpty().withMessage('Full name is required')
    .isLength({ min: 2, max: 100 }).withMessage('Name must be between 2 and 100 characters'),

  body('email')
    .trim()
    .notEmpty().withMessage('Email is required')
    .isEmail().withMessage('Please enter a valid email address')
    .normalizeEmail(),

  body('phone')
    .trim()
    .notEmpty().withMessage('WhatsApp number is required')
    .isLength({ min: 7, max: 20 }).withMessage('Please enter a valid phone number'),

  body('destination')
    .trim()
    .notEmpty().withMessage('Destination country is required')
    .isLength({ min: 2, max: 100 }),

  body('visaType')
    .trim()
    .notEmpty().withMessage('Visa type is required')
    .isIn(['study', 'work', 'travel', 'other']).withMessage('Invalid visa type'),

  body('timeline')
    .trim()
    .notEmpty().withMessage('Application timeline is required')
    .isIn(['within_1_month', '1_3_months', '3_6_months', '6_plus_months'])
    .withMessage('Invalid timeline option'),
];

// POST /api/submissions — create a new eligibility submission
const createSubmission = (req, res) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(422).json({
      success: false,
      errors: errors.array().map((e) => ({ field: e.path, message: e.msg })),
    });
  }

  const { fullName, email, phone, destination, visaType, timeline } = req.body;
  const ipAddress = req.ip || req.connection.remoteAddress || null;
  const userAgent = req.get('User-Agent') || null;

  try {
    const stmt = db.prepare(`
      INSERT INTO submissions (full_name, email, phone, destination, visa_type, timeline, ip_address, user_agent)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?)
    `);

    const result = stmt.run(fullName, email, phone, destination, visaType, timeline, ipAddress, userAgent);

    return res.status(201).json({
      success: true,
      message: 'Eligibility assessment submitted successfully.',
      id: result.lastInsertRowid,
    });
  } catch (err) {
    console.error('DB error on createSubmission:', err);
    return res.status(500).json({
      success: false,
      message: 'An internal error occurred. Please try again.',
    });
  }
};

// GET /api/submissions — list all submissions (admin use)
const getSubmissions = (req, res) => {
  const { status, limit = 50, offset = 0 } = req.query;

  try {
    let query = 'SELECT * FROM submissions';
    const params = [];

    if (status) {
      query += ' WHERE status = ?';
      params.push(status);
    }

    query += ' ORDER BY created_at DESC LIMIT ? OFFSET ?';
    params.push(Number(limit), Number(offset));

    const rows = db.prepare(query).all(...params);
    const total = db.prepare(
      status ? 'SELECT COUNT(*) as count FROM submissions WHERE status = ?' : 'SELECT COUNT(*) as count FROM submissions'
    ).get(...(status ? [status] : []));

    return res.json({
      success: true,
      data: rows,
      meta: {
        total: total.count,
        limit: Number(limit),
        offset: Number(offset),
      },
    });
  } catch (err) {
    console.error('DB error on getSubmissions:', err);
    return res.status(500).json({ success: false, message: 'Internal server error.' });
  }
};

// PATCH /api/submissions/:id/status — update submission status
const updateSubmissionStatus = (req, res) => {
  const { id } = req.params;
  const { status, notes } = req.body;

  const validStatuses = ['new', 'contacted', 'converted', 'rejected'];
  if (!validStatuses.includes(status)) {
    return res.status(422).json({ success: false, message: 'Invalid status value.' });
  }

  try {
    const stmt = db.prepare('UPDATE submissions SET status = ?, notes = ? WHERE id = ?');
    const result = stmt.run(status, notes || null, id);

    if (result.changes === 0) {
      return res.status(404).json({ success: false, message: 'Submission not found.' });
    }

    return res.json({ success: true, message: 'Status updated.' });
  } catch (err) {
    console.error('DB error on updateSubmissionStatus:', err);
    return res.status(500).json({ success: false, message: 'Internal server error.' });
  }
};

module.exports = {
  submissionValidationRules,
  createSubmission,
  getSubmissions,
  updateSubmissionStatus,
};
