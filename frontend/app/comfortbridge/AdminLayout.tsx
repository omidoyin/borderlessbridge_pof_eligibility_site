"use client";

import { useState } from "react";
import s from "./crm.module.css";

interface SidebarItemProps {
  label: string;
  active: boolean;
  onClick: () => void;
  icon: React.ReactNode;
  isSubItem?: boolean;
}

function SidebarItem({ label, active, onClick, icon, isSubItem = false }: SidebarItemProps) {
  return (
    <button
      onClick={onClick}
      className={`${s.sidebarItem} ${active ? s.sidebarItemActive : ""} ${isSubItem ? s.sidebarSubItem : ""}`}
    >
      <span className={s.sidebarItemIcon}>{icon}</span>
      {label}
    </button>
  );
}

interface AdminLayoutProps {
  activeView: string;
  setActiveView: (view: string) => void;
  children: React.ReactNode;
}

export default function AdminLayout({ activeView, setActiveView, children }: AdminLayoutProps) {
  const [showNotifications, setShowNotifications] = useState(false);
  const [notifications, setNotifications] = useState([
    { id: 1, title: "New Lead Created", desc: "Adebayo O. completed the eligibility check.", read: false, time: "5m ago" },
    { id: 2, title: "Task Assigned", desc: "Sales Head assigned task 'Call Adebayo' to you.", read: false, time: "1h ago" },
    { id: 3, title: "Strategy Call Booked", desc: "Adebayo O. booked for 4:00 PM tomorrow.", read: false, time: "2h ago" },
    { id: 4, title: "Payment Received", desc: "Ngozi E. completed payment reference #BB-9018.", read: true, time: "1d ago" },
  ]);

  const unreadCount = notifications.filter((n) => !n.read).length;

  const markAllRead = () => {
    setNotifications((prev) => prev.map((n) => ({ ...n, read: true })));
  };

  const getBreadcrumb = () => {
    switch (activeView) {
      case "crm-dashboard": return "CRM > Dashboard";
      case "crm-leads": return "CRM > Leads";
      case "crm-tasks": return "CRM > My Tasks";
      case "crm-reports": return "CRM > Reports";
      case "scheduling": return "Scheduling";
      case "settings": return "Settings";
      default: return "Dashboard";
    }
  };

  const getTitle = () => {
    switch (activeView) {
      case "crm-dashboard": return "CRM Dashboard";
      case "crm-leads": return "Sales Leads Workspace";
      case "crm-tasks": return "My Tasks Checklist";
      case "crm-reports": return "CRM Reports & Insights";
      case "scheduling": return "Sales Head Scheduling";
      case "settings": return "Global System Settings";
      default: return "ComfortBridge Admin";
    }
  };

  const getSubtitle = () => {
    switch (activeView) {
      case "crm-dashboard": return "Real-time pipeline analytics, daily summaries and task metrics.";
      case "crm-leads": return "Manage incoming leads, log details, update stages and assign sales reps.";
      case "crm-tasks": return "Checked actions assigned to your sales/ops queue.";
      case "crm-reports": return "Conversion metrics, visa types and country breakdowns.";
      case "scheduling": return "Connect Google Calendar and customize working days/hours.";
      case "settings": return "Configure notifications and global mail copy details.";
      default: return "Manage BorderlessBridge Operations.";
    }
  };

  // Icons
  const iconDash = <svg width="100%" height="100%" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2"><rect x="3" y="3" width="7" height="7" rx="1"/><rect x="14" y="3" width="7" height="7" rx="1"/><rect x="14" y="14" width="7" height="7" rx="1"/><rect x="3" y="14" width="7" height="7" rx="1"/></svg>;
  const iconLeads = <svg width="100%" height="100%" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2"><path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M23 21v-2a4 4 0 0 0-3-3.87"/><path d="M16 3.13a4 4 0 0 1 0 7.75"/></svg>;
  const iconTasks = <svg width="100%" height="100%" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2"><polyline points="9 11 12 14 22 4"/><path d="M21 12v7a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11"/></svg>;
  const iconReports = <svg width="100%" height="100%" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2"><line x1="18" y1="20" x2="18" y2="10"/><line x1="12" y1="20" x2="12" y2="4"/><line x1="6" y1="20" x2="6" y2="14"/></svg>;
  const iconSched = <svg width="100%" height="100%" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2"><rect x="3" y="4" width="18" height="18" rx="2" ry="2"/><line x1="16" y1="2" x2="16" y2="6"/><line x1="8" y1="2" x2="8" y2="6"/><line x1="3" y1="10" x2="21" y2="10"/></svg>;
  const iconSettings = <svg width="100%" height="100%" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2"><circle cx="12" cy="12" r="3"/><path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 1 1-2.83 2.83l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-4 0v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 1 1-2.83-2.83l.06-.06a1.65 1.65 0 0 0 .33-1.82 1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1 0-4h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 1 1 2.83-2.83l.06.06a1.65 1.65 0 0 0 1.82.33H9a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 4 0v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 1 1 2.83 2.83l-.06.06a1.65 1.65 0 0 0-.33 1.82V9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 0 4h-.09a1.65 1.65 0 0 0-1.51 1z"/></svg>;

  return (
    <div className={s.crmRoot}>
      {/* Desktop Sidebar */}
      <aside className={s.sidebar}>
        <div className={s.sidebarLogo}>
          <div className={s.sidebarLogoIcon}>
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#ffffff" strokeWidth="2.5">
              <polyline points="22 12 18 12 15 21 9 3 6 12 2 12"/>
            </svg>
          </div>
          <div>
            <div className={s.sidebarLogoText}>ComfortBridge</div>
            <div className={s.sidebarLogoSub}>ADMIN DASHBOARD</div>
          </div>
        </div>

        <nav className={s.sidebarNav}>
          <div className={s.sidebarSection}>
            <span className={s.sidebarSectionLabel}>CRM</span>
            <SidebarItem
              label="Dashboard"
              active={activeView === "crm-dashboard"}
              onClick={() => setActiveView("crm-dashboard")}
              icon={iconDash}
              isSubItem
            />
            <SidebarItem
              label="Leads"
              active={activeView === "crm-leads"}
              onClick={() => setActiveView("crm-leads")}
              icon={iconLeads}
              isSubItem
            />
            <SidebarItem
              label="My Tasks"
              active={activeView === "crm-tasks"}
              onClick={() => setActiveView("crm-tasks")}
              icon={iconTasks}
              isSubItem
            />
            <SidebarItem
              label="Reports"
              active={activeView === "crm-reports"}
              onClick={() => setActiveView("crm-reports")}
              icon={iconReports}
              isSubItem
            />
          </div>

          <div className={s.sidebarSection}>
            <span className={s.sidebarSectionLabel}>Scheduling</span>
            <SidebarItem
              label="Calendar & Setup"
              active={activeView === "scheduling"}
              onClick={() => setActiveView("scheduling")}
              icon={iconSched}
            />
          </div>

          <div className={s.sidebarSection}>
            <span className={s.sidebarSectionLabel}>Settings</span>
            <SidebarItem
              label="System Settings"
              active={activeView === "settings"}
              onClick={() => setActiveView("settings")}
              icon={iconSettings}
            />
          </div>
        </nav>

        <div className={s.sidebarFooter}>
          <div style={{ fontSize: "0.72rem", color: "#64748b", fontWeight: 600, padding: "0 0.5rem" }}>
            Sales Representative
          </div>
        </div>
      </aside>

      {/* Main Panel */}
      <div className={s.mainContent}>
        {/* Top Header */}
        <header className={s.topBar}>
          <div className={s.topBarLeft}>
            <div className={s.topBarBreadcrumb}>
              <span>BorderlessBridge</span>
              <span>/</span>
              <span>{getBreadcrumb()}</span>
            </div>
          </div>
          <div className={s.topBarRight}>
            {/* Notification Bell */}
            <div style={{ position: "relative" }}>
              <button
                className={s.notifBell}
                onClick={() => setShowNotifications((v) => !v)}
                title="Notifications"
              >
                <svg width="16" height="16" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2.5">
                  <path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9M13.73 21a2 2 0 0 1-3.46 0" />
                </svg>
                {unreadCount > 0 && <span className={s.notifDot} />}
              </button>

              {showNotifications && (
                <div
                  style={{
                    position: "absolute",
                    right: 0,
                    top: "42px",
                    width: "320px",
                    background: "#ffffff",
                    border: "1px solid #e2e8f0",
                    borderRadius: "10px",
                    boxShadow: "0 10px 25px -5px rgba(0, 0, 0, 0.1), 0 8px 10px -6px rgba(0, 0, 0, 0.1)",
                    zIndex: 1000,
                    overflow: "hidden",
                  }}
                >
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "0.75rem 1rem", borderBottom: "1px solid #e2e8f0", background: "#f8fafc" }}>
                    <span style={{ fontSize: "0.82rem", fontWeight: 700, color: "#0f172a" }}>Notifications</span>
                    {unreadCount > 0 && (
                      <button
                        onClick={markAllRead}
                        style={{ fontSize: "0.72rem", color: "#16a34a", fontWeight: 600, border: "none", background: "none", cursor: "pointer" }}
                      >
                        Mark all as read
                      </button>
                    )}
                  </div>
                  <div style={{ maxHeight: "250px", overflowY: "auto" }}>
                    {notifications.map((n) => (
                      <div
                        key={n.id}
                        style={{
                          padding: "0.75rem 1rem",
                          borderBottom: "1px solid #f1f5f9",
                          background: n.read ? "#ffffff" : "#f0fdf4",
                          display: "flex",
                          flexDirection: "column",
                          gap: "0.15rem",
                        }}
                      >
                        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                          <span style={{ fontSize: "0.78rem", fontWeight: n.read ? 600 : 700, color: "#0f172a" }}>{n.title}</span>
                          <span style={{ fontSize: "0.65rem", color: "#94a3b8" }}>{n.time}</span>
                        </div>
                        <span style={{ fontSize: "0.72rem", color: "#64748b", lineHeight: 1.35 }}>{n.desc}</span>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          </div>
        </header>

        {/* Main Content Area */}
        <main className={s.pageContent}>
          {/* Active View Header */}
          <div className={s.pageHeader}>
            <div className={s.pageHeaderLeft}>
              <h1 className={s.pageTitle}>{getTitle()}</h1>
              <p className={s.pageSubtitle}>{getSubtitle()}</p>
            </div>
          </div>

          {/* Children Renders */}
          {children}
        </main>
      </div>

      {/* Mobile Bottom Navigation Bar */}
      <div className={s.mobileNav}>
        <div className={s.mobileNavInner}>
          <button
            onClick={() => setActiveView("crm-dashboard")}
            className={`${s.mobileNavItem} ${activeView === "crm-dashboard" ? s.mobileNavItemActive : ""}`}
          >
            {iconDash}
            Dashboard
          </button>
          <button
            onClick={() => setActiveView("crm-leads")}
            className={`${s.mobileNavItem} ${activeView === "crm-leads" ? s.mobileNavItemActive : ""}`}
          >
            {iconLeads}
            Leads
          </button>
          <button
            onClick={() => setActiveView("crm-tasks")}
            className={`${s.mobileNavItem} ${activeView === "crm-tasks" ? s.mobileNavItemActive : ""}`}
          >
            {iconTasks}
            Tasks
          </button>
          <button
            onClick={() => setActiveView("crm-reports")}
            className={`${s.mobileNavItem} ${activeView === "crm-reports" ? s.mobileNavItemActive : ""}`}
          >
            {iconReports}
            Reports
          </button>
          <button
            onClick={() => setActiveView("scheduling")}
            className={`${s.mobileNavItem} ${activeView === "scheduling" ? s.mobileNavItemActive : ""}`}
          >
            {iconSched}
            Scheduling
          </button>
          <button
            onClick={() => setActiveView("settings")}
            className={`${s.mobileNavItem} ${activeView === "settings" ? s.mobileNavItemActive : ""}`}
          >
            {iconSettings}
            Settings
          </button>
        </div>
      </div>
    </div>
  );
}
