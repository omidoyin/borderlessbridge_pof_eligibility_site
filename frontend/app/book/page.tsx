"use client";

import { useEffect, useState, FormEvent, Suspense } from "react";
import { useSearchParams } from "next/navigation";
import styles from "./book.module.css";

interface AvailabilityDay {
  date: string;          // YYYY-MM-DD
  allSlots: string[];
  takenSlots: string[];
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
  const [businessRole, setBusinessRole] = useState("");
  const [packageChoice, setPackageChoice] = useState("");
  const [startTimeline, setStartTimeline] = useState("");
  const [guarantee, setGuarantee] = useState("");
  const [guestEmails, setGuestEmails] = useState<string[]>([]);

  // Booking details flow state
  const [availability, setAvailability] = useState<AvailabilityDay[]>([]);
  const [selectedDate, setSelectedDate] = useState<string>("");
  const [selectedTime, setSelectedTime] = useState<string>("");
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [bookingError, setBookingError] = useState("");
  const [bookingConfirmed, setBookingConfirmed] = useState<BookingConfirmation | null>(null);

  // Load availability on component mount
  useEffect(() => {
    const fetchAvailability = async () => {
      try {
        setLoading(true);
        const res = await fetch(`${API_URL}/api/bookings/availability`);
        if (res.ok) {
          const data = await res.json();
          setAvailability(data.availability || []);
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

  const handleAddGuest = () => {
    if (guestEmails.length < 5) {
      setGuestEmails([...guestEmails, ""]);
    }
  };

  const handleRemoveGuest = (index: number) => {
    setGuestEmails(guestEmails.filter((_, idx) => idx !== index));
  };

  const handleGuestEmailChange = (index: number, val: string) => {
    const updated = [...guestEmails];
    updated[index] = val;
    setGuestEmails(updated);
  };

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
    if (!businessRole || !packageChoice || !startTimeline || !guarantee) {
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
        businessRole,
        packageChoice,
        startTimeline,
        guarantee,
        guests: guestEmails.filter(email => !!email.trim()).join(","),
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
        }
        setSelectedTime("");
        return;
      }

      setBookingConfirmed(data.booking);
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
        <h2 className={styles.confirmedTitle}>Strategy Call Booked! 🎉</h2>
        <p className={styles.confirmedSub}>
          Your specialist call is scheduled. Please add this event to your calendar and keep your phone available.
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
        <span className="eyebrow eyebrow-green">Specialist Call</span>
        <h2 className={styles.bookingTitle}>Schedule Your Strategy Session</h2>
        <p className={styles.bookingSub}>
          Select a convenient date and time. Mon–Sat, 9:00 AM – 5:00 PM WAT.
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

          {selectedDate && selectedDayData && (
            <div className={styles.bookingSection}>
              <p className={styles.bookingLabel}>Select a Time Slot (WAT)</p>
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
                ⏳ 1h duration
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

            <div className="form-group">
              <label className="form-label" htmlFor="businessRole">
                What&apos;s your role in the business? (We highly recommend ALL key players in the sales/marketing decision-making process to be on the call. Use the &quot;Add guests&quot; button below to add them to the call) *
              </label>
              <div className="select-wrapper">
                <select
                  id="businessRole"
                  required
                  className="form-control"
                  value={businessRole}
                  onChange={(e) => setBusinessRole(e.target.value)}
                >
                  <option value="">Select the best option below</option>
                  <option value="Owner / Founder">Owner / Founder</option>
                  <option value="Co-Founder / Director">Co-Founder / Director</option>
                  <option value="Partner / Decision Maker">Partner / Decision Maker</option>
                  <option value="Marketing Lead">Marketing Lead</option>
                  <option value="Sales Lead">Sales Lead</option>
                  <option value="Representative">Representative</option>
                  <option value="Other">Other Role</option>
                </select>
              </div>
            </div>

            {/* Guest dynamic list */}
            <div className="form-group">
              <button type="button" onClick={handleAddGuest} className={styles.addGuestBtn}>
                <span>+</span> Add guests
              </button>
              {guestEmails.length > 0 && (
                <div className={styles.guestList}>
                  {guestEmails.map((guestEmail, index) => (
                    <div key={index} className={styles.guestInputRow}>
                      <input
                        type="email"
                        placeholder="guest@example.com"
                        className="form-control"
                        value={guestEmail}
                        onChange={(e) => handleGuestEmailChange(index, e.target.value)}
                      />
                      <button type="button" onClick={() => handleRemoveGuest(index)} className={styles.removeGuestBtn}>
                        ✕
                      </button>
                    </div>
                  ))}
                </div>
              )}
            </div>

            <div className="form-group">
              <label className="form-label" htmlFor="packageChoice">
                We have packages from as high as ₦1.5M to as low as ₦500K. Depending on your business needs, we would recommend the best solution. Which describes you the best? *
              </label>
              <div className="select-wrapper">
                <select
                  id="packageChoice"
                  required
                  className="form-control"
                  value={packageChoice}
                  onChange={(e) => setPackageChoice(e.target.value)}
                >
                  <option value="">Select the best option below</option>
                  <option value="High Tier (₦1.5M for premium customized setup)">High Tier (₦1.5M setup)</option>
                  <option value="Medium Tier (₦1.0M for accelerated setup)">Medium Tier (₦1.0M setup)</option>
                  <option value="Starter Tier (₦500K for standard starter setup)">Starter Tier (₦500K setup)</option>
                  <option value="Not Sure / Need Advice">Not Sure / Need Consultation</option>
                </select>
              </div>
            </div>

            <div className="form-group">
              <label className="form-label" htmlFor="startTimeline">
                If we&apos;re a perfect fit to work together, when are you looking to get started? *
              </label>
              <div className="select-wrapper">
                <select
                  id="startTimeline"
                  required
                  className="form-control"
                  value={startTimeline}
                  onChange={(e) => setStartTimeline(e.target.value)}
                >
                  <option value="">Select the best option below</option>
                  <option value="Immediately (Within 7 days)">Immediately (Within 7 days)</option>
                  <option value="In 1–2 weeks">In 1–2 weeks</option>
                  <option value="In 3–4 weeks">In 3–4 weeks</option>
                  <option value="Just researching">Just researching / Exploring</option>
                </select>
              </div>
            </div>

            <div className="form-group">
              <label className="form-label" htmlFor="guarantee">
                Time is Money. If your booking is approved, can you guarantee you will show up, ready and prepared to have a conversation with your mic on and your video on? *
              </label>
              <div className="select-wrapper">
                <select
                  id="guarantee"
                  required
                  className="form-control"
                  value={guarantee}
                  onChange={(e) => setGuarantee(e.target.value)}
                >
                  <option value="">Select the best option below</option>
                  <option value="Yes, I guarantee I will show up with video and mic on">Yes, I guarantee 100% attendance (video & mic on)</option>
                  <option value="No, I cannot guarantee video or mic">No, I might have issues with video or mic</option>
                </select>
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
