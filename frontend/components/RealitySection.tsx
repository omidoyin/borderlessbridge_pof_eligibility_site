import styles from "./RealitySection.module.css";

export default function RealitySection() {
  return (
    <section className={`section-dark ${styles.section}`}>
      <div className="container">
        {/* <span className={`eyebrow text-center`} style={{ display: "block" }}>
          The Cost of Failure
        </span> */}

        <h2 className={`heading-lg ${styles.headline}`}>
          Your financial documentation is one of the first things an embassy reviews.
        </h2>

        <p className={styles.solution}>
          A visa application isn&apos;t just paperwork—it’s your future. Yet, thousands of brilliant applicants get rejected every year for one single reason: unverified, poorly structured, or questionable financial documentation.
        </p>

        <p className={styles.solution}>
          Embassies are harsher than ever. If your Proof of Funds looks unbacked or suspicious, you face immediate, devastating consequences:
        </p>

        <div className={styles.list}>
          <div className={styles.listItem}>
            <span className={styles.listItemIcon}>❌</span>
            <div className={styles.listItemContent}>
              <h3 className={styles.listItemTitle}>Denied Visas & Forfeited Fees</h3>
              <p className={styles.listItemDesc}>Your embassy fees, school deposits, and application expenses? Gone. You start back at square one with a refusal on your record.</p>
            </div>
          </div>

          <div className={styles.listItem}>
            <span className={styles.listItemIcon}>❌</span>
            <div className={styles.listItemContent}>
              <h3 className={styles.listItemTitle}>The &quot;Fake Agent&quot; Trap</h3>
              <p className={styles.listItemDesc}>If you use shady, unverified bank statements from cheap internet vendors, embassy verification checks will flag them instantly.</p>
            </div>
          </div>

          <div className={styles.listItem}>
            <span className={styles.listItemIcon}>❌</span>
            <div className={styles.listItemContent}>
              <h3 className={styles.listItemTitle}>A Nightmare 5 to 10-Year Ban</h3>
              <p className={styles.listItemDesc}>Being flagged for fraudulent documents doesn&apos;t just mean a rejection—it means a permanent blackmark and a multi-year ban from entering your target country.</p>
            </div>
          </div>
        </div>

        <div className={styles.callout}>
          <p className={styles.calloutText}>
            &gt; Don&apos;t gamble with your relocation dreams just to save a few weeks or a few bucks. Do it right the first time.
          </p>
        </div>

        {/* Stats row */}
        <div className={styles.statsRow}>
          {[
            { num: "500+", label: "Applications Supported" },
            { num: "48hrs", label: "Avg. Turnaround" },
            { num: "3+", label: "Visa Categories" },
          ].map((s) => (
            <div className={styles.stat} key={s.label}>
              <div className="stat-number">{s.num}</div>
              <div className="stat-label">{s.label}</div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

