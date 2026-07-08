"use client";

import { useEffect, useState } from "react";
import styles from "./comfortbridge.module.css";

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

const API_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:4000";

export default function ComfortBridgeDashboard() {
  const [submissions, setSubmissions] = useState<Submission[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Search & Filter State
  const [searchQuery, setSearchQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [priorityFilter, setPriorityFilter] = useState("all");

  // Selected lead for detail modal
  const [selectedLead, setSelectedLead] = useState<Submission | null>(null);
  const [modalStatus, setModalStatus] = useState("");
  const [modalNotes, setModalNotes] = useState("");
  const [savingNotes, setSavingNotes] = useState(false);
  const [copied, setCopied] = useState(false);

  // Tabs & settings state
  const [activeTab, setActiveTab] = useState<"leads" | "settings">("leads");
  const [salesHeadEmail, setSalesHeadEmail] = useState("");
  const [savingSettings, setSavingSettings] = useState(false);
  const [loadingSettings, setLoadingSettings] = useState(false);

  // Fetch all submissions from backend
  const fetchSubmissions = async () => {
    try {
      setLoading(true);
      const res = await fetch(`${API_URL}/api/submissions?limit=200`);
      if (!res.ok) {
        throw new Error("Failed to load submissions from API");
      }
      const json = await res.json();
      if (json.success) {
        setSubmissions(json.data || []);
      } else {
        throw new Error(json.message || "Unknown error loading submissions");
      }
      setError(null);
    } catch (err: any) {
      console.error("[Dashboard] fetch error:", err);
      setError(err.message || "Failed to load submissions. Please ensure the backend is running.");
    } finally {
      setLoading(false);
    }
  };

  // Fetch all settings from backend
  const fetchSettings = async () => {
    try {
      setLoadingSettings(true);
      const res = await fetch(`${API_URL}/api/settings`);
      if (!res.ok) throw new Error("Failed to load settings");
      const json = await res.json();
      if (json.success && json.settings) {
        setSalesHeadEmail(json.settings.sales_head_email || "");
      }
    } catch (err) {
      console.error("[Dashboard] fetchSettings error:", err);
    } finally {
      setLoadingSettings(false);
    }
  };

  // Save settings to backend
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
      if (json.success) {
        alert("Settings saved successfully!");
      } else {
        throw new Error(json.message || "Unknown error saving settings");
      }
    } catch (err: any) {
      console.error("[Dashboard] saveSettings error:", err);
      alert(err.message || "Failed to save settings. Please try again.");
    } finally {
      setSavingSettings(false);
    }
  };

  useEffect(() => {
    fetchSubmissions();
    fetchSettings();
  }, []);

  // Update lead status
  const updateStatus = async (id: number, status: string, notes: string | null = null) => {
    try {
      const res = await fetch(`${API_URL}/api/submissions/${id}/status`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status, notes }),
      });

      if (!res.ok) {
        throw new Error("Failed to update status");
      }

      const json = await res.json();
      if (json.success) {
        // Update state locally
        setSubmissions((prev) =>
          prev.map((sub) =>
            sub.id === id
              ? { ...sub, status, notes, updated_at: new Date().toISOString() }
              : sub
          )
        );

        // Update selected modal lead if currently open
        if (selectedLead && selectedLead.id === id) {
          setSelectedLead((prev) =>
            prev ? { ...prev, status, notes } : null
          );
        }
      }
    } catch (err) {
      console.error("[Dashboard] status update error:", err);
      alert("Failed to update status. Please try again.");
    }
  };

  const handleQuickContact = (id: number) => {
    updateStatus(id, "contacted");
  };

  const handleQuickArchive = (id: number) => {
    updateStatus(id, "archived");
  };

  const handleSaveModalDetails = async () => {
    if (!selectedLead) return;
    setSavingNotes(true);
    try {
      await updateStatus(selectedLead.id, modalStatus, modalNotes);
      alert("Lead updated successfully!");
    } finally {
      setSavingNotes(false);
    }
  };

  const handleCopySummary = (text: string) => {
    navigator.clipboard.writeText(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleOpenModal = (lead: Submission) => {
    setSelectedLead(lead);
    setModalStatus(lead.status);
    setModalNotes(lead.notes || "");
  };

  // Stats calculation
  const totalLeads = submissions.length;
  const highIntentLeads = submissions.filter(
    (s) => s.priority?.toLowerCase() === "high"
  ).length;
  const contactedLeads = submissions.filter(
    (s) => s.status === "contacted"
  ).length;
  const convertedLeads = submissions.filter(
    (s) => s.status === "converted"
  ).length;

  // Filtered Leads list
  const filteredLeads = submissions.filter((lead) => {
    // 1. Text Search
    const query = searchQuery.toLowerCase().trim();
    const matchesSearch =
      query === "" ||
      lead.full_name.toLowerCase().includes(query) ||
      lead.email.toLowerCase().includes(query) ||
      lead.phone.includes(query) ||
      lead.nationality.toLowerCase().includes(query) ||
      lead.destination.toLowerCase().includes(query);

    // 2. Status Filter
    const matchesStatus =
      statusFilter === "all" || lead.status === statusFilter;

    // 3. Priority Filter
    const matchesPriority =
      priorityFilter === "all" ||
      lead.priority?.toLowerCase() === priorityFilter.toLowerCase();

    return matchesSearch && matchesStatus && matchesPriority;
  });

  const getPriorityDisplay = (priority: string | null) => {
    const p = priority?.toLowerCase() || "low";
    if (p === "high") return "🔥 High";
    if (p === "medium") return "⚡ Med";
    return "Low";
  };

  const getPriorityEmoji = (priority: string | null) => {
    const p = priority?.toLowerCase() || "low";
    if (p === "high") return "🔥";
    if (p === "medium") return "⚡";
    return "💬";
  };

  const formatTimeline = (t: string) => {
    if (t === "within_30_days") return "30d";
    if (t === "1_3_months") return "1-3m";
    if (t === "3_6_months") return "3-6m";
    if (t === "more_than_6_months") return "6m+";
    return t;
  };

  // Helper to extract initials
  const getInitials = (name: string) => {
    return name
      .trim()
      .split(/\s+/)
      .map((n) => n[0])
      .slice(0, 2)
      .join("")
      .toUpperCase();
  };

  return (
    <main className={styles.dashboard}>
      <div className="container" style={{ padding: "0 0.5rem" }}>
        
        {/* Header */}
        <header className={styles.header}>
          <div className={styles.titleGroup}>
            <span className="eyebrow eyebrow-green">Admin Hub</span>
            <h1 className={styles.title}>ComfortBridge Dashboard</h1>
            <p className={styles.subtitle}>
              {activeTab === "leads" ? "Click any lead below to view full details" : "Configure global settings"}
            </p>
          </div>
          <div className={styles.headerTabs}>
            <button
              onClick={() => setActiveTab("leads")}
              className={`${styles.tabButton} ${activeTab === "leads" ? styles.activeTabButton : ""}`}
            >
              Leads
            </button>
            <button
              onClick={() => setActiveTab("settings")}
              className={`${styles.tabButton} ${activeTab === "settings" ? styles.activeTabButton : ""}`}
            >
              Settings
            </button>
          </div>
          {activeTab === "leads" && (
            <div className={styles.actions}>
              <button
                onClick={fetchSubmissions}
                className="btn-primary"
                style={{
                  width: "100%",
                  padding: "0.45rem 1rem",
                  fontSize: "0.8rem",
                  borderRadius: "6px",
                  boxShadow: "none"
                }}
              >
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" style={{ marginRight: "4px" }}>
                  <path d="M21.5 2v6h-6M21.34 15.57a10 10 0 1 1-.57-8.38l5.67-5.67" />
                </svg>
                Refresh Leads
              </button>
            </div>
          )}
        </header>

        {activeTab === "leads" && (
          <>
            {/* Stats Grid - Small Metrics for Mobile */}
            <section className={styles.statsGrid}>
              <div className={styles.statCard}>
                <span className={styles.statLabel}>Total</span>
                <span className={styles.statNumber}>{totalLeads}</span>
              </div>
              <div className={styles.statCard}>
                <span className={styles.statLabel} style={{ color: "var(--red)" }}>High</span>
                <span className={styles.statNumber} style={{ color: "var(--red)" }}>{highIntentLeads}</span>
              </div>
              <div className={styles.statCard}>
                <span className={styles.statLabel} style={{ color: "var(--green)" }}>Cont.</span>
                <span className={styles.statNumber} style={{ color: "var(--green)" }}>{contactedLeads}</span>
              </div>
              <div className={styles.statCard}>
                <span className={styles.statLabel} style={{ color: "#a78bfa" }}>Conv.</span>
                <span className={styles.statNumber} style={{ color: "#a78bfa" }}>{convertedLeads}</span>
              </div>
            </section>

            {/* Controls - Tight Mobile Layout */}
            <section className={styles.controlsCard}>
              <div className={styles.searchWrapper}>
                <svg className={styles.searchIcon} width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                  <circle cx="11" cy="11" r="8" />
                  <line x1="21" y1="21" x2="16.65" y2="16.65" />
                </svg>
                <input
                  type="text"
                  placeholder="Search leads..."
                  className={styles.searchInput}
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                />
              </div>
              
              <div className={styles.controlsRow}>
                <div className={styles.filterGroup}>
                  {["all", "high", "medium", "low"].map((p) => (
                    <button
                      key={p}
                      onClick={() => setPriorityFilter(p)}
                      className={`${styles.filterBtn} ${priorityFilter === p ? styles.filterBtnActive : ""}`}
                    >
                      {p === "all" ? "Priority" : p === "medium" ? "Med" : p.charAt(0).toUpperCase() + p.slice(1)}
                    </button>
                  ))}
                </div>
              </div>

              <div className={styles.controlsRow} style={{ borderTop: "1px solid var(--gray-200)", paddingTop: "0.4rem" }}>
                <div className={styles.filterGroup}>
                  {["all", "new", "contacted", "converted", "archived"].map((s) => (
                    <button
                      key={s}
                      onClick={() => setStatusFilter(s)}
                      className={`${styles.filterBtn} ${statusFilter === s ? styles.filterBtnActive : ""}`}
                    >
                      {s === "all" ? "Status" : s === "contacted" ? "Cont." : s === "converted" ? "Conv." : s.charAt(0).toUpperCase() + s.slice(1)}
                    </button>
                  ))}
                </div>
                <div style={{ fontSize: "0.72rem", color: "var(--gray-400)", fontWeight: "600" }}>
                  Leads: {filteredLeads.length}
                </div>
              </div>
            </section>

            {/* Error Handling */}
            {error && (
              <div className="card text-center" style={{ borderColor: "var(--red)", padding: "1.25rem", marginBottom: "1rem" }}>
                <h3 style={{ color: "var(--red)", fontSize: "0.95rem", marginBottom: "0.25rem" }}>⚠️ Backend Connection Error</h3>
                <p style={{ color: "var(--gray-400)", fontSize: "0.75rem", marginBottom: "1rem" }}>{error}</p>
                <button onClick={fetchSubmissions} className="btn-primary" style={{ padding: "0.4rem 1rem", fontSize: "0.75rem" }}>Retry</button>
              </div>
            )}

            {/* Loading Spinner */}
            {loading && <div className={styles.loadingSpinner} />}

            {/* List Card Grid (Strict Mobile List) */}
            {!loading && !error && (
              <section className={styles.leadsGrid}>
                {filteredLeads.length === 0 ? (
                  <div className={styles.emptyState}>
                    <h3 className={styles.emptyTitle}>No leads found</h3>
                    <p style={{ fontSize: "0.78rem" }}>Change filters or search term.</p>
                  </div>
                ) : (
                  filteredLeads.map((lead) => {
                    const priorityRowClass =
                      lead.priority?.toLowerCase() === "high"
                        ? styles.leadRowHigh
                        : lead.priority?.toLowerCase() === "medium"
                        ? styles.leadRowMedium
                        : styles.leadRowLow;

                    const priorityBadgeClass =
                      lead.priority?.toLowerCase() === "high"
                        ? styles.badgeHigh
                        : lead.priority?.toLowerCase() === "medium"
                        ? styles.badgeMedium
                        : styles.badgeLow;

                    const statusBadgeClass =
                      lead.status === "new"
                        ? styles.badgeNew
                        : lead.status === "contacted"
                        ? styles.badgeContacted
                        : lead.status === "converted"
                        ? styles.badgeConverted
                        : lead.status === "archived"
                        ? styles.badgeArchived
                        : styles.badgeRejected;

                    const hasLetters = lead.letters_received && lead.letters_received !== "None Yet";
                    const quoteText = hasLetters
                      ? `${lead.letters_received?.split(",")[0]} · POF: ${lead.pof_amount || "N/A"}`
                      : `Needs ${lead.destination} POF Assistance`;

                    return (
                      <div
                        key={lead.id}
                        className={`${styles.leadRow} ${priorityRowClass}`}
                        onClick={() => handleOpenModal(lead)}
                      >
                        {/* Left: Initials Circle */}
                        <div className={styles.avatar}>
                          {getInitials(lead.full_name)}
                        </div>

                        {/* Center: Lead Information */}
                        <div className={styles.leadInfo}>
                          <div className={styles.leadMetaRow}>
                            <span className={styles.leadName}>{lead.full_name}</span>
                            <span className={styles.leadTime}>
                              {new Date(lead.created_at).toLocaleDateString(undefined, {
                                month: "short",
                                day: "numeric",
                              })}
                            </span>
                          </div>
                          <div className={styles.leadDetailText}>
                            <span>
                              {lead.destination} · {lead.visa_type.charAt(0).toUpperCase() + lead.visa_type.slice(1)} ({formatTimeline(lead.timeline)})
                            </span>
                            <span className={styles.leadQuoteText}>{quoteText}</span>
                          </div>
                        </div>

                        {/* Right: Status Pill & Fast Action Actions */}
                        <div className={styles.leadRight}>
                          <div className={styles.badgeRow}>
                            <span className={`${styles.badge} ${priorityBadgeClass}`}>
                              {getPriorityEmoji(lead.priority)}
                            </span>
                            <span className={`${styles.badge} ${statusBadgeClass}`}>
                              {lead.status === "contacted" ? "cont." : lead.status === "converted" ? "conv." : lead.status}
                            </span>
                          </div>
                          
                          <div className={styles.actionIcons} onClick={(e) => e.stopPropagation()}>
                            {lead.status === "new" && (
                              <button
                                onClick={() => handleQuickContact(lead.id)}
                                className={styles.iconBtnSuccess}
                                title="Mark Contacted"
                              >
                                ✓
                              </button>
                            )}
                            {lead.status !== "archived" && (
                              <button
                                onClick={() => handleQuickArchive(lead.id)}
                                className={styles.iconBtnArchive}
                                title="Archive Lead"
                              >
                                ✕
                              </button>
                            )}
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

        {activeTab === "settings" && (
          <section className={styles.settingsSection}>
            <div className={styles.settingsCard}>
              <h2 className={styles.settingsTitle}>System Settings</h2>
              <p className={styles.settingsDescription}>
                Configure global settings for the BorderlessBridge application.
              </p>

              <div className={styles.settingGroup}>
                <label className={styles.settingLabel} htmlFor="salesHeadEmail">
                  Sales Head Email Address
                </label>
                <input
                  type="email"
                  id="salesHeadEmail"
                  placeholder="e.g. saleshead@borderlessbridge.com"
                  className={styles.settingInput}
                  value={salesHeadEmail}
                  onChange={(e) => setSalesHeadEmail(e.target.value)}
                />
                <span className={styles.settingHelp}>
                  If set, this email address will be included as an attendee in all Google Calendar Strategy Call invites. Clear the field to remove the Sales Head invite.
                </span>
              </div>

              <div className={styles.settingsActions}>
                <button
                  onClick={handleSaveSettings}
                  disabled={savingSettings}
                  className="btn-primary"
                  style={{
                    padding: "0.5rem 1.25rem",
                    fontSize: "0.85rem",
                    borderRadius: "6px",
                    boxShadow: "none"
                  }}
                >
                  {savingSettings ? "Saving..." : "Save Settings"}
                </button>
              </div>
            </div>
          </section>
        )}

        {/* Lead Details Modal Overlay */}
        {selectedLead && (
          <div className={styles.modalOverlay} onClick={() => setSelectedLead(null)}>
            <div className={styles.modalContent} onClick={(e) => e.stopPropagation()}>
              
              {/* Close Icon */}
              <button className={styles.modalClose} onClick={() => setSelectedLead(null)}>
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                  <line x1="18" y1="6" x2="6" y2="18" />
                  <line x1="6" y1="6" x2="18" y2="18" />
                </svg>
              </button>

              {/* Modal Header */}
              <div className={styles.modalHeader}>
                <span className="eyebrow eyebrow-green">Lead Profile</span>
                <h2 className={styles.modalTitle}>{selectedLead.full_name}</h2>
                <div className={styles.modalSub}>
                  <span>{selectedLead.phone}</span>
                  <span>·</span>
                  <span className={`${styles.badge} ${
                    selectedLead.priority?.toLowerCase() === "high"
                      ? styles.badgeHigh
                      : selectedLead.priority?.toLowerCase() === "medium"
                      ? styles.badgeMedium
                      : styles.badgeLow
                  }`}>
                    {getPriorityDisplay(selectedLead.priority)}
                  </span>
                </div>
                <span style={{ fontSize: "0.75rem", color: "var(--gray-400)", wordBreak: "break-all", marginTop: "0.15rem" }}>
                  {selectedLead.email}
                </span>
              </div>

              {/* Lead Summary Report */}
              {selectedLead.summary && (
                <div className={styles.summaryContainer}>
                  <div className={styles.summaryHeader}>
                    <span className={styles.summaryTitle}>🔵 Lead Summary</span>
                    <button
                      className={styles.copyBtn}
                      onClick={() => handleCopySummary(selectedLead.summary || "")}
                    >
                      {copied ? "Copied! ✓" : "Copy"}
                    </button>
                  </div>
                  <div className={styles.summaryBox}>
                    {selectedLead.summary}
                  </div>
                </div>
              )}

              {/* Note and Status Update Panel */}
              <div className={styles.notesSection}>
                <label className={styles.notesLabel}>Notes & Status Update</label>
                <textarea
                  placeholder="Type updates or notes from WhatsApp call here..."
                  className={styles.notesArea}
                  value={modalNotes}
                  onChange={(e) => setModalNotes(e.target.value)}
                />
                
                <div className={styles.notesFooter}>
                  <div className={styles.statusSelector}>
                    <select
                      className={styles.statusSelect}
                      value={modalStatus}
                      onChange={(e) => setModalStatus(e.target.value)}
                    >
                      <option value="new">New</option>
                      <option value="contacted">Contacted</option>
                      <option value="converted">Converted</option>
                      <option value="rejected">Rejected</option>
                      <option value="archived">Archived</option>
                    </select>
                  </div>
                  <button
                    onClick={handleSaveModalDetails}
                    disabled={savingNotes}
                    className={styles.saveNotesBtn}
                  >
                    {savingNotes ? "Saving..." : "Save Notes"}
                  </button>
                </div>
              </div>

              {/* Detailed Lead Specifications Table */}
              <div className={styles.detailsGrid}>
                <div className={styles.detailItem}>
                  <span className={styles.detailLabel}>Nationality</span>
                  <span className={styles.detailValue}>{selectedLead.nationality}</span>
                </div>
                <div className={styles.detailItem}>
                  <span className={styles.detailLabel}>Destination</span>
                  <span className={styles.detailValue}>{selectedLead.destination}</span>
                </div>
                <div className={styles.detailItem}>
                  <span className={styles.detailLabel}>Visa Type</span>
                  <span className={styles.detailValue}>
                    {selectedLead.visa_type.charAt(0).toUpperCase() + selectedLead.visa_type.slice(1)}
                  </span>
                </div>
                <div className={styles.detailItem}>
                  <span className={styles.detailLabel}>Timeline</span>
                  <span className={styles.detailValue}>
                    {selectedLead.timeline === "within_30_days" ? "Within 30d" : selectedLead.timeline === "1_3_months" ? "1-3m" : selectedLead.timeline === "3_6_months" ? "3-6m" : "6m+"}
                  </span>
                </div>
                <div className={styles.detailItem}>
                  <span className={styles.detailLabel}>POF Required</span>
                  <span className={styles.detailValue}>{selectedLead.pof_amount || "N/A"}</span>
                </div>
                <div className={styles.detailItem}>
                  <span className={styles.detailLabel}>Access to Funds</span>
                  <span className={styles.detailValue}>{selectedLead.access_to_funds}</span>
                </div>
                <div className={styles.detailItem} style={{ gridColumn: "span 2" }}>
                  <span className={styles.detailLabel}>Letters Received</span>
                  <span className={styles.detailValue} style={{ whiteSpace: "normal" }}>
                    {selectedLead.letters_received || "None"}
                  </span>
                </div>
                <div className={styles.detailItem}>
                  <span className={styles.detailLabel}>Acquisition</span>
                  <span className={styles.detailValue}>{selectedLead.heard_from}</span>
                </div>
                <div className={styles.detailItem}>
                  <span className={styles.detailLabel}>Refusal History</span>
                  <span className={styles.detailValue}>{selectedLead.prior_refusal}</span>
                </div>
              </div>

            </div>
          </div>
        )}

      </div>
    </main>
  );
}
