const express = require('express');
const router = express.Router();
const { getSettings, updateSettings } = require('../controllers/settingsController');

// GET /api/settings
router.get('/', getSettings);

// POST /api/settings
router.post('/', updateSettings);

module.exports = router;
