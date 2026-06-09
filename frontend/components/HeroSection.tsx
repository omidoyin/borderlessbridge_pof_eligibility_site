import styles from "./HeroSection.module.css";

export default function HeroSection() {
  return (
    <section className={styles.hero}>
      <div className={`container ${styles.inner}`}>
        {/* Eyebrow badge */}
        <div className={styles.badge}>
          <span className={styles.badgeDot} />
          <span>Proof of Funds · Study · Work · Travel</span>
        </div>

        {/* Headline */}
        <h1 className={`heading-xl ${styles.headline}`}>
          Meet Embassy Proof of Funds Requirements{" "}
          <em className={styles.headlineAccent}>Without Tying Up Your Savings.</em> <span className={styles.warningText}>In Just 2 Weeks</span>
        </h1>

        {/* Subheadline */}
        <p className={styles.sub}>
          Fast, confidential, and professionally managed Proof of Funds support
          for study, work, and travel visa applications.
        </p>

        {/* Rating row for quick trust build */}
        <div className="rating-row">
          <div className="rating-stars">
            <span>★</span><span>★</span><span>★</span><span>★</span><span>★</span>
          </div>
          <span><strong>4.9/5</strong> rated by 500+ successful visa applicants</span>
        </div>

        {/* CTA row */}
        <div className={styles.ctaRow}>
          <a href="#eligibility-form" className={`btn-primary btn-lg ${styles.ctaBtn}`} id="hero-cta">
            Check My Eligibility
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
              <path d="M5 12h14M12 5l7 7-7 7" />
            </svg>
          </a>
          <p className={styles.ctaMeta}>
            Free assessment &nbsp;·&nbsp; No commitment required
          </p>
        </div>

        {/* Trust indicators */}
        <div className={styles.trustRow}>
          {[
            { icon: "⚡", text: "Fast Processing" },
            { icon: "🔒", text: "100% Confidential" },
            { icon: "🌍", text: "All Visa Types" },
          ].map((t) => (
            <div className={styles.trustChip} key={t.text}>
              <span>{t.icon}</span>
              <span>{t.text}</span>
            </div>
          ))}
        </div>
      </div>

      {/* Decorative elements */}
      <div className={styles.orbTop} aria-hidden />
      <div className={styles.orbBottom} aria-hidden />
    </section>
  );
}
