'use strict';

const axios = require('axios');

// ── Brevo API client ──────────────────────────────────────────────────────────
const brevoClient = axios.create({
  baseURL: 'https://api.brevo.com/v3',
  headers: {
    'api-key': process.env.BREVO_API_KEY || '',
    'Content-Type': 'application/json',
    Accept: 'application/json',
  },
});

const FROM_NAME  = process.env.EMAIL_FROM_NAME  || 'BorderlessBridge';
const FROM_EMAIL = process.env.EMAIL_FROM       || 'borderlessbridgehq@gmail.com';
const ADMIN_EMAIL = process.env.ADMIN_EMAIL     || process.env.EMAIL_FROM || 'borderlessbridgehq@gmail.com';

// Startup check
if (process.env.BREVO_API_KEY) {
  brevoClient.get('/account')
    .then(() => console.log('✅ Brevo API is ready to send emails'))
    .catch((err) => {
      console.error('❌ Brevo API error:', err.response?.data?.message || err.message);
    });
} else {
  console.warn('⚠️  BREVO_API_KEY is not set — emails will not be delivered.');
}

/**
 * Core send function via Brevo HTTP API.
 * @param {{ to: string|string[], subject: string, html: string, text?: string }} options
 */
async function sendEmail({ to, subject, html, text }) {
  const recipients = Array.isArray(to)
    ? to.map((e) => ({ email: e }))
    : [{ email: to }];

  const payload = {
    sender:      { name: FROM_NAME, email: FROM_EMAIL },
    to:          recipients,
    subject,
    htmlContent: html,
    textContent: text || subject,
    replyTo:     { email: FROM_EMAIL },
  };

  try {
    const response = await brevoClient.post('/smtp/email', payload);
    console.log(`📧 Email sent → [${recipients.map(r => r.email).join(', ')}] | ${subject} | id: ${response.data.messageId}`);
  } catch (error) {
    const msg = error.response?.data?.message || error.message;
    console.error('❌ Email send failed:', msg);
    if (error.response?.data?.errors) {
      console.error('   Details:', JSON.stringify(error.response.data.errors));
    }
    throw new Error(`Failed to send email: ${msg}`);
  }
}

// ── Shared brand header/footer helpers ───────────────────────────────────────
function brandHeader(title, subtitle = '') {
  return `
    <div style="background: linear-gradient(135deg, #0f172a 0%, #1e3a5f 100%); padding: 40px 30px; text-align: center; border-radius: 12px 12px 0 0;">
      <div style="display:inline-block; background:rgba(255,255,255,0.08); border:1px solid rgba(255,255,255,0.12); border-radius:8px; padding:6px 14px; margin-bottom:18px;">
        <span style="font-size:13px; font-weight:700; letter-spacing:2px; text-transform:uppercase; color:#60a5fa;">BorderlessBridge</span>
      </div>
      <h1 style="margin:0; font-size:26px; font-weight:800; color:#ffffff; line-height:1.2;">${title}</h1>
      ${subtitle ? `<p style="margin:10px 0 0; font-size:16px; color:rgba(255,255,255,0.75);">${subtitle}</p>` : ''}
    </div>
  `;
}

function brandFooter() {
  return `
    <div style="background:#f8fafc; padding:24px 30px; text-align:center; border-top:1px solid #e2e8f0; border-radius:0 0 12px 12px;">
      <p style="margin:0 0 6px; font-size:13px; color:#64748b;">🔒 Your information is handled with strict confidentiality.</p>
      <p style="margin:0; font-size:12px; color:#94a3b8;">© ${new Date().getFullYear()} BorderlessBridge. All rights reserved.</p>
    </div>
  `;
}

function emailWrapper(innerHtml) {
  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
</head>
<body style="font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,'Helvetica Neue',Arial,sans-serif; background-color:#f1f5f9; margin:0; padding:24px 0; color:#1e293b;">
  <div style="max-width:600px; margin:0 auto; background:#ffffff; border-radius:12px; overflow:hidden; box-shadow:0 4px 24px rgba(0,0,0,0.07);">
    ${innerHtml}
  </div>
</body>
</html>`;
}

// ── 1. Submission Received — sent to applicant after eligibility form ──────────
/**
 * @param {{ fullName: string, email: string, destination: string, visaType: string, priority: string }} params
 */
async function sendSubmissionReceivedEmail({ fullName, email, destination, visaType, priority }) {
  const firstName = fullName.trim().split(/\s+/)[0] || fullName;
  const priorityColor = priority === 'high' ? '#16a34a' : priority === 'medium' ? '#d97706' : '#64748b';
  const priorityLabel = priority === 'high' ? 'High Priority' : priority === 'medium' ? 'Medium Priority' : 'Standard';

  const html = emailWrapper(`
    ${brandHeader('We\'ve Received Your Assessment ✅', 'A specialist will review your profile shortly')}
    <div style="padding:40px 30px;">
      <p style="font-size:16px; color:#334155; margin:0 0 20px;">Hi <strong>${firstName}</strong>,</p>
      <p style="font-size:16px; color:#334155; margin:0 0 24px;">
        Thank you for completing your Proof of Funds eligibility assessment. Your submission has been received and a BorderlessBridge specialist is reviewing your profile.
      </p>

      <div style="background:#f8fafc; border:1px solid #e2e8f0; border-radius:10px; padding:24px; margin-bottom:28px;">
        <h3 style="margin:0 0 16px; font-size:14px; font-weight:700; color:#64748b; text-transform:uppercase; letter-spacing:1px;">Your Submission Summary</h3>
        <table style="width:100%; border-collapse:collapse;">
          <tr>
            <td style="padding:8px 0; color:#64748b; font-size:14px; width:45%;">Destination Country</td>
            <td style="padding:8px 0; font-weight:600; font-size:14px; color:#1e293b;">${destination}</td>
          </tr>
          <tr style="border-top:1px solid #e2e8f0;">
            <td style="padding:8px 0; color:#64748b; font-size:14px;">Visa Type</td>
            <td style="padding:8px 0; font-weight:600; font-size:14px; color:#1e293b; text-transform:capitalize;">${visaType}</td>
          </tr>
          <tr style="border-top:1px solid #e2e8f0;">
            <td style="padding:8px 0; color:#64748b; font-size:14px;">Priority</td>
            <td style="padding:8px 0;">
              <span style="display:inline-block; padding:3px 10px; background:${priorityColor}18; color:${priorityColor}; border-radius:100px; font-size:12px; font-weight:700; text-transform:uppercase; letter-spacing:0.5px;">${priorityLabel}</span>
            </td>
          </tr>
        </table>
      </div>

      <div style="background:#fffbeb; border-left:4px solid #f59e0b; border-radius:0 8px 8px 0; padding:16px 20px; margin-bottom:28px;">
        <p style="margin:0; font-size:14px; color:#78350f;">
          <strong>⚡ What Happens Next?</strong><br>
          If you are eligible, you'll be redirected to book a strategy call with a BorderlessBridge specialist who will walk you through the next steps.
        </p>
      </div>

      <p style="font-size:14px; color:#64748b; margin:0;">
        If you have any questions in the meantime, reach us on WhatsApp at 
        <a href="https://wa.me/${process.env.WHATSAPP_NUMBER || '2349133380497'}" style="color:#2563eb; font-weight:600;">+234 913 338 0497</a>.
      </p>
    </div>
    ${brandFooter()}
  `);

  const text = `Hi ${firstName},\n\nThank you for completing your Proof of Funds eligibility assessment.\n\nDestination: ${destination}\nVisa Type: ${visaType}\nPriority: ${priorityLabel}\n\nA BorderlessBridge specialist will review your profile. If eligible, book a call directly from the website.\n\nQuestions? WhatsApp us: +234 913 338 0497\n\n© ${new Date().getFullYear()} BorderlessBridge`;

  await sendEmail({ to: email, subject: `✅ Assessment Received — We'll Be in Touch, ${firstName}`, html, text });
}


// ── 2. New Submission Alert — sent to admin/team ─────────────────────────────
/**
 * @param {{ fullName: string, email: string, phone: string, nationality: string, destination: string, visaType: string, timeline: string, accessToFunds: string, pofAmount: string, lettersReceived: string, priorRefusal: string, heardFrom: string, priority: string, score: number, summary: string }} params
 */
async function sendAdminNewSubmissionAlert(params) {
  const {
    fullName, email, phone, nationality, destination, visaType,
    timeline, accessToFunds, pofAmount, lettersReceived,
    priorRefusal, heardFrom, priority, score, summary,
  } = params;

  const priorityColor = priority === 'high' ? '#16a34a' : priority === 'medium' ? '#d97706' : '#64748b';
  const priorityLabel = priority === 'high' ? '🔥 HIGH' : priority === 'medium' ? '⚡ MEDIUM' : 'STANDARD';

  const html = emailWrapper(`
    ${brandHeader('New Eligibility Submission 🔔', 'A new lead has submitted the eligibility form')}
    <div style="padding:40px 30px;">
      <div style="background:${priorityColor}12; border:2px solid ${priorityColor}; border-radius:10px; padding:16px 20px; margin-bottom:28px; text-align:center;">
        <p style="margin:0; font-size:18px; font-weight:800; color:${priorityColor};">Priority: ${priorityLabel}</p>
        <p style="margin:4px 0 0; font-size:13px; color:${priorityColor}; opacity:0.8;">Score: ${score}</p>
      </div>

      <div style="background:#f8fafc; border:1px solid #e2e8f0; border-radius:10px; padding:24px; margin-bottom:28px;">
        <h3 style="margin:0 0 16px; font-size:13px; font-weight:700; color:#64748b; text-transform:uppercase; letter-spacing:1px;">Lead Details</h3>
        <table style="width:100%; border-collapse:collapse; font-size:14px;">
          <tr><td style="padding:7px 0; color:#64748b; width:40%;">Name</td><td style="padding:7px 0; font-weight:600; color:#1e293b;">${fullName}</td></tr>
          <tr style="border-top:1px solid #e2e8f0;"><td style="padding:7px 0; color:#64748b;">Email</td><td style="padding:7px 0; font-weight:600; color:#2563eb;">${email}</td></tr>
          <tr style="border-top:1px solid #e2e8f0;"><td style="padding:7px 0; color:#64748b;">Phone/WhatsApp</td><td style="padding:7px 0; font-weight:600;">${phone}</td></tr>
          <tr style="border-top:1px solid #e2e8f0;"><td style="padding:7px 0; color:#64748b;">Nationality</td><td style="padding:7px 0; font-weight:600;">${nationality}</td></tr>
          <tr style="border-top:1px solid #e2e8f0;"><td style="padding:7px 0; color:#64748b;">Destination</td><td style="padding:7px 0; font-weight:600;">${destination}</td></tr>
          <tr style="border-top:1px solid #e2e8f0;"><td style="padding:7px 0; color:#64748b;">Visa Type</td><td style="padding:7px 0; font-weight:600; text-transform:capitalize;">${visaType}</td></tr>
          <tr style="border-top:1px solid #e2e8f0;"><td style="padding:7px 0; color:#64748b;">Timeline</td><td style="padding:7px 0; font-weight:600;">${timeline}</td></tr>
          <tr style="border-top:1px solid #e2e8f0;"><td style="padding:7px 0; color:#64748b;">Access to Funds</td><td style="padding:7px 0; font-weight:600;">${accessToFunds}</td></tr>
          <tr style="border-top:1px solid #e2e8f0;"><td style="padding:7px 0; color:#64748b;">PoF Amount</td><td style="padding:7px 0; font-weight:600;">${pofAmount || 'Not specified'}</td></tr>
          <tr style="border-top:1px solid #e2e8f0;"><td style="padding:7px 0; color:#64748b;">Letters Received</td><td style="padding:7px 0; font-weight:600;">${lettersReceived || 'None yet'}</td></tr>
          <tr style="border-top:1px solid #e2e8f0;"><td style="padding:7px 0; color:#64748b;">Prior Refusal</td><td style="padding:7px 0; font-weight:600;">${priorRefusal === 'yes' ? 'Yes' : 'No'}</td></tr>
          <tr style="border-top:1px solid #e2e8f0;"><td style="padding:7px 0; color:#64748b;">Source</td><td style="padding:7px 0; font-weight:600;">${heardFrom}</td></tr>
        </table>
      </div>

      ${summary ? `
      <div style="background:#1e293b; border-radius:10px; padding:20px 24px;">
        <h3 style="margin:0 0 12px; font-size:13px; font-weight:700; color:#94a3b8; text-transform:uppercase; letter-spacing:1px;">AI Summary</h3>
        <p style="margin:0; font-size:13px; color:#e2e8f0; white-space:pre-line; line-height:1.7;">${summary}</p>
      </div>
      ` : ''}
    </div>
    ${brandFooter()}
  `);

  const text = `NEW SUBMISSION — Priority: ${priorityLabel}\n\nName: ${fullName}\nEmail: ${email}\nPhone: ${phone}\nNationality: ${nationality}\nDestination: ${destination}\nVisa Type: ${visaType}\nTimeline: ${timeline}\nAccess to Funds: ${accessToFunds}\nPoF Amount: ${pofAmount || 'N/A'}\nLetters: ${lettersReceived || 'None yet'}\nPrior Refusal: ${priorRefusal}\nSource: ${heardFrom}\n\n${summary}`;

  await sendEmail({
    to: ADMIN_EMAIL,
    subject: `[${priorityLabel}] New PoF Lead: ${fullName} → ${destination}`,
    html,
    text,
  });
}


// ── 3. Booking Confirmation — sent to client after booking a strategy call ────
/**
 * @param {{ fullName: string, email: string, phone: string, bookedDate: string, bookedTime: string, googleMeetLink?: string, inviteUrl?: string }} params
 */
async function sendBookingConfirmationEmail({ fullName, email, phone, bookedDate, bookedTime, googleMeetLink, inviteUrl }) {
  const firstName = fullName.trim().split(/\s+/)[0] || fullName;

  // Format date nicely
  const d = new Date(bookedDate + 'T00:00:00');
  const dateLabel = d.toLocaleDateString('en-NG', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' });

  // Format time
  const [h] = bookedTime.split(':');
  const hour = parseInt(h, 10);
  const suffix = hour >= 12 ? 'PM' : 'AM';
  const h12 = hour > 12 ? hour - 12 : hour === 0 ? 12 : hour;
  const timeLabel = `${h12}:00 ${suffix} (WAT)`;

  const html = emailWrapper(`
    ${brandHeader('Strategy Call Confirmed! 🎉', 'Your slot is booked — get ready')}
    <div style="padding:40px 30px;">
      <p style="font-size:16px; color:#334155; margin:0 0 24px;">Hi <strong>${firstName}</strong>,</p>
      <p style="font-size:16px; color:#334155; margin:0 0 28px;">
        Your strategy call with a BorderlessBridge Proof of Funds specialist is confirmed. Please find the details below.
      </p>

      <!-- Booking Summary Card -->
      <div style="background:#0f172a; border-radius:12px; padding:28px; margin-bottom:28px;">
        <h3 style="margin:0 0 20px; font-size:13px; font-weight:700; color:#94a3b8; text-transform:uppercase; letter-spacing:1px;">Booking Details</h3>
        <table style="width:100%; border-collapse:collapse;">
          <tr>
            <td style="padding:10px 0; color:#94a3b8; font-size:14px; width:40%;">📅 Date</td>
            <td style="padding:10px 0; font-weight:700; font-size:15px; color:#ffffff;">${dateLabel}</td>
          </tr>
          <tr style="border-top:1px solid rgba(255,255,255,0.08);">
            <td style="padding:10px 0; color:#94a3b8; font-size:14px;">⏰ Time</td>
            <td style="padding:10px 0; font-weight:700; font-size:15px; color:#ffffff;">${timeLabel}</td>
          </tr>
          <tr style="border-top:1px solid rgba(255,255,255,0.08);">
            <td style="padding:10px 0; color:#94a3b8; font-size:14px;">👤 Name</td>
            <td style="padding:10px 0; font-weight:700; font-size:15px; color:#ffffff;">${fullName}</td>
          </tr>
          <tr style="border-top:1px solid rgba(255,255,255,0.08);">
            <td style="padding:10px 0; color:#94a3b8; font-size:14px;">📞 Phone</td>
            <td style="padding:10px 0; font-weight:700; font-size:15px; color:#ffffff;">${phone}</td>
          </tr>
          ${googleMeetLink ? `
          <tr style="border-top:1px solid rgba(255,255,255,0.08);">
            <td style="padding:10px 0; color:#94a3b8; font-size:14px;">💻 Meet Link</td>
            <td style="padding:10px 0;">
              <a href="${googleMeetLink}" style="color:#60a5fa; font-weight:600; font-size:14px; word-break:break-all;">${googleMeetLink}</a>
            </td>
          </tr>
          ` : ''}
        </table>
      </div>

      <!-- Important Reminders -->
      <div style="background:#fefce8; border:1px solid #fde68a; border-radius:10px; padding:20px; margin-bottom:28px;">
        <h4 style="margin:0 0 12px; font-size:14px; font-weight:700; color:#92400e;">⚠️ Please Note:</h4>
        <ul style="margin:0; padding-left:18px; color:#78350f; font-size:14px; line-height:1.8;">
          <li>Ensure your <strong>video and microphone are working</strong> before the call.</li>
          <li>Be on time — our specialists operate on a strict schedule.</li>
          <li>Have any relevant documents ready (admission letters, visa refusal notices, etc.).</li>
          <li>This is a <strong>1-hour strategy session</strong>, so come prepared with questions.</li>
        </ul>
      </div>

      ${inviteUrl ? `
      <div style="text-align:center; margin-bottom:28px;">
        <a href="${inviteUrl}" style="display:inline-block; background:#ea580c; color:#ffffff; text-decoration:none; padding:14px 32px; border-radius:100px; font-weight:700; font-size:15px; box-shadow:0 4px 16px rgba(234,88,12,0.3);">
          📅 Add to Google Calendar
        </a>
      </div>
      ` : ''}

      <p style="font-size:14px; color:#64748b; margin:0;">
        Need to reschedule? Contact us on WhatsApp: 
        <a href="https://wa.me/${process.env.WHATSAPP_NUMBER || '2349133380497'}" style="color:#2563eb; font-weight:600;">+234 913 338 0497</a>
      </p>
    </div>
    ${brandFooter()}
  `);

  const text = `Strategy Call Confirmed! 🎉\n\nHi ${firstName},\n\nYour BorderlessBridge strategy call is confirmed.\n\nDate: ${dateLabel}\nTime: ${timeLabel}\nName: ${fullName}\nPhone: ${phone}\n${googleMeetLink ? `Google Meet: ${googleMeetLink}\n` : ''}\nPlease ensure your video and microphone are working before the call.\n${inviteUrl ? `\nAdd to Calendar: ${inviteUrl}\n` : ''}\nNeed to reschedule? WhatsApp: +234 913 338 0497\n\n© ${new Date().getFullYear()} BorderlessBridge`;

  await sendEmail({ to: email, subject: `📅 Strategy Call Confirmed — ${dateLabel} at ${timeLabel}`, html, text });
}


// ── 4. Admin Booking Alert — sent to team when new booking is made ─────────────
/**
 * @param {{ to?: string, fullName: string, email: string, phone: string, bookedDate: string, bookedTime: string, businessRole?: string, packageChoice?: string, startTimeline?: string, googleMeetLink?: string, calendarError?: string }} params
 */
async function sendAdminBookingAlert({ to, fullName, email, phone, bookedDate, bookedTime, businessRole, packageChoice, startTimeline, googleMeetLink, calendarError }) {
  const d = new Date(bookedDate + 'T00:00:00');
  const dateLabel = d.toLocaleDateString('en-NG', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' });
  const [h] = bookedTime.split(':');
  const hour = parseInt(h, 10);
  const suffix = hour >= 12 ? 'PM' : 'AM';
  const h12 = hour > 12 ? hour - 12 : hour === 0 ? 12 : hour;
  const timeLabel = `${h12}:00 ${suffix} (WAT)`;

  let errorSection = '';
  if (calendarError) {
    errorSection = `
      <div style="background:#fef2f2; border:1px solid #fca5a5; border-radius:10px; padding:16px; margin-bottom:24px;">
        <h4 style="margin:0 0 8px; color:#991b1b; font-size:14px; font-weight:700;">⚠️ Google Calendar Integration Failed</h4>
        <p style="margin:0; color:#7f1d1d; font-size:13px; font-family:monospace; word-break:break-all; line-height:1.5;">${calendarError}</p>
      </div>
    `;
  }

  const html = emailWrapper(`
    ${brandHeader('New Strategy Call Booked 📞', 'A client has booked a call')}
    <div style="padding:40px 30px;">
      ${errorSection}
      <div style="background:#f8fafc; border:1px solid #e2e8f0; border-radius:10px; padding:24px; margin-bottom:24px;">
        <h3 style="margin:0 0 16px; font-size:13px; font-weight:700; color:#64748b; text-transform:uppercase; letter-spacing:1px;">Client Details</h3>
        <table style="width:100%; border-collapse:collapse; font-size:14px;">
          <tr><td style="padding:7px 0; color:#64748b; width:40%;">Name</td><td style="padding:7px 0; font-weight:600; color:#1e293b;">${fullName}</td></tr>
          <tr style="border-top:1px solid #e2e8f0;"><td style="padding:7px 0; color:#64748b;">Email</td><td style="padding:7px 0; font-weight:600; color:#2563eb;">${email}</td></tr>
          <tr style="border-top:1px solid #e2e8f0;"><td style="padding:7px 0; color:#64748b;">Phone</td><td style="padding:7px 0; font-weight:600;">${phone}</td></tr>
          <tr style="border-top:1px solid #e2e8f0;"><td style="padding:7px 0; color:#64748b;">📅 Date</td><td style="padding:7px 0; font-weight:700; color:#1e293b;">${dateLabel}</td></tr>
          <tr style="border-top:1px solid #e2e8f0;"><td style="padding:7px 0; color:#64748b;">⏰ Time</td><td style="padding:7px 0; font-weight:700; color:#1e293b;">${timeLabel}</td></tr>
          ${businessRole ? `<tr style="border-top:1px solid #e2e8f0;"><td style="padding:7px 0; color:#64748b;">Role</td><td style="padding:7px 0; font-weight:600;">${businessRole}</td></tr>` : ''}
          ${packageChoice ? `<tr style="border-top:1px solid #e2e8f0;"><td style="padding:7px 0; color:#64748b;">Package</td><td style="padding:7px 0; font-weight:600;">${packageChoice}</td></tr>` : ''}
          ${startTimeline ? `<tr style="border-top:1px solid #e2e8f0;"><td style="padding:7px 0; color:#64748b;">Start Timeline</td><td style="padding:7px 0; font-weight:600;">${startTimeline}</td></tr>` : ''}
          ${googleMeetLink ? `<tr style="border-top:1px solid #e2e8f0;"><td style="padding:7px 0; color:#64748b;">Meet Link</td><td style="padding:7px 0;"><a href="${googleMeetLink}" style="color:#2563eb; font-weight:600;">${googleMeetLink}</a></td></tr>` : ''}
        </table>
      </div>
    </div>
    ${brandFooter()}
  `);

  let text = `New Booking Alert!\n\nName: ${fullName}\nEmail: ${email}\nPhone: ${phone}\nDate: ${dateLabel}\nTime: ${timeLabel}\n${businessRole ? `Role: ${businessRole}\n` : ''}${packageChoice ? `Package: ${packageChoice}\n` : ''}${startTimeline ? `Start: ${startTimeline}\n` : ''}${googleMeetLink ? `Meet: ${googleMeetLink}` : ''}`;
  if (calendarError) {
    text = `⚠️ GOOGLE CALENDAR ERROR:\n${calendarError}\n\n` + text;
  }

  await sendEmail({
    to: to || ADMIN_EMAIL,
    subject: calendarError 
      ? `⚠️ Google Calendar Error / New Call Booked: ${fullName}`
      : `📞 New Call Booked: ${fullName} — ${dateLabel} at ${timeLabel}`,
    html,
    text,
  });
}

module.exports = {
  sendEmail,
  sendSubmissionReceivedEmail,
  sendAdminNewSubmissionAlert,
  sendBookingConfirmationEmail,
  sendAdminBookingAlert,
};
