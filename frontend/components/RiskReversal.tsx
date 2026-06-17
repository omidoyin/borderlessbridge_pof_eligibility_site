"use client";
import styles from "./RiskReversal.module.css";

const commitments = [
  {
    title: "100% Embassy-Verifiable Guarantee",
    icon: (
      <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
        <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" />
      </svg>
    ),
    desc: "Every single document we support is authentic, legally backed, and ready for embassy verification checks. We never use unbacked statements.",
  },
  {
    title: "Complete Application Re-run Support",
    icon: (
      <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
        <path d="M21.5 2v6h-6M21.34 15.57a10 10 0 1 1-.57-8.38l5.67-5.67" />
      </svg>
    ),
    desc: "In the rare event that an embassy requests a structural change or resubmissions on your financial files, our team will re-structure and re-issue your documentation at zero extra cost to ensure your next attempt is seamless.",
  },
  {
    title: "Total Accountability",
    icon: (
      <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
        <rect x="2" y="7" width="20" height="14" rx="2" ry="2" />
        <path d="M16 21V5a2 2 0 0 0-2-2h-4a2 2 0 0 0-2 2v16" />
      </svg>
    ),
    desc: "If an application is rejected due to a clerical error on our part, we don't hide behind fine print. We will issue a full refund of our service fees. No hassles, no arguments.",
  },
];

export default function RiskReversal() {
  return (
    <section className={styles.section}>
      <div className="container">
        <div className={styles.inner}>
          {/* Header */}
          <div className={styles.header}>
            <span className="eyebrow eyebrow-green">Guarantee</span>
            <h2 className={`heading-lg ${styles.heading}`}>
              Our Risk-Free Success Guarantee
            </h2>
            <p className={styles.intro}>
              Because we thoroughly vet every applicant before taking them on, we stand completely behind our documentation. We don’t just handle paperwork; we partner in your success.
            </p>
          </div>

          {/* Commitment cards */}
          <div className={styles.cards}>
            {commitments.map((c) => (
              <div className={styles.card} key={c.title}>
                <div className={styles.shield}>
                  {c.icon}
                </div>
                <div>
                  <h3 className={styles.cardTitle}>{c.title}</h3>
                  <p className={styles.cardDesc}>{c.desc}</p>
                </div>
              </div>
            ))}
          </div>

          {/* Section 7 - Social Proof & Executive Authority */}
          <div className={styles.inner} style={{ marginTop: "4rem" }}>
            {/* <span className="eyebrow">Social Proof & Executive Authority</span> */}
            <h2 className={`heading-md`} style={{ color: "#ffffff", marginBottom: "1.5rem" }}>
              Real Approvals. Real Experts.
            </h2>

            {/* Testimonial card */}
            <div className={styles.quoteCard}>
              <div className={styles.quoteProfile}>
                <div className={styles.quotePhoto}>
                  <span>BJ</span>
                </div>
                <div className={styles.quoteUserInfo}>
                  <h4 className={styles.quoteUserName}>Barry Jude</h4>
                  <span className={styles.quoteUserStatus}>UK Student Visa Approved</span>
                </div>
              </div>
              <p className={styles.quoteText}>
                &ldquo;I had a great experience with BorderlessBridge. The documentation was 100% accurate, easy to understand, and highly professional. Gained my visa without tying up my family savings.&rdquo;
              </p>
            </div>

            {/* Executive Authority block */}
            <div className={styles.authorityBlock}>
              <p className={styles.authorityLabel}>Vetted under the supervision of:</p>
              <div className={styles.authorityCard}>
                <div className={styles.authorityHeader}>
                  <div className={styles.authorityAvatar}>OA</div>
                  <div className={styles.authorityMeta}>
                    <h4 className={styles.authorityName}>Omidoyin Ayodeji</h4>
                    <span className={styles.authorityTitle}>Head of Documentation & Compliance, BorderlessBridge</span>
                  </div>
                </div>
                <p className={styles.authorityQuote}>
                  &ldquo;We built BorderlessBridge because we saw too many qualified applicants lose their relocation opportunities simply because they didn&apos;t structure their proof of funds correctly. We treat your application with the same precision we would use for our own family.&rdquo;
                </p>
              </div>
            </div>
          </div>

          {/* Reassurance line */}
          <div className={styles.reassurance} style={{ marginTop: "3rem" }}>
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
              <polyline points="20 6 9 17 4 12" />
            </svg>
            <p>
              No hidden conditions. No fine print traps. Just a straightforward commitment to doing right by our clients.
            </p>
          </div>
        </div>
      </div>
    </section>
  );
}

