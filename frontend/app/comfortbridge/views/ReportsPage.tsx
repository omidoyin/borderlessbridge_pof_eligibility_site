"use client";

import { useEffect, useState } from "react";
import s from "../crm.module.css";

const API_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:4000";

interface Summary {
  total: number;
  new_leads: number;
  qualified: number;
  lost: number;
  won: number;
  conversion_rate: number;
}

interface ReportData {
  success: boolean;
  summary: Summary;
  by_stage: { crm_stage: string; count: string }[];
  by_destination: { destination: string; count: string }[];
  by_visa: { visa_type: string; count: string }[];
  daily_leads: { date: string; count: string }[];
}

const STAGE_LABELS: Record<string, string> = {
  new_lead: "New Lead",
  contacted: "Contacted",
  qualified: "Qualified",
  quote_sent: "Quote Sent",
  strategy_call_booked: "Strategy Call Booked",
  payment_pending: "Payment Pending",
  paid: "Paid",
  processing: "Processing",
  completed: "Completed",
  lost: "Lost",
};

export default function ReportsPage() {
  const [data, setData] = useState<ReportData | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch(`${API_URL}/api/crm/reports`)
      .then((res) => res.json())
      .then((json) => {
        if (json.success) {
          setData(json);
        }
      })
      .catch((err) => console.error("Error loading reports", err))
      .finally(() => setLoading(false));
  }, []);

  if (loading) {
    return (
      <div className={s.spinnerCenter}>
        <div className={s.spinner} />
      </div>
    );
  }

  if (!data) {
    return (
      <div className={s.emptyState}>
        <div className={s.emptyTitle}>Error loading reports</div>
        <div className={s.emptyDesc}>Could not load analytics. Please try again.</div>
      </div>
    );
  }

  const { summary, by_stage, by_destination, by_visa, daily_leads } = data;

  // Let's compute estimated revenue (assuming average case value e.g. $1,500 per won case)
  const averageCaseValue = 1500;
  const estimatedRevenue = summary.won * averageCaseValue;

  return (
    <div>
      {/* Analytics Cards */}
      <div className={s.statsGrid}>
        <div className={s.statCard}>
          <div className={s.statLabel}>New Leads</div>
          <div className={`${s.statNumber} ${s.statNumberBlue}`}>{summary.new_leads}</div>
        </div>
        <div className={s.statCard}>
          <div className={s.statLabel}>Qualified Leads</div>
          <div className={`${s.statNumber} ${s.statNumberGreen}`}>{summary.qualified}</div>
        </div>
        <div className={s.statCard}>
          <div className={s.statLabel}>Lost Leads</div>
          <div className={`${s.statNumber} ${s.statNumberRed}`}>{summary.lost}</div>
        </div>
        <div className={s.statCard}>
          <div className={s.statLabel}>Won Cases</div>
          <div className={`${s.statNumber} ${s.statNumberGreen}`}>{summary.won}</div>
        </div>
        <div className={s.statCard}>
          <div className={s.statLabel}>Estimated Revenue</div>
          <div className={`${s.statNumber} ${s.statNumberGreen}`}>
            ${estimatedRevenue.toLocaleString()}
          </div>
          <div className={s.statChange}>Based on avg $1.5k/client</div>
        </div>
        <div className={s.statCard}>
          <div className={s.statLabel}>Conversion Rate</div>
          <div className={`${s.statNumber} ${s.statNumberPurple}`}>{summary.conversion_rate}%</div>
        </div>
      </div>

      <div className={s.chartsGrid} style={{ gridTemplateColumns: "1fr 1fr", marginBottom: "1.5rem" }}>
        {/* Daily Leads trend */}
        <div className={s.chartCard}>
          <div className={s.chartTitle}>Daily Lead Volume (Last 30 Days)</div>
          {daily_leads && daily_leads.length > 0 ? (
            <div style={{ display: "flex", alignItems: "flex-end", gap: "0.2rem", height: "150px", paddingTop: "1rem" }}>
              {daily_leads.slice(-15).map((d) => {
                const maxCount = Math.max(...daily_leads.map((x) => parseInt(x.count, 10))) || 1;
                const heightPct = (parseInt(d.count, 10) / maxCount) * 100;
                const formattedDate = new Date(d.date).toLocaleDateString("en", { day: "numeric", month: "short" });
                return (
                  <div key={d.date} style={{ flex: 1, display: "flex", flexDirection: "column", alignItems: "center", gap: "0.25rem", height: "100%" }}>
                    <div style={{ height: "100%", width: "100%", display: "flex", alignItems: "flex-end" }}>
                      <div
                        style={{
                          width: "100%",
                          background: "linear-gradient(to top, #16a34a, #86efac)",
                          borderRadius: "3px 3px 0 0",
                          height: `${heightPct}%`,
                          minHeight: "2px",
                        }}
                        title={`${formattedDate}: ${d.count} leads`}
                      />
                    </div>
                    <div style={{ fontSize: "0.55rem", color: "#94a3b8", transform: "rotate(-45deg)", marginTop: "0.25rem", whiteSpace: "nowrap" }}>
                      {formattedDate}
                    </div>
                  </div>
                );
              })}
            </div>
          ) : (
            <div style={{ fontSize: "0.8rem", color: "#94a3b8", textAlign: "center", padding: "3rem 0" }}>No daily data yet</div>
          )}
        </div>

        {/* Sales Funnel */}
        <div className={s.chartCard}>
          <div className={s.chartTitle}>Sales Funnel</div>
          <div style={{ display: "flex", flexDirection: "column", gap: "0.6rem" }}>
            {by_stage.map((st) => {
              const label = STAGE_LABELS[st.crm_stage] || st.crm_stage;
              const count = parseInt(st.count, 10);
              const totalLeads = summary.total || 1;
              const pct = Math.round((count / totalLeads) * 100);

              return (
                <div key={st.crm_stage} style={{ display: "flex", alignItems: "center", gap: "0.75rem" }}>
                  <div style={{ width: "120px", fontSize: "0.75rem", color: "#475569", fontWeight: 500, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                    {label}
                  </div>
                  <div style={{ flex: 1, height: "16px", background: "#f1f5f9", borderRadius: "4px", overflow: "hidden", position: "relative" }}>
                    <div
                      style={{
                        height: "100%",
                        width: `${Math.max(pct, 2)}%`,
                        background: st.crm_stage === "lost" ? "#ef4444" : "#16a34a",
                        transition: "width 600ms ease",
                      }}
                    />
                    <span style={{ position: "absolute", left: "8px", top: "50%", transform: "translateY(-50%)", fontSize: "0.65rem", color: pct > 10 ? "#ffffff" : "#475569", fontWeight: 700 }}>
                      {count} ({pct}%)
                    </span>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </div>

      <div className={s.chartsGrid} style={{ gridTemplateColumns: "1fr 1fr" }}>
        {/* Visa Type Distribution */}
        <div className={s.chartCard}>
          <div className={s.chartTitle}>Visa Type Distribution</div>
          <div style={{ display: "flex", flexDirection: "column", gap: "0.5rem" }}>
            {by_visa.map((v, i) => {
              const colors = ["#16a34a", "#2563eb", "#7c3aed", "#d97706", "#dc2626", "#06b6d4"];
              const total = by_visa.reduce((a, x) => a + parseInt(x.count, 10), 0) || 1;
              const pct = Math.round((parseInt(v.count, 10) / total) * 100);
              const label = v.visa_type.charAt(0).toUpperCase() + v.visa_type.slice(1);
              return (
                <div key={v.visa_type} style={{ display: "flex", alignItems: "center", gap: "0.5rem" }}>
                  <div style={{ width: "8px", height: "8px", borderRadius: "2px", background: colors[i % colors.length] }} />
                  <div style={{ flex: 1, fontSize: "0.75rem", color: "#64748b" }}>{label}</div>
                  <div style={{ fontSize: "0.75rem", fontWeight: 700, color: "#0f172a", minWidth: "30px", textAlign: "right" }}>
                    {v.count} ({pct}%)
                  </div>
                </div>
              );
            })}
            {by_visa.length === 0 && (
              <div style={{ fontSize: "0.8rem", color: "#94a3b8", textAlign: "center", padding: "1rem" }}>No data yet</div>
            )}
          </div>
        </div>

        {/* Lead Distribution by Destination */}
        <div className={s.chartCard}>
          <div className={s.chartTitle}>Lead Destination Breakdown</div>
          <div style={{ display: "flex", flexDirection: "column", gap: "0.5rem" }}>
            {by_destination.map((d, i) => {
              const colors = ["#0284c7", "#0d9488", "#4f46e5", "#b45309", "#0891b2", "#16a34a"];
              const total = by_destination.reduce((a, x) => a + parseInt(x.count, 10), 0) || 1;
              const pct = Math.round((parseInt(d.count, 10) / total) * 100);
              return (
                <div key={d.destination} style={{ display: "flex", alignItems: "center", gap: "0.5rem" }}>
                  <div style={{ width: "8px", height: "8px", borderRadius: "2px", background: colors[i % colors.length] }} />
                  <div style={{ flex: 1, fontSize: "0.75rem", color: "#64748b" }}>{d.destination}</div>
                  <div style={{ fontSize: "0.75rem", fontWeight: 700, color: "#0f172a", minWidth: "30px", textAlign: "right" }}>
                    {d.count} ({pct}%)
                  </div>
                </div>
              );
            })}
            {by_destination.length === 0 && (
              <div style={{ fontSize: "0.8rem", color: "#94a3b8", textAlign: "center", padding: "1rem" }}>No data yet</div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
