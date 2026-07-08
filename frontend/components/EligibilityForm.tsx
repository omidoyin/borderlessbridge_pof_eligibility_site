"use client";
import { useState, FormEvent } from "react";
import Link from "next/link";
import styles from "./EligibilityForm.module.css";

// ── Types ─────────────────────────────────────────────────────────────────────
interface FormData {
  fullName: string;
  email: string;
  phone: string;
  nationality: string;
  destination: string;
  visaType: string;
  timeline: string;
  knowsPofAmount: string;
  pofAmount: string;       // raw numeric string e.g. "80000000"
  lettersReceived: string[];
  accessToFunds: string;
  applyingWithin30Days: string;
  priorRefusal: string;
  heardFrom: string;
  additionalInfo: string;
}

interface FieldErrors {
  [key: string]: string;
}

interface EligibilityResult {
  eligible: boolean;
  score: number;
  priority: "High Priority" | "Medium Priority" | "Standard";
  reason?: string;
}

interface AvailabilityDay {
  date: string;          // YYYY-MM-DD
  allSlots: string[];
  takenSlots: string[];
}

interface BookingConfirmation {
  id: number;
  booked_date: string;
  booked_time: string;
}

type AppStatus =
  | "idle"
  | "loading"
  | "result"
  | "booking"
  | "bookingLoading"
  | "booked"
  | "error";

const API_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:4000";

// ── Eligibility evaluator ─────────────────────────────────────────────────────
function evaluateEligibility(form: FormData): EligibilityResult {
  const hasValidLetters =
    form.lettersReceived.length > 0 &&
    !form.lettersReceived.includes("None Yet");

  const validTimelines = ["within_30_days", "1_3_months", "3_6_months"];
  const hasValidTimeline = validTimelines.includes(form.timeline);

  const eligible =
    !!form.fullName.trim() &&
    !!form.email.trim() &&
    !!form.phone.trim() &&
    !!form.nationality.trim() &&
    !!form.destination &&
    !!form.visaType &&
    hasValidTimeline &&
    form.knowsPofAmount === "yes" &&
    hasValidLetters &&
    form.accessToFunds === "no" &&
    !!form.applyingWithin30Days &&
    !!form.priorRefusal;

  // Scoring
  let score = 0;
  if (form.timeline === "within_30_days") score += 30;
  else if (form.timeline === "1_3_months") score += 20;
  else if (form.timeline === "3_6_months") score += 10;
  if (form.priorRefusal === "no") score += 20;
  if (hasValidLetters) score += 20;

  const priority: EligibilityResult["priority"] =
    score >= 50 ? "High Priority" : score >= 30 ? "Medium Priority" : "Standard";

  let reason: string | undefined;
  if (!eligible) {
    if (!hasValidTimeline)
      reason = "Your intended application date is more than 6 months away. We work with applicants targeting sooner timelines.";
    else if (form.knowsPofAmount !== "yes")
      reason = "You need to already know your Proof of Funds requirement to proceed with our service.";
    else if (!hasValidLetters)
      reason = "You'll need at least one official letter (e.g. admission, CAS, or offer letter) before we can help.";
    else if (form.accessToFunds !== "no")
      reason = "Our service is designed for applicants who don't yet have access to the required funds.";
    else
      reason = "Based on your answers, you don't currently meet the criteria. Please reach out on WhatsApp for guidance.";
  }

  return { eligible, score, priority, reason };
}

// ── Naira formatting helpers ──────────────────────────────────────────────────
function formatNaira(raw: string): string {
  const digits = raw.replace(/\D/g, "");
  if (!digits) return "";
  return "₦ " + Number(digits).toLocaleString("en-NG");
}

function parseNairaToRaw(display: string): string {
  return display.replace(/\D/g, "");
}

// ── Date label helper ─────────────────────────────────────────────────────────
function formatDateLabel(dateStr: string): string {
  const d = new Date(dateStr + "T00:00:00");
  return d.toLocaleDateString("en-NG", {
    weekday: "short",
    day: "numeric",
    month: "short",
  });
}

function formatTime(t: string): string {
  const [h] = t.split(":");
  const hour = parseInt(h, 10);
  const suffix = hour >= 12 ? "PM" : "AM";
  const h12 = hour > 12 ? hour - 12 : hour === 0 ? 12 : hour;
  return `${h12}:00 ${suffix}`;
}

// ─────────────────────────────────────────────────────────────────────────────
export default function EligibilityForm() {
  const [form, setForm] = useState<FormData>({
    fullName: "",
    email: "",
    phone: "",
    nationality: "",
    destination: "",
    visaType: "",
    timeline: "",
    knowsPofAmount: "",
    pofAmount: "",
    lettersReceived: [],
    accessToFunds: "",
    applyingWithin30Days: "",
    priorRefusal: "",
    heardFrom: "",
    additionalInfo: "",
  });

  // Separate display value for Naira formatting
  const [pofDisplay, setPofDisplay] = useState("");

  const [errors, setErrors] = useState<FieldErrors>({});
  const [status, setStatus] = useState<AppStatus>("idle");
  const [submissionId, setSubmissionId] = useState<number | null>(null);
  const [eligibility, setEligibility] = useState<EligibilityResult | null>(null);

  // Booking state
  const [availability, setAvailability] = useState<AvailabilityDay[]>([]);
  const [selectedDate, setSelectedDate] = useState<string>("");
  const [selectedTime, setSelectedTime] = useState<string>("");
  const [bookingError, setBookingError] = useState<string>("");
  const [bookingConfirmed, setBookingConfirmed] = useState<BookingConfirmation | null>(null);

  // ── Validation ──────────────────────────────────────────────────────────────
  const validate = (): boolean => {
    const e: FieldErrors = {};
    if (!form.fullName.trim() || form.fullName.trim().length < 2)
      e.fullName = "Please enter your full name.";
    if (!form.email.trim() || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(form.email))
      e.email = "Please enter a valid email address.";
    if (!form.phone.trim() || form.phone.trim().length < 7)
      e.phone = "Please enter your WhatsApp number (with country code).";
    if (!form.nationality.trim())
      e.nationality = "Please enter your nationality.";
    if (!form.destination)
      e.destination = "Please select your destination country.";
    if (!form.visaType)
      e.visaType = "Please select your visa type.";
    if (!form.timeline)
      e.timeline = "Please select your intended application timeline.";
    if (!form.knowsPofAmount)
      e.knowsPofAmount = "Please select an option.";
    if (form.knowsPofAmount === "yes" && !form.pofAmount.trim())
      e.pofAmount = "Please specify the Proof of Funds amount required.";
    if (!form.accessToFunds)
      e.accessToFunds = "Please select an option.";
    if (!form.applyingWithin30Days)
      e.applyingWithin30Days = "Please select an option.";
    if (!form.priorRefusal)
      e.priorRefusal = "Please select an option.";
    if (!form.heardFrom)
      e.heardFrom = "Please let us know how you heard about us.";

    setErrors(e);
    return Object.keys(e).length === 0;
  };

  // ── Handlers ────────────────────────────────────────────────────────────────
  const handleChange = (
    e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>
  ) => {
    const { name, value } = e.target;
    setForm((prev) => ({ ...prev, [name]: value }));
    if (errors[name]) setErrors((prev) => ({ ...prev, [name]: "" }));
  };

  const handlePofAmountChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const raw = parseNairaToRaw(e.target.value);
    const display = formatNaira(raw);
    setPofDisplay(display);
    setForm((prev) => ({ ...prev, pofAmount: raw }));
    if (errors.pofAmount) setErrors((prev) => ({ ...prev, pofAmount: "" }));
  };

  const handleCheckboxChange = (value: string) => {
    setForm((prev) => {
      let updated = [...prev.lettersReceived];
      if (value === "None Yet") {
        updated = ["None Yet"];
      } else {
        updated = updated.filter((item) => item !== "None Yet");
        if (updated.includes(value)) {
          updated = updated.filter((item) => item !== value);
        } else {
          updated.push(value);
        }
      }
      return { ...prev, lettersReceived: updated };
    });
  };

  // ── Submit form ─────────────────────────────────────────────────────────────
  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    if (!validate()) {
      const firstKey = Object.keys(errors)[0];
      if (firstKey) {
        const el = document.getElementsByName(firstKey)[0] ||
                   document.getElementById(firstKey);
        el?.scrollIntoView({ behavior: "smooth", block: "center" });
      }
      return;
    }

    setStatus("loading");

    try {
      const res = await fetch(`${API_URL}/api/submissions`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          ...form,
          pofAmount: pofDisplay || form.pofAmount,
        }),
      });

      let data: { success?: boolean; id?: number; errors?: { field: string; message: string }[] } = {};
      try { data = await res.json(); } catch { /* ignore parse errors */ }

      if (!res.ok) {
        if (data.errors) {
          const apiErrors: FieldErrors = {};
          data.errors.forEach((err) => { apiErrors[err.field] = err.message; });
          setErrors(apiErrors);
          setStatus("idle");
          return;
        }
        throw new Error("Submission failed");
      }

      // Evaluate eligibility client-side
      const result = evaluateEligibility(form);
      setEligibility(result);
      setSubmissionId(data.id ?? null);

      // If eligible, pre-fetch availability
      if (result.eligible) {
        const avRes = await fetch(`${API_URL}/api/bookings/availability`);
        if (avRes.ok) {
          const avData = await avRes.json();
          setAvailability(avData.availability || []);
        }
      }

      setStatus("result");
    } catch {
      setStatus("error");
    }
  };

  // ── Book a call ─────────────────────────────────────────────────────────────
  const handleBooking = async () => {
    if (!selectedDate || !selectedTime) {
      setBookingError("Please select both a date and a time slot.");
      return;
    }
    setBookingError("");
    setStatus("bookingLoading");

    try {
      const res = await fetch(`${API_URL}/api/bookings`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          submissionId,
          fullName: form.fullName,
          email: form.email,
          phone: form.phone,
          bookedDate: selectedDate,
          bookedTime: selectedTime,
        }),
      });

      const data = await res.json();

      if (!res.ok) {
        setBookingError(data.message || "Something went wrong. Please try another slot.");
        setStatus("booking");
        // Refresh availability
        const avRes = await fetch(`${API_URL}/api/bookings/availability`);
        if (avRes.ok) {
          const avData = await avRes.json();
          setAvailability(avData.availability || []);
        }
        setSelectedTime("");
        return;
      }

      setBookingConfirmed(data.booking);
      setStatus("booked");
    } catch {
      setBookingError("Network error. Please try again.");
      setStatus("booking");
    }
  };

  // ── Selected date's slot data ────────────────────────────────────────────────
  const selectedDayData = availability.find((d) => d.date === selectedDate);

  // ─────────────────────────────────────────────────────────────────────────────
  // ── RENDER: Booked confirmation ───────────────────────────────────────────
  if (status === "booked" && bookingConfirmed) {
    const d = new Date(bookingConfirmed.booked_date + "T00:00:00");
    const dateLabel = d.toLocaleDateString("en-NG", {
      weekday: "long", day: "numeric", month: "long", year: "numeric",
    });
    return (
      <section id="eligibility-form" className={styles.section}>
        <div className="container">
          <div className={styles.confirmedCard}>
            <div className={styles.confirmedIconWrap}>
              <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                <polyline points="20 6 9 17 4 12" />
              </svg>
            </div>
            <h3 className={styles.confirmedTitle}>Your Call is Booked! 🎉</h3>
            <p className={styles.confirmedSub}>
              A BorderlessBridge specialist will call you at the time below. Please keep your phone available.
            </p>
            <div className={styles.bookingSummary}>
              <div className={styles.summaryRow}>
                <span className={styles.summaryLabel}>📅 Date</span>
                <span className={styles.summaryValue}>{dateLabel}</span>
              </div>
              <div className={styles.summaryRow}>
                <span className={styles.summaryLabel}>⏰ Time</span>
                <span className={styles.summaryValue}>{formatTime(bookingConfirmed.booked_time)} (WAT)</span>
              </div>
              <div className={styles.summaryRow}>
                <span className={styles.summaryLabel}>👤 Name</span>
                <span className={styles.summaryValue}>{form.fullName}</span>
              </div>
              <div className={styles.summaryRow}>
                <span className={styles.summaryLabel}>📞 Phone</span>
                <span className={styles.summaryValue}>{form.phone}</span>
              </div>
            </div>
            <p className={styles.confirmedNote}>
              📧 A confirmation will be sent to <strong>{form.email}</strong>. If you need to reschedule, contact us on WhatsApp.
            </p>
          </div>
        </div>
      </section>
    );
  }

  // ── RENDER: Booking panel ─────────────────────────────────────────────────
  if ((status === "booking" || status === "bookingLoading") && eligibility?.eligible) {
    return (
      <section id="eligibility-form" className={styles.section}>
        <div className="container">
          <div className={styles.bookingCard}>
            <div className={styles.bookingHeader}>
              <div className={styles.eligibleBadge}>✅ Eligible</div>
              <h3 className={styles.bookingTitle}>Book Your Strategy Call</h3>
              <p className={styles.bookingSub}>
                Choose an available date and time below. Mon–Sat, 9 AM – 5 PM (WAT).
              </p>
            </div>

            {/* Date selector */}
            <div className={styles.bookingSection}>
              <p className={styles.bookingLabel}>Select a date</p>
              <div className={styles.dateGrid}>
                {availability.map((day) => {
                  const availableCount = day.allSlots.length - day.takenSlots.length;
                  const isFull = availableCount === 0;
                  return (
                    <button
                      key={day.date}
                      type="button"
                      disabled={isFull}
                      onClick={() => { setSelectedDate(day.date); setSelectedTime(""); }}
                      className={`${styles.dateBtn} ${selectedDate === day.date ? styles.dateBtnActive : ""} ${isFull ? styles.dateBtnFull : ""}`}
                    >
                      <span className={styles.dateBtnDay}>{formatDateLabel(day.date)}</span>
                      {!isFull && <span className={styles.dateBtnSlots}>{availableCount} slot{availableCount !== 1 ? "s" : ""}</span>}
                      {isFull && <span className={styles.dateBtnFull}>Full</span>}
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Time slot selector */}
            {selectedDate && selectedDayData && (
              <div className={styles.bookingSection}>
                <p className={styles.bookingLabel}>Select a time slot</p>
                <div className={styles.slotGrid}>
                  {selectedDayData.allSlots.map((slot) => {
                    const isTaken = selectedDayData.takenSlots.includes(slot);
                    return (
                      <button
                        key={slot}
                        type="button"
                        disabled={isTaken}
                        onClick={() => !isTaken && setSelectedTime(slot)}
                        className={`${styles.slotBtn} ${selectedTime === slot ? styles.slotBtnActive : ""} ${isTaken ? styles.slotBtnTaken : ""}`}
                      >
                        {formatTime(slot)}
                        {isTaken && <span className={styles.slotTakenLabel}> · Taken</span>}
                      </button>
                    );
                  })}
                </div>
              </div>
            )}

            {bookingError && (
              <div className={styles.bookingError}>{bookingError}</div>
            )}

            <div className={styles.bookingActions}>
              <button
                type="button"
                onClick={() => setStatus("result")}
                className={styles.backBtn}
              >
                ← Back
              </button>
              <button
                type="button"
                onClick={handleBooking}
                disabled={!selectedDate || !selectedTime || status === "bookingLoading"}
                className={`btn-primary ${styles.confirmBtn}`}
              >
                {status === "bookingLoading" ? (
                  <><span className={styles.spinner} /> Confirming...</>
                ) : (
                  "Confirm Booking ⚡"
                )}
              </button>
            </div>
          </div>
        </div>
      </section>
    );
  }

  // ── RENDER: Result card ───────────────────────────────────────────────────
  if (status === "result" && eligibility) {
    if (eligibility.eligible) {
      return (
        <section id="eligibility-form" className={styles.section}>
          <div className="container">
            <div className={styles.resultCard}>
              <div className={styles.eligibleIconWrap}>
                <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                  <polyline points="20 6 9 17 4 12" />
                </svg>
              </div>
              <div className={`${styles.priorityBadge} ${styles[`priority${eligibility.priority.split(" ")[0]}`]}`}>
                {eligibility.priority}
              </div>
              <h3 className={styles.eligibleTitle}>You're Eligible! 🎉</h3>
              <p className={styles.eligibleText}>
                Great news — based on your answers, you qualify for our Proof of Funds service.
                A BorderlessBridge specialist is ready to take your case.
              </p>
              <div className={styles.scoreRow}>
                <span className={styles.scoreLabel}>Readiness Score</span>
                <div className={styles.scoreBarWrap}>
                  <div
                    className={styles.scoreBar}
                    style={{ width: `${Math.min(eligibility.score, 100)}%` }}
                  />
                </div>
                <span className={styles.scoreNum}>{eligibility.score}/70</span>
              </div>
              <Link
                href={`/book?submissionId=${submissionId}&name=${encodeURIComponent(form.fullName)}&email=${encodeURIComponent(form.email)}&phone=${encodeURIComponent(form.phone)}`}
                className={`btn-primary ${styles.bookBtn}`}
                style={{ width: "100%", textDecoration: "none" }}
              >
                📅 Book a Call with a Specialist
              </Link>
              <p className={styles.resultNote}>
                🔒 Your information is handled with strict confidentiality.
              </p>
            </div>
          </div>
        </section>
      );
    } else {
      return (
        <section id="eligibility-form" className={styles.section}>
          <div className="container">
            <div className={styles.ineligibleCard}>
              <div className={styles.ineligibleIconWrap}>
                <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                  <circle cx="12" cy="12" r="10" />
                  <line x1="12" y1="8" x2="12" y2="12" />
                  <line x1="12" y1="16" x2="12.01" y2="16" />
                </svg>
              </div>
              <h3 className={styles.ineligibleTitle}>Not Eligible At This Time</h3>
              <p className={styles.ineligibleText}>
                {eligibility.reason || "Based on your answers, you don't currently meet our criteria."}
              </p>
              <p className={styles.ineligibleSub}>
                Our eligibility criteria are designed to ensure we can genuinely help every client. If your situation changes or you have questions, reach out to us directly.
              </p>
              <a
                href="https://wa.me/2349133380497"
                target="_blank"
                rel="noopener noreferrer"
                className={styles.waOutlineBtn}
              >
                <svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor">
                  <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 0 1-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 0 1-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 0 1 2.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0 0 12.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 0 0 5.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 0 0-3.48-8.413z" />
                </svg>
                Ask Us on WhatsApp
              </a>
              <button
                type="button"
                className={styles.retryBtn}
                onClick={() => { setStatus("idle"); setEligibility(null); }}
              >
                ← Edit My Answers
              </button>
            </div>
          </div>
        </section>
      );
    }
  }

  // ── RENDER: Error state ───────────────────────────────────────────────────
  if (status === "error") {
    return (
      <section id="eligibility-form" className={styles.section}>
        <div className="container">
          <div className={styles.ineligibleCard}>
            <div className={styles.ineligibleIconWrap}>
              <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                <circle cx="12" cy="12" r="10" />
                <line x1="12" y1="8" x2="12" y2="12" />
                <line x1="12" y1="16" x2="12.01" y2="16" />
              </svg>
            </div>
            <h3 className={styles.ineligibleTitle}>Something Went Wrong</h3>
            <p className={styles.ineligibleText}>
              We couldn&apos;t process your submission. Please try again or contact us on WhatsApp.
            </p>
            <button
              type="button"
              className={styles.retryBtn}
              onClick={() => setStatus("idle")}
            >
              ← Try Again
            </button>
          </div>
        </div>
      </section>
    );
  }

  // ── RENDER: Main form ─────────────────────────────────────────────────────
  return (
    <section id="eligibility-form" className={styles.section}>
      <div className="container">
        {/* Authority line */}
        <div className={styles.authorityLine}>
          <span className={styles.authorityIcon}>
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
              <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" />
            </svg>
          </span>
          <p>
            We work with <strong>serious applicants only.</strong> Complete the
            assessment below and a specialist will review your case.
          </p>
        </div>

        {/* Form card */}
        <div className={styles.formCard}>
          <div className={styles.formHeader}>
            <span className="eyebrow">Eligibility Assessment</span>
            <h2 className={`heading-md ${styles.formTitle}`}>
              Complete Your Eligibility Assessment
            </h2>
            <p className={styles.formSub}>
              Takes 30 seconds. Find out instantly if you qualify — and book a call with a specialist.
            </p>
            <div className="rating-row" style={{ marginTop: "0.6rem", gap: "0.4rem" }}>
              <div className="rating-stars" style={{ fontSize: "0.9rem" }}>
                <span>★</span><span>★</span><span>★</span><span>★</span><span>★</span>
              </div>
              <span style={{ fontSize: "0.72rem", color: "var(--gray-400)" }}>Confidential · Trusted by 500+ Applicants</span>
            </div>
          </div>

          <form onSubmit={handleSubmit} noValidate className={styles.form} id="pof-eligibility-form">

            {/* SECTION 1: PERSONAL INFORMATION */}
            <div className={styles.formSection}>
              <h3 className={styles.sectionTitle}>1. Personal Information</h3>

              <div className="form-group">
                <label className="form-label" htmlFor="fullName">Full Name</label>
                <input
                  id="fullName"
                  name="fullName"
                  type="text"
                  className={`form-control ${errors.fullName ? "error" : ""}`}
                  placeholder="e.g. Amara Johnson"
                  value={form.fullName}
                  onChange={handleChange}
                  autoComplete="name"
                />
                {errors.fullName && <span className="form-error">{errors.fullName}</span>}
              </div>

              <div className="form-group">
                <label className="form-label" htmlFor="email">Email Address</label>
                <input
                  id="email"
                  name="email"
                  type="email"
                  className={`form-control ${errors.email ? "error" : ""}`}
                  placeholder="you@example.com"
                  value={form.email}
                  onChange={handleChange}
                  autoComplete="email"
                />
                {errors.email && <span className="form-error">{errors.email}</span>}
              </div>

              <div className="form-group">
                <label className="form-label" htmlFor="phone">
                  WhatsApp Number
                  <span className={styles.fieldHint}> (with country code)</span>
                </label>
                <input
                  id="phone"
                  name="phone"
                  type="tel"
                  className={`form-control ${errors.phone ? "error" : ""}`}
                  placeholder="+234 800 000 0000"
                  value={form.phone}
                  onChange={handleChange}
                  autoComplete="tel"
                />
                {errors.phone && <span className="form-error">{errors.phone}</span>}
              </div>

              <div className="form-group">
                <label className="form-label" htmlFor="nationality">Nationality</label>
                <div className="select-wrapper">
                  <select
                    id="nationality"
                    name="nationality"
                    className={`form-control ${errors.nationality ? "error" : ""}`}
                    value={form.nationality}
                    onChange={handleChange}
                  >
                    <option value="">Select nationality...</option>
                    <option value="Nigerian">Nigerian</option>
                    <option value="Ghanaian">Ghanaian</option>
                    <option value="Kenyan">Kenyan</option>
                    <option value="Ugandan">Ugandan</option>
                    <option value="Tanzanian">Tanzanian</option>
                    <option value="South African">South African</option>
                    <option value="Zimbabwean">Zimbabwean</option>
                    <option value="Zambian">Zambian</option>
                    <option value="Ethiopian">Ethiopian</option>
                    <option value="Cameroonian">Cameroonian</option>
                    <option value="Ivorian">Ivorian</option>
                    <option value="Senegalese">Senegalese</option>
                    <option value="Rwandan">Rwandan</option>
                    <option value="Malawian">Malawian</option>
                    <option value="Sudanese">Sudanese</option>
                    <option value="Sierra Leonean">Sierra Leonean</option>
                    <option value="Gambian">Gambian</option>
                    <option value="Liberian">Liberian</option>
                    <option value="Beninese">Beninese</option>
                    <option value="Togolese">Togolese</option>
                    <option value="Indian">Indian</option>
                    <option value="Pakistani">Pakistani</option>
                    <option value="Bangladeshi">Bangladeshi</option>
                    <option value="Filipino">Filipino</option>
                    <option value="Other">Other (not listed)</option>
                  </select>
                </div>
                {errors.nationality && <span className="form-error">{errors.nationality}</span>}
              </div>
            </div>

            {/* SECTION 2: APPLICATION DETAILS */}
            <div className={styles.formSection}>
              <h3 className={styles.sectionTitle}>2. Application Details</h3>

              <div className="form-group">
                <label className="form-label" htmlFor="destination">Destination Country</label>
                <div className="select-wrapper">
                  <select
                    id="destination"
                    name="destination"
                    className={`form-control ${errors.destination ? "error" : ""}`}
                    value={form.destination}
                    onChange={handleChange}
                  >
                    <option value="">Select country...</option>
                    <option value="Canada">Canada</option>
                    <option value="UK">UK</option>
                    <option value="USA">USA</option>
                    <option value="Germany">Germany</option>
                    <option value="Ireland">Ireland</option>
                    <option value="France">France</option>
                  </select>
                </div>
                {errors.destination && <span className="form-error">{errors.destination}</span>}
              </div>

              <div className="form-group">
                <label className="form-label" htmlFor="visaType">Visa Type</label>
                <div className="select-wrapper">
                  <select
                    id="visaType"
                    name="visaType"
                    className={`form-control ${errors.visaType ? "error" : ""}`}
                    value={form.visaType}
                    onChange={handleChange}
                  >
                    <option value="">Select visa type...</option>
                    <option value="student">Student Visa</option>
                    <option value="work">Work Visa</option>
                    <option value="tourist">Tourist Visa</option>
                    <option value="permanent_residency">Permanent Residency</option>
                  </select>
                </div>
                {errors.visaType && <span className="form-error">{errors.visaType}</span>}
              </div>

              <div className="form-group">
                <label className="form-label" htmlFor="timeline">Intended Application Date</label>
                <div className="select-wrapper">
                  <select
                    id="timeline"
                    name="timeline"
                    className={`form-control ${errors.timeline ? "error" : ""}`}
                    value={form.timeline}
                    onChange={handleChange}
                  >
                    <option value="">Select timeline...</option>
                    <option value="within_30_days">Within 30 Days</option>
                    <option value="1_3_months">1–3 Months</option>
                    <option value="3_6_months">3–6 Months</option>
                    <option value="more_than_6_months">More Than 6 Months</option>
                  </select>
                </div>
                {errors.timeline && <span className="form-error">{errors.timeline}</span>}
              </div>
            </div>

            {/* SECTION 3: PROOF OF FUNDS REQUIREMENTS */}
            <div className={styles.formSection}>
              <h3 className={styles.sectionTitle}>3. Proof of Funds Requirements</h3>

              <div className="form-group">
                <label className="form-label">Do you already know the Proof of Funds amount required?</label>
                <div className={styles.radioGroup}>
                  <label className={styles.radioOption}>
                    <input
                      type="radio"
                      name="knowsPofAmount"
                      value="yes"
                      checked={form.knowsPofAmount === "yes"}
                      onChange={handleChange}
                    />
                    <span>Yes, I know the amount</span>
                  </label>
                  <label className={styles.radioOption}>
                    <input
                      type="radio"
                      name="knowsPofAmount"
                      value="no"
                      checked={form.knowsPofAmount === "no"}
                      onChange={handleChange}
                    />
                    <span>No, I don&apos;t know yet</span>
                  </label>
                </div>
                {errors.knowsPofAmount && <span className="form-error">{errors.knowsPofAmount}</span>}
              </div>

              {form.knowsPofAmount === "yes" && (
                <div className="form-group" key="pof-amount-field">
                  <label className="form-label" htmlFor="pofAmount">
                    What amount is required? <span className={styles.fieldHint}>(in Naira)</span>
                  </label>
                  <input
                    id="pofAmount"
                    name="pofAmount"
                    type="text"
                    inputMode="numeric"
                    className={`form-control ${errors.pofAmount ? "error" : ""}`}
                    placeholder="e.g. ₦ 80,000,000"
                    value={pofDisplay}
                    onChange={handlePofAmountChange}
                    autoComplete="off"
                  />
                  {errors.pofAmount && <span className="form-error">{errors.pofAmount}</span>}
                </div>
              )}

              <div className="form-group">
                <label className="form-label">Have you received any of the following?</label>
                <div className={styles.checkboxGrid}>
                  {[
                    "School Admission Letter",
                    "CAS Letter",
                    "Job Offer Letter",
                    "Invitation Letter",
                    "None Yet",
                  ].map((option) => (
                    <label key={option} className={styles.checkboxOption}>
                      <input
                        type="checkbox"
                        checked={form.lettersReceived.includes(option)}
                        onChange={() => handleCheckboxChange(option)}
                      />
                      <span>{option}</span>
                    </label>
                  ))}
                </div>
              </div>

              <div className="form-group">
                <label className="form-label">Do you currently have access to the required funds?</label>
                <div className={styles.radioGroup}>
                  <label className={styles.radioOption}>
                    <input
                      type="radio"
                      name="accessToFunds"
                      value="yes_fully"
                      checked={form.accessToFunds === "yes_fully"}
                      onChange={handleChange}
                    />
                    <span>Yes, fully</span>
                  </label>
                  <label className={styles.radioOption}>
                    <input
                      type="radio"
                      name="accessToFunds"
                      value="partially"
                      checked={form.accessToFunds === "partially"}
                      onChange={handleChange}
                    />
                    <span>Partially</span>
                  </label>
                  <label className={styles.radioOption}>
                    <input
                      type="radio"
                      name="accessToFunds"
                      value="no"
                      checked={form.accessToFunds === "no"}
                      onChange={handleChange}
                    />
                    <span>No</span>
                  </label>
                </div>
                {errors.accessToFunds && <span className="form-error">{errors.accessToFunds}</span>}
              </div>
            </div>

            {/* SECTION 4: QUALIFICATION QUESTIONS */}
            <div className={styles.formSection}>
              <h3 className={styles.sectionTitle}>4. Qualification Questions</h3>

              <div className="form-group">
                <label className="form-label">Are you actively preparing your application for submission within the next 30 days?</label>
                <div className={styles.radioGroup}>
                  <label className={styles.radioOption}>
                    <input
                      type="radio"
                      name="applyingWithin30Days"
                      value="yes"
                      checked={form.applyingWithin30Days === "yes"}
                      onChange={handleChange}
                    />
                    <span>Yes</span>
                  </label>
                  <label className={styles.radioOption}>
                    <input
                      type="radio"
                      name="applyingWithin30Days"
                      value="no"
                      checked={form.applyingWithin30Days === "no"}
                      onChange={handleChange}
                    />
                    <span>No</span>
                  </label>
                </div>
                {errors.applyingWithin30Days && <span className="form-error">{errors.applyingWithin30Days}</span>}
              </div>

              <div className="form-group">
                <label className="form-label">Have you ever had a visa refusal before?</label>
                <div className={styles.radioGroup}>
                  <label className={styles.radioOption}>
                    <input
                      type="radio"
                      name="priorRefusal"
                      value="yes"
                      checked={form.priorRefusal === "yes"}
                      onChange={handleChange}
                    />
                    <span>Yes</span>
                  </label>
                  <label className={styles.radioOption}>
                    <input
                      type="radio"
                      name="priorRefusal"
                      value="no"
                      checked={form.priorRefusal === "no"}
                      onChange={handleChange}
                    />
                    <span>No</span>
                  </label>
                </div>
                {errors.priorRefusal && <span className="form-error">{errors.priorRefusal}</span>}
              </div>

              <div className="form-group">
                <label className="form-label" htmlFor="heardFrom">How did you hear about us?</label>
                <div className="select-wrapper">
                  <select
                    id="heardFrom"
                    name="heardFrom"
                    className={`form-control ${errors.heardFrom ? "error" : ""}`}
                    value={form.heardFrom}
                    onChange={handleChange}
                  >
                    <option value="">Select option...</option>
                    <option value="Facebook">Facebook</option>
                    <option value="Instagram">Instagram</option>
                    <option value="TikTok">TikTok</option>
                    <option value="Google">Google</option>
                    <option value="Referral">Referral</option>
                  </select>
                </div>
                {errors.heardFrom && <span className="form-error">{errors.heardFrom}</span>}
              </div>

              <div className="form-group">
                <label className="form-label" htmlFor="additionalInfo">
                  Additional Information
                  <span className={styles.fieldHint}> (Optional)</span>
                </label>
                <textarea
                  id="additionalInfo"
                  name="additionalInfo"
                  className="form-control"
                  rows={4}
                  placeholder="Share any details or questions that can help us evaluate your profile..."
                  value={form.additionalInfo}
                  onChange={handleChange}
                  style={{ resize: "vertical" }}
                />
              </div>
            </div>

            {/* Submit */}
            <button
              id="form-submit-btn"
              type="submit"
              disabled={status === "loading"}
              className={`btn-primary btn-lg ${styles.submitBtn}`}
            >
              {status === "loading" ? (
                <>
                  <span className={styles.spinner} />
                  Checking Eligibility...
                </>
              ) : (
                <>Check My Eligibility ⚡</>
              )}
            </button>

            <p className={styles.privacy}>
              🔒 Your information is handled with strict confidentiality and never shared with third parties. This service provides documentation support only and does not guarantee visa approval.
            </p>
          </form>
        </div>
      </div>
    </section>
  );
}
