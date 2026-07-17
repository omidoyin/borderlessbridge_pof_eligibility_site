"use client";

import { useEffect, useState, useCallback } from "react";
import s from "../crm.module.css";

const API_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:4000";

interface Task {
  id: number;
  title: string;
  due_date: string | null;
  assigned_to: string;
  priority: string;
  status: string;
  lead_name: string;
  destination: string;
  crm_stage: string;
  submission_id: number;
}

type Filter = "all" | "today" | "upcoming" | "overdue" | "completed";

function fmtDate(iso: string | null) {
  if (!iso) return "—";
  return new Date(iso).toLocaleDateString("en-GB", { day: "numeric", month: "short" });
}

function isOverdue(task: Task) {
  return task.status === "pending" && task.due_date && new Date(task.due_date) < new Date(new Date().setHours(0, 0, 0, 0));
}

function isToday(task: Task) {
  if (!task.due_date) return false;
  const d = new Date(task.due_date);
  const now = new Date();
  return d.getFullYear() === now.getFullYear() && d.getMonth() === now.getMonth() && d.getDate() === now.getDate();
}

export default function MyTasksPage({
  showToast,
  onViewLead,
}: {
  showToast: (msg: string, type?: "success" | "error") => void;
  onViewLead?: (leadId: number) => void;
}) {
  const [tasks, setTasks] = useState<Task[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<Filter>("all");

  const fetchTasks = useCallback(async () => {
    setLoading(true);
    try {
      const params = filter !== "all" ? `?status=${filter}` : "";
      const res = await fetch(`${API_URL}/api/crm/tasks${params}`);
      const json = await res.json();
      if (json.success) setTasks(json.tasks || []);
    } catch (_) {}
    finally { setLoading(false); }
  }, [filter]);

  useEffect(() => { fetchTasks(); }, [fetchTasks]);

  const toggleTask = async (task: Task) => {
    const newStatus = task.status === "completed" ? "pending" : "completed";
    setTasks((prev) => prev.map((t) => t.id === task.id ? { ...t, status: newStatus } : t));
    try {
      await fetch(`${API_URL}/api/crm/tasks/${task.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status: newStatus }),
      });
      showToast(newStatus === "completed" ? "Task completed! ✓" : "Task reopened");
    } catch (_) {
      showToast("Failed to update task", "error");
      setTasks((prev) => prev.map((t) => t.id === task.id ? { ...t, status: task.status } : t));
    }
  };

  const deleteTask = async (task: Task) => {
    if (!confirm("Delete this task?")) return;
    setTasks((prev) => prev.filter((t) => t.id !== task.id));
    await fetch(`${API_URL}/api/crm/tasks/${task.id}`, { method: "DELETE" });
    showToast("Task deleted");
  };

  const FILTERS: { key: Filter; label: string }[] = [
    { key: "all",       label: "All Tasks" },
    { key: "today",     label: "Today" },
    { key: "upcoming",  label: "Upcoming" },
    { key: "overdue",   label: "Overdue" },
    { key: "completed", label: "Completed" },
  ];

  const overdueCnt = tasks.filter(isOverdue).length;
  const todayCnt   = tasks.filter((t) => isToday(t) && t.status === "pending").length;
  const pendingCnt = tasks.filter((t) => t.status === "pending").length;

  return (
    <div>
      {/* Quick stats */}
      <div className={s.statsGrid} style={{ gridTemplateColumns: "repeat(4, 1fr)", marginBottom: "1.25rem" }}>
        <div className={s.statCard}>
          <div className={s.statLabel}>Pending</div>
          <div className={`${s.statNumber} ${s.statNumberBlue}`}>{pendingCnt}</div>
        </div>
        <div className={s.statCard}>
          <div className={s.statLabel}>Due Today</div>
          <div className={`${s.statNumber} ${s.statNumberAmber}`}>{todayCnt}</div>
        </div>
        <div className={s.statCard}>
          <div className={s.statLabel}>Overdue</div>
          <div className={`${s.statNumber} ${s.statNumberRed}`}>{overdueCnt}</div>
        </div>
        <div className={s.statCard}>
          <div className={s.statLabel}>Total</div>
          <div className={s.statNumber}>{tasks.length}</div>
        </div>
      </div>

      {/* Filter tabs */}
      <div style={{ display: "flex", gap: "0.4rem", marginBottom: "1rem", flexWrap: "wrap" }}>
        {FILTERS.map((f) => (
          <button
            key={f.key}
            onClick={() => setFilter(f.key)}
            style={{
              padding: "0.4rem 0.875rem",
              borderRadius: "99px",
              border: `1px solid ${filter === f.key ? "#16a34a" : "#e2e8f0"}`,
              background: filter === f.key ? "#dcfce7" : "#ffffff",
              color: filter === f.key ? "#166534" : "#64748b",
              fontSize: "0.78rem",
              fontWeight: 600,
              cursor: "pointer",
              transition: "all 180ms",
            }}
          >
            {f.label}
            {f.key === "overdue" && overdueCnt > 0 && (
              <span style={{ marginLeft: "0.35rem", background: "#dc2626", color: "#fff", borderRadius: "99px", fontSize: "0.6rem", padding: "0.05rem 0.35rem" }}>{overdueCnt}</span>
            )}
            {f.key === "today" && todayCnt > 0 && (
              <span style={{ marginLeft: "0.35rem", background: "#d97706", color: "#fff", borderRadius: "99px", fontSize: "0.6rem", padding: "0.05rem 0.35rem" }}>{todayCnt}</span>
            )}
          </button>
        ))}
        <div style={{ marginLeft: "auto" }}>
          <button className={s.btnSecondary} onClick={fetchTasks}>
            <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><path d="M21.5 2v6h-6M21.34 15.57a10 10 0 1 1-.57-8.38l5.67-5.67"/></svg>
            Refresh
          </button>
        </div>
      </div>

      {/* Tasks Table */}
      {loading ? (
        <div className={s.spinnerCenter}><div className={s.spinner} /></div>
      ) : tasks.length === 0 ? (
        <div className={s.emptyState}>
          <div className={s.emptyIcon}>
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><polyline points="9 11 12 14 22 4"/><path d="M21 12v7a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11"/></svg>
          </div>
          <div className={s.emptyTitle}>No tasks found</div>
          <div className={s.emptyDesc}>
            {filter === "overdue" ? "No overdue tasks. You're on top of it!" : filter === "today" ? "Nothing due today." : "No tasks here yet."}
          </div>
        </div>
      ) : (
        <>
          {/* Desktop */}
          <div className={s.tableWrapper}>
            <table className={s.table}>
              <thead>
                <tr>
                  <th style={{ width: "32px" }}></th>
                  <th>Task</th>
                  <th>Lead</th>
                  <th>Due Date</th>
                  <th>Priority</th>
                  <th>Status</th>
                  <th>Actions</th>
                </tr>
              </thead>
              <tbody>
                {tasks.map((task) => {
                  const overdue = isOverdue(task);
                  const today = isToday(task);
                  return (
                    <tr key={task.id} style={{ opacity: task.status === "completed" ? 0.6 : 1 }}>
                      <td onClick={(e) => { e.stopPropagation(); toggleTask(task); }}>
                        <input
                          type="checkbox"
                          className={s.taskCheckbox}
                          checked={task.status === "completed"}
                          onChange={() => toggleTask(task)}
                          onClick={(e) => e.stopPropagation()}
                        />
                      </td>
                      <td>
                        <div className={`${s.taskTitle} ${task.status === "completed" ? s.taskTitleCompleted : ""}`} style={{ fontSize: "0.85rem" }}>{task.title}</div>
                        <div style={{ fontSize: "0.7rem", color: "#94a3b8", marginTop: "0.1rem" }}>Assigned to {task.assigned_to}</div>
                      </td>
                      <td>
                        <div style={{ fontWeight: 600, fontSize: "0.82rem" }}>{task.lead_name}</div>
                        <div style={{ fontSize: "0.7rem", color: "#94a3b8" }}>{task.destination}</div>
                      </td>
                      <td>
                        <span style={{
                          fontSize: "0.78rem",
                          fontWeight: overdue ? 700 : 500,
                          color: overdue ? "#dc2626" : today ? "#d97706" : "#64748b",
                        }}>
                          {overdue ? "⚠ " : today ? "📌 " : ""}{fmtDate(task.due_date)}
                        </span>
                      </td>
                      <td>
                        <span className={`${s.badge} ${task.priority === "high" ? s.priorityHigh : task.priority === "low" ? s.priorityLow : s.priorityMedium}`}>
                          {task.priority.charAt(0).toUpperCase() + task.priority.slice(1)}
                        </span>
                      </td>
                      <td>
                        <span className={`${s.badge} ${task.status === "completed" ? s.badgeGreen : overdue ? s.badgeRed : s.badgeGray}`}>
                          {task.status === "completed" ? "Completed" : overdue ? "Overdue" : today ? "Due Today" : "Pending"}
                        </span>
                      </td>
                      <td onClick={(e) => e.stopPropagation()}>
                        <div className={s.rowActions}>
                          <button
                            className={`${s.rowBtn} ${task.status === "completed" ? "" : s.rowBtnGreen}`}
                            onClick={() => toggleTask(task)}
                          >
                            {task.status === "completed" ? "Reopen" : "Complete"}
                          </button>
                          <button className={`${s.rowBtn} ${s.rowBtnRed}`} onClick={() => deleteTask(task)}>Delete</button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>

          {/* Mobile */}
          <div className={s.mobileCardGrid}>
            {tasks.map((task) => {
              const overdue = isOverdue(task);
              return (
                <div key={task.id} className={s.mobileCard} style={{ opacity: task.status === "completed" ? 0.7 : 1 }}>
                  <div className={s.mobileCardTop}>
                    <div style={{ display: "flex", gap: "0.5rem", alignItems: "flex-start" }}>
                      <input type="checkbox" className={s.taskCheckbox} checked={task.status === "completed"} onChange={() => toggleTask(task)} style={{ marginTop: "2px" }} />
                      <div>
                        <div className={`${s.mobileCardName} ${task.status === "completed" ? s.taskTitleCompleted : ""}`} style={{ fontSize: "0.85rem" }}>{task.title}</div>
                        <div className={s.mobileCardMeta}>{task.lead_name} · {task.destination}</div>
                      </div>
                    </div>
                    <span className={`${s.badge} ${task.priority === "high" ? s.priorityHigh : task.priority === "low" ? s.priorityLow : s.priorityMedium}`}>
                      {task.priority}
                    </span>
                  </div>
                  <div style={{ fontSize: "0.75rem", color: overdue ? "#dc2626" : "#64748b", fontWeight: overdue ? 700 : 400 }}>
                    {overdue ? "⚠ Overdue: " : "Due: "}{fmtDate(task.due_date)}
                  </div>
                  <div className={s.mobileCardActions}>
                    <button className={`${s.rowBtn} ${s.rowBtnGreen}`} onClick={() => toggleTask(task)}>
                      {task.status === "completed" ? "Reopen" : "Complete"}
                    </button>
                    <button className={`${s.rowBtn} ${s.rowBtnRed}`} onClick={() => deleteTask(task)}>Delete</button>
                  </div>
                </div>
              );
            })}
          </div>
        </>
      )}
    </div>
  );
}
