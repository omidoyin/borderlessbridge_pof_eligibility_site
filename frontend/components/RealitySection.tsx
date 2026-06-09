'use client'
import styles from "./RealitySection.module.css";
import Image from "next/image";

export default function RealitySection() {
  return (
    <section className={`section-dark ${styles.section} container`}>
        <div className="md:w-1/2 relative bg-slate-100 h-full">
              <img src="/Testimonial_Barry.jpeg" alt="Lead Trainer Omidoyin Ayodeji" className=" inset-0 w-full h-full object-cover" onError={(e) => { e.currentTarget.src = "https://i.pravatar.cc/300?u=ayodeji" }} />
              <div className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-slate-900 via-slate-900/60 to-transparent p-6 text-white">
                 <h3 className="text-xl font-serif font-black leading-tight uppercase">Barry</h3>
                 <p className="text-orange-500 font-black uppercase tracking-widest text-[9px]">Cohort 2 Student</p>
              </div>
           </div>



      <div className="container">
        <span className={`eyebrow eyebrow-green text-center `} style={{ display: "block" }}>
          Applying for a Visa?
        </span>

        <h2 className={`heading-lg ${styles.headline}`}>
          Your financial documentation is one of the first things an embassy reviews.
        </h2>

        <div className={styles.warningCard}>
          <div className={styles.warningIcon}>
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
              <path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z" />
              <line x1="12" y1="9" x2="12" y2="13" />
              <line x1="12" y1="17" x2="12.01" y2="17" />
            </svg>
          </div>
          <p className={styles.warningText}>
            <strong>THE BRUTAL TRUTH:</strong> A poorly prepared Proof of Funds can{" "}
            <strong>delay your application</strong>, create unnecessary questions,
            or <strong>weaken an otherwise strong file.</strong>
          </p>
        </div>

        <p className={styles.solution}>
          That&apos;s why we help serious applicants prepare embassy-ready Proof of Funds
          documentation through a <em>clear, structured process</em> — so your
          visa file speaks for itself.
        </p>

        {/* Real Client Proof — WhatsApp Screenshot Mockup */}
        {/* <div className="wa-chat-mockup">
          <div className="wa-chat-header">
            <div className="wa-chat-avatar">AD</div>
            <div className="wa-chat-user">
              <span className="wa-chat-name">Akande Daniel</span>
              <span className="wa-chat-status">Verified Visa Applicant</span>
            </div>
          </div>
          <div className="wa-bubble wa-bubble-client">
            Hi BorderlessBridge, just wanted to say thank you! Got my Canada Study Visa approved today. The embassy had zero questions about my Proof of Funds. You saved my application! 🙏
            <div className="wa-time">11:15 AM</div>
          </div>
          <div className="wa-bubble wa-bubble-agent">
            Congratulations Daniel! We are absolutely thrilled to hear that. Best of luck as you start your classes! 🇨🇦✈️
            <div className="wa-time">11:18 AM</div>
          </div>
        </div> */}

          <div className="md:w-1/2 relative bg-slate-100 h-full container">
              <img src="/Testimonial_Barry.jpeg" alt="Lead Trainer Omidoyin Ayodeji" className=" inset-0 w-full h-full object-cover" onError={(e) => { e.currentTarget.src = "https://i.pravatar.cc/300?u=ayodeji" }} />
              <div className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-slate-900 via-slate-900/60 to-transparent p-6 text-white">
                 <h3 className="text-xl font-serif font-black leading-tight uppercase">Barry</h3>
                 <p className="text-orange-500 font-black uppercase tracking-widest text-[9px]">Cohort 2 Student</p>
              </div>
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
