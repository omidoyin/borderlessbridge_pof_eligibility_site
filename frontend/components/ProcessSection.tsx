import styles from "./ProcessSection.module.css";

export default function ProcessSection() {
  const steps = [
    {
      num: "01",
      title: "Check you eligibility (60 Seconds)",
      desc: "Fill out the quick eligibility form below with your target country and timeline.",
    },
    {
      num: "02",
      title: "Get Your Custom Plan on WhatsApp",
      desc: "Our system securely routes your details back to our chat, where a dedicated specialist will ping you with a tailored strategy.",
    },
    {
      num: "03",
      title: "Secure Your Documentation",
      desc: "We legally structure, verify, and issue your embassy-ready proof of funds within 14 days.",
    },
  ];

  return (
    <section className="section">
      <div className="container">
        {/* Header */}
        <div className={styles.header}>
          {/* <span className="eyebrow text-center">Process Blueprint</span> */}
          <h2 className={`heading-lg ${styles.heading}`}>
            How It Works
          </h2>
          <p className={styles.intro}>
            From assessment to embassy-ready in 3 simple steps
          </p>
        </div>

        {/* Steps */}
        <div className={styles.steps}>
          {steps.map((step) => (
            <div className={styles.stepCard} key={step.num}>
              <div className={styles.stepNumber}>{step.num}</div>
              <div className={styles.stepContent}>
                <h3 className={styles.stepTitle}>{step.title}</h3>
                <p className={styles.stepDesc}>{step.desc}</p>
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
