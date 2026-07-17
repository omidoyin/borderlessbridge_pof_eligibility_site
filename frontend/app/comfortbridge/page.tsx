"use client";

import { useEffect, useState, useCallback } from "react";
import { useSearchParams } from "next/navigation";
import { Suspense } from "react";
import styles from "./comfortbridge.module.css";

// ── Types ─────────────────────────────────────────────────────────────────────

interface Submission {
  id: number;
  full_name: string;
  email: string;
  phone: string;
  nationality: string;
  destination: string;
  visa_type: string;
  timeline: string;
  knows_pof_amount: string;
  pof_amount: string | null;
  letters_received: string | null;
  access_to_funds: string;
  applying_within_30_days: string;
  prior_refusal: string;
  heard_from: string;
  additional_info: string | null;
  status: string;
  notes: string | null;
  summary: string | null;
  priority: string | null;
  created_at: string;
  updated_at: string;
}

interface CalendarStatus {
  connected: boolean;
  email?: string;
  calendarId?: string;
  connectedAt?: string;
  lastSyncedAt?: string;
}

interface SchedulingSettings {
  working_days: string;        // "0,1,2,3,4,5,6" (JS day-of-week)
  working_hours_start: string; // "09:00"
  working_hours_end: string;   // "17:00"
  meeting_duration: number;
  buffer_before: number;
  buffer_after: number;
  min_notice_hours: number;
  max_booking_days: number;
  max_meetings_per_day: number;
  timezone: string;
}

interface TimeOffEntry {
  id: number;
  label: string;
  start_date: string;
  end_date: string;
  reason: string | null;
  created_at: string;
}

const API_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:4000";

const DEFAULT_SETTINGS: SchedulingSettings = {
  working_days: "1,2,3,4,5",
  working_hours_start: "09:00",
  working_hours_end: "17:00",
  meeting_duration: 60,
  buffer_before: 0,
  buffer_after: 0,
  min_notice_hours: 0,
  max_booking_days: 14,
  max_meetings_per_day: 8,
  timezone: "Africa/Lagos",
};

const TIMEZONES = [
  "Africa/Lagos",
  "Africa/Accra",
  "Africa/Nairobi",
  "Africa/Cairo",
  "Europe/London",
  "Europe/Paris",
  "Europe/Berlin",
  "America/New_York",
  "America/Chicago",
  "America/Denver",
  "America/Los_Angeles",
  "America/Toronto",
  "Asia/Dubai",
  "Asia/Kolkata",
  "Asia/Singapore",
  "Australia/Sydney",
];

// Helper: format relative time
function timeAgo(isoString?: string): string {
  if (!isoString) return "Never";
  const diff = Date.now() - new Date(isoString).getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 1) return "just now";
  if (mins < 60) return `${mins} minute${mins !== 1 ? "s" : ""} ago`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs} hour${hrs !== 1 ? "s" : ""} ago`;
  const days = Math.floor(hrs / 24);
  return `${days} day${days !== 1 ? "s" : ""} ago`;
}

// ── Main Dashboard (wrapped in Suspense for useSearchParams) ──────────────────

function DashboardContent() {
  const searchParams = useSearchParams();

  // ── State ──────────────────────────────────────────────────────────────────
  const [submissions, setSubmissions] = useState<Submission[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [searchQuery, setSearchQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [priorityFilter, setPriorityFilter] = useState("all");

  const [selectedLead, setSelectedLead] = useState<Submission | null>(null);
  const [modalStatus, setModalStatus] = useState("");
  const [modalNotes, setModalNotes] = useState("");
  const [savingNotes, setSavingNotes] = useState(false);
  const [copied, setCopied] = useState(false);

  const [activeTab, setActiveTab] = useState<"leads" | "settings" | "scheduling">("leads");
  const [salesHeadEmail, setSalesHeadEmail] = useState("");
  const [savingSettings, setSavingSettings] = useState(false);
  const [loadingSettings, setLoadingSettings] = useState(false);

  // Calendar & scheduling state
  const [calendarStatus, setCalendarStatus] = useState<CalendarStatus>({ connected: false });
  const [calendarLoading, setCalendarLoading] = useState(false);
  const [schedSettings, setSchedSettings] = useState<SchedulingSettings>(DEFAULT_SETTINGS);
  const [schedSaving, setSchedSaving] = useState(false);
  const [schedLoading, setSchedLoading] = useState(false);
  const [timeOff, setTimeOff] = useState<TimeOffEntry[]>([]);
  const [timeOffLoading, setTimeOffLoading] = useState(false);

  // Toast notification
  const [toast, setToast] = useState<{ message: string; type: "success" | "error" } | null>(null);

  // Add Time Off form
  const [showAddTimeOff, setShowAddTimeOff] = useState(false);
  const [newTimeOff, setNewTimeOff] = useState({ label: "", start_date: "", end_date: "", reason: "" });
  const [addingTimeOff, setAddingTimeOff] = useState(false);

  // ── Toast helper ───────────────────────────────────────────────────────────
  const showToast = useCallback((message: string, type: "success" | "error" = "success") => {
    setToast({ message, type });
    setTimeout(() => setToast(null), 4000);
  }, []);

  // ── Handle OAuth redirect params ───────────────────────────────────────────
  useEffect(() => {
    if (searchParams.get("calendarConnected") === "true") {
      setActiveTab("scheduling");
      const email = searchParams.get("email") || "";
      showToast(`✅ Google Calendar connected${email ? `: ${email}` : ""}!`);
      window.history.replaceState({}, "", "/comfortbridge");
    }
    if (searchParams.get("calendarError")) {
      setActiveTab("scheduling");
      showToast("❌ Google Calendar connection failed. Please try again.", "error");
      window.history.replaceState({}, "", "/comfortbridge");
    }
  }, [searchParams, showToast]);

  // ── Data Fetching ──────────────────────────────────────────────────────────
  const fetchSubmissions = async () => {
    try {
      setLoading(true);
      const res = await fetch(`${API_URL}/api/submissions?limit=200`);
      if (!res.ok) throw new Error("Failed to load submissions from API");
      const json = await res.json();
      if (json.success) setSubmissions(json.data || []);
      else throw new Error(json.message || "Unknown error loading submissions");
      setError(null);
    } catch (err: any) {
      setError(err.message || "Failed to load submissions.");
    } finally {
      setLoading(false);
    }
  };

  const fetchSettings = async () => {
    try {
      setLoadingSettings(true);
      const res = await fetch(`${API_URL}/api/settings`);
      if (!res.ok) throw new Error("Failed to load settings");
      const json = await res.json();
      if (json.success && json.settings) {
        setSalesHeadEmail(json.settings.sales_head_email || "");
      }
    } catch (_) {}
    finally { setLoadingSettings(false); }
  };

  const fetchCalendarStatus = useCallback(async () => {
    try {
      setCalendarLoading(true);
      const res = await fetch(`${API_URL}/api/scheduling/status`);
      const json = await res.json();
      setCalendarStatus(json);
    } catch (_) {}
    finally { setCalendarLoading(false); }
  }, []);

  const fetchSchedSettings = useCallback(async () => {
    try {
      setSchedLoading(true);
      const res = await fetch(`${API_URL}/api/scheduling/settings`);
      const json = await res.json();
      if (json.success && json.settings) setSchedSettings({ ...DEFAULT_SETTINGS, ...json.settings });
    } catch (_) {}
    finally { setSchedLoading(false); }
  }, []);

  const fetchTimeOff = useCallback(async () => {
    try {
      setTimeOffLoading(true);
      const res = await fetch(`${API_URL}/api/scheduling/time-off`);
      const json = await res.json();
      if (json.success) setTimeOff(json.timeOff || []);
    } catch (_) {}
    finally { setTimeOffLoading(false); }
  }, []);

  useEffect(() => {
    fetchSubmissions();
    fetchSettings();
    fetchCalendarStatus();
    fetchSchedSettings();
    fetchTimeOff();
  }, [fetchCalendarStatus, fetchSchedSettings, fetchTimeOff]);

  // ── Settings Handlers ──────────────────────────────────────────────────────
  const handleSaveSettings = async () => {
    setSavingSettings(true);
    try {
      const res = await fetch(`${API_URL}/api/settings`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ sales_head_email: salesHeadEmail }),
      });
      if (!res.ok) throw new Error("Failed to update settings");
      const json = await res.json();
      if (json.success) showToast("Settings saved successfully!");
      else throw new Error(json.message || "Unknown error");
    } catch (err: any) {
      showToast(err.message || "Failed to save settings.", "error");
    } finally {
      setSavingSettings(false);
    }
  };

  // ── Calendar Handlers ──────────────────────────────────────────────────────
  const handleDisconnectCalendar = async () => {
    if (!confirm("Disconnect the Sales Head Google Calendar? Bookings will fall back to the legacy calendar.")) return;
    try {
      const res = await fetch(`${API_URL}/api/scheduling/calendar`, { method: "DELETE" });
      const json = await res.json();
      if (json.success) {
        setCalendarStatus({ connected: false });
        showToast("Calendar disconnected.");
      }
    } catch (_) {
      showToast("Failed to disconnect calendar.", "error");
    }
  };

  // ── Scheduling Settings Handler ───────────────────────────────────────────
  const handleSaveSchedSettings = async () => {
    setSchedSaving(true);
    try {
      const res = await fetch(`${API_URL}/api/scheduling/settings`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(schedSettings),
      });
      const json = await res.json();
      if (json.success) showToast("Scheduling settings saved!");
      else throw new Error(json.message);
    } catch (err: any) {
      showToast(err.message || "Failed to save scheduling settings.", "error");
    } finally {
      setSchedSaving(false);
    }
  };

  // Toggle a working day
  const toggleWorkingDay = (day: number) => {
    const current = schedSettings.working_days.split(",").map(Number).filter((d) => !isNaN(d));
    const next = current.includes(day) ? current.filter((d) => d !== day) : [...current, day].sort();
    setSchedSettings((s) => ({ ...s, working_days: next.join(",") }));
  };

  // ── Time Off Handlers ─────────────────────────────────────────────────────
  const handleAddTimeOff = async () => {
    if (!newTimeOff.label || !newTimeOff.start_date || !newTimeOff.end_date) {
      showToast("Label, start date, and end date are required.", "error");
      return;
    }
    setAddingTimeOff(true);
    try {
      const res = await fetch(`${API_URL}/api/scheduling/time-off`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(newTimeOff),
      });
      const json = await res.json();
      if (json.success) {
        setTimeOff((prev) => [...prev, json.timeOff]);
        setNewTimeOff({ label: "", start_date: "", end_date: "", reason: "" });
        setShowAddTimeOff(false);
        showToast("Time off added!");
      } else {
        throw new Error(json.message);
      }
    } catch (err: any) {
      showToast(err.message || "Failed to add time off.", "error");
    } finally {
      setAddingTimeOff(false);
    }
  };

  const handleDeleteTimeOff = async (id: number) => {
    if (!confirm("Remove this time-off block?")) return;
    try {
      const res = await fetch(`${API_URL}/api/scheduling/time-off/${id}`, { method: "DELETE" });
      const json = await res.json();
      if (json.success) {
        setTimeOff((prev) => prev.filter((t) => t.id !== id));
        showToast("Time off removed.");
      }
    } catch (_) {
      showToast("Failed to delete time off.", "error");
    }
  };

  // ── Lead Handlers ──────────────────────────────────────────────────────────
  const updateStatus = async (id: number, status: string, notes: string | null = null) => {
    try {
      const res = await fetch(`${API_URL}/api/submissions/${id}/status`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status, notes }),
      });
      if (!res.ok) throw new Error("Failed to update status");
      const json = await res.json();
      if (json.success) {
        setSubmissions((prev) =>
          prev.map((sub) =>
            sub.id === id ? { ...sub, status, notes, updated_at: new Date().toISOString() } : sub
          )
        );
        if (selectedLead && selectedLead.id === id) {
          setSelectedLead((prev) => (prev ? { ...prev, status, notes } : null));
        }
      }
    } catch (_) { alert("Failed to update status."); }
  };

  const handleSaveModalDetails = async () => {
    if (!selectedLead) return;
    setSavingNotes(true);
    try {
      await updateStatus(selectedLead.id, modalStatus, modalNotes);
      showToast("Lead updated!");
    } finally { setSavingNotes(false); }
  };

  // ── Derived state ──────────────────────────────────────────────────────────
  const totalLeads = submissions.length;
  const highIntentLeads = submissions.filter((s) => s.priority?.toLowerCase() === "high").length;
  const contactedLeads = submissions.filter((s) => s.status === "contacted").length;
  const convertedLeads = submissions.filter((s) => s.status === "converted").length;

  const filteredLeads = submissions.filter((lead) => {
    const q = searchQuery.toLowerCase().trim();
    const matchesSearch =
      q === "" ||
      lead.full_name.toLowerCase().includes(q) ||
      lead.email.toLowerCase().includes(q) ||
      lead.phone.includes(q) ||
      lead.nationality.toLowerCase().includes(q) ||
      lead.destination.toLowerCase().includes(q);
    const matchesStatus = statusFilter === "all" || lead.status === statusFilter;
    const matchesPriority = priorityFilter === "all" || lead.priority?.toLowerCase() === priorityFilter;
    return matchesSearch && matchesStatus && matchesPriority;
  });

  const getPriorityDisplay = (p: string | null) => {
    const pr = p?.toLowerCase() || "low";
    if (pr === "high") return "🔥 High";
    if (pr === "medium") return "⚡ Med";
    return "Low";
  };
  const getPriorityEmoji = (p: string | null) => {
    const pr = p?.toLowerCase() || "low";
    if (pr === "high") return "🔥";
    if (pr === "medium") return "⚡";
    return "💬";
  };
  const formatTimeline = (t: string) => {
    if (t === "within_30_days") return "30d";
    if (t === "1_3_months") return "1-3m";
    if (t === "3_6_months") return "3-6m";
    if (t === "more_than_6_months") return "6m+";
    return t;
  };
  const getInitials = (name: string) =>
    name.trim().split(/\s+/).map((n) => n[0]).slice(0, 2).join("").toUpperCase();

  const workingDayNums = schedSettings.working_days.split(",").map(Number).filter((d) => !isNaN(d));
  const DAY_LABELS = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
  const DAY_NAMES  = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"];

  // ── Render ─────────────────────────────────────────────────────────────────
  return (
    <main className={styles.dashboard}>
      <div className="container" style={{ padding: "0 0.5rem" }}>

        {/* Toast */}
        {toast && (
          <div className={`${styles.toast} ${toast.type === "error" ? styles.toastError : styles.toastSuccess}`}>
            {toast.message}
          </div>
        )}

        {/* Header */}
        <header className={styles.header}>
          <div className={styles.titleGroup}>
            <span className="eyebrow eyebrow-green">Admin Hub</span>
            <h1 className={styles.title}>ComfortBridge Dashboard</h1>
            <p className={styles.subtitle}>
              {activeTab === "leads"
                ? "Click any lead below to view full details"
                : activeTab === "settings"
                ? "Configure global settings"
                : "Manage Sales Head scheduling"}
            </p>
          </div>
          <div className={styles.headerTabs}>
            {(["leads", "scheduling", "settings"] as const).map((tab) => (
              <button
                key={tab}
                onClick={() => setActiveTab(tab)}
                className={`${styles.tabButton} ${activeTab === tab ? styles.activeTabButton : ""}`}
              >
                {tab === "leads" ? "Leads" : tab === "scheduling" ? "Scheduling" : "Settings"}
              </button>
            ))}
          </div>
          {activeTab === "leads" && (
            <div className={styles.actions}>
              <button
                onClick={fetchSubmissions}
                className="btn-primary"
                style={{ width: "100%", padding: "0.45rem 1rem", fontSize: "0.8rem", borderRadius: "6px", boxShadow: "none" }}
              >
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" style={{ marginRight: "4px" }}>
                  <path d="M21.5 2v6h-6M21.34 15.57a10 10 0 1 1-.57-8.38l5.67-5.67" />
                </svg>
                Refresh Leads
              </button>
            </div>
          )}
        </header>

        {/* ─── LEADS TAB ──────────────────────────────────────────────────── */}
        {activeTab === "leads" && (
          <>
            <section className={styles.statsGrid}>
              <div className={styles.statCard}><span className={styles.statLabel}>Total</span><span className={styles.statNumber}>{totalLeads}</span></div>
              <div className={styles.statCard}><span className={styles.statLabel} style={{ color: "var(--red)" }}>High</span><span className={styles.statNumber} style={{ color: "var(--red)" }}>{highIntentLeads}</span></div>
              <div className={styles.statCard}><span className={styles.statLabel} style={{ color: "var(--green)" }}>Cont.</span><span className={styles.statNumber} style={{ color: "var(--green)" }}>{contactedLeads}</span></div>
              <div className={styles.statCard}><span className={styles.statLabel} style={{ color: "#a78bfa" }}>Conv.</span><span className={styles.statNumber} style={{ color: "#a78bfa" }}>{convertedLeads}</span></div>
            </section>

            <section className={styles.controlsCard}>
              <div className={styles.searchWrapper}>
                <svg className={styles.searchIcon} width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><circle cx="11" cy="11" r="8" /><line x1="21" y1="21" x2="16.65" y2="16.65" /></svg>
                <input type="text" placeholder="Search leads..." className={styles.searchInput} value={searchQuery} onChange={(e) => setSearchQuery(e.target.value)} />
              </div>
              <div className={styles.controlsRow}>
                <div className={styles.filterGroup}>
                  {["all", "high", "medium", "low"].map((p) => (
                    <button key={p} onClick={() => setPriorityFilter(p)} className={`${styles.filterBtn} ${priorityFilter === p ? styles.filterBtnActive : ""}`}>
                      {p === "all" ? "Priority" : p === "medium" ? "Med" : p.charAt(0).toUpperCase() + p.slice(1)}
                    </button>
                  ))}
                </div>
              </div>
              <div className={styles.controlsRow} style={{ borderTop: "1px solid var(--gray-200)", paddingTop: "0.4rem" }}>
                <div className={styles.filterGroup}>
                  {["all", "new", "contacted", "converted", "archived"].map((s) => (
                    <button key={s} onClick={() => setStatusFilter(s)} className={`${styles.filterBtn} ${statusFilter === s ? styles.filterBtnActive : ""}`}>
                      {s === "all" ? "Status" : s === "contacted" ? "Cont." : s === "converted" ? "Conv." : s.charAt(0).toUpperCase() + s.slice(1)}
                    </button>
                  ))}
                </div>
                <div style={{ fontSize: "0.72rem", color: "var(--gray-400)", fontWeight: "600" }}>Leads: {filteredLeads.length}</div>
              </div>
            </section>

            {error && (
              <div className="card text-center" style={{ borderColor: "var(--red)", padding: "1.25rem", marginBottom: "1rem" }}>
                <h3 style={{ color: "var(--red)", fontSize: "0.95rem", marginBottom: "0.25rem" }}>⚠️ Backend Connection Error</h3>
                <p style={{ color: "var(--gray-400)", fontSize: "0.75rem", marginBottom: "1rem" }}>{error}</p>
                <button onClick={fetchSubmissions} className="btn-primary" style={{ padding: "0.4rem 1rem", fontSize: "0.75rem" }}>Retry</button>
              </div>
            )}
            {loading && <div className={styles.loadingSpinner} />}
            {!loading && !error && (
              <section className={styles.leadsGrid}>
                {filteredLeads.length === 0 ? (
                  <div className={styles.emptyState}><h3 className={styles.emptyTitle}>No leads found</h3><p style={{ fontSize: "0.78rem" }}>Change filters or search term.</p></div>
                ) : (
                  filteredLeads.map((lead) => {
                    const priorityRowClass = lead.priority?.toLowerCase() === "high" ? styles.leadRowHigh : lead.priority?.toLowerCase() === "medium" ? styles.leadRowMedium : styles.leadRowLow;
                    const priorityBadgeClass = lead.priority?.toLowerCase() === "high" ? styles.badgeHigh : lead.priority?.toLowerCase() === "medium" ? styles.badgeMedium : styles.badgeLow;
                    const statusBadgeClass = lead.status === "new" ? styles.badgeNew : lead.status === "contacted" ? styles.badgeContacted : lead.status === "converted" ? styles.badgeConverted : lead.status === "archived" ? styles.badgeArchived : styles.badgeRejected;
                    const hasLetters = lead.letters_received && lead.letters_received !== "None Yet";
                    const quoteText = hasLetters ? `${lead.letters_received?.split(",")[0]} · POF: ${lead.pof_amount || "N/A"}` : `Needs ${lead.destination} POF Assistance`;
                    return (
                      <div key={lead.id} className={`${styles.leadRow} ${priorityRowClass}`} onClick={() => { setSelectedLead(lead); setModalStatus(lead.status); setModalNotes(lead.notes || ""); }}>
                        <div className={styles.avatar}>{getInitials(lead.full_name)}</div>
                        <div className={styles.leadInfo}>
                          <div className={styles.leadMetaRow}><span className={styles.leadName}>{lead.full_name}</span><span className={styles.leadTime}>{new Date(lead.created_at).toLocaleDateString(undefined, { month: "short", day: "numeric" })}</span></div>
                          <div className={styles.leadDetailText}><span>{lead.destination} · {lead.visa_type.charAt(0).toUpperCase() + lead.visa_type.slice(1)} ({formatTimeline(lead.timeline)})</span><span className={styles.leadQuoteText}>{quoteText}</span></div>
                        </div>
                        <div className={styles.leadRight}>
                          <div className={styles.badgeRow}><span className={`${styles.badge} ${priorityBadgeClass}`}>{getPriorityEmoji(lead.priority)}</span><span className={`${styles.badge} ${statusBadgeClass}`}>{lead.status === "contacted" ? "cont." : lead.status === "converted" ? "conv." : lead.status}</span></div>
                          <div className={styles.actionIcons} onClick={(e) => e.stopPropagation()}>
                            {lead.status === "new" && <button onClick={() => updateStatus(lead.id, "contacted")} className={styles.iconBtnSuccess} title="Mark Contacted">✓</button>}
                            {lead.status !== "archived" && <button onClick={() => updateStatus(lead.id, "archived")} className={styles.iconBtnArchive} title="Archive Lead">✕</button>}
                          </div>
                        </div>
                      </div>
                    );
                  })
                )}
              </section>
            )}
          </>
        )}

        {/* ─── SCHEDULING TAB ─────────────────────────────────────────────── */}
        {activeTab === "scheduling" && (
          <section className={styles.schedulingSection}>

            {/* ── Section 1: Google Calendar ───────────────────────────────── */}
            <div className={styles.schedCard}>
              <div className={styles.schedCardHeader}>
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <rect x="3" y="4" width="18" height="18" rx="2" ry="2" /><line x1="16" y1="2" x2="16" y2="6" /><line x1="8" y1="2" x2="8" y2="6" /><line x1="3" y1="10" x2="21" y2="10" />
                </svg>
                <h2 className={styles.schedCardTitle}>Google Calendar</h2>
              </div>

              {calendarLoading ? (
                <div className={styles.calendarLoadingRow}><div className={styles.miniSpinner} /> Loading calendar status…</div>
              ) : calendarStatus.connected ? (
                <div className={styles.calendarConnected}>
                  <div className={styles.calendarStatusBadge}>
                    <span className={styles.connectedDot} />
                    Connected
                  </div>
                  <div className={styles.calendarInfoGrid}>
                    <div className={styles.calendarInfoRow}>
                      <span className={styles.calendarInfoLabel}>Account</span>
                      <span className={styles.calendarInfoValue}>{calendarStatus.email}</span>
                    </div>
                    <div className={styles.calendarInfoRow}>
                      <span className={styles.calendarInfoLabel}>Calendar</span>
                      <span className={styles.calendarInfoValue}>{calendarStatus.calendarId || "Primary"}</span>
                    </div>
                    <div className={styles.calendarInfoRow}>
                      <span className={styles.calendarInfoLabel}>Connected</span>
                      <span className={styles.calendarInfoValue}>{calendarStatus.connectedAt ? new Date(calendarStatus.connectedAt).toLocaleDateString() : "—"}</span>
                    </div>
                    <div className={styles.calendarInfoRow}>
                      <span className={styles.calendarInfoLabel}>Last Synced</span>
                      <span className={styles.calendarInfoValue}>{timeAgo(calendarStatus.lastSyncedAt)}</span>
                    </div>
                  </div>
                  <div className={styles.calendarActions}>
                    <a href={`${API_URL}/api/google/saleshead/auth`} className={styles.reconnectBtn}>
                      🔄 Reconnect
                    </a>
                    <button onClick={handleDisconnectCalendar} className={styles.disconnectBtn}>
                      Disconnect
                    </button>
                  </div>
                </div>
              ) : (
                <div className={styles.calendarDisconnected}>
                  <div className={styles.calendarDisconnectedIcon}>
                    <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
                      <path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6" />
                      <polyline points="15 3 21 3 21 9" />
                      <line x1="10" y1="14" x2="21" y2="3" />
                    </svg>
                  </div>
                  <p className={styles.calendarDisconnectedText}>
                    No Google Calendar connected. Connect the Sales Head&apos;s Google account to enable real-time availability and automatic meeting creation.
                  </p>
                  <a href={`${API_URL}/api/google/saleshead/auth`} className={styles.connectCalendarBtn}>
                    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" style={{ marginRight: "8px" }}>
                      <rect x="3" y="4" width="18" height="18" rx="2" ry="2" /><line x1="16" y1="2" x2="16" y2="6" /><line x1="8" y1="2" x2="8" y2="6" /><line x1="3" y1="10" x2="21" y2="10" />
                    </svg>
                    Connect Google Calendar
                  </a>
                  <p className={styles.calendarFallbackNote}>
                    Without a connected calendar, the system will use the legacy env-var calendar configuration.
                  </p>
                </div>
              )}
            </div>

            {/* ── Section 2: Availability Settings ────────────────────────── */}
            <div className={styles.schedCard}>
              <div className={styles.schedCardHeader}>
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <circle cx="12" cy="12" r="10" /><polyline points="12 6 12 12 16 14" />
                </svg>
                <h2 className={styles.schedCardTitle}>Scheduling Settings</h2>
              </div>

              {schedLoading ? (
                <div className={styles.calendarLoadingRow}><div className={styles.miniSpinner} /> Loading settings…</div>
              ) : (
                <div className={styles.schedForm}>

                  {/* Working Days */}
                  <div className={styles.schedFormGroup}>
                    <label className={styles.schedLabel}>Working Days</label>
                    <div className={styles.dayCheckboxGrid}>
                      {DAY_NAMES.map((name, idx) => (
                        <label key={idx} className={`${styles.dayCheckbox} ${workingDayNums.includes(idx) ? styles.dayCheckboxActive : ""}`}>
                          <input
                            type="checkbox"
                            checked={workingDayNums.includes(idx)}
                            onChange={() => toggleWorkingDay(idx)}
                            style={{ display: "none" }}
                          />
                          <span className={styles.dayCheckboxShort}>{DAY_LABELS[idx]}</span>
                          <span className={styles.dayCheckboxFull}>{name}</span>
                        </label>
                      ))}
                    </div>
                  </div>

                  {/* Working Hours */}
                  <div className={styles.schedFormRow}>
                    <div className={styles.schedFormGroup}>
                      <label className={styles.schedLabel}>Start Time</label>
                      <input type="time" className={styles.schedInput} value={schedSettings.working_hours_start} onChange={(e) => setSchedSettings((s) => ({ ...s, working_hours_start: e.target.value }))} />
                    </div>
                    <div className={styles.schedFormGroup}>
                      <label className={styles.schedLabel}>End Time</label>
                      <input type="time" className={styles.schedInput} value={schedSettings.working_hours_end} onChange={(e) => setSchedSettings((s) => ({ ...s, working_hours_end: e.target.value }))} />
                    </div>
                  </div>

                  {/* Meeting Duration */}
                  <div className={styles.schedFormGroup}>
                    <label className={styles.schedLabel}>Meeting Duration</label>
                    <select className={styles.schedSelect} value={schedSettings.meeting_duration} onChange={(e) => setSchedSettings((s) => ({ ...s, meeting_duration: Number(e.target.value) }))}>
                      <option value={15}>15 minutes</option>
                      <option value={30}>30 minutes</option>
                      <option value={45}>45 minutes</option>
                      <option value={60}>60 minutes</option>
                      <option value={90}>90 minutes</option>
                    </select>
                  </div>

                  {/* Buffers */}
                  <div className={styles.schedFormRow}>
                    <div className={styles.schedFormGroup}>
                      <label className={styles.schedLabel}>Buffer Before Meeting</label>
                      <select className={styles.schedSelect} value={schedSettings.buffer_before} onChange={(e) => setSchedSettings((s) => ({ ...s, buffer_before: Number(e.target.value) }))}>
                        <option value={0}>None</option>
                        <option value={5}>5 min</option>
                        <option value={10}>10 min</option>
                        <option value={15}>15 min</option>
                        <option value={30}>30 min</option>
                      </select>
                    </div>
                    <div className={styles.schedFormGroup}>
                      <label className={styles.schedLabel}>Buffer After Meeting</label>
                      <select className={styles.schedSelect} value={schedSettings.buffer_after} onChange={(e) => setSchedSettings((s) => ({ ...s, buffer_after: Number(e.target.value) }))}>
                        <option value={0}>None</option>
                        <option value={5}>5 min</option>
                        <option value={10}>10 min</option>
                        <option value={15}>15 min</option>
                        <option value={30}>30 min</option>
                      </select>
                    </div>
                  </div>

                  {/* Booking Rules */}
                  <div className={styles.schedFormRow}>
                    <div className={styles.schedFormGroup}>
                      <label className={styles.schedLabel}>Minimum Notice</label>
                      <select className={styles.schedSelect} value={schedSettings.min_notice_hours} onChange={(e) => setSchedSettings((s) => ({ ...s, min_notice_hours: Number(e.target.value) }))}>
                        <option value={0}>None</option>
                        <option value={1}>1 hour</option>
                        <option value={2}>2 hours</option>
                        <option value={4}>4 hours</option>
                        <option value={12}>12 hours</option>
                        <option value={24}>24 hours</option>
                      </select>
                    </div>
                    <div className={styles.schedFormGroup}>
                      <label className={styles.schedLabel}>Maximum Booking Window</label>
                      <select className={styles.schedSelect} value={schedSettings.max_booking_days} onChange={(e) => setSchedSettings((s) => ({ ...s, max_booking_days: Number(e.target.value) }))}>
                        <option value={7}>7 days</option>
                        <option value={14}>14 days</option>
                        <option value={30}>30 days</option>
                        <option value={60}>60 days</option>
                        <option value={90}>90 days</option>
                      </select>
                    </div>
                  </div>

                  {/* Max Meetings / Timezone */}
                  <div className={styles.schedFormRow}>
                    <div className={styles.schedFormGroup}>
                      <label className={styles.schedLabel}>Max Meetings Per Day</label>
                      <input type="number" min={1} max={20} className={styles.schedInput} value={schedSettings.max_meetings_per_day} onChange={(e) => setSchedSettings((s) => ({ ...s, max_meetings_per_day: Math.max(1, parseInt(e.target.value, 10) || 1) }))} />
                    </div>
                    <div className={styles.schedFormGroup}>
                      <label className={styles.schedLabel}>Time Zone</label>
                      <select className={styles.schedSelect} value={schedSettings.timezone} onChange={(e) => setSchedSettings((s) => ({ ...s, timezone: e.target.value }))}>
                        {TIMEZONES.map((tz) => (
                          <option key={tz} value={tz}>{tz}</option>
                        ))}
                      </select>
                    </div>
                  </div>

                  <button onClick={handleSaveSchedSettings} disabled={schedSaving} className={styles.schedSaveBtn}>
                    {schedSaving ? (
                      <><span className={styles.miniSpinner} style={{ marginRight: "8px" }} /> Saving…</>
                    ) : "Save Scheduling Settings"}
                  </button>
                </div>
              )}
            </div>

            {/* ── Section 3: Time Off ──────────────────────────────────────── */}
            <div className={styles.schedCard}>
              <div className={styles.schedCardHeader}>
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2" /><circle cx="9" cy="7" r="4" /><path d="M23 21v-2a4 4 0 0 0-3-3.87" /><path d="M16 3.13a4 4 0 0 1 0 7.75" />
                </svg>
                <h2 className={styles.schedCardTitle}>Time Off</h2>
                <button onClick={() => setShowAddTimeOff((v) => !v)} className={styles.addTimeOffBtn}>
                  {showAddTimeOff ? "Cancel" : "+ Add Time Off"}
                </button>
              </div>

              {/* Add Time Off Form */}
              {showAddTimeOff && (
                <div className={styles.addTimeOffForm}>
                  <div className={styles.schedFormRow}>
                    <div className={styles.schedFormGroup}>
                      <label className={styles.schedLabel}>Label</label>
                      <input type="text" placeholder="e.g. Vacation" className={styles.schedInput} value={newTimeOff.label} onChange={(e) => setNewTimeOff((v) => ({ ...v, label: e.target.value }))} />
                    </div>
                    <div className={styles.schedFormGroup}>
                      <label className={styles.schedLabel}>Reason (optional)</label>
                      <input type="text" placeholder="e.g. Annual Leave" className={styles.schedInput} value={newTimeOff.reason} onChange={(e) => setNewTimeOff((v) => ({ ...v, reason: e.target.value }))} />
                    </div>
                  </div>
                  <div className={styles.schedFormRow}>
                    <div className={styles.schedFormGroup}>
                      <label className={styles.schedLabel}>Start Date</label>
                      <input type="date" className={styles.schedInput} value={newTimeOff.start_date} onChange={(e) => setNewTimeOff((v) => ({ ...v, start_date: e.target.value }))} />
                    </div>
                    <div className={styles.schedFormGroup}>
                      <label className={styles.schedLabel}>End Date</label>
                      <input type="date" className={styles.schedInput} value={newTimeOff.end_date} onChange={(e) => setNewTimeOff((v) => ({ ...v, end_date: e.target.value }))} />
                    </div>
                  </div>
                  <button onClick={handleAddTimeOff} disabled={addingTimeOff} className={styles.schedSaveBtn}>
                    {addingTimeOff ? "Adding…" : "Add Time Off Block"}
                  </button>
                </div>
              )}

              {/* Time Off List */}
              {timeOffLoading ? (
                <div className={styles.calendarLoadingRow}><div className={styles.miniSpinner} /> Loading…</div>
              ) : timeOff.length === 0 ? (
                <div className={styles.timeOffEmpty}>
                  <p>No time-off blocks added yet. Use the button above to block dates.</p>
                </div>
              ) : (
                <div className={styles.timeOffList}>
                  {timeOff.map((entry) => (
                    <div key={entry.id} className={styles.timeOffCard}>
                      <div className={styles.timeOffCardLeft}>
                        <span className={styles.timeOffLabel}>{entry.label}</span>
                        <span className={styles.timeOffDates}>
                          {new Date(entry.start_date + "T00:00:00").toLocaleDateString("en-GB", { day: "numeric", month: "short" })}
                          {entry.start_date !== entry.end_date && (
                            <> — {new Date(entry.end_date + "T00:00:00").toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "numeric" })}</>
                          )}
                        </span>
                        {entry.reason && <span className={styles.timeOffReason}>{entry.reason}</span>}
                      </div>
                      <button onClick={() => handleDeleteTimeOff(entry.id)} className={styles.timeOffDelete} title="Remove">✕</button>
                    </div>
                  ))}
                </div>
              )}
            </div>

          </section>
        )}

        {/* ─── SETTINGS TAB ───────────────────────────────────────────────── */}
        {activeTab === "settings" && (
          <section className={styles.settingsSection}>
            <div className={styles.settingsCard}>
              <h2 className={styles.settingsTitle}>System Settings</h2>
              <p className={styles.settingsDescription}>Configure global settings for the BorderlessBridge application.</p>
              <div className={styles.settingGroup}>
                <label className={styles.settingLabel} htmlFor="salesHeadEmail">Sales Head Email Address</label>
                <input type="email" id="salesHeadEmail" placeholder="e.g. saleshead@borderlessbridge.com" className={styles.settingInput} value={salesHeadEmail} onChange={(e) => setSalesHeadEmail(e.target.value)} />
                <span className={styles.settingHelp}>If set, this email address will be included as an attendee in all Google Calendar invites.</span>
              </div>
              <div className={styles.settingsActions}>
                <button onClick={handleSaveSettings} disabled={savingSettings} className="btn-primary" style={{ padding: "0.5rem 1.25rem", fontSize: "0.85rem", borderRadius: "6px", boxShadow: "none" }}>
                  {savingSettings ? "Saving..." : "Save Settings"}
                </button>
              </div>
            </div>
          </section>
        )}

        {/* ─── LEAD MODAL ──────────────────────────────────────────────────── */}
        {selectedLead && (
          <div className={styles.modalOverlay} onClick={() => setSelectedLead(null)}>
            <div className={styles.modalContent} onClick={(e) => e.stopPropagation()}>
              <button className={styles.modalClose} onClick={() => setSelectedLead(null)}>
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><line x1="18" y1="6" x2="6" y2="18" /><line x1="6" y1="6" x2="18" y2="18" /></svg>
              </button>
              <div className={styles.modalHeader}>
                <span className="eyebrow eyebrow-green">Lead Profile</span>
                <h2 className={styles.modalTitle}>{selectedLead.full_name}</h2>
                <div className={styles.modalSub}>
                  <span>{selectedLead.phone}</span>
                  <span>·</span>
                  <span className={`${styles.badge} ${selectedLead.priority?.toLowerCase() === "high" ? styles.badgeHigh : selectedLead.priority?.toLowerCase() === "medium" ? styles.badgeMedium : styles.badgeLow}`}>
                    {getPriorityDisplay(selectedLead.priority)}
                  </span>
                </div>
                <span style={{ fontSize: "0.75rem", color: "var(--gray-400)", wordBreak: "break-all", marginTop: "0.15rem" }}>{selectedLead.email}</span>
              </div>
              {selectedLead.summary && (
                <div className={styles.summaryContainer}>
                  <div className={styles.summaryHeader}>
                    <span className={styles.summaryTitle}>🔵 Lead Summary</span>
                    <button className={styles.copyBtn} onClick={() => { navigator.clipboard.writeText(selectedLead.summary || ""); setCopied(true); setTimeout(() => setCopied(false), 2000); }}>
                      {copied ? "Copied! ✓" : "Copy"}
                    </button>
                  </div>
                  <div className={styles.summaryBox}>{selectedLead.summary}</div>
                </div>
              )}
              <div className={styles.notesSection}>
                <label className={styles.notesLabel}>Notes & Status Update</label>
                <textarea placeholder="Type updates or notes here..." className={styles.notesArea} value={modalNotes} onChange={(e) => setModalNotes(e.target.value)} />
                <div className={styles.notesFooter}>
                  <div className={styles.statusSelector}>
                    <select className={styles.statusSelect} value={modalStatus} onChange={(e) => setModalStatus(e.target.value)}>
                      <option value="new">New</option>
                      <option value="contacted">Contacted</option>
                      <option value="converted">Converted</option>
                      <option value="rejected">Rejected</option>
                      <option value="archived">Archived</option>
                    </select>
                  </div>
                  <button onClick={handleSaveModalDetails} disabled={savingNotes} className={styles.saveNotesBtn}>
                    {savingNotes ? "Saving..." : "Save Notes"}
                  </button>
                </div>
              </div>
              <div className={styles.detailsGrid}>
                <div className={styles.detailItem}><span className={styles.detailLabel}>Nationality</span><span className={styles.detailValue}>{selectedLead.nationality}</span></div>
                <div className={styles.detailItem}><span className={styles.detailLabel}>Destination</span><span className={styles.detailValue}>{selectedLead.destination}</span></div>
                <div className={styles.detailItem}><span className={styles.detailLabel}>Visa Type</span><span className={styles.detailValue}>{selectedLead.visa_type.charAt(0).toUpperCase() + selectedLead.visa_type.slice(1)}</span></div>
                <div className={styles.detailItem}><span className={styles.detailLabel}>Timeline</span><span className={styles.detailValue}>{selectedLead.timeline === "within_30_days" ? "Within 30d" : selectedLead.timeline === "1_3_months" ? "1-3m" : selectedLead.timeline === "3_6_months" ? "3-6m" : "6m+"}</span></div>
                <div className={styles.detailItem}><span className={styles.detailLabel}>POF Required</span><span className={styles.detailValue}>{selectedLead.pof_amount || "N/A"}</span></div>
                <div className={styles.detailItem}><span className={styles.detailLabel}>Access to Funds</span><span className={styles.detailValue}>{selectedLead.access_to_funds}</span></div>
                <div className={styles.detailItem} style={{ gridColumn: "span 2" }}><span className={styles.detailLabel}>Letters Received</span><span className={styles.detailValue} style={{ whiteSpace: "normal" }}>{selectedLead.letters_received || "None"}</span></div>
                <div className={styles.detailItem}><span className={styles.detailLabel}>Acquisition</span><span className={styles.detailValue}>{selectedLead.heard_from}</span></div>
                <div className={styles.detailItem}><span className={styles.detailLabel}>Refusal History</span><span className={styles.detailValue}>{selectedLead.prior_refusal}</span></div>
              </div>
            </div>
          </div>
        )}

      </div>
    </main>
  );
}

export default function ComfortBridgeDashboard() {
  return (
    <Suspense fallback={<div style={{ padding: "4rem", textAlign: "center", color: "var(--gray-400)" }}>Loading…</div>}>
      <DashboardContent />
    </Suspense>
  );
}
