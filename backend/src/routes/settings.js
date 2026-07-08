const express = require('express');
const router = express.Router();
const {
  getSettings,
  updateSettings,
  getSalesHeadEmail,
  updateSalesHeadEmail,
  removeSalesHeadEmail
} = require('../controllers/settingsController');

// GET /api/settings
router.get('/', getSettings);

// POST /api/settings
router.post('/', updateSettings);

// GET /api/settings/salesHeadEmail
router.get('/salesHeadEmail', getSalesHeadEmail);

// POST /api/settings/salesHeadEmail
router.post('/salesHeadEmail', updateSalesHeadEmail);

// DELETE /api/settings/salesHeadEmail
router.delete('/salesHeadEmail', removeSalesHeadEmail);

module.exports = router;
