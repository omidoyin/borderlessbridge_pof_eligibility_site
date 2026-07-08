const { pool } = require('../database/pool');

const getSettings = async (req, res) => {
  try {
    const { rows } = await pool.query('SELECT key, value FROM settings');
    const settingsObj = {};
    rows.forEach(row => {
      settingsObj[row.key] = row.value;
    });

    // Sync salesHeadEmail and sales_head_email in returned object for compatibility
    const emailVal = settingsObj['salesHeadEmail'] || settingsObj['sales_head_email'] || null;
    if (emailVal !== null) {
      settingsObj['salesHeadEmail'] = emailVal;
      settingsObj['sales_head_email'] = emailVal;
    }

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
      const trimmedVal = val !== null && val !== undefined ? String(val).trim() : null;

      if (key === 'salesHeadEmail' || key === 'sales_head_email') {
        // Sync both keys in the DB
        await pool.query(
          `INSERT INTO settings (key, value, updated_at)
           VALUES ('salesHeadEmail', $1, CURRENT_TIMESTAMP)
           ON CONFLICT (key) DO UPDATE SET value = EXCLUDED.value, updated_at = CURRENT_TIMESTAMP`,
          [trimmedVal]
        );
        await pool.query(
          `INSERT INTO settings (key, value, updated_at)
           VALUES ('sales_head_email', $1, CURRENT_TIMESTAMP)
           ON CONFLICT (key) DO UPDATE SET value = EXCLUDED.value, updated_at = CURRENT_TIMESTAMP`,
          [trimmedVal]
        );
      } else {
        await pool.query(
          `INSERT INTO settings (key, value, updated_at)
           VALUES ($1, $2, CURRENT_TIMESTAMP)
           ON CONFLICT (key) DO UPDATE SET value = EXCLUDED.value, updated_at = CURRENT_TIMESTAMP`,
          [key, trimmedVal]
        );
      }
    }
    return res.json({ success: true, message: 'Settings updated successfully.' });
  } catch (err) {
    console.error('[DB] updateSettings error:', err.message);
    return res.status(500).json({ success: false, message: 'Internal server error.' });
  }
};

const getSalesHeadEmail = async (req, res) => {
  try {
    const { rows } = await pool.query(
      "SELECT value FROM settings WHERE key IN ('salesHeadEmail', 'sales_head_email') AND value IS NOT NULL"
    );
    const email = rows.length > 0 ? rows[0].value : null;
    return res.json({ success: true, salesHeadEmail: email });
  } catch (err) {
    console.error('[DB] getSalesHeadEmail error:', err.message);
    return res.status(500).json({ success: false, message: 'Internal server error.' });
  }
};

const updateSalesHeadEmail = async (req, res) => {
  const body = req.body;
  const email = body.email !== undefined ? body.email : (body.salesHeadEmail !== undefined ? body.salesHeadEmail : body.sales_head_email);

  if (email !== null && email !== undefined && typeof email !== 'string') {
    return res.status(422).json({ success: false, message: 'Invalid email payload.' });
  }

  try {
    const trimmedEmail = email ? email.trim() : null;
    // Insert/update both keys
    await pool.query(
      `INSERT INTO settings (key, value, updated_at)
       VALUES ('salesHeadEmail', $1, CURRENT_TIMESTAMP)
       ON CONFLICT (key) DO UPDATE SET value = EXCLUDED.value, updated_at = CURRENT_TIMESTAMP`,
      [trimmedEmail]
    );
    await pool.query(
      `INSERT INTO settings (key, value, updated_at)
       VALUES ('sales_head_email', $1, CURRENT_TIMESTAMP)
       ON CONFLICT (key) DO UPDATE SET value = EXCLUDED.value, updated_at = CURRENT_TIMESTAMP`,
      [trimmedEmail]
    );
    return res.json({ success: true, message: 'Sales Head email updated successfully.', salesHeadEmail: trimmedEmail });
  } catch (err) {
    console.error('[DB] updateSalesHeadEmail error:', err.message);
    return res.status(500).json({ success: false, message: 'Internal server error.' });
  }
};

const removeSalesHeadEmail = async (req, res) => {
  try {
    await pool.query("DELETE FROM settings WHERE key IN ('salesHeadEmail', 'sales_head_email')");
    return res.json({ success: true, message: 'Sales Head email removed successfully.' });
  } catch (err) {
    console.error('[DB] removeSalesHeadEmail error:', err.message);
    return res.status(500).json({ success: false, message: 'Internal server error.' });
  }
};

module.exports = {
  getSettings,
  updateSettings,
  getSalesHeadEmail,
  updateSalesHeadEmail,
  removeSalesHeadEmail
};
