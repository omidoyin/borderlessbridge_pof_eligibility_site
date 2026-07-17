Build a Complete CRM Module for BorderlessBridge Admin
Overview

Build a modern, clean, responsive CRM module inside the existing BorderlessBridge Admin Dashboard.

This CRM is not intended to be a generic CRM like HubSpot. It is purpose-built for BorderlessBridge's sales process.

The CRM should manage leads from the moment they submit the eligibility form until they become paying clients and eventually completed cases.

The design should be clean, minimal, professional and fast.

Use a white background with subtle gray borders and soft shadows.

Accent color should match the existing BorderlessBridge branding (green as the primary accent).

Avoid clutter.

The interface should feel similar to Linear, Notion, Stripe Dashboard or modern SaaS products.

Everything should work beautifully on desktop, tablet and mobile.

Sidebar

Add a new sidebar item.

CRM

Inside CRM create:

CRM

Dashboard

Leads

My Tasks

Reports

Do NOT create separate pages like:

Contacts
Deals
Companies

This CRM revolves around a single Lead record.

CRM Dashboard

The dashboard should display quick statistics.

Top cards:

New Leads

Qualified Leads

Strategy Calls Today

Payments Pending

Paid Clients

Completed Cases

Second row

Today's Tasks

Overdue Tasks

Upcoming Calls

Upcoming Follow Ups

Third row

Charts

Leads this week

Sales Pipeline

Conversion Rate

Lead Sources
Leads Page

This is the main CRM page.

Display all leads in a modern table.

Columns:

Checkbox

Name

Destination

Visa Type

Timeline

Current Stage

Assigned To

Priority

Next Task

Last Contact

Created Date

Actions
Table Actions

Everything below should be editable directly inside the table WITHOUT opening the lead.

Stage

Dropdown.

New Lead

Contacted

Qualified

Quote Sent

Strategy Call Booked

Payment Pending

Paid

Processing

Completed

Lost

Changing the stage updates instantly.

Assigned To

Dropdown.

Example

Sales Head

Admin

Operations
Priority

Dropdown.

High

Medium

Low

Display colored badges.

Red

Yellow

Green

Quick Task

Each row has

+ Task

Click opens a small modal.

Fields

Task Title

Due Date

Assign To

Priority

Save

No need to leave the page.

Quick Note

Each row has

+ Note

Small popup.

One textarea.

Save.

Quick Actions
View

Archive

Delete
Filters

Top of page

Search

Filter

Sort

Filters include

Stage

Assigned To

Destination

Visa Type

Timeline

Priority

Date

Payment Status
Column Visibility

Allow users to choose visible columns.

Button

Columns

Example

✓ Name

✓ Destination

✓ Stage

✓ Priority

✓ Next Task

☐ Nationality

☐ Email

☐ Phone

☐ POF Amount

☐ Previous Refusal

Lead Details Page

Clicking View opens the Lead Workspace.

This is one complete page.

No tabs.

Everything scrolls naturally.

Section 1

Header

John Doe

Canada Tourist Visa

Stage Badge

Assigned To

Priority

Buttons

Edit

WhatsApp

Call

Email
Section 2

Customer Information

Full Name

Phone

Email

Nationality

Destination

Visa Type

Timeline

POF Amount

Access To Funds

Applying Within 30 Days

Prior Refusal

Referral Source

Additional Notes
Section 3

Tasks

Task list

Each task

Checkbox

Task

Due Date

Assigned To

Priority

Buttons

Add Task

Edit

Delete

Completed tasks stay visible.

Section 4

Activity Timeline

Automatically generated.

Examples

Lead Created

Assigned to Sales Head

Stage changed

Quote sent

Task completed

Strategy Call booked

Payment received

Documents uploaded

Moved to Processing

Marked Completed

Newest first.

Each activity shows

User

Time

Description
Section 5

Internal Notes

Rich text area.

Notes should display

Author

Date

Note

Newest first.

Add Note button.

Section 6

Strategy Call

Display

Status

Date

Time

Meeting Link

Sales Head

Buttons

Reschedule

Cancel

View Calendar
Section 7

Payment

Display

Status

Amount

Payment Date

Reference

Method

Statuses

Pending

Paid

Refunded
Section 8

Documents

Uploaded files

Examples

Passport

Admission Letter

Bank Statement

Others

Allow preview and download.

Section 9

Case Progress

Display progress

Eligibility

Strategy Call

Payment

POF Processing

Completed

Nice progress component.

Tasks Page

Separate page

My Tasks

Shows tasks assigned to current logged in user.

Columns

Task

Lead

Due Date

Priority

Status

Actions

Filters

Today

Upcoming

Overdue

Completed

Completing a task automatically creates an Activity inside the Lead.

Reports

Simple analytics.

Cards

New Leads

Qualified

Lost

Won

Revenue

Conversion Rate

Charts

Leads by Destination

Visa Type Distribution

Sales Funnel

Daily Leads

Monthly Revenue
Notifications

Notification bell.

Examples

New Lead

Task Assigned

Task Due

Strategy Call Today

Payment Received
Mobile Layout

Must be fully responsive.

On mobile:

The Leads table becomes cards.

Each card displays

Name

Destination

Stage

Assigned To

Priority

Buttons

View

Task

Note

Quick stage change should still work.

Lead detail sections stack vertically.

Floating Add button for quick actions.

UX Rules

The Sales Head should be able to perform most daily work directly from the Leads page without opening the Lead.

Only open the Lead when detailed information is needed.

Keep clicks to a minimum.

Every update should happen without a full page refresh.

Use optimistic UI updates where possible.

Future-Proof the Architecture

Build the CRM with extensibility in mind.

Future integrations may include:

HubSpot sync
Google Calendar
WhatsApp integration
Email history
SMS
AI lead scoring
Automation rules
Multiple sales representatives
Case management after payment

Design the database and components so these features can be added later without major refactoring.

Design Style

Use a modern SaaS aesthetic:

Clean white background
Light gray borders (#E5E7EB)
Soft shadows
Rounded corners (10–12px)
Green as the primary accent color (matching BorderlessBridge branding)
Consistent spacing (8px spacing system)
Clear typography with good hierarchy
Hover states for interactive elements
Smooth transitions (150–200ms)
Accessible color contrast and keyboard navigation

The interface should feel closer to Linear, Stripe Dashboard, Notion, or Vercel than to older enterprise CRMs. Prioritize speed, clarity, and ease of use over feature density.