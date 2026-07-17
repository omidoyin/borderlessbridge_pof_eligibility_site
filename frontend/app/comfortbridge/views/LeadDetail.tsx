"use client";

import { useEffect, useState, useCallback } from "react";
import s from "../crm.module.css";

const API_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:4000";

const CRM_STAGES = [
  { value: "new_lead", label: "New Lead" },
  { value: "contacted", label: "Contacted" },
  { value: "qualified", label: "Qualified" },
  { value: "quote_sent", label: "Quote Sent" },
  { value: "strategy_call_booked", label: "Strategy Call Booked" },
  { value: "payment_pending", label: "Payment Pending" },
  { value: "paid", label: "Paid" },
  { value: "processing", label: "Processing" },
  { value: "completed", label: "Completed" },
  { value: "lost", label: "Lost" },
];

const ASSIGNEES = ["Sales Head", "Admin", "Operations"];
const PRIORITIES = ["high", "medium", "low"];

const STAGE_BADGE: Record<string, string> = {
  new_lead: s.stageNewLead,
  contacted: s.stageContacted,
  qualified: s.stageQualified,
  quote_sent: s.stageQuoteSent,
  strategy_call_booked: s.stageStrategyCall,
  payment_pending: s.stagePaymentPending,
  paid: s.stagePaid,
  processing: s.stageProcessing,
  completed: s.stageCompleted,
  lost: s.stageLost,
};

const CASE_PROGRESS_STEPS = [
  { key: "eligibility",       label: "Eligibility",      stages: ["new_lead", "contacted", "qualified", "quote_sent"] },
  { key: "strategy_call",     label: "Strategy Call",    stages: ["strategy_call_booked"] },
  { key: "payment",           label: "Payment",          stages: ["payment_pending", "paid"] },
  { key: "pof_processing",    label: "POF Processing",   stages: ["processing"] },
  { key: "completed",         label: "Completed",        stages: ["completed"] },
];

interface Lead {
  id: number;
  full_name: string;
  email: string;
  phone: string;
  nationality: string;
  destination: string;
  visa_type: string;
  timeline: string;
  pof_amount: string | null;
  access_to_funds: string;
  applying_within_30_days: string;
  prior_refusal: string;
  heard_from: string;
  additional_info: string | null;
  crm_stage: string;
  assigned_to: string;
  priority: string | null;
  created_at: string;
}

interface Task {
  id: number;
  title: string;
  due_date: string | null;
  assigned_to: string;
  priority: string;
  status: string;
}

interface ActivityItem {
  id: number;
  actor: string;
  type: string;
  description: string;
  created_at: string;
}

interface NoteItem {
  id: number;
  author: string;
  content: string;
  created_at: string;
}

function timeAgo(iso: string) {
  const diff = Date.now() - new Date(iso).getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 1) return "just now";
  if (mins < 60) return `${mins}m ago`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs}h ago`;
  return `${Math.floor(hrs / 24)}d ago`;
}

function fmtDate(iso: string) {
  return new Date(iso).toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "numeric" });
}

function fmtTimeline(t: string) {
  if (t === "within_30_days") return "Within 30 days";
  if (t === "1_3_months") return "1–3 months";
  if (t === "3_6_months") return "3–6 months";
  if (t === "more_than_6_months") return "More than 6 months";
  return t;
}

export default function LeadDetail({
  lead: initialLead,
  onBack,
  showToast,
}: {
  lead: Lead;
  onBack: () => void;
  showToast: (msg: string, type?: "success" | "error") => void;
}) {
  const [lead, setLead] = useState<Lead>(initialLead);
  const [tasks, setTasks] = useState<Task[]>([]);
  const [activity, setActivity] = useState<ActivityItem[]>([]);
  const [notes, setNotes] = useState<NoteItem[]>([]);
  const [loadingTasks, setLoadingTasks] = useState(true);
  const [loadingActivity, setLoadingActivity] = useState(true);
  const [loadingNotes, setLoadingNotes] = useState(true);

  // Task form
  const [showAddTask, setShowAddTask] = useState(false);
  const [newTask, setNewTask] = useState({ title: "", due_date: "", assigned_to: "Sales Head", priority: "medium" });
  const [savingTask, setSavingTask] = useState(false);

  // Note form
  const [showAddNote, setShowAddNote] = useState(false);
  const [newNote, setNewNote] = useState("");
  const [savingNote, setSavingNote] = useState(false);

  const fetchAll = useCallback(async () => {
    const id = lead.id;
    setLoadingTasks(true);
    setLoadingActivity(true);
    setLoadingNotes(true);
    try {
      const [tasksRes, activityRes, notesRes] = await Promise.all([
        fetch(`${API_URL}/api/crm/leads/${id}/tasks`),
        fetch(`${API_URL}/api/crm/leads/${id}/activity`),
        fetch(`${API_URL}/api/crm/leads/${id}/notes`),
      ]);
      const [t, a, n] = await Promise.all([tasksRes.json(), activityRes.json(), notesRes.json()]);
      if (t.success) setTasks(t.tasks || []);
      if (a.success) setActivity(a.activity || []);
      if (n.success) setNotes(n.notes || []);
    } catch (_) {}
    finally {
      setLoadingTasks(false);
      setLoadingActivity(false);
      setLoadingNotes(false);
    }
  }, [lead.id]);

  useEffect(() => { fetchAll(); }, [fetchAll]);

  const toggleTask = async (task: Task) => {
    const newStatus = task.status === "completed" ? "pending" : "completed";
    setTasks((prev) => prev.map((t) => t.id === task.id ? { ...t, status: newStatus } : t));
    await fetch(`${API_URL}/api/crm/tasks/${task.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ status: newStatus }),
    });
    if (newStatus === "completed") {
      // refresh activity
      const res = await fetch(`${API_URL}/api/crm/leads/${lead.id}/activity`);
      const json = await res.json();
      if (json.success) setActivity(json.activity || []);
    }
  };

  const deleteTask = async (taskId: number) => {
    if (!confirm("Delete this task?")) return;
    setTasks((prev) => prev.filter((t) => t.id !== taskId));
    await fetch(`${API_URL}/api/crm/tasks/${taskId}`, { method: "DELETE" });
    showToast("Task deleted");
  };

  const saveTask = async () => {
    if (!newTask.title.trim()) return;
    setSavingTask(true);
    try {
      const res = await fetch(`${API_URL}/api/crm/leads/${lead.id}/tasks`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(newTask),
      });
      const json = await res.json();
      if (json.success) {
        setTasks((prev) => [...prev, json.task]);
        setNewTask({ title: "", due_date: "", assigned_to: "Sales Head", priority: "medium" });
        setShowAddTask(false);
        showToast("Task added!");
      }
    } catch (_) { showToast("Failed", "error"); }
    finally { setSavingTask(false); }
  };

  const saveNote = async () => {
    if (!newNote.trim()) return;
    setSavingNote(true);
    try {
      const res = await fetch(`${API_URL}/api/crm/leads/${lead.id}/notes`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ content: newNote }),
      });
      const json = await res.json();
      if (json.success) {
        setNotes((prev) => [json.note, ...prev]);
        setNewNote("");
        setShowAddNote(false);
        showToast("Note saved!");
        // refresh activity
        const aRes = await fetch(`${API_URL}/api/crm/leads/${lead.id}/activity`);
        const aJson = await aRes.json();
        if (aJson.success) setActivity(aJson.activity || []);
      }
    } catch (_) { showToast("Failed", "error"); }
    finally { setSavingNote(false); }
  };

  const updateStage = async (stage: string) => {
    setLead((prev) => ({ ...prev, crm_stage: stage }));
    await fetch(`${API_URL}/api/crm/leads/${lead.id}/stage`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ stage }),
    });
    const aRes = await fetch(`${API_URL}/api/crm/leads/${lead.id}/activity`);
    const aJson = await aRes.json();
    if (aJson.success) setActivity(aJson.activity || []);
    showToast("Stage updated!");
  };

  // ── Progress step calculation ──────────────────────────────────────────────
  const currentStage = lead.crm_stage || "new_lead";
  const getStepStatus = (step: typeof CASE_PROGRESS_STEPS[0]) => {
    const allStages = CASE_PROGRESS_STEPS.flatMap((s) => s.stages);
    const currentIdx = allStages.indexOf(currentStage);
    const stepMin = Math.min(...step.stages.map((s) => allStages.indexOf(s)));
    const stepMax = Math.max(...step.stages.map((s) => allStages.indexOf(s)));
    if (currentIdx > stepMax) return "done";
    if (currentIdx >= stepMin) return "active";
    return "pending";
  };

  const stageBadgeCls = STAGE_BADGE[currentStage] || s.stageNewLead;
  const stageLabel = CRM_STAGES.find((st) => st.value === currentStage)?.label || currentStage;

  return (
    <div className={s.leadWorkspace}>
      {/* Back button */}
      <button
        className={s.btnSecondary}
        onClick={onBack}
        style={{ alignSelf: "flex-start", marginBottom: "0.25rem" }}
      >
        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><path d="M19 12H5M12 19l-7-7 7-7"/></svg>
        Back to Leads
      </button>

      {/* ── Section 1: Header ── */}
      <div className={s.leadWorkspaceHeader}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", flexWrap: "wrap", gap: "0.75rem" }}>
          <div>
            <div className={s.leadWorkspaceName}>{lead.full_name}</div>
            <div className={s.leadWorkspaceSub}>{lead.destination} — {lead.visa_type.charAt(0).toUpperCase() + lead.visa_type.slice(1)}</div>
          </div>
          <div style={{ display: "flex", alignItems: "center", gap: "0.5rem", flexWrap: "wrap" }}>
            <span className={`${s.badge} ${stageBadgeCls}`}>{stageLabel}</span>
            <span className={`${s.badge} ${lead.priority?.toLowerCase() === "high" ? s.priorityHigh : lead.priority?.toLowerCase() === "low" ? s.priorityLow : s.priorityMedium}`}>
              {lead.priority?.charAt(0).toUpperCase() || "M"}{lead.priority?.slice(1) || "edium"}
            </span>
            <span style={{ fontSize: "0.78rem", color: "#64748b" }}>📋 {lead.assigned_to || "Sales Head"}</span>
          </div>
        </div>

        <div className={s.leadWorkspaceActions}>
          <select
            className={s.formSelect}
            value={currentStage}
            onChange={(e) => updateStage(e.target.value)}
            style={{ maxWidth: "200px" }}
          >
            {CRM_STAGES.map((st) => <option key={st.value} value={st.value}>{st.label}</option>)}
          </select>

          <a
            href={`https://wa.me/${lead.phone.replace(/\D/g, "")}`}
            target="_blank"
            rel="noopener noreferrer"
            className={s.btnSecondary}
            style={{ color: "#16a34a", borderColor: "#86efac", textDecoration: "none" }}
          >
            <svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor"><path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z"/></svg>
            WhatsApp
          </a>
          <a href={`tel:${lead.phone}`} className={s.btnSecondary} style={{ textDecoration: "none" }}>
            📞 Call
          </a>
          <a href={`mailto:${lead.email}`} className={s.btnSecondary} style={{ textDecoration: "none" }}>
            ✉️ Email
          </a>
        </div>
      </div>

      {/* ── Section 2: Customer Information ── */}
      <div className={s.sectionCard}>
        <div className={s.sectionCardHeader}>
          <div className={s.sectionCardTitle}>
            <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"/><circle cx="12" cy="7" r="4"/></svg>
            Customer Information
          </div>
        </div>
        <div className={s.sectionCardBody}>
          <div className={s.infoGrid}>
            {[
              { label: "Full Name", value: lead.full_name },
              { label: "Phone", value: lead.phone },
              { label: "Email", value: lead.email },
              { label: "Nationality", value: lead.nationality },
              { label: "Destination", value: lead.destination },
              { label: "Visa Type", value: lead.visa_type.charAt(0).toUpperCase() + lead.visa_type.slice(1) },
              { label: "Timeline", value: fmtTimeline(lead.timeline) },
              { label: "POF Amount", value: lead.pof_amount || "Not specified" },
              { label: "Access to Funds", value: lead.access_to_funds },
              { label: "Applying Within 30 Days", value: lead.applying_within_30_days },
              { label: "Prior Refusal", value: lead.prior_refusal },
              { label: "Referral Source", value: lead.heard_from },
            ].map((item) => (
              <div className={s.infoItem} key={item.label}>
                <div className={s.infoLabel}>{item.label}</div>
                <div className={s.infoValue}>{item.value}</div>
              </div>
            ))}
            {lead.additional_info && (
              <div className={s.infoItem} style={{ gridColumn: "span 3" }}>
                <div className={s.infoLabel}>Additional Notes</div>
                <div className={s.infoValue} style={{ whiteSpace: "pre-wrap", lineHeight: 1.5 }}>{lead.additional_info}</div>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* ── Section 9: Case Progress ── */}
      <div className={s.sectionCard}>
        <div className={s.sectionCardHeader}>
          <div className={s.sectionCardTitle}>
            <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><polyline points="22 12 18 12 15 21 9 3 6 12 2 12"/></svg>
            Case Progress
          </div>
        </div>
        <div className={s.sectionCardBody}>
          <div className={s.progressSteps}>
            {CASE_PROGRESS_STEPS.map((step, i) => {
              const status = getStepStatus(step);
              return (
                <div key={step.key} className={s.progressStep}>
                  {i < CASE_PROGRESS_STEPS.length - 1 && (
                    <div className={`${s.progressConnector} ${status === "done" ? s.progressConnectorDone : ""}`} />
                  )}
                  <div className={`${s.progressStepCircle} ${status === "done" ? s.progressStepCircleDone : status === "active" ? s.progressStepCircleActive : ""}`}>
                    {status === "done" ? "✓" : i + 1}
                  </div>
                  <div className={`${s.progressStepLabel} ${status === "done" ? s.progressStepLabelDone : status === "active" ? s.progressStepLabelActive : ""}`}>
                    {step.label}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </div>

      {/* ── Section 3: Tasks ── */}
      <div className={s.sectionCard}>
        <div className={s.sectionCardHeader}>
          <div className={s.sectionCardTitle}>
            <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><polyline points="9 11 12 14 22 4"/><path d="M21 12v7a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11"/></svg>
            Tasks
            <span style={{ fontSize: "0.7rem", background: "#f1f5f9", padding: "0.1rem 0.4rem", borderRadius: "99px", color: "#64748b" }}>
              {tasks.filter((t) => t.status === "pending").length} pending
            </span>
          </div>
          <button className={s.btnSecondary} onClick={() => setShowAddTask((v) => !v)} style={{ fontSize: "0.75rem" }}>
            {showAddTask ? "Cancel" : "+ Add Task"}
          </button>
        </div>
        <div className={s.sectionCardBody}>
          {showAddTask && (
            <div style={{ background: "#f8fafc", border: "1px solid #e2e8f0", borderRadius: "8px", padding: "1rem", marginBottom: "1rem" }}>
              <div className={s.formRow}>
                <div className={s.formGroup}>
                  <label className={s.formLabel}>Task Title *</label>
                  <input className={s.formInput} placeholder="e.g. Follow up on quote" value={newTask.title} onChange={(e) => setNewTask((v) => ({ ...v, title: e.target.value }))} />
                </div>
                <div className={s.formGroup}>
                  <label className={s.formLabel}>Due Date</label>
                  <input type="date" className={s.formInput} value={newTask.due_date} onChange={(e) => setNewTask((v) => ({ ...v, due_date: e.target.value }))} />
                </div>
              </div>
              <div className={s.formRow}>
                <div className={s.formGroup}>
                  <label className={s.formLabel}>Assign To</label>
                  <select className={s.formSelect} value={newTask.assigned_to} onChange={(e) => setNewTask((v) => ({ ...v, assigned_to: e.target.value }))}>
                    {ASSIGNEES.map((a) => <option key={a} value={a}>{a}</option>)}
                  </select>
                </div>
                <div className={s.formGroup}>
                  <label className={s.formLabel}>Priority</label>
                  <select className={s.formSelect} value={newTask.priority} onChange={(e) => setNewTask((v) => ({ ...v, priority: e.target.value }))}>
                    {PRIORITIES.map((p) => <option key={p} value={p}>{p.charAt(0).toUpperCase() + p.slice(1)}</option>)}
                  </select>
                </div>
              </div>
              <div style={{ display: "flex", gap: "0.5rem", marginTop: "0.75rem" }}>
                <button className={s.btnPrimary} onClick={saveTask} disabled={savingTask}>{savingTask ? "Saving…" : "Save Task"}</button>
                <button className={s.btnSecondary} onClick={() => setShowAddTask(false)}>Cancel</button>
              </div>
            </div>
          )}

          {loadingTasks ? (
            <div className={s.spinnerCenter}><div className={s.spinner} /></div>
          ) : tasks.length === 0 ? (
            <div className={s.emptyState} style={{ padding: "1.5rem" }}>
              <div className={s.emptyDesc}>No tasks yet. Add one above.</div>
            </div>
          ) : (
            tasks.map((task) => {
              const isOverdue = task.due_date && new Date(task.due_date) < new Date() && task.status === "pending";
              return (
                <div key={task.id} className={s.taskItem}>
                  <input
                    type="checkbox"
                    className={s.taskCheckbox}
                    checked={task.status === "completed"}
                    onChange={() => toggleTask(task)}
                  />
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div className={`${s.taskTitle} ${task.status === "completed" ? s.taskTitleCompleted : ""}`}>{task.title}</div>
                    <div className={s.taskMeta}>
                      <span style={{ fontSize: "0.68rem", color: "#94a3b8" }}>{task.assigned_to}</span>
                      {task.due_date && (
                        <span className={`${s.taskDue} ${isOverdue ? s.taskDueOverdue : ""}`}>
                          {isOverdue ? "⚠ " : ""}Due {fmtDate(task.due_date)}
                        </span>
                      )}
                      <span className={`${s.badge} ${task.priority === "high" ? s.priorityHigh : task.priority === "low" ? s.priorityLow : s.priorityMedium}`} style={{ fontSize: "0.6rem" }}>
                        {task.priority}
                      </span>
                    </div>
                  </div>
                  <button className={s.btnIcon} onClick={() => deleteTask(task.id)} title="Delete">
                    <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><path d="M3 6h18M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a1 1 0 0 1 1-1h4a1 1 0 0 1 1 1v2"/></svg>
                  </button>
                </div>
              );
            })
          )}
        </div>
      </div>

      {/* ── Section 7: Payment (Display) ── */}
      <div className={s.sectionCard}>
        <div className={s.sectionCardHeader}>
          <div className={s.sectionCardTitle}>
            <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><rect x="1" y="4" width="22" height="16" rx="2" ry="2"/><line x1="1" y1="10" x2="23" y2="10"/></svg>
            Payment
          </div>
        </div>
        <div className={s.sectionCardBody}>
          <div className={s.infoGrid}>
            <div className={s.infoItem}>
              <div className={s.infoLabel}>Status</div>
              <div className={s.infoValue}>
                <span className={`${s.badge} ${currentStage === "paid" || currentStage === "processing" || currentStage === "completed" ? s.badgeGreen : currentStage === "payment_pending" ? s.badgeAmber : s.badgeGray}`}>
                  {currentStage === "paid" || currentStage === "processing" || currentStage === "completed" ? "Paid" : currentStage === "payment_pending" ? "Pending" : "Not Yet"}
                </span>
              </div>
            </div>
            <div className={s.infoItem}>
              <div className={s.infoLabel}>POF Amount</div>
              <div className={s.infoValue}>{lead.pof_amount || "—"}</div>
            </div>
            <div className={s.infoItem}>
              <div className={s.infoLabel}>Payment Method</div>
              <div className={s.infoValue} style={{ color: "#94a3b8" }}>—</div>
            </div>
          </div>
        </div>
      </div>

      {/* ── Section 4: Activity Timeline ── */}
      <div className={s.sectionCard}>
        <div className={s.sectionCardHeader}>
          <div className={s.sectionCardTitle}>
            <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/></svg>
            Activity Timeline
          </div>
        </div>
        <div className={s.sectionCardBody}>
          {loadingActivity ? (
            <div className={s.spinnerCenter}><div className={s.spinner} /></div>
          ) : activity.length === 0 ? (
            <div style={{ color: "#94a3b8", fontSize: "0.82rem", padding: "0.5rem 0" }}>
              No activity logged yet. Actions on this lead will appear here.
            </div>
          ) : (
            <div className={s.timeline}>
              {activity.map((item, i) => (
                <div key={item.id} className={s.timelineItem}>
                  <div className={s.timelineLine}>
                    <div className={s.timelineDot} />
                    {i < activity.length - 1 && <div className={s.timelineConnector} />}
                  </div>
                  <div className={s.timelineContent}>
                    <div className={s.timelineDesc}>{item.description}</div>
                    <div className={s.timelineMeta}>{item.actor} · {timeAgo(item.created_at)}</div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* ── Section 5: Internal Notes ── */}
      <div className={s.sectionCard}>
        <div className={s.sectionCardHeader}>
          <div className={s.sectionCardTitle}>
            <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14 2 14 8 20 8"/></svg>
            Internal Notes
          </div>
          <button className={s.btnSecondary} onClick={() => setShowAddNote((v) => !v)} style={{ fontSize: "0.75rem" }}>
            {showAddNote ? "Cancel" : "+ Add Note"}
          </button>
        </div>
        <div className={s.sectionCardBody}>
          {showAddNote && (
            <div style={{ marginBottom: "1rem" }}>
              <textarea
                className={s.formTextarea}
                placeholder="Type your internal note..."
                value={newNote}
                onChange={(e) => setNewNote(e.target.value)}
                rows={4}
              />
              <div style={{ display: "flex", gap: "0.5rem", marginTop: "0.5rem" }}>
                <button className={s.btnPrimary} onClick={saveNote} disabled={savingNote}>{savingNote ? "Saving…" : "Save Note"}</button>
                <button className={s.btnSecondary} onClick={() => setShowAddNote(false)}>Cancel</button>
              </div>
            </div>
          )}
          {loadingNotes ? (
            <div className={s.spinnerCenter}><div className={s.spinner} /></div>
          ) : notes.length === 0 && !showAddNote ? (
            <div style={{ color: "#94a3b8", fontSize: "0.82rem" }}>No notes yet.</div>
          ) : (
            notes.map((note) => (
              <div key={note.id} className={s.noteItem}>
                <div className={s.noteHeader}>
                  <span className={s.noteAuthor}>{note.author}</span>
                  <span className={s.noteDate}>{fmtDate(note.created_at)}</span>
                </div>
                <div className={s.noteContent}>{note.content}</div>
              </div>
            ))
          )}
        </div>
      </div>

      {/* ── Section 6: Strategy Call (Display) ── */}
      <div className={s.sectionCard}>
        <div className={s.sectionCardHeader}>
          <div className={s.sectionCardTitle}>
            <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><rect x="3" y="4" width="18" height="18" rx="2" ry="2"/><line x1="16" y1="2" x2="16" y2="6"/><line x1="8" y1="2" x2="8" y2="6"/><line x1="3" y1="10" x2="21" y2="10"/></svg>
            Strategy Call
          </div>
        </div>
        <div className={s.sectionCardBody}>
          <div className={s.infoGrid}>
            <div className={s.infoItem}>
              <div className={s.infoLabel}>Status</div>
              <div className={s.infoValue}>
                <span className={`${s.badge} ${currentStage === "strategy_call_booked" || currentStage === "payment_pending" || currentStage === "paid" || currentStage === "processing" || currentStage === "completed" ? s.badgeGreen : s.badgeGray}`}>
                  {currentStage === "strategy_call_booked" ? "Booked" : (currentStage === "payment_pending" || currentStage === "paid" || currentStage === "processing" || currentStage === "completed") ? "Completed" : "Not Booked"}
                </span>
              </div>
            </div>
            <div className={s.infoItem}>
              <div className={s.infoLabel}>Sales Head</div>
              <div className={s.infoValue}>{lead.assigned_to || "Sales Head"}</div>
            </div>
            <div className={s.infoItem}>
              <div className={s.infoLabel}>Meeting Link</div>
              <div className={s.infoValue} style={{ color: "#94a3b8" }}>—</div>
            </div>
          </div>
        </div>
      </div>

      {/* ── Section 8: Documents ── */}
      <div className={s.sectionCard}>
        <div className={s.sectionCardHeader}>
          <div className={s.sectionCardTitle}>
            <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M21.44 11.05l-9.19 9.19a6 6 0 0 1-8.49-8.49l9.19-9.19a4 4 0 0 1 5.66 5.66l-9.2 9.19a2 2 0 0 1-2.83-2.83l8.49-8.48"/></svg>
            Documents
          </div>
        </div>
        <div className={s.sectionCardBody}>
          <div style={{ color: "#94a3b8", fontSize: "0.82rem", display: "flex", flexDirection: "column", gap: "0.5rem" }}>
            {["Passport", "Admission Letter", "Bank Statement"].map((doc) => (
              <div key={doc} style={{ display: "flex", alignItems: "center", gap: "0.5rem", padding: "0.5rem 0.75rem", border: "1px dashed #e2e8f0", borderRadius: "6px" }}>
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14 2 14 8 20 8"/></svg>
                <span style={{ fontSize: "0.8rem", color: "#64748b" }}>{doc}</span>
                <span style={{ marginLeft: "auto", fontSize: "0.7rem", color: "#cbd5e1" }}>Not uploaded</span>
              </div>
            ))}
            <p style={{ fontSize: "0.72rem", color: "#cbd5e1", marginTop: "0.25rem" }}>Document upload integration coming soon.</p>
          </div>
        </div>
      </div>
    </div>
  );
}
