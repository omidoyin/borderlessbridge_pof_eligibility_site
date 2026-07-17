const express = require('express');
const router = express.Router();
const { pool } = require('../database/pool');

const CRM_STAGES = [
  'new_lead', 'contacted', 'qualified', 'quote_sent',
  'strategy_call_booked', 'payment_pending', 'paid',
  'processing', 'completed', 'lost',
];

// ── Helper: log activity ───────────────────────────────────────────────────────
async function logActivity(submissionId, type, description, actor = 'Admin') {
  await pool.query(
    `INSERT INTO crm_activity (submission_id, type, description, actor) VALUES ($1, $2, $3, $4)`,
    [submissionId, type, description, actor]
  );
}

// ── GET /api/crm/stats — Dashboard quick stats ─────────────────────────────────
router.get('/stats', async (_req, res) => {
  try {
    const [stages, tasks, overdue, calls] = await Promise.all([
      pool.query(`
        SELECT crm_stage, COUNT(*) as count FROM submissions GROUP BY crm_stage
      `),
      pool.query(`
        SELECT COUNT(*) as count FROM crm_tasks
        WHERE status = 'pending' AND due_date = CURRENT_DATE
      `),
      pool.query(`
        SELECT COUNT(*) as count FROM crm_tasks
        WHERE status = 'pending' AND due_date < CURRENT_DATE
      `),
      pool.query(`
        SELECT COUNT(*) as count FROM submissions
        WHERE crm_stage = 'strategy_call_booked'
      `),
    ]);

    const stageMap = {};
    stages.rows.forEach((r) => { stageMap[r.crm_stage] = parseInt(r.count, 10); });

    res.json({
      success: true,
      stats: {
        new_lead: stageMap['new_lead'] || 0,
        contacted: stageMap['contacted'] || 0,
        qualified: stageMap['qualified'] || 0,
        quote_sent: stageMap['quote_sent'] || 0,
        strategy_call_booked: stageMap['strategy_call_booked'] || 0,
        payment_pending: stageMap['payment_pending'] || 0,
        paid: stageMap['paid'] || 0,
        processing: stageMap['processing'] || 0,
        completed: stageMap['completed'] || 0,
        lost: stageMap['lost'] || 0,
        tasks_today: parseInt(tasks.rows[0].count, 10),
        tasks_overdue: parseInt(overdue.rows[0].count, 10),
        strategy_calls_today: parseInt(calls.rows[0].count, 10),
      },
    });
  } catch (err) {
    console.error('[CRM] stats error:', err);
    res.status(500).json({ success: false, message: 'Failed to load stats' });
  }
});

// ── PATCH /api/crm/leads/:id/stage — Update CRM stage ─────────────────────────
router.patch('/leads/:id/stage', async (req, res) => {
  const { id } = req.params;
  const { stage, actor = 'Admin' } = req.body;
  if (!CRM_STAGES.includes(stage)) {
    return res.status(400).json({ success: false, message: 'Invalid stage' });
  }
  try {
    const { rows } = await pool.query(
      `UPDATE submissions SET crm_stage = $1, updated_at = CURRENT_TIMESTAMP WHERE id = $2 RETURNING *`,
      [stage, id]
    );
    if (!rows.length) return res.status(404).json({ success: false, message: 'Lead not found' });

    const label = stage.replace(/_/g, ' ').replace(/\b\w/g, (c) => c.toUpperCase());
    await logActivity(id, 'stage_change', `Stage changed to ${label}`, actor);

    res.json({ success: true, lead: rows[0] });
  } catch (err) {
    console.error('[CRM] stage update error:', err);
    res.status(500).json({ success: false, message: 'Failed to update stage' });
  }
});

// ── PATCH /api/crm/leads/:id/assign — Update assigned_to ──────────────────────
router.patch('/leads/:id/assign', async (req, res) => {
  const { id } = req.params;
  const { assigned_to, actor = 'Admin' } = req.body;
  try {
    const { rows } = await pool.query(
      `UPDATE submissions SET assigned_to = $1, updated_at = CURRENT_TIMESTAMP WHERE id = $2 RETURNING *`,
      [assigned_to, id]
    );
    if (!rows.length) return res.status(404).json({ success: false, message: 'Lead not found' });
    await logActivity(id, 'assigned', `Assigned to ${assigned_to}`, actor);
    res.json({ success: true, lead: rows[0] });
  } catch (err) {
    res.status(500).json({ success: false, message: 'Failed to update assignment' });
  }
});

// ── PATCH /api/crm/leads/:id/priority — Update priority ───────────────────────
router.patch('/leads/:id/priority', async (req, res) => {
  const { id } = req.params;
  const { priority } = req.body;
  try {
    const { rows } = await pool.query(
      `UPDATE submissions SET priority = $1, updated_at = CURRENT_TIMESTAMP WHERE id = $2 RETURNING *`,
      [priority, id]
    );
    if (!rows.length) return res.status(404).json({ success: false, message: 'Lead not found' });
    res.json({ success: true, lead: rows[0] });
  } catch (err) {
    res.status(500).json({ success: false, message: 'Failed to update priority' });
  }
});

// ── GET /api/crm/leads/:id/tasks ───────────────────────────────────────────────
router.get('/leads/:id/tasks', async (req, res) => {
  try {
    const { rows } = await pool.query(
      `SELECT * FROM crm_tasks WHERE submission_id = $1 ORDER BY due_date ASC, created_at DESC`,
      [req.params.id]
    );
    res.json({ success: true, tasks: rows });
  } catch (err) {
    res.status(500).json({ success: false, message: 'Failed to load tasks' });
  }
});

// ── POST /api/crm/leads/:id/tasks ─────────────────────────────────────────────
router.post('/leads/:id/tasks', async (req, res) => {
  const { id } = req.params;
  const { title, due_date, assigned_to = 'Sales Head', priority = 'medium', actor = 'Admin' } = req.body;
  if (!title) return res.status(400).json({ success: false, message: 'Title is required' });
  try {
    const { rows } = await pool.query(
      `INSERT INTO crm_tasks (submission_id, title, due_date, assigned_to, priority)
       VALUES ($1, $2, $3, $4, $5) RETURNING *`,
      [id, title, due_date || null, assigned_to, priority]
    );
    await logActivity(id, 'task_added', `Task added: "${title}"`, actor);
    res.json({ success: true, task: rows[0] });
  } catch (err) {
    res.status(500).json({ success: false, message: 'Failed to create task' });
  }
});

// ── PATCH /api/crm/tasks/:taskId — Edit or complete a task ────────────────────
router.patch('/tasks/:taskId', async (req, res) => {
  const { taskId } = req.params;
  const { status, title, due_date, assigned_to, priority, actor = 'Admin' } = req.body;
  try {
    const current = await pool.query(`SELECT * FROM crm_tasks WHERE id = $1`, [taskId]);
    if (!current.rows.length) return res.status(404).json({ success: false, message: 'Task not found' });

    const task = current.rows[0];
    const newStatus  = status ?? task.status;
    const newTitle   = title ?? task.title;
    const newDue     = due_date !== undefined ? due_date : task.due_date;
    const newAssign  = assigned_to ?? task.assigned_to;
    const newPrio    = priority ?? task.priority;
    const completedAt = newStatus === 'completed' && task.status !== 'completed'
      ? 'CURRENT_TIMESTAMP' : task.completed_at ? `'${task.completed_at}'` : 'NULL';

    const { rows } = await pool.query(
      `UPDATE crm_tasks SET
         status = $1, title = $2, due_date = $3, assigned_to = $4, priority = $5,
         completed_at = ${completedAt}
       WHERE id = $6 RETURNING *`,
      [newStatus, newTitle, newDue || null, newAssign, newPrio, taskId]
    );

    if (newStatus === 'completed' && task.status !== 'completed') {
      await logActivity(task.submission_id, 'task_completed', `Task completed: "${task.title}"`, actor);
    }

    res.json({ success: true, task: rows[0] });
  } catch (err) {
    console.error('[CRM] task patch error:', err);
    res.status(500).json({ success: false, message: 'Failed to update task' });
  }
});

// ── DELETE /api/crm/tasks/:taskId ─────────────────────────────────────────────
router.delete('/tasks/:taskId', async (req, res) => {
  try {
    await pool.query(`DELETE FROM crm_tasks WHERE id = $1`, [req.params.taskId]);
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ success: false, message: 'Failed to delete task' });
  }
});

// ── GET /api/crm/tasks — All tasks (My Tasks page) ────────────────────────────
router.get('/tasks', async (req, res) => {
  const { assigned_to, status } = req.query;
  try {
    let q = `
      SELECT t.*, s.full_name as lead_name, s.destination, s.crm_stage
      FROM crm_tasks t
      JOIN submissions s ON t.submission_id = s.id
      WHERE 1=1
    `;
    const params = [];
    if (assigned_to) { params.push(assigned_to); q += ` AND t.assigned_to = $${params.length}`; }
    if (status === 'today') { q += ` AND t.status = 'pending' AND t.due_date = CURRENT_DATE`; }
    else if (status === 'overdue') { q += ` AND t.status = 'pending' AND t.due_date < CURRENT_DATE`; }
    else if (status === 'upcoming') { q += ` AND t.status = 'pending' AND t.due_date > CURRENT_DATE`; }
    else if (status === 'completed') { q += ` AND t.status = 'completed'`; }
    else if (status === 'pending') { q += ` AND t.status = 'pending'`; }
    q += ` ORDER BY t.due_date ASC NULLS LAST, t.created_at DESC`;

    const { rows } = await pool.query(q, params);
    res.json({ success: true, tasks: rows });
  } catch (err) {
    res.status(500).json({ success: false, message: 'Failed to load tasks' });
  }
});

// ── GET /api/crm/leads/:id/activity ───────────────────────────────────────────
router.get('/leads/:id/activity', async (req, res) => {
  try {
    const { rows } = await pool.query(
      `SELECT * FROM crm_activity WHERE submission_id = $1 ORDER BY created_at DESC`,
      [req.params.id]
    );
    res.json({ success: true, activity: rows });
  } catch (err) {
    res.status(500).json({ success: false, message: 'Failed to load activity' });
  }
});

// ── GET /api/crm/leads/:id/notes ──────────────────────────────────────────────
router.get('/leads/:id/notes', async (req, res) => {
  try {
    const { rows } = await pool.query(
      `SELECT * FROM crm_notes WHERE submission_id = $1 ORDER BY created_at DESC`,
      [req.params.id]
    );
    res.json({ success: true, notes: rows });
  } catch (err) {
    res.status(500).json({ success: false, message: 'Failed to load notes' });
  }
});

// ── POST /api/crm/leads/:id/notes ─────────────────────────────────────────────
router.post('/leads/:id/notes', async (req, res) => {
  const { id } = req.params;
  const { content, author = 'Admin' } = req.body;
  if (!content?.trim()) return res.status(400).json({ success: false, message: 'Content required' });
  try {
    const { rows } = await pool.query(
      `INSERT INTO crm_notes (submission_id, content, author) VALUES ($1, $2, $3) RETURNING *`,
      [id, content.trim(), author]
    );
    await logActivity(id, 'note_added', `Note added by ${author}`, author);
    res.json({ success: true, note: rows[0] });
  } catch (err) {
    res.status(500).json({ success: false, message: 'Failed to save note' });
  }
});

// ── GET /api/crm/reports — Analytics data ─────────────────────────────────────
router.get('/reports', async (_req, res) => {
  try {
    const [byStage, byDest, byVisa, dailyLeads, weeklyLeads] = await Promise.all([
      pool.query(`SELECT crm_stage, COUNT(*) as count FROM submissions GROUP BY crm_stage ORDER BY count DESC`),
      pool.query(`SELECT destination, COUNT(*) as count FROM submissions GROUP BY destination ORDER BY count DESC LIMIT 8`),
      pool.query(`SELECT visa_type, COUNT(*) as count FROM submissions GROUP BY visa_type ORDER BY count DESC`),
      pool.query(`
        SELECT DATE(created_at) as date, COUNT(*) as count
        FROM submissions
        WHERE created_at >= CURRENT_DATE - INTERVAL '30 days'
        GROUP BY DATE(created_at)
        ORDER BY date ASC
      `),
      pool.query(`
        SELECT DATE(created_at) as date, COUNT(*) as count
        FROM submissions
        WHERE created_at >= CURRENT_DATE - INTERVAL '7 days'
        GROUP BY DATE(created_at)
        ORDER BY date ASC
      `),
    ]);

    const stageMap = {};
    byStage.rows.forEach((r) => { stageMap[r.crm_stage] = parseInt(r.count, 10); });
    const total = Object.values(stageMap).reduce((a, b) => a + b, 0);
    const won   = (stageMap['paid'] || 0) + (stageMap['processing'] || 0) + (stageMap['completed'] || 0);
    const lost  = stageMap['lost'] || 0;

    res.json({
      success: true,
      summary: {
        total,
        new_leads: stageMap['new_lead'] || 0,
        qualified: stageMap['qualified'] || 0,
        lost,
        won,
        conversion_rate: total > 0 ? Math.round((won / total) * 100) : 0,
      },
      by_stage: byStage.rows,
      by_destination: byDest.rows,
      by_visa: byVisa.rows,
      daily_leads: dailyLeads.rows,
      weekly_leads: weeklyLeads.rows,
    });
  } catch (err) {
    console.error('[CRM] reports error:', err);
    res.status(500).json({ success: false, message: 'Failed to load reports' });
  }
});

module.exports = router;
