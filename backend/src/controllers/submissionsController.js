const { body, validationResult } = require('express-validator');
const { pool } = require('../database/pool');
const {
  sendSubmissionReceivedEmail,
  sendAdminNewSubmissionAlert,
} = require('../services/emailService');

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

  body('budgetRange')
    .optional({ nullable: true, checkFalsy: true })
    .trim()
    .isIn(['above_3_5m', '2_5m_3_5m', '1_5m_2_5m', 'below_1_5m', ''])
    .withMessage('Invalid budget range option'),
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
    budgetRange,
  } = req.body;

  const ipAddress  = req.ip || req.connection?.remoteAddress || null;
  const userAgent  = req.get('User-Agent') || null;

  // Calculate score and priority
  let score = 0;
  const lettersStr = Array.isArray(lettersReceived)
    ? lettersReceived.join(', ')
    : (lettersReceived || '');
  const hasLetters = lettersStr && !lettersStr.includes('None Yet') && lettersStr.trim() !== '';

  if (hasLetters) score += 30;
  if (accessToFunds === 'no') score += 20;
  if (timeline === '1_3_months' || timeline === 'within_30_days') score += 20;
  if (knowsPofAmount === 'yes') score += 10;

  let priority = 'low';
  if (score >= 60) {
    priority = 'high';
  } else if (score >= 30) {
    priority = 'medium';
  }

  // Convert timeline code to readable string
  let readableTimeline = timeline;
  if (timeline === 'within_30_days') readableTimeline = 'within 30 days';
  else if (timeline === '1_3_months') readableTimeline = 'within 1–3 months';
  else if (timeline === '3_6_months') readableTimeline = 'within 3–6 months';
  else if (timeline === 'more_than_6_months') readableTimeline = 'in more than 6 months';

  // Convert accessToFunds code to readable string
  let readableAccess = 'no';
  if (accessToFunds === 'yes_fully') readableAccess = 'full';
  else if (accessToFunds === 'partially') readableAccess = 'partial';

  const lettersDisplay = hasLetters ? lettersStr : 'no letters yet';
  const refusalDisplay = priorRefusal === 'yes' ? 'have a' : 'have no';

  // Format budget range for display
  const budgetLabels = {
    above_3_5m: '₦3.5M – ₦5.5M (or above)',
    '2_5m_3_5m': '₦2.5M – ₦3.5M',
    '1_5m_2_5m': '₦1.5M – ₦2.5M',
    below_1_5m: 'Below ₦1.5M',
  };
  const budgetDisplay = (budgetRange && budgetLabels[budgetRange]) || 'Not specified';

  const summary = `🔵 Lead Summary

This is a ${destination} ${visaType} visa applicant (${nationality}) who has received ${lettersDisplay} and intends to apply ${readableTimeline}.

The applicant is aware of the required proof of funds (${pofAmount || 'unspecified amount'}) but currently has ${readableAccess} access to the funds, indicating a possible need for financial support guidance.

Budget range: ${budgetDisplay}

They were acquired through ${heardFrom} and ${refusalDisplay} prior visa refusal history.

👤 Full Details
Name: ${fullName}
Email: ${email}
Phone: ${phone}
Nationality: ${nationality}
Destination: ${destination}
Visa Type: ${visaType}
Timeline: ${readableTimeline}
Admission: ${lettersDisplay}
POF: ${pofAmount || 'N/A'}
Budget Range: ${budgetDisplay}
Access to Funds: ${accessToFunds}
Source: ${heardFrom}
Status: New`;

  try {
    const { rows } = await pool.query(
      `INSERT INTO submissions (
          full_name, email, phone, nationality,
          destination, visa_type, timeline,
          knows_pof_amount, pof_amount, letters_received,
          access_to_funds, applying_within_30_days, prior_refusal,
          heard_from, additional_info, ip_address, user_agent,
          summary, priority
        ) VALUES (
          $1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15,$16,$17,$18,$19
        ) RETURNING id`,
      [
        fullName, email, phone, nationality,
        destination, visaType, timeline,
        knowsPofAmount, pofAmount || null, lettersStr || null,
        accessToFunds, applyingWithin30Days, priorRefusal,
        heardFrom, additionalInfo || null, ipAddress, userAgent,
        summary, priority,
      ]
    );

    // ── Fire-and-forget emails (don't block the response) ──────────────────
    const submissionIdForEmail = rows[0].id;

    // 1. Confirmation email to applicant
    sendSubmissionReceivedEmail({
      fullName,
      email,
      destination,
      visaType,
      priority,
    }).catch((err) => console.error('[Email] applicant confirmation failed:', err.message));

    // 2. Alert email to admin/team
    sendAdminNewSubmissionAlert({
      fullName,
      email,
      phone,
      nationality,
      destination,
      visaType,
      timeline: readableTimeline,
      accessToFunds: readableAccess,
      pofAmount: pofAmount || '',
      lettersReceived: lettersDisplay,
      priorRefusal,
      heardFrom,
      priority,
      score,
      summary,
    }).catch((err) => console.error('[Email] admin alert failed:', err.message));

    return res.status(201).json({
      success: true,
      message: 'Eligibility assessment submitted successfully.',
      id: submissionIdForEmail,
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

  const validStatuses = ['new', 'contacted', 'converted', 'rejected', 'archived'];
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
