# Zaadi Kitchen — Backend API: High-Level Business Requirements

> **Purpose:** This document lists — module by module — every piece of **business logic** the backend must support. No implementation details, only *what* the system must do.
>
> **Sources:** Sign-Off Workbook (Backend APIs, Admin Dashboard, Mobile App, Infrastructure & QA) + Architecture PDF + Gap Analysis

---

## 1. Identity & Authentication

| # | Requirement |
|---|-------------|
| 1 | **(Customer & Driver)** Send a one-time password via **WhatsApp** (primary) or **SMS** |
| 2 | **(Customer & Driver)** Verify OTP within 30 seconds of delivery |
| 3 | **(Customer & Driver)** Enforce **rate limiting** — max 3 OTP attempts per phone per 10 minutes, then lockout |
| 4 | **(Customer & Driver)** Issue **JWT access token** (short-lived, ~15 min) + **refresh token** (long-lived, ~30 days) |
| 5 | **(Customer & Driver)** Silent token refresh — access token renewed before expiry without user action |
| 6 | **(Customer & Driver)** Logout invalidates current session only (not all devices) |
| 7 | **(Driver)** Role determined at OTP verify step — no separate login flow |
| 8 | **(Admin)** Separate web app login via **email + password** only — no OTP flow |
| 9 | **(Admin)** Issue **JWT access token** (short-lived, ~15 min) + **refresh token** (long-lived, ~8 hours) 
| 10 | Role-based access: **CUSTOMER**, **DRIVER**, **ADMIN** — enforced on every protected route across all apps |

---

## 2. User Profile & Account

| # | Requirement |
|---|-------------|
| 1 | Update profile: name, language preference (EN/AR), push notification token |
| 2 | Get current user profile |
| 3 | **Delete account** — mandatory for App Store / Play Store compliance |
| 4 | Sign-up flow: collect full name, optional email |

---

## 3. Address & Building Management

### 3A. Admin-Managed Location Hierarchy

| # | Requirement |
|---|-------------|
| 1 | Admin can create and manage a hierarchy: **Tech Park → Tower → Building → Floor** |
| 2 | Each building has: name, geo-coordinates, delivery notes, active/inactive status |
| 3 | Only **active** buildings are visible to customers during search |
| 4 | Admin can deactivate a building (hides it from new orders, does not affect existing) |

### 3B. Customer Address Search & Selection
| # | Requirement |
|---|-------------|
| 5 | Customer types to search — results come from **verified internal DB first** |
| 6 | Search scoped to **GCC region** only |
| 7 | Customer selects a verified building then adds: floor number, desk number, delivery instructions (max 200 chars) |
| 8 | If location not found, customer can **submit a new location request** (name + map pin or address text) |

### 3C. New Location Verification Flow
| # | Requirement |
|---|-------------|
| 9 | Submitted location enters **"Pending Verification"** state |
| 10 | Customer is informed their location is under review |
| 11 | Delivery partner or ops team **calls customer to confirm** location details |
| 12 | Admin reviews and either **approves** (adds to verified DB) or **rejects** (with reason) |
| 13 | Customer is notified of approval or rejection via WhatsApp/SMS |
| 14 | Approved locations become available for all future customers (Tier 1) |

### 3D. Saved Addresses
| # | Requirement |
|---|-------------|
| 15 | Customer can save multiple addresses from verified buildings |
| 16 | **Set default address** — pre-filled for all new orders |
| 17 | Deleted addresses cannot be used in new orders |
| 18 | If a building is deactivated by admin, saved addresses for that building are flagged and customer is notified |

---

## 4. Plans & Pricing

| # | Requirement |
|---|-------------|
| 1 | Serve plan catalogue: **TRY_IT**, **WEEKLY**, **MONTHLY**, **QUARTERLY** |
| 2 | Each plan defines: price, included skip allowance, max pause days, salad add-on pricing |
| 3 | Admin can **CRUD plan configuration** — price changes reflect immediately in the app |
| 4 | Skip allowance changes apply to **new subscriptions only** (not retroactive) |

---

## 5. Subscription State Machine

| # | Requirement |
|---|-------------|
| 1 | States: **NEW → ACTIVE → PAUSED → EXPIRED** |
| 2 | **Create subscription** — triggered only after confirmed payment webhook (not client-initiated) |
| 3 | Start date calculated based on plan type; state set to ACTIVE immediately |
| 4 | **Pause subscription** — ACTIVE → PAUSED with date-range validation and max pause days enforced |
| 5 | Deliveries suspended for the entire pause period |
| 6 | **Resume subscription** — PAUSED → ACTIVE; end date recalculated to account for paused days |
| 7 | **Renew / Upgrade** — prorated cost calculation; wallet credits offset before charging the gateway |
| 8 | Subscription end date extended correctly on renewal |
| 9 | **Expiry** — subscription auto-transitions to EXPIRED when days run out |
| 10 | Renewal nudge when ≤ 5 days remain |

---

## 6. Meal Engine

| # | Requirement |
|---|-------------|
| 1 | Serve **weekly menu** (Mon–Fri) with per-day meals, calorie/macro data, allergens, and salad flag |
| 2 | **Switch meal type** — for entire plan or specific days, within allowed window |
| 3 | **6 PM cut-off lock** — after 6 PM, the following operations are blocked for the next day: skip, switch meal, toggle salad |
| 4 | **Skip a day** — decrements skip counter atomically; rejected if balance is zero |
| 5 | **Undo skip** — only within a configurable time window; restores counter and reinstates delivery |
| 6 | **Salad add-on toggle** — per-user, per-day; reflected in production counts |
| 7 | **Meal history** — paginated (max 20/page), includes meal name, date, calories, delivery status |
| 8 | Calorie tracking / cumulative totals |

---

## 7. Ops & Delivery

| # | Requirement |
|---|-------------|
| 1 | **Daily production counts** — aggregated meal counts per type, accurate as of 6 PM lock |
| 2 | **Delivery status transitions**: SCHEDULED → OUT_FOR_DELIVERY → DELIVERED (enforced order) |
| 3 | Timestamp recorded at each status transition |
| 4 | **Driver GPS capture** — latitude/longitude recorded when driver marks delivery |
| 5 | **Issue reporting** by driver — categories: **Damaged, Missing, Wrong** — with photo upload (S3 presigned URL) |
| 6 | Issues appear in admin queue immediately |
| 7 | **Label generation** — per-order label data (name, address, floor/desk, meal, date) for PDF generation (100×60 mm thermal labels) |
| 8 | Label counts must match production counts post-6 PM lock |
| 9 | **Driver CSV export** — per-building delivery list grouped by building → floor |
| 10 | **QR scan verification** — validate QR code on delivery to confirm successful drop-off |

---

## 8. Payments & Wallet

| # | Requirement |
|---|-------------|
| 1 | **Init payment** — create gateway session (Telr/Tap) with correct amount; session expires after 15 minutes |
| 2 | Support **Apple Pay**, **Google Pay**, and **card** via gateway |
| 3 | **Webhook handler** — verify signature, enforce idempotency (no double-processing), trigger subscription creation/renewal on confirmed payment |
| 4 | Failed payment webhooks return 200 to gateway (prevent retry storm) |
| 5 | **Billing history** — all transactions in reverse chronological order |
| 6 | **PDF receipt generation** per transaction (Puppeteer) |
| 7 | **Wallet ledger** — credit/debit transactions with description, amount, timestamp |
| 8 | Wallet balance can **never go below zero** |
| 9 | **Atomic transactions** — no race conditions on concurrent wallet credits (transaction-level locking) |
| 10 | Wallet credit applied **before** charging the payment gateway on checkout |
| 11 | Promo code validation and discount application at checkout |

---

## 9. Referral System

| # | Requirement |
|---|-------------|
| 1 | Every user gets a **unique referral code** |
| 2 | Referee applies referral code at sign-up — validated, expired/invalid codes return clear error |
| 3 | **Referee credited at sign-up** |
| 4 | **Referrer credited only after referee's first successful payment** (deferred credit logic) |
| 5 | Referral stats: code, total uses, total credits earned |
| 6 | **Referral stats CSV export** for admin |

---

## 10. Ratings & Feedback

| # | Requirement |
|---|-------------|
| 1 | **Meal rating** — 1–5 stars, optional photo (S3 upload), optional text note (max 500 chars) |
| 2 | Ratings visible in admin customer detail view |

---

## 11. Notifications

| # | Requirement |
|---|-------------|
| 1 | **Push notifications via FCM** — must work on both iOS and Android |
| 2 | Notification types: delivery reminder (day-before or morning-of), skip-window alert (before 6 PM), renewal nudge (≤ 5 days left) |
| 3 | Tapping notification **deep-links** to the correct screen in the app |
| 4 | User can disable notifications from profile |

---

## 12. Admin Dashboard (Backend APIs)

| # | Requirement |
|---|-------------|
| 1 | **Live meal count dashboard** — real-time totals by meal type with lock status (Locked/Cooking after 6 PM) |
| 2 | **Delivery status board** — per-building overview with issue flags and driver assignments |
| 3 | **Customer list & search** — filter by plan state, plan type, building, sign-up date; paginated (max 50/page); results within 2 seconds |
| 4 | **Customer detail view** — full plan history, skip/pause log (timestamped), ratings (with photo thumbnails), current address |
| 5 | **Issue queue** — combined driver-reported + customer feedback; resolve/close actions; closed issues archived, not deleted |
| 6 | **Manual wallet credit/refund** — requires mandatory admin note; audit trail (admin user, amount, note, timestamp); credited immediately |
| 7 | **Weekly menu CRUD** — create/edit/delete meals with photo upload (S3), calorie & allergen data, salad flag |
| 8 | **MRR / Revenue overview** — monthly recurring revenue, new vs churned subscribers, plan distribution; must match billing history totals |

---

## 13. Audit & Compliance

| # | Requirement |
|---|-------------|
| 1 | **Audit log** for every skip, pause, resume, status change, and manual credit |
| 2 | Audit entries include: who, what, when, and relevant context |
| 3 | Account deletion support (App Store / Play Store compliance) |

---

## 14. Cross-Cutting / Infrastructure (Backend-Relevant)

| # | Requirement |
|---|-------------|
| 1 | **6 PM cron job** — Redis-based daily lock; API endpoints also enforce lock independently of cron |
| 2 | Lock status exposed to admin dashboard |
| 3 | **EN/AR localisation** — all API responses must support bilingual content where applicable |
| 4 | Scale target: **5,000 active users** |
| 5 | **S3 + CloudFront** for all file uploads (meal photos, issue photos, rating photos) |

---

## Out of Scope (v1)

| Item | Notes |
|------|-------|
| Real-time map-based delivery tracking | No GPS routing for drivers |
| ERP / POS integrations | No kitchen ERP or POS |
| Multi-kitchen / multi-city | Single city, single kitchen |
| Email marketing / CRM | No MailChimp, Klaviyo, etc. |
| Advanced analytics / BI | Basic MRR only |
| Loyalty / points programme | Referral credits only |
| Additional UAT rounds | One round included |

---

*Generated: April 25, 2025*
