import styles from "./TrustBar.module.css";

const reasons = [
  {
    icon: (
      <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
        <path d="M21 16V8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16z" />
        <polyline points="3.27 6.96 12 12.01 20.73 6.96" />
        <line x1="12" y1="22.08" x2="12" y2="12" />
      </svg>
    ),
    title: "Embassy-Ready Docs",
    desc: "Verified financial documentation tailored to your specific destination's strict rules.",
  },
  {
    icon: (
      <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
        <rect x="3" y="11" width="18" height="11" rx="2" ry="2" />
        <path d="M7 11V7a5 5 0 0 1 10 0v4" />
      </svg>
    ),
    title: "100% Confidential",
    desc: "Your personal, financial, and application details are strictly protected.",
  },
  {
    icon: (
      <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
        <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" />
      </svg>
    ),
    title: "Verification Guarantee",
    desc: "Fully legitimate channels built to pass rigorous embassy verification checks.",
  },
  {
    icon: (
      <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
        <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z" />
      </svg>
    ),
    title: "Direct Specialist Support",
    desc: "No automated bots. You get paired with a dedicated documentation expert on WhatsApp.",
  },
];

export default function TrustBar() {
  return (
    <section className={styles.section}>
      <div className="container">
        <span className="eyebrow text-center" style={{ display: "block" }}>
          Why Applicants Trust BorderlessBridge
        </span>
        <h2 className={`heading-md ${styles.heading}`}>
          The authoritative name in immigration documentation support
        </h2>

        <div className={styles.grid}>
          {reasons.map((r) => (
            <div className={styles.card} key={r.title}>
              <div className={styles.iconWrap}>{r.icon}</div>
              <div>
                <h3 className={styles.cardTitle}>{r.title}</h3>
                <p className={styles.cardDesc}>{r.desc}</p>
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

