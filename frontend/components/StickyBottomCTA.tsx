"use client";
import styles from "./StickyBottomCTA.module.css";

export default function StickyBottomCTA() {
  const scrollToForm = () => {
    document
      .getElementById("eligibility-form")
      ?.scrollIntoView({ behavior: "smooth" });
  };

  return (
    <div className={styles.bar} role="complementary" aria-label="Quick access CTA">
      <div className={styles.inner}>
        <div className={styles.left}>
          <p className={styles.label}>Free eligibility assessment</p>
          <p className={styles.meta}>60 seconds &nbsp;·&nbsp; No commitment</p>
        </div>
        <button
          id="sticky-cta-btn"
          className={styles.btn}
          onClick={scrollToForm}
          aria-label="Check my eligibility"
        >
          Check My Eligibility
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
            <path d="M5 12h14M12 5l7 7-7 7" />
          </svg>
        </button>
      </div>
    </div>
  );
}
