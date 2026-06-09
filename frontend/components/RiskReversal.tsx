import styles from "./RiskReversal.module.css";

const commitments = [
  {
    title: "Free Reprint For First Refusal",
    desc: "If your application is refused on eligible grounds, we reprint your documentation at no extra charge.",
  },
  {
    title: "Full Refund For Covered Procedural Fairness Issues",
    desc: "If we make an error on our part that affects your application's fairness, you receive a full refund.",
  },
  {
    title: "Support Throughout Your Application Process",
    desc: "Our commitment doesn't end at delivery. We stay available from submission to decision.",
  },
];

export default function RiskReversal() {
  return (
    <section className={styles.section}>
      <div className="container">
        <div className={styles.inner}>
          {/* Header */}
          <div className={styles.header}>
            <span className="eyebrow eyebrow-green">Our Commitment To You</span>
            <h2 className={`heading-lg ${styles.heading}`}>
              We stand behind our work — completely.
            </h2>
            <p className={styles.intro}>
              We only work with applicants we can genuinely help. And when we
              take on your case, we take full responsibility for our part.
            </p>
          </div>

          {/* Commitment cards */}
          <div className={styles.cards}>
            {commitments.map((c) => (
              <div className={styles.card} key={c.title}>
                <div className={styles.shield}>
                  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                    <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" />
                  </svg>
                </div>
                <div>
                  <h3 className={styles.cardTitle}>{c.title}</h3>
                  <p className={styles.cardDesc}>{c.desc}</p>
                </div>
              </div>
            ))}
          </div>

          {/* High-Contrast quote card review */}
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

          {/* Reassurance line */}
          <div className={styles.reassurance}>
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
              <polyline points="20 6 9 17 4 12" />
            </svg>
            <p>
              No hidden conditions. No fine print traps. Just a straightforward
              commitment to doing right by our clients.
            </p>
          </div>
        </div>
      </div>

       <div className="md:w-1/2 relative bg-slate-100 h-full container">
              <img src="/Testimonial_Barry.jpeg" alt="Lead Trainer Omidoyin Ayodeji" className=" inset-0 w-full h-full object-cover" onError={(e) => { e.currentTarget.src = "https://i.pravatar.cc/300?u=ayodeji" }} />
              <div className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-slate-900 via-slate-900/60 to-transparent p-6 text-white">
                 <h3 className="text-xl font-serif font-black leading-tight uppercase">Barry</h3>
                 <p className="text-orange-500 font-black uppercase tracking-widest text-[9px]">Cohort 2 Student</p>
              </div>
           </div>
    </section>
  );
}
