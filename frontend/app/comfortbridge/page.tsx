"use client";

import { useEffect, useState, useCallback } from "react";
import { useSearchParams } from "next/navigation";
import { Suspense } from "react";
import s from "./crm.module.css";

// Views & Layout Imports
import AdminLayout from "./AdminLayout";
import CRMDashboard from "./views/CRMDashboard";
import LeadsPage from "./views/LeadsPage";
import LeadDetail from "./views/LeadDetail";
import MyTasksPage from "./views/MyTasksPage";
import ReportsPage from "./views/ReportsPage";
import SchedulingView from "./views/SchedulingView";
import SettingsView from "./views/SettingsView";

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
  crm_stage: string;
  assigned_to: string;
  priority: string | null;
  notes: string | null;
  created_at: string;
  updated_at: string;
}

interface CalendarStatus {
  connected: boolean;
  email?: string;
  calendarId?: string;
  calendarName?: string;
  connectedAt?: string;
  lastSyncedAt?: string;
}

interface GoogleCalendarItem {
  id: string;
  summary: string;
  description: string;
  primary: boolean;
  timezone: string;
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

// Helper: format relative time
function timeAgo(isoString?: string): string {
  if (!isoString) return "Never";
  const diff = Date.now() - new Date(isoString).getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 1) return "just now";
  if (mins < 60) return `${mins}m ago`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs}h ago`;
  const days = Math.floor(hrs / 24);
  return `${days}d ago`;
}

function DashboardContent() {
  const searchParams = useSearchParams();

  // ── State ──────────────────────────────────────────────────────────────────
  const [activeView, setActiveView] = useState<string>("crm-dashboard");
  const [selectedLead, setSelectedLead] = useState<any | null>(null);

  // Shared config/settings states
  const [salesHeadEmail, setSalesHeadEmail] = useState("");
  const [savingSettings, setSavingSettings] = useState(false);

  // Calendar & scheduling state
  const [calendarStatus, setCalendarStatus] = useState<CalendarStatus>({ connected: false });
  const [calendarLoading, setCalendarLoading] = useState(false);
  const [schedSettings, setSchedSettings] = useState<SchedulingSettings>(DEFAULT_SETTINGS);
  const [schedSaving, setSchedSaving] = useState(false);
  const [schedLoading, setSchedLoading] = useState(false);
  const [timeOff, setTimeOff] = useState<TimeOffEntry[]>([]);
  const [timeOffLoading, setTimeOffLoading] = useState(false);

  // Multi-calendar selection states
  const [calendars, setCalendars] = useState<GoogleCalendarItem[]>([]);
  const [calendarsLoading, setCalendarsLoading] = useState(false);
  const [searchCalendarQuery, setSearchCalendarQuery] = useState("");
  const [showCalendarSelector, setShowCalendarSelector] = useState(false);
  const [selectedCalendarId, setSelectedCalendarId] = useState("");
  const [selectedCalendarName, setSelectedCalendarName] = useState("");
  const [isSavingCalendar, setIsSavingCalendar] = useState(false);
  const [isTestingConnection, setIsTestingConnection] = useState(false);

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
      setActiveView("scheduling");
      const email = searchParams.get("email") || "";
      showToast(`✅ Google Calendar connected${email ? `: ${email}` : ""}!`);
      window.history.replaceState({}, "", "/comfortbridge");
    }
    if (searchParams.get("calendarError")) {
      setActiveView("scheduling");
      showToast("❌ Google Calendar connection failed. Please try again.", "error");
      window.history.replaceState({}, "", "/comfortbridge");
    }
  }, [searchParams, showToast]);

  // ── Data Fetching ──────────────────────────────────────────────────────────
  const fetchSettings = useCallback(async () => {
    try {
      const res = await fetch(`${API_URL}/api/settings`);
      if (!res.ok) throw new Error("Failed to load settings");
      const json = await res.json();
      if (json.success && json.settings) {
        setSalesHeadEmail(json.settings.sales_head_email || "");
      }
    } catch (_) {}
  }, []);

  const fetchCalendarStatus = useCallback(async () => {
    try {
      setCalendarLoading(true);
      const res = await fetch(`${API_URL}/api/scheduling/status`);
      const json = await res.json();
      setCalendarStatus(json);
      if (json.connected) {
        setSelectedCalendarId(json.calendarId || "primary");
        setSelectedCalendarName(json.calendarName || "Primary");
      }
    } catch (_) {}
    finally { setCalendarLoading(false); }
  }, []);

  const fetchWritableCalendars = useCallback(async () => {
    try {
      setCalendarsLoading(true);
      const res = await fetch(`${API_URL}/api/scheduling/calendars`);
      const json = await res.json();
      if (json.success) {
        setCalendars(json.calendars || []);
      }
    } catch (_) {}
    finally { setCalendarsLoading(false); }
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
    fetchSettings();
    fetchCalendarStatus();
    fetchSchedSettings();
    fetchTimeOff();
  }, [fetchSettings, fetchCalendarStatus, fetchSchedSettings, fetchTimeOff]);

  useEffect(() => {
    if (calendarStatus.connected) {
      fetchWritableCalendars();
    }
  }, [calendarStatus.connected, fetchWritableCalendars]);

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

  const handleSaveCalendarSelection = async (calId: string, calName: string) => {
    setIsSavingCalendar(true);
    try {
      const res = await fetch(`${API_URL}/api/scheduling/calendar`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ calendarId: calId, calendarName: calName }),
      });
      const json = await res.json();
      if (json.success) {
        setCalendarStatus((prev) => ({ ...prev, calendarId: calId, calendarName: calName }));
        showToast("Selected calendar updated successfully!");
        setShowCalendarSelector(false);
      } else {
        throw new Error(json.message);
      }
    } catch (err: any) {
      showToast(err.message || "Failed to update calendar selection.", "error");
    } finally {
      setIsSavingCalendar(false);
    }
  };

  const handleTestCalendarEvent = async () => {
    setIsTestingConnection(true);
    try {
      const res = await fetch(`${API_URL}/api/scheduling/test-event`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
      });
      const json = await res.json();
      if (json.success) {
        showToast("✅ Test event created successfully!");
        if (json.link) {
          window.open(json.link, "_blank");
        }
      } else {
        throw new Error(json.message);
      }
    } catch (err: any) {
      showToast(err.message || "Failed to create test calendar event.", "error");
    } finally {
      setIsTestingConnection(false);
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

  // ── Router / Render Views ──────────────────────────────────────────────────
  const renderView = () => {
    if (selectedLead) {
      return (
        <LeadDetail
          lead={selectedLead}
          onBack={() => {
            setSelectedLead(null);
            setActiveView("crm-leads");
          }}
          showToast={showToast}
        />
      );
    }

    switch (activeView) {
      case "crm-dashboard":
        return <CRMDashboard />;
      case "crm-leads":
        return (
          <LeadsPage
            onViewLead={(lead) => setSelectedLead(lead)}
            showToast={showToast}
          />
        );
      case "crm-tasks":
        return (
          <MyTasksPage
            showToast={showToast}
            onViewLead={async (leadId) => {
              try {
                const res = await fetch(`${API_URL}/api/submissions?limit=500`);
                const json = await res.json();
                if (json.success) {
                  const lead = (json.data || []).find((l: any) => l.id === leadId);
                  if (lead) {
                    setSelectedLead(lead);
                  } else {
                    showToast("Lead profile not found", "error");
                  }
                }
              } catch (_) {
                showToast("Could not open lead details", "error");
              }
            }}
          />
        );
      case "crm-reports":
        return <ReportsPage />;
      case "scheduling":
        return (
          <SchedulingView
            API_URL={API_URL}
            calendarLoading={calendarLoading}
            calendarStatus={calendarStatus}
            showCalendarSelector={showCalendarSelector}
            setShowCalendarSelector={setShowCalendarSelector}
            calendarsLoading={calendarsLoading}
            calendars={calendars}
            searchCalendarQuery={searchCalendarQuery}
            setSearchCalendarQuery={setSearchCalendarQuery}
            selectedCalendarId={selectedCalendarId}
            setSelectedCalendarId={setSelectedCalendarId}
            selectedCalendarName={selectedCalendarName}
            setSelectedCalendarName={setSelectedCalendarName}
            isSavingCalendar={isSavingCalendar}
            isTestingConnection={isTestingConnection}
            schedLoading={schedLoading}
            schedSaving={schedSaving}
            schedSettings={schedSettings}
            setSchedSettings={setSchedSettings}
            timeOffLoading={timeOffLoading}
            timeOff={timeOff}
            showAddTimeOff={showAddTimeOff}
            setShowAddTimeOff={setShowAddTimeOff}
            newTimeOff={newTimeOff}
            setNewTimeOff={setNewTimeOff}
            addingTimeOff={addingTimeOff}
            handleDisconnectCalendar={handleDisconnectCalendar}
            handleSaveCalendarSelection={handleSaveCalendarSelection}
            handleTestCalendarEvent={handleTestCalendarEvent}
            handleSaveSchedSettings={handleSaveSchedSettings}
            handleAddTimeOff={handleAddTimeOff}
            handleDeleteTimeOff={handleDeleteTimeOff}
            fetchWritableCalendars={fetchWritableCalendars}
            timeAgo={timeAgo}
          />
        );
      case "settings":
        return (
          <SettingsView
            salesHeadEmail={salesHeadEmail}
            setSalesHeadEmail={setSalesHeadEmail}
            savingSettings={savingSettings}
            handleSaveSettings={handleSaveSettings}
          />
        );
      default:
        return <CRMDashboard />;
    }
  };

  return (
    <AdminLayout activeView={selectedLead ? "crm-leads" : activeView} setActiveView={(view) => {
      setSelectedLead(null);
      setActiveView(view);
    }}>
      {/* Toast Alert */}
      {toast && (
        <div className={`${s.toast} ${toast.type === "error" ? s.toastError : s.toastSuccess}`}>
          {toast.type === "error" ? "❌" : "✅"} {toast.message}
        </div>
      )}

      {renderView()}
    </AdminLayout>
  );
}

export default function ComfortBridgeDashboard() {
  return (
    <Suspense fallback={<div style={{ padding: "4rem", textAlign: "center", color: "#64748b" }}>Loading admin interface…</div>}>
      <DashboardContent />
    </Suspense>
  );
}
