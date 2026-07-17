"use client";

import { useEffect, useState, useRef, useCallback } from "react";
import s from "../crm.module.css";

const API_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:4000";

const CRM_STAGES = [
  { value: "new_lead",              label: "New Lead" },
  { value: "contacted",             label: "Contacted" },
  { value: "qualified",             label: "Qualified" },
  { value: "quote_sent",            label: "Quote Sent" },
  { value: "strategy_call_booked",  label: "Strategy Call Booked" },
  { value: "payment_pending",       label: "Payment Pending" },
  { value: "paid",                  label: "Paid" },
  { value: "processing",            label: "Processing" },
  { value: "completed",             label: "Completed" },
  { value: "lost",                  label: "Lost" },
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

const PRIORITY_BADGE: Record<string, string> = {
  high: s.priorityHigh,
  medium: s.priorityMedium,
  low: s.priorityLow,
};

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
  status: string;
  crm_stage: string;
  assigned_to: string;
  priority: string | null;
  notes: string | null;
  created_at: string;
}

interface TaskModal {
  leadId: number;
  leadName: string;
}

interface NoteModal {
  leadId: number;
  leadName: string;
}

const ALL_COLUMNS = [
  { key: "name",        label: "Name",         default: true },
  { key: "destination", label: "Destination",  default: true },
  { key: "visa_type",   label: "Visa Type",    default: true },
  { key: "timeline",    label: "Timeline",     default: true },
  { key: "stage",       label: "Stage",        default: true },
  { key: "assigned_to", label: "Assigned To",  default: true },
  { key: "priority",    label: "Priority",     default: true },
  { key: "next_task",   label: "Next Task",    default: true },
  { key: "created_at",  label: "Created",      default: true },
  { key: "email",       label: "Email",        default: false },
  { key: "phone",       label: "Phone",        default: false },
  { key: "nationality", label: "Nationality",  default: false },
  { key: "pof_amount",  label: "POF Amount",   default: false },
  { key: "refusal",     label: "Prior Refusal",default: false },
];

function fmtTimeline(t: string) {
  if (t === "within_30_days") return "< 30d";
  if (t === "1_3_months")     return "1–3m";
  if (t === "3_6_months")     return "3–6m";
  if (t === "more_than_6_months") return "6m+";
  return t;
}

function getInitials(name: string) {
  return name.trim().split(/\s+/).map((n) => n[0]).slice(0, 2).join("").toUpperCase();
}

function formatDate(iso: string) {
  return new Date(iso).toLocaleDateString("en-GB", { day: "numeric", month: "short" });
}

export default function LeadsPage({
  onViewLead,
  showToast,
}: {
  onViewLead: (lead: Lead) => void;
  showToast: (msg: string, type?: "success" | "error") => void;
}) {
  const [leads, setLeads] = useState<Lead[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");
  const [stageFilter, setStageFilter] = useState("all");
  const [assignedFilter, setAssignedFilter] = useState("all");
  const [priorityFilter, setPriorityFilter] = useState("all");
  const [destFilter, setDestFilter] = useState("all");

  const [taskModal, setTaskModal] = useState<TaskModal | null>(null);
  const [noteModal, setNoteModal] = useState<NoteModal | null>(null);

  const [newTask, setNewTask] = useState({ title: "", due_date: "", assigned_to: "Sales Head", priority: "medium" });
  const [newNote, setNewNote] = useState("");
  const [savingTask, setSavingTask] = useState(false);
  const [savingNote, setSavingNote] = useState(false);

  // Column visibility
  const [colVis, setColVis] = useState<Record<string, boolean>>(() =>
    Object.fromEntries(ALL_COLUMNS.map((c) => [c.key, c.default]))
  );
  const [showColVis, setShowColVis] = useState(false);
  const colVisRef = useRef<HTMLDivElement>(null);

  // Lead-level tasks (for "Next Task" column)
  const [leadTasks, setLeadTasks] = useState<Record<number, any[]>>({});

  const fetchLeads = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch(`${API_URL}/api/submissions?limit=500`);
      const json = await res.json();
      if (json.success) setLeads(json.data || []);
    } catch (_) {}
    finally { setLoading(false); }
  }, []);

  useEffect(() => { fetchLeads(); }, [fetchLeads]);

  // Close col-vis on outside click
  useEffect(() => {
    function onClickOutside(e: MouseEvent) {
      if (colVisRef.current && !colVisRef.current.contains(e.target as Node)) {
        setShowColVis(false);
      }
    }
    document.addEventListener("mousedown", onClickOutside);
    return () => document.removeEventListener("mousedown", onClickOutside);
  }, []);

  // Fetch next task for each lead lazily
  useEffect(() => {
    leads.forEach(async (lead) => {
      if (leadTasks[lead.id] !== undefined) return;
      try {
        const res = await fetch(`${API_URL}/api/crm/leads/${lead.id}/tasks`);
        const json = await res.json();
        if (json.success) {
          setLeadTasks((prev) => ({ ...prev, [lead.id]: json.tasks || [] }));
        }
      } catch (_) {}
    });
  }, [leads]); // eslint-disable-line

  // ── Inline update handlers ────────────────────────────────────────────────
  const updateStage = async (lead: Lead, stage: string) => {
    setLeads((prev) => prev.map((l) => l.id === lead.id ? { ...l, crm_stage: stage } : l));
    try {
      await fetch(`${API_URL}/api/crm/leads/${lead.id}/stage`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ stage }),
      });
    } catch (_) { showToast("Failed to update stage", "error"); }
  };

  const updateAssigned = async (lead: Lead, assigned_to: string) => {
    setLeads((prev) => prev.map((l) => l.id === lead.id ? { ...l, assigned_to } : l));
    try {
      await fetch(`${API_URL}/api/crm/leads/${lead.id}/assign`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ assigned_to }),
      });
    } catch (_) { showToast("Failed to update assignment", "error"); }
  };

  const updatePriority = async (lead: Lead, priority: string) => {
    setLeads((prev) => prev.map((l) => l.id === lead.id ? { ...l, priority } : l));
    try {
      await fetch(`${API_URL}/api/crm/leads/${lead.id}/priority`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ priority }),
      });
    } catch (_) { showToast("Failed to update priority", "error"); }
  };

  const archiveLead = async (lead: Lead) => {
    if (!confirm(`Archive ${lead.full_name}?`)) return;
    setLeads((prev) => prev.map((l) => l.id === lead.id ? { ...l, crm_stage: "lost" } : l));
    await fetch(`${API_URL}/api/crm/leads/${lead.id}/stage`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ stage: "lost" }),
    });
    showToast("Lead archived");
  };

  const saveTask = async () => {
    if (!taskModal || !newTask.title.trim()) return;
    setSavingTask(true);
    try {
      const res = await fetch(`${API_URL}/api/crm/leads/${taskModal.leadId}/tasks`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(newTask),
      });
      const json = await res.json();
      if (json.success) {
        showToast("Task created!");
        // refresh tasks for this lead
        setLeadTasks((prev) => ({
          ...prev,
          [taskModal.leadId]: [...(prev[taskModal.leadId] || []), json.task],
        }));
        setTaskModal(null);
        setNewTask({ title: "", due_date: "", assigned_to: "Sales Head", priority: "medium" });
      } else throw new Error(json.message);
    } catch (err: any) { showToast(err.message || "Failed", "error"); }
    finally { setSavingTask(false); }
  };

  const saveNote = async () => {
    if (!noteModal || !newNote.trim()) return;
    setSavingNote(true);
    try {
      const res = await fetch(`${API_URL}/api/crm/leads/${noteModal.leadId}/notes`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ content: newNote }),
      });
      const json = await res.json();
      if (json.success) {
        showToast("Note saved!");
        setNoteModal(null);
        setNewNote("");
      } else throw new Error(json.message);
    } catch (err: any) { showToast(err.message || "Failed", "error"); }
    finally { setSavingNote(false); }
  };

  // ── Filter ────────────────────────────────────────────────────────────────
  const filtered = leads.filter((l) => {
    const q = searchQuery.toLowerCase();
    const matchQ = !q || l.full_name.toLowerCase().includes(q) || l.email.toLowerCase().includes(q) || l.destination.toLowerCase().includes(q) || l.nationality?.toLowerCase().includes(q);
    const matchStage = stageFilter === "all" || l.crm_stage === stageFilter;
    const matchAssigned = assignedFilter === "all" || l.assigned_to === assignedFilter;
    const matchPriority = priorityFilter === "all" || l.priority?.toLowerCase() === priorityFilter;
    const matchDest = destFilter === "all" || l.destination === destFilter;
    return matchQ && matchStage && matchAssigned && matchPriority && matchDest;
  });

  const destinations = [...new Set(leads.map((l) => l.destination))].sort();

  function getNextTask(leadId: number) {
    const tasks = leadTasks[leadId] || [];
    const pending = tasks.filter((t) => t.status === "pending").sort((a, b) =>
      (a.due_date || "9999") < (b.due_date || "9999") ? -1 : 1
    );
    return pending[0] || null;
  }

  return (
    <div>
      {/* Filter Bar */}
      <div className={s.filterBar}>
        <div className={s.searchBox}>
          <svg className={s.searchIcon} width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
            <circle cx="11" cy="11" r="8" /><line x1="21" y1="21" x2="16.65" y2="16.65" />
          </svg>
          <input className={s.searchInput} placeholder="Search leads..." value={searchQuery} onChange={(e) => setSearchQuery(e.target.value)} />
        </div>

        <div className={s.filterDivider} />

        <select className={s.filterSelect} value={stageFilter} onChange={(e) => setStageFilter(e.target.value)}>
          <option value="all">All Stages</option>
          {CRM_STAGES.map((st) => <option key={st.value} value={st.value}>{st.label}</option>)}
        </select>
        <select className={s.filterSelect} value={assignedFilter} onChange={(e) => setAssignedFilter(e.target.value)}>
          <option value="all">All Assignees</option>
          {ASSIGNEES.map((a) => <option key={a} value={a}>{a}</option>)}
        </select>
        <select className={s.filterSelect} value={priorityFilter} onChange={(e) => setPriorityFilter(e.target.value)}>
          <option value="all">All Priorities</option>
          {PRIORITIES.map((p) => <option key={p} value={p}>{p.charAt(0).toUpperCase() + p.slice(1)}</option>)}
        </select>
        <select className={s.filterSelect} value={destFilter} onChange={(e) => setDestFilter(e.target.value)}>
          <option value="all">All Destinations</option>
          {destinations.map((d) => <option key={d} value={d}>{d}</option>)}
        </select>

        <div className={s.filterDivider} />
        <span className={s.filterCount}>{filtered.length} leads</span>

        {/* Column Visibility */}
        <div style={{ position: "relative" }} ref={colVisRef}>
          <button className={s.colVisBtn} onClick={() => setShowColVis((v) => !v)}>
            <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
              <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/><circle cx="12" cy="12" r="3"/>
            </svg>
            Columns
          </button>
          {showColVis && (
            <div className={s.colVisDropdown}>
              {ALL_COLUMNS.map((col) => (
                <label key={col.key} className={s.colVisItem}>
                  <input type="checkbox" checked={!!colVis[col.key]} onChange={() =>
                    setColVis((v) => ({ ...v, [col.key]: !v[col.key] }))
                  } style={{ accentColor: "#16a34a" }} />
                  {col.label}
                </label>
              ))}
            </div>
          )}
        </div>

        <button className={s.btnSecondary} onClick={fetchLeads}>
          <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
            <path d="M21.5 2v6h-6M21.34 15.57a10 10 0 1 1-.57-8.38l5.67-5.67"/>
          </svg>
          Refresh
        </button>
      </div>

      {/* ── Desktop Table ── */}
      {loading ? (
        <div className={s.spinnerCenter}><div className={s.spinner} /></div>
      ) : filtered.length === 0 ? (
        <div className={s.emptyState}>
          <div className={s.emptyIcon}>
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/></svg>
          </div>
          <div className={s.emptyTitle}>No leads found</div>
          <div className={s.emptyDesc}>Try adjusting your filters or search query.</div>
        </div>
      ) : (
        <>
          {/* Desktop */}
          <div className={s.tableWrapper}>
            <table className={s.table}>
              <thead>
                <tr>
                  {colVis.name && <th>Name</th>}
                  {colVis.destination && <th>Destination</th>}
                  {colVis.visa_type && <th>Visa Type</th>}
                  {colVis.timeline && <th>Timeline</th>}
                  {colVis.stage && <th>Stage</th>}
                  {colVis.assigned_to && <th>Assigned To</th>}
                  {colVis.priority && <th>Priority</th>}
                  {colVis.next_task && <th>Next Task</th>}
                  {colVis.email && <th>Email</th>}
                  {colVis.phone && <th>Phone</th>}
                  {colVis.nationality && <th>Nationality</th>}
                  {colVis.pof_amount && <th>POF Amount</th>}
                  {colVis.refusal && <th>Prior Refusal</th>}
                  {colVis.created_at && <th>Created</th>}
                  <th>Actions</th>
                </tr>
              </thead>
              <tbody>
                {filtered.map((lead) => {
                  const nextTask = getNextTask(lead.id);
                  return (
                    <tr key={lead.id}>
                      {colVis.name && (
                        <td>
                          <div style={{ display: "flex", alignItems: "center", gap: "0.6rem" }}>
                            <div className={s.avatar}>{getInitials(lead.full_name)}</div>
                            <div>
                              <div className={s.leadName}>{lead.full_name}</div>
                              <div className={s.leadSub}>{lead.email}</div>
                            </div>
                          </div>
                        </td>
                      )}
                      {colVis.destination && <td style={{ color: "#334155", fontWeight: 500 }}>{lead.destination}</td>}
                      {colVis.visa_type && <td style={{ color: "#64748b" }}>{lead.visa_type.charAt(0).toUpperCase() + lead.visa_type.slice(1)}</td>}
                      {colVis.timeline && <td><span className={`${s.badge} ${s.badgeGray}`}>{fmtTimeline(lead.timeline)}</span></td>}
                      {colVis.stage && (
                        <td onClick={(e) => e.stopPropagation()}>
                          <select
                            className={s.inlineSelect}
                            value={lead.crm_stage || "new_lead"}
                            onChange={(e) => updateStage(lead, e.target.value)}
                          >
                            {CRM_STAGES.map((st) => <option key={st.value} value={st.value}>{st.label}</option>)}
                          </select>
                        </td>
                      )}
                      {colVis.assigned_to && (
                        <td onClick={(e) => e.stopPropagation()}>
                          <select
                            className={s.inlineSelect}
                            value={lead.assigned_to || "Sales Head"}
                            onChange={(e) => updateAssigned(lead, e.target.value)}
                          >
                            {ASSIGNEES.map((a) => <option key={a} value={a}>{a}</option>)}
                          </select>
                        </td>
                      )}
                      {colVis.priority && (
                        <td onClick={(e) => e.stopPropagation()}>
                          <select
                            className={s.inlineSelect}
                            value={lead.priority?.toLowerCase() || "medium"}
                            onChange={(e) => updatePriority(lead, e.target.value)}
                          >
                            {PRIORITIES.map((p) => <option key={p} value={p}>{p.charAt(0).toUpperCase() + p.slice(1)}</option>)}
                          </select>
                        </td>
                      )}
                      {colVis.next_task && (
                        <td>
                          {nextTask ? (
                            <span style={{ fontSize: "0.75rem", color: "#334155" }}>
                              {nextTask.title.length > 20 ? nextTask.title.slice(0, 20) + "…" : nextTask.title}
                              {nextTask.due_date && (
                                <span style={{ color: new Date(nextTask.due_date) < new Date() ? "#dc2626" : "#94a3b8", marginLeft: "0.3rem" }}>
                                  {formatDate(nextTask.due_date)}
                                </span>
                              )}
                            </span>
                          ) : (
                            <span style={{ color: "#cbd5e1", fontSize: "0.72rem" }}>—</span>
                          )}
                        </td>
                      )}
                      {colVis.email && <td style={{ fontSize: "0.75rem", color: "#64748b" }}>{lead.email}</td>}
                      {colVis.phone && <td style={{ fontSize: "0.75rem", color: "#64748b" }}>{lead.phone}</td>}
                      {colVis.nationality && <td style={{ fontSize: "0.75rem", color: "#64748b" }}>{lead.nationality}</td>}
                      {colVis.pof_amount && <td style={{ fontSize: "0.75rem" }}>{lead.pof_amount || "—"}</td>}
                      {colVis.refusal && <td style={{ fontSize: "0.75rem" }}>{lead.prior_refusal}</td>}
                      {colVis.created_at && <td style={{ fontSize: "0.75rem", color: "#94a3b8" }}>{formatDate(lead.created_at)}</td>}
                      <td onClick={(e) => e.stopPropagation()}>
                        <div className={s.rowActions}>
                          <button className={`${s.rowBtn} ${s.rowBtnGreen}`} onClick={() => onViewLead(lead)}>View</button>
                          <button className={s.rowBtn} onClick={() => setTaskModal({ leadId: lead.id, leadName: lead.full_name })}>+ Task</button>
                          <button className={s.rowBtn} onClick={() => setNoteModal({ leadId: lead.id, leadName: lead.full_name })}>+ Note</button>
                          <button className={`${s.rowBtn} ${s.rowBtnRed}`} onClick={() => archiveLead(lead)}>Archive</button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>

          {/* Mobile cards */}
          <div className={s.mobileCardGrid}>
            {filtered.map((lead) => (
              <div key={lead.id} className={s.mobileCard}>
                <div className={s.mobileCardTop}>
                  <div style={{ display: "flex", alignItems: "center", gap: "0.5rem" }}>
                    <div className={s.avatar}>{getInitials(lead.full_name)}</div>
                    <span className={s.mobileCardName}>{lead.full_name}</span>
                  </div>
                  <span className={`${s.badge} ${PRIORITY_BADGE[lead.priority?.toLowerCase() || "medium"]}`}>
                    {lead.priority?.charAt(0).toUpperCase() + (lead.priority?.slice(1) || "")}
                  </span>
                </div>
                <div className={s.mobileCardMeta}>{lead.destination} · {lead.visa_type} · {fmtTimeline(lead.timeline)}</div>
                <span className={`${s.badge} ${STAGE_BADGE[lead.crm_stage] || s.stageNewLead}`} style={{ marginBottom: "0.5rem" }}>
                  {CRM_STAGES.find((st) => st.value === lead.crm_stage)?.label || lead.crm_stage}
                </span>
                <div style={{ display: "flex", alignItems: "center", gap: "0.5rem", marginTop: "0.5rem" }}>
                  <span style={{ fontSize: "0.72rem", color: "#64748b" }}>Stage:</span>
                  <select className={s.inlineSelect} value={lead.crm_stage || "new_lead"} onChange={(e) => updateStage(lead, e.target.value)}>
                    {CRM_STAGES.map((st) => <option key={st.value} value={st.value}>{st.label}</option>)}
                  </select>
                </div>
                <div className={s.mobileCardActions}>
                  <button className={`${s.rowBtn} ${s.rowBtnGreen}`} onClick={() => onViewLead(lead)}>View</button>
                  <button className={s.rowBtn} onClick={() => setTaskModal({ leadId: lead.id, leadName: lead.full_name })}>+ Task</button>
                  <button className={s.rowBtn} onClick={() => setNoteModal({ leadId: lead.id, leadName: lead.full_name })}>+ Note</button>
                </div>
              </div>
            ))}
          </div>
        </>
      )}

      {/* ── Task Modal ── */}
      {taskModal && (
        <div className={s.modalOverlay} onClick={() => setTaskModal(null)}>
          <div className={s.modal} onClick={(e) => e.stopPropagation()}>
            <div className={s.modalHeader}>
              <span className={s.modalTitle}>Add Task — {taskModal.leadName}</span>
              <button className={s.modalClose} onClick={() => setTaskModal(null)}>✕</button>
            </div>
            <div className={s.modalBody}>
              <div className={s.formGroup}>
                <label className={s.formLabel}>Task Title *</label>
                <input className={s.formInput} placeholder="e.g. Send quote" value={newTask.title} onChange={(e) => setNewTask((v) => ({ ...v, title: e.target.value }))} autoFocus />
              </div>
              <div className={s.formRow}>
                <div className={s.formGroup}>
                  <label className={s.formLabel}>Due Date</label>
                  <input type="date" className={s.formInput} value={newTask.due_date} onChange={(e) => setNewTask((v) => ({ ...v, due_date: e.target.value }))} />
                </div>
                <div className={s.formGroup}>
                  <label className={s.formLabel}>Priority</label>
                  <select className={s.formSelect} value={newTask.priority} onChange={(e) => setNewTask((v) => ({ ...v, priority: e.target.value }))}>
                    {PRIORITIES.map((p) => <option key={p} value={p}>{p.charAt(0).toUpperCase() + p.slice(1)}</option>)}
                  </select>
                </div>
              </div>
              <div className={s.formGroup}>
                <label className={s.formLabel}>Assign To</label>
                <select className={s.formSelect} value={newTask.assigned_to} onChange={(e) => setNewTask((v) => ({ ...v, assigned_to: e.target.value }))}>
                  {ASSIGNEES.map((a) => <option key={a} value={a}>{a}</option>)}
                </select>
              </div>
            </div>
            <div className={s.modalFooter}>
              <button className={s.btnSecondary} onClick={() => setTaskModal(null)}>Cancel</button>
              <button className={s.btnPrimary} onClick={saveTask} disabled={savingTask}>
                {savingTask ? "Saving…" : "Save Task"}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ── Note Modal ── */}
      {noteModal && (
        <div className={s.modalOverlay} onClick={() => setNoteModal(null)}>
          <div className={s.modal} onClick={(e) => e.stopPropagation()}>
            <div className={s.modalHeader}>
              <span className={s.modalTitle}>Add Note — {noteModal.leadName}</span>
              <button className={s.modalClose} onClick={() => setNoteModal(null)}>✕</button>
            </div>
            <div className={s.modalBody}>
              <div className={s.formGroup}>
                <label className={s.formLabel}>Note</label>
                <textarea className={s.formTextarea} rows={5} placeholder="Type your internal note here..." value={newNote} onChange={(e) => setNewNote(e.target.value)} autoFocus />
              </div>
            </div>
            <div className={s.modalFooter}>
              <button className={s.btnSecondary} onClick={() => setNoteModal(null)}>Cancel</button>
              <button className={s.btnPrimary} onClick={saveNote} disabled={savingNote}>
                {savingNote ? "Saving…" : "Save Note"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
