"use client";

import s from "../crm.module.css";

interface SettingsViewProps {
  salesHeadEmail: string;
  setSalesHeadEmail: (val: string) => void;
  savingSettings: boolean;
  handleSaveSettings: () => Promise<void>;
}

export default function SettingsView({
  salesHeadEmail,
  setSalesHeadEmail,
  savingSettings,
  handleSaveSettings,
}: SettingsViewProps) {
  return (
    <div className={s.sectionCard} style={{ maxWidth: "600px" }}>
      <div className={s.sectionCardHeader}>
        <div className={s.sectionCardTitle}>
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" style={{ color: "#16a34a" }}>
            <circle cx="12" cy="12" r="3" />
            <path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 1 1-2.83 2.83l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-4 0v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 1 1-2.83-2.83l.06-.06a1.65 1.65 0 0 0 .33-1.82 1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1 0-4h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 1 1 2.83-2.83l.06.06a1.65 1.65 0 0 0 1.82.33H9a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 4 0v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 1 1 2.83 2.83l-.06.06a1.65 1.65 0 0 0-.33 1.82V9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 0 4h-.09a1.65 1.65 0 0 0-1.51 1z" />
          </svg>
          Global System Settings
        </div>
      </div>
      <div className={s.sectionCardBody}>
        <div style={{ display: "flex", flexDirection: "column", gap: "1.25rem" }}>
          <p style={{ fontSize: "0.82rem", color: "#64748b", margin: 0 }}>
            Configure global variables and contact endpoints for notifications and workflow triggers.
          </p>

          <div className={s.formGroup}>
            <label className={s.formLabel} htmlFor="salesHeadEmail">
              Sales Head Email Address
            </label>
            <input
              type="email"
              id="salesHeadEmail"
              placeholder="e.g. saleshead@borderlessbridge.com"
              className={s.formInput}
              value={salesHeadEmail}
              onChange={(e) => setSalesHeadEmail(e.target.value)}
            />
            <span style={{ fontSize: "0.72rem", color: "#94a3b8" }}>
              Google Calendar invitations and daily lead digests will automatically carbon-copy this email.
            </span>
          </div>

          <button
            className={s.btnPrimary}
            onClick={handleSaveSettings}
            disabled={savingSettings}
            style={{ alignSelf: "flex-end" }}
          >
            {savingSettings ? "Saving Settings…" : "Save Settings"}
          </button>
        </div>
      </div>
    </div>
  );
}
