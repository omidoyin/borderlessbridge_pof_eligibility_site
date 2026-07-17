const { Pool } = require('pg');
require('dotenv').config();

// Single shared Postgres connection pool with retry configuration
const pool = new Pool({
  host:     process.env.DB_HOST?.trim(),
  port:     parseInt(process.env.DB_PORT?.trim() || '5432', 10),
  user:     process.env.DB_USER?.trim(),
  password: process.env.DB_PASSWORD?.trim(),
  database: process.env.DB_NAME?.trim(),

  // Connection pool settings
  max: 10,
  idleTimeoutMillis: 30000,
  connectionTimeoutMillis: 5000,

  // SSL required for Supabase
  ssl: { rejectUnauthorized: false },

  // Keep-alive
  keepAlive: true,
  keepAliveInitialDelayMillis: 10000,
});

pool.on('error', (err) => {
  console.error('[DB] Unexpected pool error:', err.message);
});

async function pingDatabase() {
  const start = Date.now();
  await pool.query('SELECT 1');
  const duration = Date.now() - start;
  if (duration > 500) {
    console.warn(`[DB] Ping took ${duration}ms – possible slow Supabase connection`);
  }

  // Auto-initialize tables in PostgreSQL if they don't exist
  await pool.query(`
    CREATE TABLE IF NOT EXISTS submissions (
      id SERIAL PRIMARY KEY,
      full_name VARCHAR(100) NOT NULL,
      email VARCHAR(100) NOT NULL,
      phone VARCHAR(20) NOT NULL,
      nationality VARCHAR(100) NOT NULL,
      destination VARCHAR(50) NOT NULL,
      visa_type VARCHAR(50) NOT NULL,
      timeline VARCHAR(50) NOT NULL,
      knows_pof_amount VARCHAR(10) NOT NULL,
      pof_amount VARCHAR(200),
      letters_received TEXT,
      access_to_funds VARCHAR(50) NOT NULL,
      applying_within_30_days VARCHAR(10) NOT NULL,
      prior_refusal VARCHAR(10) NOT NULL,
      heard_from VARCHAR(50) NOT NULL,
      additional_info TEXT,
      status VARCHAR(20) NOT NULL DEFAULT 'new',
      notes TEXT,
      ip_address VARCHAR(45),
      user_agent TEXT,
      summary TEXT,
      priority VARCHAR(10) DEFAULT 'medium',
      created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
      updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
    );
  `);

  // Ensure columns exist on existing databases
  await pool.query(`
    ALTER TABLE submissions ADD COLUMN IF NOT EXISTS nationality VARCHAR(100);
    ALTER TABLE submissions ADD COLUMN IF NOT EXISTS knows_pof_amount VARCHAR(10);
    ALTER TABLE submissions ADD COLUMN IF NOT EXISTS pof_amount VARCHAR(200);
    ALTER TABLE submissions ADD COLUMN IF NOT EXISTS letters_received TEXT;
    ALTER TABLE submissions ADD COLUMN IF NOT EXISTS access_to_funds VARCHAR(50);
    ALTER TABLE submissions ADD COLUMN IF NOT EXISTS applying_within_30_days VARCHAR(10);
    ALTER TABLE submissions ADD COLUMN IF NOT EXISTS prior_refusal VARCHAR(10);
    ALTER TABLE submissions ADD COLUMN IF NOT EXISTS heard_from VARCHAR(50);
    ALTER TABLE submissions ADD COLUMN IF NOT EXISTS additional_info TEXT;
    ALTER TABLE submissions ADD COLUMN IF NOT EXISTS summary TEXT;
    ALTER TABLE submissions ADD COLUMN IF NOT EXISTS priority VARCHAR(10) DEFAULT 'medium';
    ALTER TABLE submissions ADD COLUMN IF NOT EXISTS score INT DEFAULT 0;
    ALTER TABLE submissions ADD COLUMN IF NOT EXISTS notes TEXT;
    ALTER TABLE submissions ADD COLUMN IF NOT EXISTS ip_address VARCHAR(45);
    ALTER TABLE submissions ADD COLUMN IF NOT EXISTS user_agent TEXT;
    ALTER TABLE submissions ADD COLUMN IF NOT EXISTS crm_stage VARCHAR(50) DEFAULT 'new_lead';
    ALTER TABLE submissions ADD COLUMN IF NOT EXISTS assigned_to VARCHAR(100) DEFAULT 'Sales Head';
  `);

  // Migrate existing status values to crm_stage
  await pool.query(`
    UPDATE submissions SET crm_stage = 'new_lead'  WHERE crm_stage IS NULL AND status = 'new';
    UPDATE submissions SET crm_stage = 'contacted'  WHERE crm_stage IS NULL AND status = 'contacted';
    UPDATE submissions SET crm_stage = 'paid'       WHERE crm_stage IS NULL AND status = 'converted';
    UPDATE submissions SET crm_stage = 'lost'       WHERE crm_stage IS NULL AND status = 'archived';
    UPDATE submissions SET crm_stage = 'new_lead'   WHERE crm_stage IS NULL;
  `);


  // Create bookings table
  await pool.query(`
    CREATE TABLE IF NOT EXISTS bookings (
      id               SERIAL PRIMARY KEY,
      submission_id    INT REFERENCES submissions(id) ON DELETE SET NULL,
      full_name        VARCHAR(100) NOT NULL,
      email            VARCHAR(100) NOT NULL,
      phone            VARCHAR(20)  NOT NULL,
      booked_date      DATE         NOT NULL,
      booked_time      VARCHAR(10)  NOT NULL,
      status           VARCHAR(20)  NOT NULL DEFAULT 'pending',
      notes            TEXT,
      business_role    VARCHAR(100),
      package_choice   VARCHAR(100),
      start_timeline   VARCHAR(100),
      guarantee        VARCHAR(100),
      guests           TEXT,
      google_event_id  VARCHAR(255),
      google_meet_link VARCHAR(512),
      created_at       TIMESTAMP    NOT NULL DEFAULT CURRENT_TIMESTAMP,
      UNIQUE(booked_date, booked_time)
    );
  `);

  // Ensure new columns exist on existing databases
  await pool.query(`
    ALTER TABLE bookings ADD COLUMN IF NOT EXISTS business_role VARCHAR(100);
    ALTER TABLE bookings ADD COLUMN IF NOT EXISTS package_choice VARCHAR(100);
    ALTER TABLE bookings ADD COLUMN IF NOT EXISTS start_timeline VARCHAR(100);
    ALTER TABLE bookings ADD COLUMN IF NOT EXISTS guarantee VARCHAR(100);
    ALTER TABLE bookings ADD COLUMN IF NOT EXISTS guests TEXT;
    ALTER TABLE bookings ADD COLUMN IF NOT EXISTS google_event_id VARCHAR(255);
    ALTER TABLE bookings ADD COLUMN IF NOT EXISTS google_meet_link VARCHAR(512);
  `);

  await pool.query(`
    CREATE TABLE IF NOT EXISTS borderlessbridgeheart (
      id INT PRIMARY KEY,
      last_ping TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      counter INT DEFAULT 0
    );
  `);

  // Create settings table
  await pool.query(`
    CREATE TABLE IF NOT EXISTS settings (
      key VARCHAR(100) PRIMARY KEY,
      value TEXT,
      updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    );
  `);

  // ── Sales Head Calendar (OAuth tokens) ───────────────────────────────────────
  await pool.query(`
    CREATE TABLE IF NOT EXISTS sales_head_calendar (
      id              SERIAL PRIMARY KEY,
      google_email    VARCHAR(255) NOT NULL,
      refresh_token   TEXT        NOT NULL,
      access_token    TEXT,
      token_expiry    TIMESTAMP,
      calendar_id     VARCHAR(255) NOT NULL DEFAULT 'primary',
      connected_at    TIMESTAMP   NOT NULL DEFAULT CURRENT_TIMESTAMP,
      last_synced_at  TIMESTAMP
    );
  `);

  // ── Scheduling Settings (single-row config) ───────────────────────────────────
  await pool.query(`
    CREATE TABLE IF NOT EXISTS scheduling_settings (
      id                    SERIAL PRIMARY KEY,
      working_days          TEXT    NOT NULL DEFAULT '1,2,3,4,5',
      working_hours_start   VARCHAR(5) NOT NULL DEFAULT '09:00',
      working_hours_end     VARCHAR(5) NOT NULL DEFAULT '17:00',
      meeting_duration      INT     NOT NULL DEFAULT 60,
      buffer_before         INT     NOT NULL DEFAULT 0,
      buffer_after          INT     NOT NULL DEFAULT 0,
      min_notice_hours      INT     NOT NULL DEFAULT 0,
      max_booking_days      INT     NOT NULL DEFAULT 14,
      max_meetings_per_day  INT     NOT NULL DEFAULT 8,
      timezone              VARCHAR(100) NOT NULL DEFAULT 'Africa/Lagos',
      updated_at            TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
    );
  `);

  // Seed default scheduling_settings row if not present
  await pool.query(`
    INSERT INTO scheduling_settings (
      id, working_days, working_hours_start, working_hours_end,
      meeting_duration, buffer_before, buffer_after,
      min_notice_hours, max_booking_days, max_meetings_per_day, timezone
    )
    VALUES (
      1, '1,2,3,4,5', '09:00', '17:00',
      60, 0, 0,
      0, 14, 8, 'Africa/Lagos'
    )
    ON CONFLICT (id) DO NOTHING;
  `);

  // ── Time Off ──────────────────────────────────────────────────────────────────
  await pool.query(`
    CREATE TABLE IF NOT EXISTS time_off (
      id         SERIAL PRIMARY KEY,
      label      VARCHAR(255) NOT NULL,
      start_date DATE         NOT NULL,
      end_date   DATE         NOT NULL,
      reason     TEXT,
      created_at TIMESTAMP    NOT NULL DEFAULT CURRENT_TIMESTAMP
    );
  `);

  // Ensure new columns/tables exist for Sales Head scheduling
  await pool.query(`
    ALTER TABLE sales_head_calendar ADD COLUMN IF NOT EXISTS calendar_name VARCHAR(255);
  `);

  // ── CRM Tasks ─────────────────────────────────────────────────────────────────
  await pool.query(`
    CREATE TABLE IF NOT EXISTS crm_tasks (
      id             SERIAL PRIMARY KEY,
      submission_id  INT REFERENCES submissions(id) ON DELETE CASCADE,
      title          VARCHAR(255) NOT NULL,
      due_date       DATE,
      assigned_to    VARCHAR(100) DEFAULT 'Sales Head',
      priority       VARCHAR(20)  DEFAULT 'medium',
      status         VARCHAR(20)  DEFAULT 'pending',
      created_at     TIMESTAMP   DEFAULT CURRENT_TIMESTAMP,
      completed_at   TIMESTAMP
    );
  `);

  // ── CRM Activity Log ──────────────────────────────────────────────────────────
  await pool.query(`
    CREATE TABLE IF NOT EXISTS crm_activity (
      id             SERIAL PRIMARY KEY,
      submission_id  INT REFERENCES submissions(id) ON DELETE CASCADE,
      actor          VARCHAR(100) DEFAULT 'Admin',
      type           VARCHAR(50),
      description    TEXT NOT NULL,
      created_at     TIMESTAMP   DEFAULT CURRENT_TIMESTAMP
    );
  `);

  // ── CRM Internal Notes ────────────────────────────────────────────────────────
  await pool.query(`
    CREATE TABLE IF NOT EXISTS crm_notes (
      id             SERIAL PRIMARY KEY,
      submission_id  INT REFERENCES submissions(id) ON DELETE CASCADE,
      author         VARCHAR(100) DEFAULT 'Admin',
      content        TEXT NOT NULL,
      created_at     TIMESTAMP   DEFAULT CURRENT_TIMESTAMP
    );
  `);

  // Ensure row 1 exists in borderlessbridgeheart
  await pool.query(`
    INSERT INTO borderlessbridgeheart (id, last_ping, counter)
    VALUES (1, CURRENT_TIMESTAMP, 0)
    ON CONFLICT (id) DO NOTHING;
  `);
}

module.exports = { pool, pingDatabase };
