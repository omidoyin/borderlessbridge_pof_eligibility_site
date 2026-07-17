"use client";

import { useEffect, useState } from "react";
import s from "../crm.module.css";

const API_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:4000";

const STAGE_LABELS: Record<string, string> = {
  new_lead: "New Lead",
  contacted: "Contacted",
  qualified: "Qualified",
  quote_sent: "Quote Sent",
  strategy_call_booked: "Strategy Call",
  payment_pending: "Payment Pending",
  paid: "Paid",
  processing: "Processing",
  completed: "Completed",
  lost: "Lost",
};

interface Stats {
  new_lead: number;
  contacted: number;
  qualified: number;
  quote_sent: number;
  strategy_call_booked: number;
  payment_pending: number;
  paid: number;
  processing: number;
  completed: number;
  lost: number;
  tasks_today: number;
  tasks_overdue: number;
  strategy_calls_today: number;
}

interface ReportData {
  summary: {
    total: number;
    new_leads: number;
    qualified: number;
    lost: number;
    won: number;
    conversion_rate: number;
  };
  by_stage: { crm_stage: string; count: string }[];
  by_destination: { destination: string; count: string }[];
  by_visa: { visa_type: string; count: string }[];
  weekly_leads: { date: string; count: string }[];
}

export default function CRMDashboard() {
  const [stats, setStats] = useState<Stats | null>(null);
  const [reportData, setReportData] = useState<ReportData | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    Promise.all([
      fetch(`${API_URL}/api/crm/stats`).then((r) => r.json()),
      fetch(`${API_URL}/api/crm/reports`).then((r) => r.json()),
    ]).then(([statsJson, reportsJson]) => {
      if (statsJson.success) setStats(statsJson.stats);
      if (reportsJson.success) setReportData(reportsJson);
    }).finally(() => setLoading(false));
  }, []);

  if (loading) return (
    <div className={s.spinnerCenter}><div className={s.spinner} /></div>
  );

  const pipelineStages = [
    { key: "new_lead", label: "New Lead", color: "#3b82f6" },
    { key: "contacted", label: "Contacted", color: "#0ea5e9" },
    { key: "qualified", label: "Qualified", color: "#10b981" },
    { key: "quote_sent", label: "Quote Sent", color: "#f59e0b" },
    { key: "strategy_call_booked", label: "Strategy Call", color: "#8b5cf6" },
    { key: "payment_pending", label: "Pmt. Pending", color: "#eab308" },
    { key: "paid", label: "Paid", color: "#16a34a" },
    { key: "completed", label: "Completed", color: "#15803d" },
  ];

  const totalPipeline = pipelineStages.reduce((a, p) => a + ((stats as any)?.[p.key] || 0), 0) || 1;

  return (
    <div>
      {/* ── Row 1: Main stats ── */}
      <div className={s.statsGrid}>
        {[
          { label: "New Leads", key: "new_lead", cls: s.statNumberBlue },
          { label: "Qualified", key: "qualified", cls: s.statNumberGreen },
          { label: "Strategy Calls Today", key: "strategy_calls_today", cls: s.statNumberPurple },
          { label: "Payment Pending", key: "payment_pending", cls: s.statNumberAmber },
          { label: "Paid Clients", key: "paid", cls: s.statNumberGreen },
          { label: "Completed Cases", key: "completed", cls: s.statNumberGreen },
        ].map((item) => (
          <div className={s.statCard} key={item.key}>
            <div className={s.statLabel}>{item.label}</div>
            <div className={`${s.statNumber} ${item.cls}`}>
              {(stats as any)?.[item.key] ?? 0}
            </div>
          </div>
        ))}
      </div>

      {/* ── Row 2: Task stats ── */}
      <div className={s.statsGrid} style={{ gridTemplateColumns: "repeat(4, 1fr)", marginBottom: "1.25rem" }}>
        {[
          { label: "Today's Tasks", key: "tasks_today", cls: s.statNumberBlue },
          { label: "Overdue Tasks", key: "tasks_overdue", cls: s.statNumberRed },
          { label: "Upcoming Calls", key: "strategy_call_booked", cls: s.statNumberPurple },
          { label: "Lost Leads", key: "lost", cls: s.statNumberRed },
        ].map((item) => (
          <div className={s.statCard} key={item.key}>
            <div className={s.statLabel}>{item.label}</div>
            <div className={`${s.statNumber} ${item.cls}`}>
              {(stats as any)?.[item.key] ?? 0}
            </div>
          </div>
        ))}
      </div>

      {/* ── Row 3: Charts ── */}
      <div className={s.chartsGrid}>
        {/* Sales Pipeline */}
        <div className={s.chartCard}>
          <div className={s.chartTitle}>Sales Pipeline</div>
          <div style={{ display: "flex", flexDirection: "column", gap: "0.5rem" }}>
            {pipelineStages.map((stage) => {
              const count = (stats as any)?.[stage.key] || 0;
              const pct = Math.round((count / totalPipeline) * 100);
              return (
                <div key={stage.key}>
                  <div style={{ display: "flex", justifyContent: "space-between", marginBottom: "0.2rem" }}>
                    <span style={{ fontSize: "0.75rem", color: "#64748b", fontWeight: 500 }}>{stage.label}</span>
                    <span style={{ fontSize: "0.75rem", fontWeight: 700, color: "#0f172a" }}>{count}</span>
                  </div>
                  <div style={{ height: "6px", background: "#f1f5f9", borderRadius: "99px", overflow: "hidden" }}>
                    <div style={{ height: "100%", width: `${pct}%`, background: stage.color, borderRadius: "99px", transition: "width 600ms ease" }} />
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Leads by Destination */}
        <div className={s.chartCard}>
          <div className={s.chartTitle}>Leads by Destination</div>
          <div style={{ display: "flex", flexDirection: "column", gap: "0.45rem" }}>
            {(reportData?.by_destination || []).slice(0, 6).map((d) => {
              const total = (reportData?.by_destination || []).reduce((a, x) => a + parseInt(x.count, 10), 0) || 1;
              const pct = Math.round((parseInt(d.count, 10) / total) * 100);
              return (
                <div key={d.destination}>
                  <div style={{ display: "flex", justifyContent: "space-between", marginBottom: "0.15rem" }}>
                    <span style={{ fontSize: "0.75rem", color: "#64748b", fontWeight: 500 }}>{d.destination}</span>
                    <span style={{ fontSize: "0.75rem", fontWeight: 700, color: "#0f172a" }}>{d.count}</span>
                  </div>
                  <div style={{ height: "6px", background: "#f1f5f9", borderRadius: "99px", overflow: "hidden" }}>
                    <div style={{ height: "100%", width: `${pct}%`, background: "#16a34a", borderRadius: "99px" }} />
                  </div>
                </div>
              );
            })}
            {(reportData?.by_destination || []).length === 0 && (
              <div style={{ fontSize: "0.8rem", color: "#94a3b8", textAlign: "center", padding: "1rem" }}>No data yet</div>
            )}
          </div>
        </div>

        {/* Leads This Week */}
        <div className={s.chartCard}>
          <div className={s.chartTitle}>Leads This Week</div>
          {reportData?.weekly_leads && reportData.weekly_leads.length > 0 ? (
            <div style={{ display: "flex", alignItems: "flex-end", gap: "0.5rem", height: "100px", paddingTop: "0.5rem" }}>
              {reportData.weekly_leads.map((d) => {
                const maxCount = Math.max(...reportData.weekly_leads.map((x) => parseInt(x.count, 10))) || 1;
                const heightPct = (parseInt(d.count, 10) / maxCount) * 100;
                const dayLabel = new Date(d.date).toLocaleDateString("en", { weekday: "short" });
                return (
                  <div key={d.date} style={{ flex: 1, display: "flex", flexDirection: "column", alignItems: "center", gap: "0.25rem" }}>
                    <div style={{ fontSize: "0.6rem", color: "#64748b", fontWeight: 700 }}>{d.count}</div>
                    <div style={{ width: "100%", background: "#16a34a", borderRadius: "4px 4px 0 0", height: `${heightPct}%`, minHeight: "4px", transition: "height 600ms ease" }} />
                    <div style={{ fontSize: "0.6rem", color: "#94a3b8" }}>{dayLabel}</div>
                  </div>
                );
              })}
            </div>
          ) : (
            <div style={{ fontSize: "0.8rem", color: "#94a3b8", textAlign: "center", padding: "2rem 0" }}>No data this week</div>
          )}
        </div>

        {/* Visa Type Distribution */}
        <div className={s.chartCard}>
          <div className={s.chartTitle}>Visa Type Distribution</div>
          <div style={{ display: "flex", flexDirection: "column", gap: "0.5rem" }}>
            {(reportData?.by_visa || []).slice(0, 5).map((v, i) => {
              const colors = ["#16a34a", "#2563eb", "#7c3aed", "#d97706", "#dc2626"];
              const total = (reportData?.by_visa || []).reduce((a, x) => a + parseInt(x.count, 10), 0) || 1;
              const pct = Math.round((parseInt(v.count, 10) / total) * 100);
              const label = v.visa_type.charAt(0).toUpperCase() + v.visa_type.slice(1);
              return (
                <div key={v.visa_type} style={{ display: "flex", alignItems: "center", gap: "0.5rem" }}>
                  <div style={{ width: "8px", height: "8px", borderRadius: "2px", background: colors[i % colors.length], flexShrink: 0 }} />
                  <div style={{ flex: 1, fontSize: "0.75rem", color: "#64748b" }}>{label}</div>
                  <div style={{ fontSize: "0.75rem", fontWeight: 700, color: "#0f172a", minWidth: "30px", textAlign: "right" }}>{pct}%</div>
                  <div style={{ width: "80px", height: "6px", background: "#f1f5f9", borderRadius: "99px", overflow: "hidden", flexShrink: 0 }}>
                    <div style={{ height: "100%", width: `${pct}%`, background: colors[i % colors.length], borderRadius: "99px" }} />
                  </div>
                </div>
              );
            })}
            {(reportData?.by_visa || []).length === 0 && (
              <div style={{ fontSize: "0.8rem", color: "#94a3b8", textAlign: "center", padding: "1rem" }}>No data yet</div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
