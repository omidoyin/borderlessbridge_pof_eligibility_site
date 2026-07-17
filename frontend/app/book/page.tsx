"use client";

import { useEffect, useState, useRef, FormEvent, Suspense } from "react";
import { useSearchParams } from "next/navigation";
import styles from "./book.module.css";

interface AvailabilityDay {
  date: string;          // YYYY-MM-DD
  allSlots: string[];
  takenSlots: string[];
}

interface AvailabilityMeta {
  meetingDuration: number;  // minutes
  timezone: string;         // IANA timezone e.g. "Africa/Lagos"
  maxBookingDays: number;
}

interface BookingConfirmation {
  id: number;
  booked_date: string;
  booked_time: string;
  google_meet_link: string | null;
  invite_url: string;
}

const API_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:4000";

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

function BookingContent() {
  const searchParams = useSearchParams();

  // Prepopulated state from URL params
  const paramSubmissionId = searchParams.get("submissionId") || "";
  const paramFullName = searchParams.get("name") || "";
  const paramEmail = searchParams.get("email") || "";
  const paramPhone = searchParams.get("phone") || "";

  // Split name into first and last
  const nameParts = paramFullName.trim().split(/\s+/);
  const initialFirstName = nameParts[0] || "";
  const initialLastName = nameParts.slice(1).join(" ") || "";

  // Component Form State
  const [firstName, setFirstName] = useState(initialFirstName);
  const [lastName, setLastName] = useState(initialLastName);
  const [email, setEmail] = useState(paramEmail);
  const [phone, setPhone] = useState(paramPhone);
  const [startTimeline, setStartTimeline] = useState("");
  const [availability, setAvailability] = useState<AvailabilityDay[]>([]);
  const timeSlotsRef = useRef<HTMLDivElement>(null);

  const [authorityCheck, setAuthorityCheck] = useState("");
  const [guestEmails, setGuestEmails] = useState<string[]>([""]);  // guest email inputs
  const [guarantee, setGuarantee] = useState("");

  // Show guest email section whenever the answer is NOT "Just me"
  const needsGuests = authorityCheck !== "" && authorityCheck !== "Just me";

  const handleGuestEmailChange = (index: number, value: string) => {
    setGuestEmails((prev) => prev.map((e, i) => (i === index ? value : e)));
  };

  const addGuestEmail = () => {
    setGuestEmails((prev) => [...prev, ""]);
  };

  const removeGuestEmail = (index: number) => {
    setGuestEmails((prev) => prev.filter((_, i) => i !== index));
  };

  // Booking details flow state
  const [selectedDate, setSelectedDate] = useState<string>("");
  const [selectedTime, setSelectedTime] = useState<string>("");
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [bookingError, setBookingError] = useState("");
  const [bookingConfirmed, setBookingConfirmed] = useState<BookingConfirmation | null>(null);

  // Dynamic scheduling meta from backend
  const [meta, setMeta] = useState<AvailabilityMeta>({
    meetingDuration: 60,
    timezone: "Africa/Lagos",
    maxBookingDays: 14,
  });

  // Load availability on component mount
  useEffect(() => {
    const fetchAvailability = async () => {
      try {
        setLoading(true);
        const res = await fetch(`${API_URL}/api/bookings/availability`);
        if (res.ok) {
          const data = await res.json();
          setAvailability(data.availability || []);
          if (data.meta) setMeta(data.meta);
        } else {
          setBookingError("Failed to fetch slots availability.");
        }
      } catch (err) {
        setBookingError("Network error loading calendar availability.");
      } finally {
        setLoading(false);
      }
    };
    fetchAvailability();
  }, []);


  const handleSubmitBooking = async (e: FormEvent) => {
    e.preventDefault();
    setBookingError("");

    if (!firstName.trim() || !lastName.trim()) {
      setBookingError("First name and Last name are required.");
      return;
    }
    if (!email.trim() || !phone.trim()) {
      setBookingError("Email address and Phone number are required.");
      return;
    }
    if (!startTimeline || !authorityCheck || !guarantee) {
      setBookingError("Please answer all qualification questions.");
      return;
    }

    setSubmitting(true);

    try {
      const payload = {
        submissionId: paramSubmissionId ? parseInt(paramSubmissionId, 10) : null,
        fullName: `${firstName.trim()} ${lastName.trim()}`,
        email: email.trim(),
        phone: phone.trim(),
        bookedDate: selectedDate,
        bookedTime: selectedTime,
        startTimeline,
        businessRole: authorityCheck,
        guarantee,
        guests: needsGuests
          ? guestEmails.map((e) => e.trim()).filter(Boolean).join(",")
          : "",
      };

      const res = await fetch(`${API_URL}/api/bookings`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      const data = await res.json();

      if (!res.ok) {
        setBookingError(data.message || "Failed to confirm call booking. Please try another slot.");
        // Refresh availability
        const avRes = await fetch(`${API_URL}/api/bookings/availability`);
        if (avRes.ok) {
          const avData = await avRes.json();
          setAvailability(avData.availability || []);
          if (avData.meta) setMeta(avData.meta);
        }
        setSelectedTime("");
        return;
      }

      setBookingConfirmed(data.booking);
      // Update meta if the booking response includes it
      if (data.booking?.meetingDuration) {
        setMeta((prev) => ({ ...prev, meetingDuration: data.booking.meetingDuration, timezone: data.booking.timezone || prev.timezone }));
      }
    } catch (err) {
      setBookingError("Network error. Please check your connection and try again.");
    } finally {
      setSubmitting(false);
    }
  };

  const selectedDayData = availability.find((d) => d.date === selectedDate);

  // RENDER: Confirmed screen
  if (bookingConfirmed) {
    const d = new Date(bookingConfirmed.booked_date + "T00:00:00");
    const dateLabel = d.toLocaleDateString("en-NG", {
      weekday: "long", day: "numeric", month: "long", year: "numeric",
    });

    return (
      <div className={styles.confirmedCard}>
        <div className={styles.confirmedIconWrap}>
          <svg width="36" height="36" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
            <polyline points="20 6 9 17 4 12" />
          </svg>
        </div>
        <h2 className={styles.confirmedTitle}>Proof of Funds Consultation Booked! 🎉</h2>
        <p className={styles.confirmedSub}>
          Your consultation has been scheduled successfully. Please add this appointment to your calendar and keep your phone available at the scheduled time. We look forward to discussing your application, available options, pricing, and processing timeline.
        </p>

        <div className={styles.bookingSummary}>
          <div className={styles.summaryRow}>
            <span className={styles.summaryLabel}>📅 Date</span>
            <span className={styles.summaryValue}>{dateLabel}</span>
          </div>
          <div className={styles.summaryRow}>
            <span className={styles.summaryLabel}>⏰ Time</span>
            <span className={styles.summaryValue}>{formatTime(bookingConfirmed.booked_time)} ({meta.timezone})</span>
          </div>
          <div className={styles.summaryRow}>
            <span className={styles.summaryLabel}>👤 Name</span>
            <span className={styles.summaryValue}>{firstName} {lastName}</span>
          </div>
          <div className={styles.summaryRow}>
            <span className={styles.summaryLabel}>📞 Phone</span>
            <span className={styles.summaryValue}>{phone}</span>
          </div>
          {bookingConfirmed.google_meet_link && (
            <div className={styles.summaryRow} style={{ flexDirection: "column", gap: "0.4rem", alignItems: "flex-start" }}>
              <span className={styles.summaryLabel}>💻 Google Meet Conference URL</span>
              <div className={styles.meetLinkPill}>
                <a href={bookingConfirmed.google_meet_link} target="_blank" rel="noopener noreferrer">
                  {bookingConfirmed.google_meet_link}
                </a>
              </div>
            </div>
          )}
        </div>

        <a href={bookingConfirmed.invite_url} target="_blank" rel="noopener noreferrer" className={styles.calendarBtn}>
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" style={{ marginRight: "4px" }}>
            <rect x="3" y="4" width="18" height="18" rx="2" ry="2" />
            <line x1="16" y1="2" x2="16" y2="6" />
            <line x1="8" y1="2" x2="8" y2="6" />
            <line x1="3" y1="10" x2="21" y2="10" />
          </svg>
          Add to Google Calendar
        </a>

        <p className={styles.confirmedNote}>
          📧 A calendar invite with the Google Meet link has been sent to <strong>{email}</strong>.
        </p>
      </div>
    );
  }

  return (
    <div className={styles.bookingCard}>
      {/* HEADER */}
      <div className={styles.bookingHeader}>
        <span className="eyebrow eyebrow-green">Proof of Funds Consultation</span>
        <h2 className={styles.bookingTitle}>

          Book a short call to review your application, discuss the most suitable Proof of Funds option, and receive a clear quote and processing timeline.
        </h2>
        <p className={styles.bookingSub}>
          Select a convenient date and time. {meta.meetingDuration}-minute sessions — {meta.timezone}.
        </p>
      </div>

      {loading && (
        <div style={{ display: "flex", justifyContent: "center", padding: "4rem" }}>
          <div className={styles.spinner} style={{ width: "32px", height: "32px", borderWidth: "4px", borderTopColor: "var(--gold)" }} />
        </div>
      )}

      {/* STEP 1: DATE AND TIME SELECTION */}
      {!loading && (!selectedDate || !selectedTime) && (
        <>
          <div className={styles.bookingSection}>
            <p className={styles.bookingLabel}>Select a Date</p>
            <div className={styles.dateGrid}>
              {availability.map((day) => {
                const availableCount = day.allSlots.length - day.takenSlots.length;
                const isFull = availableCount === 0;
                return (
                  <button
                    key={day.date}
                    type="button"
                    disabled={isFull}
                    onClick={() => {
                      setSelectedDate(day.date);
                      setSelectedTime("");
                      // Scroll to time slots after a short delay to allow render
                      setTimeout(() => {
                        timeSlotsRef.current?.scrollIntoView({ behavior: "smooth", block: "start" });
                      }, 80);
                    }}
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

          {selectedDate && selectedDayData && (
            <div className={styles.bookingSection} ref={timeSlotsRef}>
              <p className={styles.bookingLabel}>Select a Time Slot ({meta.timezone})</p>
              <div className={styles.slotGrid}>
                {selectedDayData.allSlots.map((slot) => {
                  const isTaken = selectedDayData.takenSlots.includes(slot);
                  return (
                    <button
                      key={slot}
                      type="button"
                      disabled={isTaken}
                      onClick={() => setSelectedTime(slot)}
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
        </>
      )}

      {/* STEP 2: CONFIRM DETAILS FORM */}
      {!loading && selectedDate && selectedTime && (
        <form onSubmit={handleSubmitBooking}>
          {/* Slot Pill Indicator */}
          <div className={styles.formHeaderRow}>
            <h3 className={styles.formHeaderTitle}>Confirm details</h3>
            <div className={styles.slotPillRow}>
              <span className={styles.slotPill}>
                📅 {new Date(selectedDate + "T00:00:00").toLocaleDateString(undefined, { weekday: 'short', month: 'short', day: 'numeric', year: 'numeric' })}
              </span>
              <span className={styles.slotPill}>
                ⏰ {formatTime(selectedTime)}
              </span>
              <span className={styles.slotPill}>
                ⏳ {meta.meetingDuration >= 60 ? `${Math.floor(meta.meetingDuration / 60)}h${meta.meetingDuration % 60 !== 0 ? ` ${meta.meetingDuration % 60}min` : ""}` : `${meta.meetingDuration}min`}
              </span>
            </div>
          </div>

          <div className={styles.bookingSection} style={{ display: "flex", flexDirection: "column", gap: "1.25rem" }}>
            <div className={styles.formGrid}>
              <div className="form-group">
                <label className="form-label" htmlFor="firstName">First name *</label>
                <input
                  id="firstName"
                  type="text"
                  required
                  className="form-control"
                  value={firstName}
                  onChange={(e) => setFirstName(e.target.value)}
                />
              </div>
              <div className="form-group">
                <label className="form-label" htmlFor="lastName">Last name *</label>
                <input
                  id="lastName"
                  type="text"
                  required
                  className="form-control"
                  value={lastName}
                  onChange={(e) => setLastName(e.target.value)}
                />
              </div>
            </div>

            <div className="form-group">
              <label className="form-label" htmlFor="emailAddress">Email address *</label>
              <input
                id="emailAddress"
                type="email"
                required
                className="form-control"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
              />
              <p className={styles.emailHint}>
                📩 <strong>Please use your Gmail address</strong> — we&apos;ll send a Google Calendar invite with the meeting link directly to your inbox. Using a non-Gmail address may prevent you from receiving the calendar booking.
              </p>
            </div>

            <div className="form-group">
              <label className="form-label" htmlFor="phoneNumber">Phone number *</label>
              <div className={styles.phoneInputWrapper}>
                <div className={styles.flagSelector}>
                  <span className={styles.flagEmoji}>🇳🇬</span>
                  <span>+234</span>
                </div>
                <input
                  id="phoneNumber"
                  type="tel"
                  required
                  placeholder="800 000 0000"
                  className={styles.phoneInput}
                  value={phone.replace(/^\+234\s*/, "")}
                  onChange={(e) => {
                    const val = e.target.value;
                    if (val.startsWith("+")) {
                      setPhone(val);
                    } else {
                      setPhone("+234 " + val);
                    }
                  }}
                />
              </div>
            </div>

            {/* Question 1: Authority Check */}
            <div className="form-group">
              <label className="form-label">
                1. Who are the primary people who need this Proof of Funds? *
                <span style={{ display: "block", fontWeight: 400, fontSize: "0.82rem", color: "var(--gray-400)", marginTop: "0.3rem", fontStyle: "italic" }}>
                  (Please ensure everyone who can influence the final decision is available on the call, so we can move fast if the service is the right fit.)
                </span>
              </label>
              <div className="select-wrapper">
                <select
                  className="form-control"
                  value={authorityCheck}
                  onChange={(e) => {
                    setAuthorityCheck(e.target.value);
                    setGuestEmails([""]);  // reset guests when answer changes
                  }}
                  required
                >
                  <option value="">Select who will be on the call...</option>
                  <option value="Just me">Just me</option>
                  <option value="Me and my spouse / partner">Me and my spouse / partner</option>
                  <option value="Me and a parent / guardian">Me and a parent / guardian</option>
                  <option value="Me and other family members">Me and other family members</option>
                  <option value="I am applying on behalf of someone else">I am applying on behalf of someone else</option>
                </select>
              </div>
            </div>

            {/* Guest email inputs — shown when more than one person is involved */}
            {needsGuests && (
              <div className="form-group">
                <label className="form-label">
                  Other attendee email(s)
                  <span style={{ display: "block", fontWeight: 400, fontSize: "0.82rem", color: "var(--gray-400)", marginTop: "0.25rem" }}>
                    Add their email address(es) so they receive a calendar invite with the meeting link.
                  </span>
                </label>
                <div className={styles.guestList}>
                  {guestEmails.map((gEmail, index) => (
                    <div key={index} className={styles.guestInputRow}>
                      <input
                        type="email"
                        className="form-control"
                        placeholder={`Guest ${index + 1} email address`}
                        value={gEmail}
                        onChange={(e) => handleGuestEmailChange(index, e.target.value)}
                        autoComplete="email"
                      />
                      {guestEmails.length > 1 && (
                        <button
                          type="button"
                          className={styles.removeGuestBtn}
                          onClick={() => removeGuestEmail(index)}
                          title="Remove"
                        >
                          ✕
                        </button>
                      )}
                    </div>
                  ))}
                  {guestEmails.length < 5 && (
                    <button
                      type="button"
                      className={styles.addGuestBtn}
                      onClick={addGuestEmail}
                    >
                      + Add another person
                    </button>
                  )}
                </div>
              </div>
            )}

            {/* Question 2: Timeline to start */}
            <div className="form-group">
              <label className="form-label">
                2. If we determine a suitable Proof of Funds option for your application, how soon would you like to proceed? *
              </label>
              <div className="select-wrapper">
                <select
                  className="form-control"
                  value={startTimeline}
                  onChange={(e) => setStartTimeline(e.target.value)}
                  required
                >
                  <option value="">Select timeline...</option>
                  <option value="Immediately">Immediately</option>
                  <option value="Within 7 days">Within 7 days</option>
                  <option value="Within 30 days">Within 30 days</option>
                  <option value="I'm still considering my options">I&apos;m still considering my options</option>
                </select>
              </div>
            </div>

            {/* Question 3: Attendance guarantee */}
            <div className="form-group">
              <label className="form-label">
                3. Will you be available for the consultation at the scheduled time? *
              </label>
              <div className={styles.radioGroup}>
                {[
                  "Yes, I will attend",
                  "I may need to reschedule if necessary",
                ].map((option) => (
                  <label key={option} className={styles.radioLabel}>
                    <input
                      type="radio"
                      name="guarantee"
                      value={option}
                      checked={guarantee === option}
                      onChange={(e) => setGuarantee(e.target.value)}
                      className={styles.radioInput}
                    />
                    <span className={styles.radioCustom} />
                    {option}
                  </label>
                ))}
              </div>
            </div>
          </div>

          {bookingError && (
            <div className={styles.bookingError}>{bookingError}</div>
          )}

          {/* ACTION BUTTONS */}
          <div className={styles.bookingActions}>
            <button
              type="button"
              className={styles.backBtn}
              onClick={() => { setSelectedTime(""); }}
            >
              Back
            </button>
            <button
              type="submit"
              disabled={submitting}
              className={styles.confirmBtn}
            >
              {submitting ? (
                <>
                  <span className={styles.spinner} />
                  Confirming...
                </>
              ) : (
                "Confirm"
              )}
            </button>
          </div>

          <p className={styles.termsText}>
            By proceeding, you agree to BorderlessBridge&apos;s <a href="#">Terms</a> and <a href="#">Privacy Policy</a>.
          </p>
        </form>
      )}
    </div>
  );
}

export default function CallBookingPage() {
  return (
    <main className={styles.section}>
      <div className="container">
        <Suspense fallback={
          <div style={{ display: "flex", justifyContent: "center", padding: "6rem" }}>
            <div className={styles.spinner} style={{ width: "32px", height: "32px", borderWidth: "4px", borderTopColor: "var(--gold)" }} />
          </div>
        }>
          <BookingContent />
        </Suspense>
      </div>
    </main>
  );
}
