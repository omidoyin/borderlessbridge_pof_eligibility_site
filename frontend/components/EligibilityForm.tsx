"use client";
import { useState, FormEvent } from "react";
import styles from "./EligibilityForm.module.css";

interface FormData {
  fullName: string;
  email: string;
  phone: string;
  nationality: string;
  destination: string;
  visaType: string;
  timeline: string;
  knowsPofAmount: string;
  pofAmount: string;
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

const WHATSAPP_NUMBER = process.env.NEXT_PUBLIC_WHATSAPP_NUMBER || "2349133380497";
const API_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:4000";



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

  const WHATSAPP_MESSAGE = encodeURIComponent(`
Hi BorderlessBridge,

I completed the eligibility assessment and would like to proceed with my Proof of Funds application.

Name: ${form.fullName}
Destination: ${form.destination}
Visa Type: ${form.visaType}
Timeline: ${form.timeline}
POF Amount: ${form.pofAmount || "Not specified"}
Access to Funds: ${form.accessToFunds}
Applying Within 30 Days: ${form.applyingWithin30Days}
Prior Refusal: ${form.priorRefusal}
`);

  const [errors, setErrors] = useState<FieldErrors>({});
  const [status, setStatus] = useState<"idle" | "loading" | "success" | "error">("idle");

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

  const handleChange = (
    e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>
  ) => {
    const { name, value } = e.target;
    setForm((prev) => ({ ...prev, [name]: value }));
    if (errors[name]) setErrors((prev) => ({ ...prev, [name]: "" }));
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

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    if (!validate()) {
      // Scroll to the first error
      const firstError = Object.keys(errors)[0];
      if (firstError) {
        document.getElementsByName(firstError)[0]?.scrollIntoView({ behavior: "smooth", block: "center" });
      }
      return;
    }

    setStatus("loading");

    try {
      const res = await fetch(`${API_URL}/api/submissions`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(form),
      });

      if (!res.ok) {
        const data = await res.json();
        if (data.errors) {
          const apiErrors: FieldErrors = {};
          data.errors.forEach((err: { field: string; message: string }) => {
            apiErrors[err.field] = err.message;
          });
          setErrors(apiErrors);
          setStatus("idle");
          return;
        }
        throw new Error("Submission failed");
      }

      setStatus("success");

      // Redirect to WhatsApp after 1.5s
      setTimeout(() => {
        window.open(
          `https://wa.me/${WHATSAPP_NUMBER}?text=${WHATSAPP_MESSAGE}`,
          "_blank"
        );
      }, 1500);
    } catch {
      setStatus("error");
    }
  };

  if (status === "success") {
    return (
      <section id="eligibility-form" className={styles.section}>
        <div className="container">
          <div className={styles.successCard}>
            <div className={styles.successIcon}>
              <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                <polyline points="20 6 9 17 4 12" />
              </svg>
            </div>
            <h3 className={styles.successTitle}>Assessment Submitted!</h3>
            <p className={styles.successText}>
              Excellent. We&apos;re opening WhatsApp so you can connect with a specialist directly.
              <br />If it doesn&apos;t open automatically, tap the button below.
            </p>
            <a
              href={`https://wa.me/${WHATSAPP_NUMBER}?text=${WHATSAPP_MESSAGE}`}
              target="_blank"
              rel="noopener noreferrer"
              className={`btn-primary ${styles.waBtn}`}
              id="whatsapp-redirect-btn"
            >
              <svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor">
                <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 0 1-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 0 1-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 0 1 2.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0 0 12.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 0 0 5.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 0 0-3.48-8.413z" />
              </svg>
              Open WhatsApp
            </a>
          </div>
        </div>
      </section>
    );
  }

  return (
    <section id="eligibility-form" className={styles.section}>
      <div className="container">
        {/* Authority line — the most important sentence */}
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
              Takes 30 seconds. A specialist will review and contact you on WhatsApp within 24 hours.
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
                <input
                  id="nationality"
                  name="nationality"
                  type="text"
                  className={`form-control ${errors.nationality ? "error" : ""}`}
                  placeholder="e.g. Nigerian, Ghanaian"
                  value={form.nationality}
                  onChange={handleChange}
                />
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
                    {/* <option value="Other">Other</option> */}
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
                    {/* <option value="other">Other</option> */}
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
                    <span>Yes</span>
                  </label>
                  <label className={styles.radioOption}>
                    <input
                      type="radio"
                      name="knowsPofAmount"
                      value="no"
                      checked={form.knowsPofAmount === "no"}
                      onChange={handleChange}
                    />
                    <span>No</span>
                  </label>
                </div>
                {errors.knowsPofAmount && <span className="form-error">{errors.knowsPofAmount}</span>}
              </div>

              {form.knowsPofAmount === "yes" && (
                <div className="form-group animate-fade">
                  <label className="form-label" htmlFor="pofAmount">What amount is required?</label>
                  <input
                    id="pofAmount"
                    name="pofAmount"
                    type="text"
                    className={`form-control ${errors.pofAmount ? "error" : ""}`}
                    placeholder="e.g. ₦ 80,000,000"
                    value={form.pofAmount}
                    onChange={handleChange}
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
                    {/* <option value="Other">Other</option> */}
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

            {/* Error banner */}
            {status === "error" && (
              <div className={styles.errorBanner}>
                Something went wrong on our end. Please try again or contact us
                on WhatsApp directly.
              </div>
            )}

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
                  Submitting...
                </>
              ) : (
                <>
                  Submit & Connect on WhatsApp ⚡
                </>
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
