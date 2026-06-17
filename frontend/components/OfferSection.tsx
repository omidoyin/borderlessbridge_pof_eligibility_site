import styles from "./OfferSection.module.css";

const items = [
  {
    title: "Complete Embassy-Ready POF",
    desc: "End-to-end preparation of legally backed, verifiable POF that meets strict immigration standards.",
  },
  {
    title: "Free Consultation",
    desc: "No-cost initial call to understand your situation and visa requirements."},
  {
    title: "Country-Specific Policy Alignment",
    desc: "Tailored structuring based on the exact current rules of your destination country (whether it’s Canada's IRCC, UKVI, or European alternatives).",
  },
  {
    title: "Documentation Review",
    desc: "A rigorous review of your financial profile before you hit submit to catch and eliminate red flags early.",
  },
  {
    title: "Priority WhatsApp Hotline",
    desc: "Direct, continuous access to your assigned specialist on WhatsApp so you can get fast answers whenever you have questions.",
  },
];

export default function OfferSection() {
  return (
    <section className="section">
      <div className="container" >
        {/* Header */}
        <div className={`${styles.header} `} style={{display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center'}}>
          {/* <span className="eyebrow">Portfolio</span> */}
          <h2 className={`heading-lg ${styles.heading}`}>
            What you get
          </h2>
          <p className={styles.intro}>
            We handle the administrative complexity so you can focus on packing your bags.
          </p>
        </div>
        

        {/* Items list */}
        <div className={styles.list} >
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

