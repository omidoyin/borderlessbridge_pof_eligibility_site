import styles from "./TrustBar.module.css";

const reasons = [
  {
    icon: (
      <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
        <path d="M13 2L3 14h9l-1 8 10-12h-9l1-8z" />
      </svg>
    ),
    title: "Fast Processing",
    desc: "Embassy-ready documentation prepared quickly and efficiently.",
  },
  {
    icon: (
      <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
        <rect x="3" y="11" width="18" height="11" rx="2" ry="2" />
        <path d="M7 11V7a5 5 0 0 1 10 0v4" />
      </svg>
    ),
    title: "Confidential Handling",
    desc: "Your financial information is handled with strict discretion.",
  },
  {
    icon: (
      <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
        <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2" />
        <circle cx="9" cy="7" r="4" />
        <path d="M23 21v-2a4 4 0 0 0-3-3.87M16 3.13a4 4 0 0 1 0 7.75" />
      </svg>
    ),
    title: "Dedicated Support",
    desc: "A specialist is assigned to guide you through every step.",
  },
  {
    icon: (
      <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
        <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z" />
      </svg>
    ),
    title: "Reprint Guarantee",
    desc: "Free reprint if your first application is refused on procedural grounds.",
  },
  {
    icon: (
      <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
        <polyline points="22 12 18 12 15 21 9 3 6 12 2 12" />
      </svg>
    ),
    title: "Transparent Process",
    desc: "Clear steps, no hidden costs, no confusion — just results.",
  },
];

export default function TrustBar() {
  return (
    <section className={styles.section}>
      <div className="container">
        <span className="eyebrow text-center" style={{ display: "block" }}>
          Why Applicants Choose BorderlessBridge
        </span>
        <h2 className={`heading-md ${styles.heading}`}>
          The trusted name in POF support
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
