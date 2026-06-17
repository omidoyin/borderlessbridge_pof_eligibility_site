const { body, validationResult } = require('express-validator');
const { pool } = require('../database/pool');

// ── Validation rules ─────────────────────────────────────────────────────────
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

  body('nationality')
    .trim()
    .notEmpty().withMessage('Nationality is required')
    .isLength({ min: 2, max: 100 }),

  body('destination')
    .trim()
    .notEmpty().withMessage('Destination country is required')
    .isIn(['Canada', 'UK', 'USA', 'Germany', 'Ireland', 'France', 'Other'])
    .withMessage('Please select a valid destination country'),

  body('visaType')
    .trim()
    .notEmpty().withMessage('Visa type is required')
    .isIn(['student', 'work', 'tourist', 'other']).withMessage('Invalid visa type'),

  body('timeline')
    .trim()
    .notEmpty().withMessage('Application timeline is required')
    .isIn(['within_30_days', '1_3_months', '3_6_months', 'more_than_6_months'])
    .withMessage('Invalid timeline option'),

  body('knowsPofAmount')
    .notEmpty().withMessage('Please indicate if you know the PoF amount')
    .isIn(['yes', 'no']),

  body('pofAmount')
    .optional({ nullable: true, checkFalsy: true })
    .trim()
    .isLength({ max: 200 }),

  body('lettersReceived')
    .optional({ nullable: true }),

  body('accessToFunds')
    .trim()
    .notEmpty().withMessage('Please indicate your access to funds')
    .isIn(['yes_fully', 'partially', 'no']),

  body('applyingWithin30Days')
    .notEmpty().withMessage('Please answer this question')
    .isIn(['yes', 'no']),

  body('priorRefusal')
    .notEmpty().withMessage('Please answer this question')
    .isIn(['yes', 'no']),

  body('heardFrom')
    .trim()
    .notEmpty().withMessage('Please tell us how you heard about us')
    .isIn(['Facebook', 'Instagram', 'TikTok', 'Google', 'Referral', 'Other']),

  body('additionalInfo')
    .optional({ nullable: true, checkFalsy: true })
    .trim()
    .isLength({ max: 1000 }),
];

// ── POST /api/submissions ────────────────────────────────────────────────────
const createSubmission = async (req, res) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(422).json({
      success: false,
      errors: errors.array().map((e) => ({ field: e.path, message: e.msg })),
    });
  }

  const {
    fullName,
    email,
    phone,
    nationality,
    destination,
    visaType,
    timeline,
    knowsPofAmount,
    pofAmount,
    lettersReceived,
    accessToFunds,
    applyingWithin30Days,
    priorRefusal,
    heardFrom,
    additionalInfo,
  } = req.body;

  const ipAddress  = req.ip || req.connection?.remoteAddress || null;
  const userAgent  = req.get('User-Agent') || null;
  const letters    = Array.isArray(lettersReceived)
    ? lettersReceived.join(', ')
    : (lettersReceived || null);

  try {
    const { rows } = await pool.query(
      `INSERT INTO submissions (
          full_name, email, phone, nationality,
          destination, visa_type, timeline,
          knows_pof_amount, pof_amount, letters_received,
          access_to_funds, applying_within_30_days, prior_refusal,
          heard_from, additional_info, ip_address, user_agent
        ) VALUES (
          $1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15,$16,$17
        ) RETURNING id`,
      [
        fullName, email, phone, nationality,
        destination, visaType, timeline,
        knowsPofAmount, pofAmount || null, letters,
        accessToFunds, applyingWithin30Days, priorRefusal,
        heardFrom, additionalInfo || null, ipAddress, userAgent,
      ]
    );

    return res.status(201).json({
      success: true,
      message: 'Eligibility assessment submitted successfully.',
      id: rows[0].id,
    });
  } catch (err) {
    console.error('[DB] createSubmission error:', err.message);
    return res.status(500).json({
      success: false,
      message: 'An internal error occurred. Please try again.',
    });
  }
};

// ── GET /api/submissions ─────────────────────────────────────────────────────
const getSubmissions = async (req, res) => {
  const { status, limit = 50, offset = 0 } = req.query;

  try {
    const params = [];
    let where = '';
    if (status) {
      params.push(status);
      where = `WHERE status = $${params.length}`;
    }

    params.push(Number(limit), Number(offset));
    const dataResult = await pool.query(
      `SELECT * FROM submissions ${where} ORDER BY created_at DESC LIMIT $${params.length - 1} OFFSET $${params.length}`,
      params
    );

    const countParams = status ? [status] : [];
    const countResult = await pool.query(
      `SELECT COUNT(*) as count FROM submissions ${where}`,
      countParams
    );

    return res.json({
      success: true,
      data: dataResult.rows,
      meta: {
        total: parseInt(countResult.rows[0].count, 10),
        limit: Number(limit),
        offset: Number(offset),
      },
    });
  } catch (err) {
    console.error('[DB] getSubmissions error:', err.message);
    return res.status(500).json({ success: false, message: 'Internal server error.' });
  }
};

// ── PATCH /api/submissions/:id/status ───────────────────────────────────────
const updateSubmissionStatus = async (req, res) => {
  const { id } = req.params;
  const { status, notes } = req.body;

  const validStatuses = ['new', 'contacted', 'converted', 'rejected'];
  if (!validStatuses.includes(status)) {
    return res.status(422).json({ success: false, message: 'Invalid status value.' });
  }

  try {
    const result = await pool.query(
      'UPDATE submissions SET status = $1, notes = $2 WHERE id = $3',
      [status, notes || null, id]
    );

    if (result.rowCount === 0) {
      return res.status(404).json({ success: false, message: 'Submission not found.' });
    }

    return res.json({ success: true, message: 'Status updated.' });
  } catch (err) {
    console.error('[DB] updateSubmissionStatus error:', err.message);
    return res.status(500).json({ success: false, message: 'Internal server error.' });
  }
};

module.exports = {
  submissionValidationRules,
  createSubmission,
  getSubmissions,
  updateSubmissionStatus,
};
