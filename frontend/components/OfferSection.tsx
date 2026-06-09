import styles from "./OfferSection.module.css";

const items = [
  {
    title: "Full Proof of Funds Support",
    desc: "End-to-end preparation of your embassy-ready POF documentation.",
  },
  {
    title: "Free Consultation",
    desc: "No-cost initial call to understand your situation and visa requirements.",
  },
  {
    title: "Country-Specific Guidance",
    desc: "Tailored advice based on the exact embassy and destination you're applying to.",
  },
  {
    title: "Documentation Review",
    desc: "We review your documents before submission to catch any issues early.",
  },
  {
    title: "Dedicated WhatsApp Support",
    desc: "Direct access to your assigned specialist via WhatsApp throughout the process.",
  },
];

export default function OfferSection() {
  return (
    <section className="section">
      <div className="container">
        {/* Header */}
        <div className={styles.header}>
          <span className="eyebrow">What You Get</span>
          <h2 className={`heading-lg ${styles.heading}`}>
            Everything you need to meet embassy standards
          </h2>
          <p className={styles.intro}>
            We handle the complexity so you can focus on preparing for your
            new chapter. Here&apos;s exactly what&apos;s included:
          </p>
        </div>

        {/* Items list */}
        <div className={styles.list}>
          {items.map((item, i) => (
            <div className={styles.item} key={item.title}>
              <div className={styles.number}>0{i + 1}</div>
              <div className={styles.content}>
                <div className={styles.itemHeader}>
                  <div className={styles.checkCircle}>
                    <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3">
                      <polyline points="20 6 9 17 4 12" />
                    </svg>
                  </div>
                  <h3 className={styles.itemTitle}>{item.title}</h3>
                </div>
                <p className={styles.itemDesc}>{item.desc}</p>
              </div>
            </div>
          ))}
        </div>

        {/* Bottom callout */}
        <div className={styles.callout}>
          <p className={styles.calloutText}>
            All services are handled by experienced immigration documentation
            specialists — not automated tools.
          </p>
        </div>
      </div>
    </section>
  );
}
