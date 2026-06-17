"use client";
import { useState, useEffect } from "react";
import styles from "./Navbar.module.css";

export default function Navbar() {
  const [scrolled, setScrolled] = useState(false);

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 20);
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  const scrollToForm = () => {
    document.getElementById("eligibility-form")?.scrollIntoView({ behavior: "smooth" });
  };

  return (
    <header className={`${styles.header} ${scrolled ? styles.scrolled : ""}`}>
      {/* High-urgency top announcement bar */}
      <div className={styles.announcement}>
        {/* <span className={styles.announcementDot} /> */}
        {/* <span>⚡ Meet Embassy Proof of Funds Requirements — in just 2 weeks ⏳</span> */}
      </div>

      <div className={styles.inner}>
        {/* Logo */}
        <a href="#" className={styles.logo}>
          <div className={styles.logoMark}>
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none">
              <circle cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="2" />
              <path d="M2 12h20M12 2a15.3 15.3 0 0 1 4 10 15.3 15.3 0 0 1-4 10 15.3 15.3 0 0 1-4-10 15.3 15.3 0 0 1 4-10z" stroke="currentColor" strokeWidth="2" />
            </svg>
          </div>
          <div className={styles.logoText}>
            <span className={styles.logoName}>BorderlessBridge</span>
            <span className={styles.logoSub}>POF Specialists</span>
          </div>
        </a>

        {/* CTA */}
        <button id="navbar-cta" className={styles.navCta} onClick={scrollToForm}>
          Check My Eligibility
        </button>
      </div>
    </header>
  );
}
