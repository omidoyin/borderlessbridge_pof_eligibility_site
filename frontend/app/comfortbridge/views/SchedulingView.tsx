"use client";

import { useState } from "react";
import s from "../crm.module.css";

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
  working_days: string;
  working_hours_start: string;
  working_hours_end: string;
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

interface SchedulingViewProps {
  API_URL: string;
  calendarLoading: boolean;
  calendarStatus: CalendarStatus;
  showCalendarSelector: boolean;
  setShowCalendarSelector: (val: boolean) => void;
  calendarsLoading: boolean;
  calendars: GoogleCalendarItem[];
  searchCalendarQuery: string;
  setSearchCalendarQuery: (val: string) => void;
  selectedCalendarId: string;
  setSelectedCalendarId: (val: string) => void;
  selectedCalendarName: string;
  setSelectedCalendarName: (val: string) => void;
  isSavingCalendar: boolean;
  isTestingConnection: boolean;
  schedLoading: boolean;
  schedSaving: boolean;
  schedSettings: SchedulingSettings;
  setSchedSettings: React.Dispatch<React.SetStateAction<SchedulingSettings>>;
  timeOffLoading: boolean;
  timeOff: TimeOffEntry[];
  showAddTimeOff: boolean;
  setShowAddTimeOff: React.Dispatch<React.SetStateAction<boolean>>;
  newTimeOff: { label: string; start_date: string; end_date: string; reason: string };
  setNewTimeOff: React.Dispatch<React.SetStateAction<{ label: string; start_date: string; end_date: string; reason: string }>>;
  addingTimeOff: boolean;
  handleDisconnectCalendar: () => Promise<void>;
  handleSaveCalendarSelection: (calId: string, calName: string) => Promise<void>;
  handleTestCalendarEvent: () => Promise<void>;
  handleSaveSchedSettings: () => Promise<void>;
  handleAddTimeOff: () => Promise<void>;
  handleDeleteTimeOff: (id: number) => Promise<void>;
  fetchWritableCalendars: () => Promise<void>;
  timeAgo: (iso?: string) => string;
}

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

const DAY_LABELS = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
const DAY_NAMES  = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"];

export default function SchedulingView({
  API_URL,
  calendarLoading,
  calendarStatus,
  showCalendarSelector,
  setShowCalendarSelector,
  calendarsLoading,
  calendars,
  searchCalendarQuery,
  setSearchCalendarQuery,
  selectedCalendarId,
  setSelectedCalendarId,
  selectedCalendarName,
  setSelectedCalendarName,
  isSavingCalendar,
  isTestingConnection,
  schedLoading,
  schedSaving,
  schedSettings,
  setSchedSettings,
  timeOffLoading,
  timeOff,
  showAddTimeOff,
  setShowAddTimeOff,
  newTimeOff,
  setNewTimeOff,
  addingTimeOff,
  handleDisconnectCalendar,
  handleSaveCalendarSelection,
  handleTestCalendarEvent,
  handleSaveSchedSettings,
  handleAddTimeOff,
  handleDeleteTimeOff,
  fetchWritableCalendars,
  timeAgo,
}: SchedulingViewProps) {

  const workingDayNums = schedSettings.working_days.split(",").map(Number).filter((d) => !isNaN(d));

  const toggleWorkingDay = (day: number) => {
    const current = schedSettings.working_days.split(",").map(Number).filter((d) => !isNaN(d));
    const next = current.includes(day) ? current.filter((d) => d !== day) : [...current, day].sort();
    setSchedSettings((s) => ({ ...s, working_days: next.join(",") }));
  };

  return (
    <div className={s.settingsPanelGrid}>
      {/* ── Section 1: Google Calendar ── */}
      <div className={s.sectionCard}>
        <div className={s.sectionCardHeader}>
          <div className={s.sectionCardTitle}>
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" style={{ color: "#16a34a" }}>
              <rect x="3" y="4" width="18" height="18" rx="2" ry="2" /><line x1="16" y1="2" x2="16" y2="6" /><line x1="8" y1="2" x2="8" y2="6" /><line x1="3" y1="10" x2="21" y2="10" />
            </svg>
            Google Calendar
          </div>
        </div>
        <div className={s.sectionCardBody}>
          {calendarLoading ? (
            <div style={{ display: "flex", gap: "0.5rem", alignItems: "center", fontSize: "0.85rem", color: "#64748b" }}>
              <div className={s.spinner} style={{ width: "16px", height: "16px" }} /> Loading status…
            </div>
          ) : calendarStatus.connected ? (
            <div style={{ display: "flex", flexDirection: "column", gap: "1rem" }}>
              <div className={s.calConnectedBadge}>
                <span className={s.calConnectedDot} />
                Connected
              </div>

              <div className={s.calInfoGrid}>
                <div className={s.calInfoLabel}>Account</div>
                <div className={s.calInfoValue}>{calendarStatus.email}</div>

                <div className={s.calInfoLabel}>Target Calendar</div>
                <div className={s.calInfoValue} style={{ display: "flex", flexDirection: "column", gap: "0.35rem" }}>
                  <div>
                    <strong>{calendarStatus.calendarName || "Primary"}</strong>
                    <span style={{ color: "#94a3b8", fontSize: "0.75rem", marginLeft: "0.25rem" }}>({calendarStatus.calendarId})</span>
                  </div>
                  {!showCalendarSelector && (
                    <button
                      onClick={() => {
                        setShowCalendarSelector(true);
                        fetchWritableCalendars();
                      }}
                      className={s.btnSecondary}
                      style={{ padding: "0.25rem 0.5rem", fontSize: "0.72rem", alignSelf: "flex-start" }}
                    >
                      ✏️ Change Target Calendar
                    </button>
                  )}
                </div>
              </div>

              {showCalendarSelector && (
                <div style={{ background: "#f8fafc", border: "1px solid #e2e8f0", borderRadius: "8px", padding: "1rem", marginTop: "0.5rem" }}>
                  <label className={s.formLabel}>Select Calendar</label>
                  <input
                    type="text"
                    placeholder="Search calendars..."
                    className={s.formInput}
                    style={{ marginBottom: "0.5rem", marginTop: "0.25rem" }}
                    value={searchCalendarQuery}
                    onChange={(e) => setSearchCalendarQuery(e.target.value)}
                  />

                  {calendarsLoading ? (
                    <div style={{ display: "flex", gap: "0.5rem", alignItems: "center", fontSize: "0.8rem", color: "#64748b", padding: "0.5rem" }}>
                      <div className={s.spinner} style={{ width: "14px", height: "14px" }} /> Fetching calendar list...
                    </div>
                  ) : (
                    <div style={{ maxHeight: "200px", overflowY: "auto", display: "flex", flexDirection: "column", gap: "0.25rem", background: "#ffffff", border: "1px solid #cbd5e1", borderRadius: "6px", padding: "0.25rem" }}>
                      {calendars
                        .filter((cal) => cal.summary.toLowerCase().includes(searchCalendarQuery.toLowerCase()))
                        .map((cal) => (
                          <button
                            key={cal.id}
                            type="button"
                            onClick={() => {
                              setSelectedCalendarId(cal.id);
                              setSelectedCalendarName(cal.summary);
                            }}
                            style={{
                              width: "100%",
                              padding: "0.45rem 0.6rem",
                              borderRadius: "4px",
                              border: "none",
                              background: selectedCalendarId === cal.id ? "#dcfce7" : "none",
                              color: selectedCalendarId === cal.id ? "#166534" : "#334155",
                              textAlign: "left",
                              cursor: "pointer",
                              fontSize: "0.8rem",
                              fontWeight: selectedCalendarId === cal.id ? 600 : 400,
                            }}
                          >
                            <span style={{ display: "block", fontWeight: 600 }}>{cal.summary} {cal.primary && "(Primary)"}</span>
                            <span style={{ fontSize: "0.7rem", color: "#94a3b8" }}>{cal.id}</span>
                          </button>
                        ))}
                    </div>
                  )}

                  <div style={{ display: "flex", gap: "0.5rem", marginTop: "0.75rem" }}>
                    <button
                      className={s.btnPrimary}
                      onClick={() => handleSaveCalendarSelection(selectedCalendarId, selectedCalendarName)}
                      disabled={isSavingCalendar}
                    >
                      {isSavingCalendar ? "Saving..." : "Save Target Calendar"}
                    </button>
                    <button
                      className={s.btnSecondary}
                      onClick={() => {
                        setShowCalendarSelector(false);
                        setSelectedCalendarId(calendarStatus.calendarId || "primary");
                        setSelectedCalendarName(calendarStatus.calendarName || "Primary");
                      }}
                    >
                      Cancel
                    </button>
                  </div>
                </div>
              )}

              <div className={s.calInfoGrid} style={{ borderTop: "1px solid #f1f5f9", paddingTop: "0.75rem" }}>
                <div className={s.calInfoLabel}>Connected On</div>
                <div className={s.calInfoValue}>{calendarStatus.connectedAt ? new Date(calendarStatus.connectedAt).toLocaleDateString() : "—"}</div>

                <div className={s.calInfoLabel}>Last Synced</div>
                <div className={s.calInfoValue}>{timeAgo(calendarStatus.lastSyncedAt)}</div>
              </div>

              <div style={{ display: "flex", gap: "0.5rem", marginTop: "0.5rem", flexWrap: "wrap" }}>
                <button className={s.btnSecondary} onClick={handleTestCalendarEvent} disabled={isTestingConnection}>
                  {isTestingConnection ? "Sending Test Event…" : "Send Test Invite"}
                </button>
                <a href={`${API_URL}/api/google/saleshead/auth`} className={s.btnSecondary} style={{ textDecoration: "none" }}>
                  Reconnect Google Account
                </a>
                <button className={s.btnDanger} onClick={handleDisconnectCalendar} style={{ marginLeft: "auto" }}>
                  Disconnect
                </button>
              </div>
            </div>
          ) : (
            <div style={{ textAlign: "center", padding: "1.5rem 0", color: "#64748b" }}>
              <p style={{ fontSize: "0.85rem", marginBottom: "1rem" }}>
                No target Google Calendar is connected. Connect the Sales Head calendar to enable automated booking sync and schedule block coordination.
              </p>
              <a href={`${API_URL}/api/google/saleshead/auth`} className={s.btnPrimary} style={{ textDecoration: "none" }}>
                Connect Google Calendar
              </a>
            </div>
          )}
        </div>
      </div>

      {/* ── Section 2: Availability Settings ── */}
      <div className={s.sectionCard}>
        <div className={s.sectionCardHeader}>
          <div className={s.sectionCardTitle}>
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" style={{ color: "#16a34a" }}>
              <circle cx="12" cy="12" r="10" /><polyline points="12 6 12 12 16 14" />
            </svg>
            Scheduling Configuration
          </div>
        </div>
        <div className={s.sectionCardBody}>
          {schedLoading ? (
            <div style={{ display: "flex", gap: "0.5rem", alignItems: "center", fontSize: "0.85rem", color: "#64748b" }}>
              <div className={s.spinner} style={{ width: "16px", height: "16px" }} /> Loading configuration…
            </div>
          ) : (
            <div style={{ display: "flex", flexDirection: "column", gap: "1rem" }}>
              {/* Working Days */}
              <div className={s.formGroup}>
                <label className={s.formLabel}>Working Days</label>
                <div className={s.dayGrid}>
                  {DAY_NAMES.map((name, idx) => (
                    <button
                      key={idx}
                      type="button"
                      className={`${s.dayToggle} ${workingDayNums.includes(idx) ? s.dayToggleActive : ""}`}
                      onClick={() => toggleWorkingDay(idx)}
                    >
                      {DAY_LABELS[idx]}
                    </button>
                  ))}
                </div>
              </div>

              {/* Working Hours */}
              <div className={s.formRow}>
                <div className={s.formGroup}>
                  <label className={s.formLabel}>Start Time</label>
                  <input
                    type="time"
                    className={s.schedInputField}
                    value={schedSettings.working_hours_start}
                    onChange={(e) => setSchedSettings((prev) => ({ ...prev, working_hours_start: e.target.value }))}
                  />
                </div>
                <div className={s.formGroup}>
                  <label className={s.formLabel}>End Time</label>
                  <input
                    type="time"
                    className={s.schedInputField}
                    value={schedSettings.working_hours_end}
                    onChange={(e) => setSchedSettings((prev) => ({ ...prev, working_hours_end: e.target.value }))}
                  />
                </div>
              </div>

              {/* Meeting Duration */}
              <div className={s.formGroup}>
                <label className={s.formLabel}>Meeting Duration</label>
                <select
                  className={s.formSelect}
                  value={schedSettings.meeting_duration}
                  onChange={(e) => setSchedSettings((prev) => ({ ...prev, meeting_duration: Number(e.target.value) }))}
                >
                  <option value={15}>15 minutes</option>
                  <option value={30}>30 minutes</option>
                  <option value={45}>45 minutes</option>
                  <option value={60}>60 minutes</option>
                  <option value={90}>90 minutes</option>
                </select>
              </div>

              {/* Buffer Times */}
              <div className={s.formRow}>
                <div className={s.formGroup}>
                  <label className={s.formLabel}>Buffer Before</label>
                  <select
                    className={s.formSelect}
                    value={schedSettings.buffer_before}
                    onChange={(e) => setSchedSettings((prev) => ({ ...prev, buffer_before: Number(e.target.value) }))}
                  >
                    <option value={0}>None</option>
                    <option value={5}>5 min</option>
                    <option value={10}>10 min</option>
                    <option value={15}>15 min</option>
                    <option value={30}>30 min</option>
                  </select>
                </div>
                <div className={s.formGroup}>
                  <label className={s.formLabel}>Buffer After</label>
                  <select
                    className={s.formSelect}
                    value={schedSettings.buffer_after}
                    onChange={(e) => setSchedSettings((prev) => ({ ...prev, buffer_after: Number(e.target.value) }))}
                  >
                    <option value={0}>None</option>
                    <option value={5}>5 min</option>
                    <option value={10}>10 min</option>
                    <option value={15}>15 min</option>
                    <option value={30}>30 min</option>
                  </select>
                </div>
              </div>

              {/* Notice & Booking Window */}
              <div className={s.formRow}>
                <div className={s.formGroup}>
                  <label className={s.formLabel}>Min Notice Time</label>
                  <select
                    className={s.formSelect}
                    value={schedSettings.min_notice_hours}
                    onChange={(e) => setSchedSettings((prev) => ({ ...prev, min_notice_hours: Number(e.target.value) }))}
                  >
                    <option value={0}>Instant</option>
                    <option value={1}>1 hour</option>
                    <option value={2}>2 hours</option>
                    <option value={4}>4 hours</option>
                    <option value={12}>12 hours</option>
                    <option value={24}>24 hours</option>
                  </select>
                </div>
                <div className={s.formGroup}>
                  <label className={s.formLabel}>Max Horizon Window</label>
                  <select
                    className={s.formSelect}
                    value={schedSettings.max_booking_days}
                    onChange={(e) => setSchedSettings((prev) => ({ ...prev, max_booking_days: Number(e.target.value) }))}
                  >
                    <option value={7}>7 days</option>
                    <option value={14}>14 days</option>
                    <option value={30}>30 days</option>
                    <option value={60}>60 days</option>
                    <option value={90}>90 days</option>
                  </select>
                </div>
              </div>

              {/* Max Meetings & Timezone */}
              <div className={s.formRow}>
                <div className={s.formGroup}>
                  <label className={s.formLabel}>Max Meetings per Day</label>
                  <input
                    type="number"
                    min={1}
                    max={20}
                    className={s.schedInputField}
                    value={schedSettings.max_meetings_per_day}
                    onChange={(e) => setSchedSettings((prev) => ({ ...prev, max_meetings_per_day: Math.max(1, parseInt(e.target.value, 10) || 1) }))}
                  />
                </div>
                <div className={s.formGroup}>
                  <label className={s.formLabel}>Scheduling Time Zone</label>
                  <select
                    className={s.formSelect}
                    value={schedSettings.timezone}
                    onChange={(e) => setSchedSettings((prev) => ({ ...prev, timezone: e.target.value }))}
                  >
                    {TIMEZONES.map((tz) => (
                      <option key={tz} value={tz}>{tz}</option>
                    ))}
                  </select>
                </div>
              </div>

              <button
                className={s.btnPrimary}
                onClick={handleSaveSchedSettings}
                disabled={schedSaving}
                style={{ alignSelf: "flex-end", marginTop: "0.5rem" }}
              >
                {schedSaving ? "Saving Configuration…" : "Save Configuration"}
              </button>
            </div>
          )}
        </div>
      </div>

      {/* ── Section 3: Time Off ── */}
      <div className={s.sectionCard}>
        <div className={s.sectionCardHeader}>
          <div className={s.sectionCardTitle}>
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" style={{ color: "#16a34a" }}>
              <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2" /><circle cx="9" cy="7" r="4" /><path d="M23 21v-2a4 4 0 0 0-3-3.87" /><path d="M16 3.13a4 4 0 0 1 0 7.75" />
            </svg>
            Calendar Blackout & Time Off
          </div>
          <button className={s.btnSecondary} onClick={() => setShowAddTimeOff((v) => !v)} style={{ fontSize: "0.75rem" }}>
            {showAddTimeOff ? "Cancel" : "+ Add Blackout Window"}
          </button>
        </div>
        <div className={s.sectionCardBody}>
          {showAddTimeOff && (
            <div style={{ background: "#f8fafc", border: "1px solid #e2e8f0", borderRadius: "8px", padding: "1rem", marginBottom: "1rem" }}>
              <div className={s.formRow}>
                <div className={s.formGroup}>
                  <label className={s.formLabel}>Blackout Label *</label>
                  <input
                    type="text"
                    placeholder="e.g. Annual Leave"
                    className={s.formInput}
                    value={newTimeOff.label}
                    onChange={(e) => setNewTimeOff((prev) => ({ ...prev, label: e.target.value }))}
                  />
                </div>
                <div className={s.formGroup}>
                  <label className={s.formLabel}>Blackout Reason</label>
                  <input
                    type="text"
                    placeholder="e.g. Traveling out of country"
                    className={s.formInput}
                    value={newTimeOff.reason}
                    onChange={(e) => setNewTimeOff((prev) => ({ ...prev, reason: e.target.value }))}
                  />
                </div>
              </div>
              <div className={s.formRow} style={{ marginTop: "0.5rem" }}>
                <div className={s.formGroup}>
                  <label className={s.formLabel}>Start Date *</label>
                  <input
                    type="date"
                    className={s.formInput}
                    value={newTimeOff.start_date}
                    onChange={(e) => setNewTimeOff((prev) => ({ ...prev, start_date: e.target.value }))}
                  />
                </div>
                <div className={s.formGroup}>
                  <label className={s.formLabel}>End Date *</label>
                  <input
                    type="date"
                    className={s.formInput}
                    value={newTimeOff.end_date}
                    onChange={(e) => setNewTimeOff((prev) => ({ ...prev, end_date: e.target.value }))}
                  />
                </div>
              </div>
              <div style={{ display: "flex", gap: "0.5rem", marginTop: "1rem" }}>
                <button className={s.btnPrimary} onClick={handleAddTimeOff} disabled={addingTimeOff}>
                  {addingTimeOff ? "Adding Block…" : "Block Calendar Dates"}
                </button>
                <button className={s.btnSecondary} onClick={() => setShowAddTimeOff(false)}>
                  Cancel
                </button>
              </div>
            </div>
          )}

          {timeOffLoading ? (
            <div style={{ display: "flex", gap: "0.5rem", alignItems: "center", fontSize: "0.85rem", color: "#64748b" }}>
              <div className={s.spinner} style={{ width: "16px", height: "16px" }} /> Loading blackout blocks…
            </div>
          ) : timeOff.length === 0 ? (
            <div style={{ color: "#94a3b8", fontSize: "0.85rem", padding: "0.5rem 0" }}>
              No calendar blackout dates scheduled. Use the button above to prevent client bookings on specific dates.
            </div>
          ) : (
            <div style={{ display: "flex", flexDirection: "column", gap: "0.5rem" }}>
              {timeOff.map((entry) => (
                <div
                  key={entry.id}
                  style={{
                    display: "flex",
                    justifyContent: "space-between",
                    alignItems: "center",
                    padding: "0.75rem 1rem",
                    border: "1px solid #e2e8f0",
                    borderRadius: "6px",
                    background: "#f8fafc",
                  }}
                >
                  <div>
                    <span style={{ fontSize: "0.85rem", fontWeight: 700, color: "#334155", display: "block" }}>
                      {entry.label}
                    </span>
                    <span style={{ fontSize: "0.75rem", color: "#64748b" }}>
                      {new Date(entry.start_date + "T00:00:00").toLocaleDateString("en-GB", { day: "numeric", month: "short" })}
                      {entry.start_date !== entry.end_date && (
                        <> — {new Date(entry.end_date + "T00:00:00").toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "numeric" })}</>
                      )}
                    </span>
                    {entry.reason && (
                      <span style={{ display: "block", fontSize: "0.72rem", color: "#94a3b8", marginTop: "0.1rem" }}>
                        Reason: {entry.reason}
                      </span>
                    )}
                  </div>
                  <button
                    onClick={() => handleDeleteTimeOff(entry.id)}
                    className={s.btnDanger}
                    style={{ padding: "0.25rem 0.5rem", fontSize: "0.72rem" }}
                  >
                    Delete Block
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
