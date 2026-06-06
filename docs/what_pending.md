# Zaadi Kitchen — Pending Backend APIs & Infrastructure

> **Generated:** 2026-06-07  
> **Source:** Cross-referenced from `UI_API_FLOW_GUIDE.md`, `ZaadiKitchen_CustomerApp_UIScreens_v2.html`, `ZaadiKitchen_AdminOpsRider_UIScreens_v1-1.html`, and sign-off CSVs  
> **Base path:** `/api/v1`

---

## Table of Contents

1. [Customer App — Missing Endpoints](#1-customer-app--missing-endpoints)
2. [Admin / Ops Portal — Missing Endpoints](#2-admin--ops-portal--missing-endpoints)
3. [Rider App — Missing Endpoints](#3-rider-app--missing-endpoints)
4. [Infrastructure & Integration Gaps](#4-infrastructure--integration-gaps)
5. [Partial Implementations — Gaps in Existing Endpoints](#5-partial-implementations--gaps-in-existing-endpoints)
6. [Priority Order](#6-priority-order)

---

## 1. Customer App — Missing Endpoints

### 1.1 Address Management
> **Gap:** Only `GET /users/delivery-location` and `POST /users/delivery-location` are implemented.  
> The address list screen requires full CRUD — edit, delete, and set-as-primary.

| Method | Endpoint | Description |
|---|---|---|
| `PATCH` | `/users/delivery-location/:id` | Edit a saved address (pre-filled form) |
| `DELETE` | `/users/delivery-location/:id` | Delete a saved address |
| `PATCH` | `/users/delivery-location/:id/primary` | Set an address as the primary/default |

**Business rules:**
- Deleting the primary address should auto-promote the most recently created remaining address to primary
- All three endpoints require `CUSTOMER` role

---

### 1.2 User Stats
> **Gap:** The Profile tab shows "Meals (total delivered)" and "Referrals" count stats. No endpoint returns these. Can be added to `GET /users/profile` response or as a separate endpoint.

| Method | Endpoint | Description |
|---|---|---|
| `GET` | `/users/stats` | Returns `totalMealsDelivered` and `totalReferrals` |

---

### 1.3 Meal Rating
> **Gap:** Entire feature is missing — no entity model, no use cases, no routes.  
> Triggered by a 3 PM push notification daily. Shows last 5 unrated delivered meals.  
> One star minimum to submit. Tags are optional multi-select chips. Cannot be changed after submission.

| Method | Endpoint | Description |
|---|---|---|
| `GET` | `/subscriptions/me/pending-ratings` | Returns up to 5 delivered meals awaiting a rating |
| `POST` | `/meals/:meal_id/rating` | Submit rating — body: `{ stars: 1–5, tags?: string[] }` |
| `GET` | `/subscriptions/me/ratings` | Paginated submitted ratings (used in Meal History) |

**Tag options (from UI):** `Great portion` · `Too spicy` · `Too salty` · `Small portion`

**Business rules:**
- `stars` is required (1–5), tags are optional
- Once submitted, rating cannot be updated or deleted
- Only meals with `status: "delivered"` in the user's subscription can be rated
- Visible to admin in customer detail view

---

### 1.4 Meal History
> **Gap:** No paginated delivery history endpoint exists.  
> Screen shows a weekly kcal bar chart (Sun–Thu), per-day meal name + kcal + star rating, and cumulative calorie total.

| Method | Endpoint | Description |
|---|---|---|
| `GET` | `/subscriptions/me/history` | Paginated delivery history — meal name, date, kcal, status, star rating |

**Query params:** `?page=1&per_page=20&period=last_30_days`

---

### 1.5 Customer Issue Reporting
> **Gap:** Feature entirely missing — no model, no routes.  
> "Report an Issue" screen: today's delivery is pre-filled. Customer selects an issue type (single-select, required) and adds optional description text. Creates a record that appears in the **Admin issues queue**.

| Method | Endpoint | Description |
|---|---|---|
| `POST` | `/subscriptions/me/issues` | Submit an issue report for a delivery |

**Request body:**
```json
{
  "deliveryDate": "2025-05-05",
  "issueType": "wrong_order",
  "description": "I received the salad instead of the executive meal."
}
```

**Issue types:** `wrong_order` · `quality_issue` · `not_delivered` · `damaged`

---

### 1.6 Billing History / Order List
> **Gap:** Individual orders are created and retrievable by ID (`GET /orders/:id`), but there is no endpoint to list all of a customer's past orders for the Billing & Wallet screen.

| Method | Endpoint | Description |
|---|---|---|
| `GET` | `/orders` | List all orders for the authenticated user — paginated |
| `GET` | `/orders/:id/receipt` | Download PDF receipt for a specific order |

**Query params for list:** `?page=1&per_page=20`

---

### 1.7 Switch Meal Type — Specific Day
> **Gap:** `PATCH /subscriptions/me/meal-type` handles whole-plan switching only.  
> The Switch screen also offers a "Specific days" mode with a Sun–Thu day picker.

| Method | Endpoint | Description |
|---|---|---|
| `PATCH` | `/subscriptions/me/deliveries/:delivery_date/meal-type` | Switch meal type for one specific day only |

**Request body:** `{ "mealType": "salad" }`

**Business rules:**
- Subject to same 6 PM cutoff rule as skip
- Only affects the one delivery day, not the whole plan

---

### 1.8 FCM Push Token
> **Gap:** `POST /users/profile` DTO does not include an `fcmToken` field.  
> The sign-off spec requires the FCM token to be updated on every app launch.

**Fix:** Add `fcmToken?: string` field to `UpdateProfileDTO` and persist it on `UserModel`.

---

## 2. Admin / Ops Portal — Missing Endpoints

### 2.1 Dashboard Summary
> **Gap:** The 6-tile dashboard needs live sub-label data. Currently nothing provides aggregated live counts.

| Method | Endpoint | Role | Description |
|---|---|---|---|
| `GET` | `/admin/dashboard/summary` | `ADMIN` | Live tile data: open issues count, today's meal count + stage, MRR, current week fill status, active customer count, active automation count |

**Response shape:**
```json
{
  "openIssues": 3,
  "todayMealCount": 63,
  "pipelineStage": "locked",
  "mrr": 14500,
  "weekFillStatus": { "filled": 7, "total": 10 },
  "activeCustomers": 142,
  "activeAutomations": 5
}
```

---

### 2.2 Daily Operations
> **Gap:** All daily ops endpoints are missing. Both Admin and Ops users land on this screen after login.  
> Pipeline: `locked → dispatch → delivered` (sequential, no skipping).  
> Issues queue is Admin-only — Ops never sees it.

| Method | Endpoint | Role | Description |
|---|---|---|---|
| `GET` | `/admin/ops/daily-summary` | `ADMIN\|OPS` | Pipeline stage + meal breakdown (executive/salad/total counts) |
| `POST` | `/admin/ops/advance-stage` | `ADMIN\|OPS` | Advance pipeline stage: `locked → dispatch → delivered` |
| `GET` | `/admin/ops/export-delivery-sheet` | `ADMIN\|OPS` | Download CSV of today's full delivery list grouped by building + floor |
| `GET` | `/admin/ops/issues` | `ADMIN` | Paginated open issues queue (customer avatar, issue type, time since submitted) |
| `POST` | `/admin/ops/issues/:id/credit` | `ADMIN` | Credit customer wallet for issue (max SAR 30, presets: 10/20/28/30) |
| `POST` | `/admin/ops/issues/:id/reject` | `ADMIN` | Reject issue — reason required, notes optional (max 200 chars) |

**Advance stage request:** `{ "date": "2025-05-05" }` (defaults to today)

**Credit request:** `{ "amountSar": 28 }`

**Reject request:**
```json
{
  "reason": "not_valid_issue",
  "notes": "Optional free text up to 200 chars"
}
```
**Reject reasons:** `not_valid_issue` · `duplicate_report` · `outside_policy`

**Business rules:**
- Meal counts freeze at `locked` stage (post-6 PM). `advance-stage` cannot move back.
- Resolved issues (credited or rejected) are archived immediately — not deleted.
- Credit triggers a push notification to the customer; reject does not.

---

### 2.3 Label Printing
> **Gap:** All label endpoints are missing.  
> Labels are 100×60 mm PDF. Counts reflect the frozen `locked` stage and do not change after 6 PM.

| Method | Endpoint | Role | Description |
|---|---|---|---|
| `GET` | `/admin/labels` | `ADMIN\|OPS` | List all labels for today — filterable by `meal_type` and `area_id` |
| `GET` | `/admin/labels/download-all` | `ADMIN\|OPS` | Download single PDF of all labels sorted by area |
| `GET` | `/admin/labels/area/:area_id/download` | `ADMIN\|OPS` | Download PDF of one area's labels only |
| `GET` | `/admin/labels/:delivery_id/preview` | `ADMIN\|OPS` | Preview single label (100×60 mm sticker layout) |
| `GET` | `/admin/labels/:delivery_id/download` | `ADMIN\|OPS` | Download individual label PDF |

**Label content:** customer name, building + floor + desk, gate/delivery preference, meal type colour band, delivery date, order reference `#ZK-YYYY-MM-DD-NNNN`

**Query params for list:** `?meal_type=executive&area_id=area_01ALNAKHEEL`

---

### 2.4 Revenue Dashboard
> **Gap:** All revenue endpoints are missing. Admin-only — Ops never sees this section.  
> Stat cards on this screen are tappable and pre-filter the Customer List.

| Method | Endpoint | Role | Description |
|---|---|---|---|
| `GET` | `/admin/revenue/summary` | `ADMIN` | MRR + MoM change, active subscriber count, churned count, avg skip rate |
| `GET` | `/admin/revenue/daily-chart` | `ADMIN` | Daily revenue bar chart data — today's bar highlighted, future as projections |
| `GET` | `/admin/revenue/plan-breakdown` | `ADMIN` | Subscriber count per plan type (for horizontal bar chart) |

**Query params for daily chart:** `?period=this_week` | `this_month` | `prior`

**Churn definition (from UI):** expired + no renewal within 3 days

---

### 2.5 Customer Management
> **Gap:** All customer management endpoints are missing.  
> The customer list uses inline row expansion (no navigation to a separate screen). "View History →" opens a full history panel.

| Method | Endpoint | Role | Description |
|---|---|---|---|
| `GET` | `/admin/customers` | `ADMIN\|OPS` | Paginated customer list — search by name/phone, filter by plan status |
| `GET` | `/admin/customers/:id` | `ADMIN\|OPS` | Inline detail: current plan, end date, wallet balance, delivery address, issue count |
| `GET` | `/admin/customers/:id/history` | `ADMIN\|OPS` | Full history panel: all subscription periods, delivery records, skipped days, resolved issues |
| `POST` | `/admin/customers/:id/deactivate` | `ADMIN` | Deactivate a customer account |
| `POST` | `/admin/customers/:id/wallet/credit` | `ADMIN\|OPS` | Manual wallet credit — requires mandatory admin note |

**Query params for list:** `?q=Ahmed&status=active&page=1&per_page=50`

**Status filter values:** `active` · `expired` · `paused` · `cancelled`

**Wallet credit request:**
```json
{
  "amountSar": 50,
  "note": "Compensation for missed delivery on 2025-05-03"
}
```

---

### 2.6 Comms & Automations
> **Gap:** All comms endpoints are missing.  
> Five automation toggles (push notification only — no WhatsApp or SMS for automations or broadcasts).

| Method | Endpoint | Role | Description |
|---|---|---|---|
| `GET` | `/admin/comms/automations` | `ADMIN` | List 5 automations with their current enabled/disabled state |
| `PUT` | `/admin/comms/automations/:id` | `ADMIN` | Toggle an automation on or off |
| `GET` | `/admin/comms/broadcast/segments` | `ADMIN` | List broadcast segments with live recipient counts |
| `POST` | `/admin/comms/broadcast` | `ADMIN` | Send a push notification broadcast to a segment |

**Automation IDs and triggers:**

| ID | Name | Trigger |
|---|---|---|
| `delivery_confirmed` | Delivery Confirmed | Driver taps "Mark as Delivered" |
| `end_of_day_feedback` | End-of-Day Feedback | 3:00 PM daily to meal recipients |
| `renewal_reminder` | Renewal Reminder | 48 hours before plan end date |
| `referral_reward` | Referral Reward | Referred friend's plan activates |
| `lapsed_reactivation` | Lapsed Reactivation | Expired + no renewal in 3 days |

**Broadcast segments:** `all` · `delivering_today` · `active` · `expiring_soon` · `churned`

**Broadcast request:**
```json
{
  "segment": "delivering_today",
  "message": "Your lunch is on the way! Expected delivery between 12:00–1:00 PM. 🍱"
}
```

**Business rules:**
- Broadcasts are push notification only — no WhatsApp or SMS
- Send button is disabled when segment recipient count = 0
- Message max 200 characters

---

## 3. Rider App — Missing Endpoints

> **Gap:** All rider endpoints are missing. The Driver role is detected from the OTP verify response and routes to the rider screens. No separate app — same build as customer app.

| Method | Endpoint | Role | Description |
|---|---|---|---|
| `GET` | `/rider/deliveries/today` | `DRIVER` | Today's delivery list — grouped by building, then floor, sorted by area |
| `POST` | `/rider/deliveries/:id/complete` | `DRIVER` | Mark a delivery as completed (triggers `delivery_confirmed` push to customer) |
| `POST` | `/rider/deliveries/:id/issue` | `DRIVER` | Report a delivery issue with issue type and optional photo |

**Delivery issue request:**
```json
{
  "issueType": "wrong_order",
  "photoKey": "s3-key-from-presigned-url",
  "notes": "Customer wasn't at desk"
}
```

**Issue types:** `wrong_order` · `quality_issue` · `not_delivered` · `damaged`

**Business rules:**
- Completing a delivery creates a record in the admin issues queue if an issue was also reported
- Driver issue report and customer issue report feed the same `GET /admin/ops/issues` queue
- `complete` endpoint triggers `delivery_confirmed` automation push if that toggle is enabled

---

## 4. Infrastructure & Integration Gaps

### 4.1 Real Payment Gateway
> **Current state:** `MockPaymentGatewayService` always returns success. No real gateway wired.

- [ ] Integrate Moyasar / HyperPay / Telr (client to provide credentials)
- [ ] Implement `POST /payment/webhook` — signature verification, idempotency key, triggers subscription creation on confirmed payment
- [ ] Failed payment response must return HTTP 200 to gateway (prevent retry storm)
- [ ] Swap `MockPaymentGatewayService` binding in `coreadapter.module.ts`

---

### 4.2 FCM Push Notifications
> **Current state:** No Firebase project set up, no FCM service exists in `src/infrastructure/`.

- [ ] Create `FCMNotificationService` in `src/infrastructure/FCM/`
- [ ] Store FCM token on `UserModel` (field needs adding)
- [ ] Implement `POST /users/profile` to accept and persist `fcmToken`
- [ ] Wire FCM calls into: `delivery_confirmed`, `end_of_day_feedback`, `renewal_reminder`, `referral_reward`, `lapsed_reactivation`, issue credit

---

### 4.3 Scheduled Jobs (Cron / EventBridge)
> **Current state:** Only `POST /internal/jobs/expire-subscriptions` exists.

| Job | Trigger | What it does |
|---|---|---|
| **6 PM Lock** | Daily at 18:00 AST | Freezes skip/switch/salad toggle for next day; advances `daily-ops` to `locked` stage |
| **3 PM Feedback Push** | Daily at 15:00 AST | Sends feedback push to all customers with a delivery today (if `end_of_day_feedback` automation enabled) |
| **Renewal Reminder Push** | Daily | Sends push to customers with plan ending in ≤ 2 days (if `renewal_reminder` automation enabled) |
| **Lapsed Reactivation Push** | Daily | Sends push to customers expired ≥ 3 days with no renewal (if `lapsed_reactivation` automation enabled) |
| **Expire Subscriptions** | Daily | Already implemented — triggered by EventBridge |

Each job needs a corresponding `POST /internal/jobs/:job-name` endpoint guarded by `InternalSecretGuard` for EventBridge.

---

### 4.4 Billing PDF Receipts
> **Current state:** No PDF generation infrastructure exists.

- [ ] Add Puppeteer or `@react-pdf/renderer` for PDF generation
- [ ] Implement `GET /orders/:id/receipt` which returns a PDF blob
- [ ] Receipt content: order reference, plan name, amount paid, promo applied, date, customer name

---

### 4.5 Plan Configuration (Admin)
> **Current state:** Plans are seeded as static data; no admin UI can edit them.

| Method | Endpoint | Role | Description |
|---|---|---|---|
| `GET` | `/admin/plans` | `ADMIN` | List all plans with full config |
| `PATCH` | `/admin/plans/:id` | `ADMIN` | Edit plan price, meal count, skip allowance, pause limit |

**Business rules (from sign-off):**
- Price changes reflect in app immediately
- Skip/pause limit changes apply to **new subscriptions only** — not existing ones

---

### 4.6 OTP Channel — FCM as Primary
> **Current state:** SNS SMS is implemented. FCM (push notification) is the primary OTP channel per the UI spec.

- [ ] Add Firebase Admin SDK OTP delivery (send OTP as push notification to device)
- [ ] Implement fallback: if push not delivered within N seconds, fall back to SMS
- [ ] `channel` field in `POST /auth/otp/send` already accepts `"whatsapp"` — needs FCM path

---

## 5. Partial Implementations — Gaps in Existing Endpoints

| Endpoint | What Exists | What's Missing |
|---|---|---|
| `POST /users/profile` | Name + email update | `fcmToken` field |
| `GET /users/profile` | Basic profile | `totalMealsDelivered`, `totalReferrals` stats |
| `PATCH /subscriptions/me/meal-type` | Whole-plan switch | Per-day switch (see §1.7) |
| `GET /users/delivery-location` | List addresses | Returns array but no `edit`, `delete`, `set-primary` |
| `POST /auth/otp/send` | SNS SMS | FCM push as primary channel |
| `POST /referrals/validate` | Validates code | Awarding credits to both parties after referee's first confirmed payment not verified wired |
| `PATCH /admin/areas/:area_id` | Update area | `status: "paused"` variant needs confirmation it is handled |

---

## 6. Priority Order

### 🔴 Critical — Blocks Core Customer Flow

| # | Item |
|---|---|
| 1 | Address edit / delete / set-primary (`PATCH`, `DELETE`, `PATCH /primary`) |
| 2 | Customer issue reporting (`POST /subscriptions/me/issues`) |
| 3 | Meal rating endpoints (pending-ratings, submit, history) |
| 4 | Meal history (`GET /subscriptions/me/history`) |
| 5 | Real payment gateway + webhook handler |
| 6 | FCM push notifications infrastructure |
| 7 | 6 PM lock cron job |

### 🟠 High — Blocks Admin Daily Operations

| # | Item |
|---|---|
| 8 | Daily ops summary + advance stage |
| 9 | Issues queue (credit / reject) |
| 10 | Export delivery sheet (CSV) |
| 11 | Label printing (list + download-all + area + individual) |
| 12 | Admin dashboard summary tile data |

### 🟡 High — Blocks Admin Oversight

| # | Item |
|---|---|
| 13 | Customer management (list + detail + history + deactivate + credit) |
| 14 | Revenue dashboard (summary + chart + plan breakdown) |
| 15 | Comms & automations (toggles + broadcast) |

### 🟢 Medium — Rider & Ancillary

| # | Item |
|---|---|
| 16 | Rider app (today's list + mark delivered + report issue) |
| 17 | Billing history list + PDF receipt |
| 18 | Plan configuration admin panel |
| 19 | FCM as primary OTP channel (not just SMS) |
| 20 | Scheduled cron jobs (3 PM feedback, renewal reminder, lapsed push) |
| 21 | Referral credit-both-parties on first payment |
| 22 | Per-day meal type switch |
| 23 | FCM token on profile update |
| 24 | User stats endpoint |

---

*Last updated: 2026-06-07*
