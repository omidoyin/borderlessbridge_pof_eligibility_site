import styles from "./Footer.module.css";

export default function Footer() {
  return (
    <footer className={styles.footer}>
      <div className="container">
        <div className={styles.top}>
          {/* Brand */}
          <div className={styles.brand}>
            <div className={styles.logoMark}>
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <circle cx="12" cy="12" r="10" />
                <path d="M2 12h20M12 2a15.3 15.3 0 0 1 4 10 15.3 15.3 0 0 1-4 10 15.3 15.3 0 0 1-4-10 15.3 15.3 0 0 1 4-10z" />
              </svg>
            </div>
            <div>
              <p className={styles.brandName}>BorderlessBridge</p>
              <p className={styles.brandTag}>Professional POF Support</p>
            </div>
          </div>
          <p className={styles.tagline}>
            Helping visa applicants meet embassy Proof of Funds requirements —
            professionally, confidentially, and efficiently.
          </p>
        </div>

        <div className={styles.divider} />

        <div className={styles.bottom}>
          <p className={styles.copy}>
            © {new Date().getFullYear()} BorderlessBridge. All rights reserved.
          </p>
          <p className={styles.disclaimer}>
            This service provides documentation support only and does not
            guarantee visa approval. Results depend on individual circumstances
            and embassy discretion.
          </p>
        </div>
      </div>
    </footer>
  );
}
