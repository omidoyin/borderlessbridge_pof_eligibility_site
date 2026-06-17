"use client";

import styles from "./PreCloseSection.module.css";

const forYou = [
  "You have a chosen destination country (UK, Canada, USA, Europe, etc.).",
  "You are actively preparing your visa application.",
  "You want a professional, confidential, and legitimate process.",
  "You are ready to start within the next few weeks.",
];

const notForYou = [
  "You are looking for cheap, fake, or photoshopped bank statements which can lead to issues.",
  "You want an instant, automated tool that risks getting you a 10-year embassy ban.",
  "You are just browsing and don't have an active application timeline.",
];

export default function PreCloseSection() {
  const scrollToForm = () => {
    document
      .getElementById("eligibility-form")
      ?.scrollIntoView({ behavior: "smooth" });
  };

  return (
    <section className="section">
      <div className="container">
        {/* Eyebrow */}
        <span className="eyebrow text-center" style={{ display: "block" }}>Eligibility Check</span>
        <h2 className={`heading-lg ${styles.heading}`} style={{ textAlign: "center", margin: "0.5rem auto 1rem" }}>
          Before You Continue
        </h2>
        <p style={{ textAlign: "center", color: "#cbd5e1", marginBottom: "2.5rem", fontSize: "1.1rem" }}>
          We work with serious applicants only.
        </p>

        <div className={styles.grid}>
          {/* For you */}
          <div className={`${styles.card} ${styles.forCard}`}>
            <div className={styles.cardHeader}>
              <div className={styles.iconGreen}>
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3">
                  <polyline points="20 6 9 17 4 12" />
                </svg>
              </div>
              <h3 className={styles.cardTitle}>This is for you if...</h3>
            </div>
            <ul className={styles.list}>
              {forYou.map((item) => (
                <li className={styles.listItem} key={item}>
                  <span className={styles.checkMark}>✓</span>
                  <span>{item}</span>
                </li>
              ))}
            </ul>
          </div>

          {/* Not for you */}
          <div className={`${styles.card} ${styles.notCard}`}>
            <div className={styles.cardHeader}>
              <div className={styles.iconRed}>
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3">
                  <line x1="18" y1="6" x2="6" y2="18" />
                  <line x1="6" y1="6" x2="18" y2="18" />
                </svg>
              </div>
              <h3 className={styles.cardTitle}>Skip this if...</h3>
            </div>
            <ul className={styles.list}>
              {notForYou.map((item) => (
                <li className={`${styles.listItem} ${styles.listItemMuted}`} key={item}>
                  <span className={styles.crossMark}>✗</span>
                  <span>{item}</span>
                </li>
              ))}
            </ul>
          </div>
        </div>

        {/* Bridge text → form */}
        <div className={styles.bridge}>
          <p className={styles.bridgeText}>
            If that&apos;s you, congratulations, you&apos;re a step ahead.  complete the quick eligibility check below.
          </p>
          <button
            id="pre-close-cta"
            className={`btn-primary ${styles.bridgeBtn}`}
            onClick={scrollToForm}
          >
            Complete the Assessment
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
              <path d="M12 5v14M5 12l7 7 7-7" />
            </svg>
          </button>
        </div>
      </div>
    </section>
  );
}

