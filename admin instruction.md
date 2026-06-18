What you should build (simple architecture)
1. Save raw submission (already doing this)

Your current submission table stays as-is.

2. Add a “summary” field

Add a column like:

summary TEXT

Optionally:

priority VARCHAR(10) -- high / medium / low
3. Generate summary on the backend (FREE)

When a new submission comes in:

Run a simple function
Convert JSON → readable text
Save it in summary
Example output (what admin will see)
🔵 Lead Summary

This is a UK student visa applicant who has received a school admission letter and intends to apply within 1–3 months.

The applicant is aware of the required proof of funds (₦46,000,000) but currently does not have access to the funds, indicating a possible need for financial support guidance.

They were acquired through Facebook and have no prior visa refusal history.

👤 Full Details
Name: Tertsea Thomas Gwaza
Email: gwazatertseathomas@gmail.com
Phone: +2348060011810
Nationality: Nigerian
Destination: UK
Visa Type: Student
Timeline: 1–3 months
Admission: School Admission Letter
POF: ₦46,000,000
Access to Funds: No
Source: Facebook
Status: New
4. Admin dashboard layout (what you should build)

Each submission should appear as a card or table row:

Card view:

🔥 High Intent Lead
UK Student Visa — 1–3 months

👉 “Has admission letter but no access to ₦46M POF”

Buttons:

View Details
Mark as Contacted
Archive
5. Optional upgrade (still free)

Add a simple scoring system:

let score = 0;

if (lead.letters_received) score += 30;
if (lead.access_to_funds === "no") score += 20;
if (lead.timeline === "1_3_months") score += 20;
if (lead.knows_pof_amount === "yes") score += 10;

if (score >= 60) priority = "High";
Final recommendation

Since you’re NOT using WhatsApp or email:

👉 Your admin dashboard becomes your “command center”
👉 So invest in:

clean summaries
priority labels
quick scanning cards