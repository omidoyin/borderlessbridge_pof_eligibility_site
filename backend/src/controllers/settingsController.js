const { pool } = require('../database/pool');

const getSettings = async (req, res) => {
  try {
    const { rows } = await pool.query('SELECT key, value FROM settings');
    const settingsObj = {};
    rows.forEach(row => {
      settingsObj[row.key] = row.value;
    });
    return res.json({ success: true, settings: settingsObj });
  } catch (err) {
    console.error('[DB] getSettings error:', err.message);
    return res.status(500).json({ success: false, message: 'Internal server error.' });
  }
};

const updateSettings = async (req, res) => {
  const settings = req.body;
  if (!settings || typeof settings !== 'object') {
    return res.status(422).json({ success: false, message: 'Invalid payload.' });
  }

  try {
    for (const [key, val] of Object.entries(settings)) {
      await pool.query(
        `INSERT INTO settings (key, value, updated_at)
         VALUES ($1, $2, CURRENT_TIMESTAMP)
         ON CONFLICT (key) DO UPDATE SET value = EXCLUDED.value, updated_at = CURRENT_TIMESTAMP`,
        [key, val !== null && val !== undefined ? String(val).trim() : null]
      );
    }
    return res.json({ success: true, message: 'Settings updated successfully.' });
  } catch (err) {
    console.error('[DB] updateSettings error:', err.message);
    return res.status(500).json({ success: false, message: 'Internal server error.' });
  }
};

module.exports = { getSettings, updateSettings };
