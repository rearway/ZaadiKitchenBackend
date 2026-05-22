# Plan & Payment + Subscription Management — Implementation Guide

**Modules:** Plan & Payment (F10–F22) · Subscription Management (F37–F56)  
**Base URL:** `http://localhost:3000/api/v1`  
**Auth:** All endpoints require `Authorization: Bearer <access_token>` unless noted.

---

## What Was Built

### Architecture (Clean Architecture layers)

```
HTTP Controllers  →  Use Cases  →  Entity Gateways  →  Persistence Services  →  Database
     (7 new)        (25 new)        (10 new)              (8 new)
```

### New Database Tables

| Table | Purpose |
|-------|---------|
| `plans` | Meal plans with pricing (try_it, week, month, quarterly) |
| `promo_codes` | Referral and promo codes with discount rules |
| `checkout_sessions` | 10-minute payment sessions with TTL |
| `payment_methods` | Saved tokenised payment cards |
| `orders` | Confirmed purchase records |
| `subscriptions` | Active/paused/cancelled meal subscriptions |
| `delivery_days` | Individual daily delivery entries (status per day) |
| `public_holidays` | Saudi public holidays (admin-managed) |
| `wallet_transactions` | Ledger of wallet credits/debits |
| `user_referrals` | Referral relationships + rewards |

> The `users` table also gained a `referral_code VARCHAR(20) UNIQUE` column.

---

## API Reference

### 1. Config

#### `GET /config/public-holidays`
Returns Saudi public holidays used to grey out unavailable dates in the start-date picker.

**Query params:** `year` (optional, defaults to current year)

```json
// Response 200
{
  "holidays": [
    { "date": "2025-04-23", "name": "Founding Day" },
    { "date": "2025-06-25", "name": "Eid Al-Adha" }
  ]
}
```

---

### 2. Plans

#### `GET /plans`
All plans (static catalogue). Use this to display the plan selection screen.

```json
// Response 200
{
  "plans": [
    {
      "id": "try_it",
      "name": "Try It",
      "price_sar": 28,
      "meal_count": 1,
      "price_per_meal_sar": 28.00,
      "skip_days_allowed": 1,
      "pause_days_allowed": 1,
      "is_most_popular": false
    },
    {
      "id": "month",
      "name": "Month Plan",
      "price_sar": 500,
      "meal_count": 22,
      "price_per_meal_sar": 22.70,
      "skip_days_allowed": 66,
      "pause_days_allowed": 66,
      "is_most_popular": true
    }
  ]
}
```

#### `GET /plans/active`
Active plans with the user's last-used plan flagged + current wallet balance. Use this for **returning users** — shows the "YOUR LAST PLAN" badge and the wallet credit strip.

```json
// Response 200
{
  "plans": [
    {
      "id": "month",
      "name": "Month Plan",
      "price_sar": 500,
      "meal_count": 22,
      "price_per_meal_sar": 22.70,
      "skip_days_allowed": 66,
      "pause_days_allowed": 66,
      "is_most_popular": true,
      "is_last_plan": true       // ← only one plan gets true
    }
  ],
  "wallet_balance_sar": 50.00   // ← auto-applied at checkout
}
```

---

### 3. Referrals

#### `POST /referrals/validate`
Validates a referral or promo code **before** applying it at checkout. Use this to give instant feedback as the user types.

```json
// Request
{ "code": "AHMED15", "plan_id": "month" }

// Response 200 — valid
{
  "valid": true,
  "code": "AHMED15",
  "discount_type": "referral",
  "discount_sar": 100,
  "description": "Referral discount"
}

// Response 200 — invalid
{
  "valid": false,
  "error_code": "INVALID_CODE",       // or NOT_NEW_USER / PLAN_MISMATCH
  "message": "This code doesn't exist or has already been used."
}
```

**Error codes:**

| `error_code` | Meaning |
|---|---|
| `INVALID_CODE` | Code not found or exhausted |
| `NOT_NEW_USER` | Referral codes are for new users only |
| `PLAN_MISMATCH` | Code is scoped to a different plan |

#### `GET /referrals/me`
User's own referral code + stats. Use for the **Referral screen** in Profile tab.

```json
// Response 200
{
  "referral_code": "AHMED15",
  "friends_joined": 4,
  "total_earned_sar": 170,
  "reward_rate_pct": 10,
  "whatsapp_share_text": "Hey! Try Zaadi Kitchen — fresh lunch delivered to your desk every day. Use my code AHMED15 for SAR 100 off your first plan. 🍛"
}
```

> **Note:** `GET /users/referral` is an alias for this endpoint — same response, both routes work.

---

### 4. Checkout Flow

**Complete flow:**
```
GET /plans/active
  → POST /checkout/session          (create 10-min session)
  → POST /checkout/session/:id/promo (optional: apply code)
  → GET /delivery/start-dates        (pick start date)
  → GET /payment/methods             (pick payment method)
  → POST /orders                     (pay & confirm)
  → GET /orders/:id                  (receipt)
```

#### `POST /checkout/session`
Creates a checkout session. Wallet credit is **auto-applied**. Any existing active session is expired.

```json
// Request
{ "plan_id": "month", "meal_type": "executive" }

// Response 201
{
  "session_id": "sess_01JK2MNP3QRS4TUV5WXY6Z",
  "plan_id": "month",
  "meal_type": "executive",
  "base_price_sar": 500,
  "wallet_credit_sar": 50,        // auto-applied
  "promo_discount_sar": 0,
  "total_due_sar": 450,
  "promo_code": null,
  "promo_attempt_count": 0,
  "promo_locked": false,
  "expires_at": "2025-05-05T10:51:00Z"   // 10-minute TTL
}
```

**Business rules:**
- `meal_type`: `"executive"` or `"salad"` (price is the same)
- Session TTL is **10 minutes** — show a countdown timer
- One active session per user at a time

#### `GET /checkout/session/:session_id`
Poll this after any promo change to refresh the order summary.

- Returns same shape as `POST /checkout/session`
- Returns **`410 Gone`** with `SESSION_EXPIRED` if TTL has passed

#### `POST /checkout/session/:session_id/promo`
Apply a promo/referral code.

```json
// Request
{ "code": "AHMED15" }

// Response 200 — applied
{
  "session_id": "sess_...",
  "promo_code": "AHMED15",
  "discount_type": "referral",
  "promo_discount_sar": 100,
  "total_due_sar": 400,
  "promo_attempt_count": 1,
  "promo_locked": false
}

// Response 422 — invalid code
{
  "error": "INVALID_CODE",
  "message": "This code doesn't exist or has already been used.",
  "promo_attempt_count": 3,
  "promo_locked": false
}

// Response 423 — locked after 10 bad attempts
{
  "error": "PROMO_LOCKED",
  "message": "Too many invalid attempts. Promo field has been disabled for this session.",
  "promo_attempt_count": 10,
  "promo_locked": true
}
```

#### `DELETE /checkout/session/:session_id/promo`
Remove applied code and recalculate total.

```json
// Response 200
{
  "session_id": "sess_...",
  "promo_code": null,
  "promo_discount_sar": 0,
  "total_due_sar": 450
}
```

---

### 5. Delivery Start Dates

#### `GET /delivery/start-dates`
Returns valid subscription start dates (Sun–Thu, excluding public holidays). Use for the **date picker** on the Payment page.

**Query params:** `from` (YYYY-MM-DD, optional), `limit` (default 14, max 30)

```json
// Response 200
{
  "start_dates": [
    {
      "date": "2025-05-05",
      "label": "Sunday, 5 May 2025",
      "is_next_working_day": true,   // pre-select this one in the UI
      "is_available": true
    },
    {
      "date": "2025-06-25",
      "label": "Wednesday, 25 Jun 2025",
      "is_next_working_day": false,
      "is_available": false,
      "unavailable_reason": "Public holiday"
    }
  ]
}
```

**Rules:**
- Working days: **Sunday–Thursday** (KSA work week)
- Fridays and Saturdays are excluded automatically
- Public holidays sourced from `/config/public-holidays` are returned as `is_available: false`

---

### 6. Payment Methods

#### `GET /payment/methods`
```json
// Response 200
{
  "payment_methods": [
    { "id": "pm_abc123", "type": "mada", "label": "Mada ····4242", "is_default": true, "is_last_used": true },
    { "id": "pm_def456", "type": "apple_pay", "label": "Apple Pay", "is_default": false, "is_last_used": false }
  ]
}
```
Pre-select the method with `is_last_used: true`. Empty array = prompt card entry.

**Supported types:** `mada` · `visa` · `mastercard` · `stc_pay` · `apple_pay`

#### `POST /payment/methods`
Save a tokenised card.

```json
// Request
{ "type": "mada", "token": "tok_sandbox_xxxxxxxxxxxx" }

// Response 201
{ "id": "pm_ghi789", "type": "mada", "label": "Mada ····0000", "is_default": false, "is_last_used": false }
```

> **Note:** `apple_pay` is handled natively by the device — it doesn't go through this endpoint.

#### `DELETE /payment/methods/:method_id`
`204 No Content` on success.

---

### 7. Orders

#### `POST /orders`
The **Pay button** action. Confirms the session, creates the order + subscription + delivery schedule.

```json
// Request
{
  "session_id": "sess_01JK2MNP3QRS4TUV5WXY6Z",
  "payment_method_id": "pm_abc123",
  "start_date": "2025-05-05"
}

// Response 201
{
  "order_id": "ord_01JM3...",
  "subscription_id": "sub_01JM3XYZ",
  "status": "confirmed",
  "is_new_user": true,          // drives which success screen to show
  "plan_id": "month",
  "meal_type": "executive",
  "meal_count": 22,
  "start_date": "2025-05-05",
  "first_delivery_label": "Sunday, 5 May",
  "summary": {
    "plan_price_sar": 500,
    "wallet_credit_sar": 0,
    "promo_discount_sar": 100,
    "promo_code": "AHMED15",
    "discount_label": "Referral discount",
    "total_paid_sar": 400
  }
}
```

**What happens on `POST /orders`:**
1. Session is validated and confirmed
2. Order record created
3. Subscription created (status = `active`)
4. Delivery days generated: `meal_count` working days (Sun–Thu, skipping public holidays) from `start_date`
5. Wallet debited if `wallet_credit_sar > 0`
6. Referrer wallet credited (10% of plan price) if a referral code was applied
7. Payment method marked as last-used

**Error responses:**
- `402` — `PAYMENT_FAILED` (gateway declined)
- `410` — `SESSION_EXPIRED` (start over from checkout session)

#### `GET /orders/:order_id`
Full order receipt. Use for the "View receipt" CTA on the success screen.

```json
// Response 200
{
  "order_id": "ord_...",
  "subscription_id": "sub_...",
  "status": "confirmed",
  "plan_id": "month",
  "meal_type": "executive",
  "meal_count": 22,
  "start_date": "2025-05-05",
  "summary": {
    "plan_price_sar": 500,
    "wallet_credit_sar": 50,
    "promo_discount_sar": 0,
    "total_paid_sar": 450
  },
  "payment_method": { "type": "mada", "label": "Mada ····4242" },
  "created_at": "2025-05-05T09:41:00Z"
}
```

---

### 8. Subscriptions

#### `GET /subscriptions/me`
Active (or most recent) subscription. Drives the **My Plan tab** and Home screen banners.

```json
// Response 200
{
  "subscription_id": "sub_01JM3XYZ",
  "plan_id": "month",
  "plan_name": "Month Plan",
  "meal_type": "executive",
  "status": "active",             // active | paused | cancelled | expired
  "total_meal_days": 22,
  "delivered_count": 14,
  "skipped_count": 3,
  "remaining_count": 5,           // computed: total - delivered - skipped
  "days_remaining": 17,           // calendar days until end_date
  "start_date": "2025-05-05",
  "end_date": "2025-06-05",
  "skip_days_allowed": 66,
  "skip_days_used": 3,
  "skip_days_remaining": 63,
  "pause_days_allowed": 66,
  "pause_days_used": 0,
  "paused_until": null,
  "pause_ceiling_date": null
}
```

**Status → UI mapping:**

| `status` | Home banner | My Plan controls |
|---|---|---|
| `active` | Active | Normal |
| `paused` | Paused + Resume CTA | Toggle ON |
| `cancelled` | Deliveries continue until end_date | Cancel note |
| `expired` | Expired → Renew CTA | Renew CTA |

#### `GET /subscriptions/me/deliveries`
All delivery days with skip eligibility. Used by the **Skip a Day screen**.

**Query params:** `from` (YYYY-MM-DD), `to` (YYYY-MM-DD) — both optional

```json
// Response 200
{
  "deliveries": [
    {
      "date": "2025-05-05",
      "label": "Sun 5 May · Today",
      "meal_name": "Lamb Kabsa",
      "meal_type": "executive",
      "status": "past_cutoff",
      "skippable": false,
      "skip_reason": "past_cutoff"
    },
    {
      "date": "2025-05-06",
      "label": "Mon 6 May",
      "meal_name": "Chicken Mandi",
      "meal_type": "executive",
      "status": "skipped",
      "skippable": false,
      "skip_reason": "already_skipped",
      "undoable": true           // true if cutoff hasn't passed
    },
    {
      "date": "2025-05-07",
      "label": "Tue 7 May",
      "meal_name": "Kofta Platter",
      "meal_type": "executive",
      "status": "scheduled",
      "skippable": true
    }
  ],
  "skip_limit_reached": false
}
```

**Skip cutoff rule:** 6 PM KSA time (UTC+3) the day **before** delivery.

**`skip_reason` values when `skippable: false`:**

| Reason | Description |
|---|---|
| `past_cutoff` | 6 PM cutoff has passed |
| `skip_limit_reached` | All `skip_days_allowed` are used |
| `already_skipped` | Already skipped (show Undo button if `undoable: true`) |

#### `POST /subscriptions/me/deliveries/:delivery_date/skip`
Skip a delivery. `delivery_date` in `YYYY-MM-DD` format.

```json
// Response 200
{
  "date": "2025-05-06",
  "status": "skipped",
  "undoable": true,
  "skip_days_used": 4,
  "skip_days_remaining": 62
}
```

Error responses:
- `409` — `SKIP_LIMIT_REACHED` with `skip_days_used`, `skip_days_remaining`
- `422` — `PAST_CUTOFF`

#### `DELETE /subscriptions/me/deliveries/:delivery_date/skip`
Undo a skip. Only valid before the 6 PM cutoff.

```json
// Response 200
{
  "date": "2025-05-06",
  "status": "scheduled",
  "skip_days_used": 3,
  "skip_days_remaining": 63
}
```

#### `POST /subscriptions/me/pause`
Pause for a date range. Delivery days in the range are set to `paused` status.

```json
// Request
{ "start_date": "2025-05-12", "end_date": "2025-05-18" }

// Response 200
{
  "subscription_id": "sub_...",
  "status": "paused",
  "paused_from": "2025-05-12",
  "paused_until": "2025-05-18",
  "pause_ceiling_date": "2025-05-18",
  "pause_days_used": 5,
  "pause_days_remaining": 61
}
```

Error: `409 PAUSE_LIMIT_EXCEEDED` if range exceeds remaining pause days.

**Important:** Subscription does **not** auto-resume — user must call `/resume`.

#### `POST /subscriptions/me/resume`
Resume from a specific date.

```json
// Request
{ "resume_date": "2025-05-20" }    // use tomorrow for default "resume from tomorrow"

// Response 200
{
  "subscription_id": "sub_...",
  "status": "active",
  "resume_date": "2025-05-20",
  "first_delivery_label": "Tuesday, 20 May",
  "pause_days_used": 5
}
```

#### `POST /subscriptions/me/cancel`
Cancel (no request body needed). Deliveries continue until `end_date`. No refund.

```json
// Response 200
{
  "subscription_id": "sub_...",
  "status": "cancelled",
  "deliveries_continue_until": "2025-05-30",
  "refund_sar": 0,
  "message": "Your plan has been cancelled. Deliveries will continue until 30 May."
}
```

#### `PATCH /subscriptions/me/meal-type`
Switch Executive ↔ Salad. Price doesn't change.

```json
// Request — apply to all remaining days
{ "meal_type": "salad", "apply_to": "all", "specific_days": null }

// Request — apply to specific dates only
{ "meal_type": "salad", "apply_to": "specific", "specific_days": ["2025-05-13", "2025-05-14"] }

// Response 200
{
  "subscription_id": "sub_...",
  "meal_type": "salad",
  "applied_to": "all",
  "effective_from": "2025-05-07",    // next working day
  "message": "Meal type updated to Salad from Wed 7 May onwards."
}
```

**Cutoff rule:** Changes before 6 PM take effect **tomorrow**; after 6 PM take effect the **day after tomorrow**.

---

### 9. Wallet & Referral

#### `GET /users/wallet`
```json
// Response 200
{
  "balance_sar": 50.00,
  "currency": "SAR",
  "auto_applied_at_checkout": true    // wallet credit cannot be opted out
}
```

#### `GET /users/wallet/transactions`
Paginated transaction history. Use for the **Billing & Wallet screen**.

**Query params:** `page` (default 1), `per_page` (default 20, max 50)

```json
// Response 200
{
  "transactions": [
    {
      "id": "txn_001",
      "type": "debit",
      "amount_sar": -500,
      "label": "Month Plan · May",
      "description": "5 May 2025",
      "created_at": "2025-05-05T09:41:00Z"
    },
    {
      "id": "txn_002",
      "type": "credit",
      "amount_sar": 50,
      "label": "Referral reward",
      "description": "10% of SAR 500",
      "created_at": "2025-05-05T10:00:00Z"
    }
  ],
  "pagination": {
    "page": 1,
    "per_page": 20,
    "total": 2,
    "total_pages": 1
  }
}
```

#### `GET /users/referral`
Same as `GET /referrals/me` — both routes return identical data.

---

## Error Handling

All errors follow this envelope:

```json
{
  "error": "ERROR_CODE",
  "message": "Human-readable description.",
  "details": {}
}
```

### HTTP Status Code Reference

| Code | Meaning |
|------|---------|
| `200` | Success (GETs, actions with body) |
| `201` | Resource created |
| `204` | Success, no body (DELETE /payment/methods) |
| `400` | Validation error (missing fields, bad format) |
| `401` | Invalid/expired JWT token |
| `402` | Payment gateway failed |
| `404` | Resource not found |
| `409` | Business rule conflict (skip limit, pause limit) |
| `410` | Session expired (checkout TTL elapsed) |
| `422` | Semantically invalid (past cutoff, invalid code) |
| `423` | Promo field locked (10 bad attempts) |

### Domain Error Code Reference

| `error` code | HTTP | Description |
|---|---|---|
| `SESSION_EXPIRED` | 410 | Checkout session TTL elapsed |
| `PAYMENT_FAILED` | 402 | Gateway declined the card |
| `INVALID_CODE` | 422 | Promo/referral code not found or used |
| `NOT_NEW_USER` | 422 | Referral code needs new subscriber |
| `PLAN_MISMATCH` | 422 | Code scoped to a different plan |
| `PROMO_LOCKED` | 423 | 10 invalid attempts exhausted |
| `SKIP_LIMIT_REACHED` | 409 | All skip days used |
| `PAST_CUTOFF` | 422 | 6 PM day-before cutoff has passed |
| `PAUSE_LIMIT_EXCEEDED` | 409 | Pause range exceeds remaining days |

---

## Client App Integration Guide

### Complete Purchase Flow

```
1. GET /plans/active
   → Show plan cards with is_last_plan badge and wallet strip

2. User selects plan + meal type
   → POST /checkout/session
   → Save session_id (store for 10 min)
   → Start countdown timer in Payment page header

3. (Optional) User enters promo code
   → POST /referrals/validate  (instant feedback before applying)
   → POST /checkout/session/:id/promo  (apply to session)
   → GET /checkout/session/:id  (refresh order summary)

4. User picks start date
   → GET /delivery/start-dates  (pre-select is_next_working_day: true)

5. User picks payment method
   → GET /payment/methods  (pre-select is_last_used: true)
   → (New card) POST /payment/methods

6. User taps Pay
   → POST /orders
   → On 201: route to success screen based on is_new_user
   → On 410 SESSION_EXPIRED: route to Payment Timeout screen
   → On 402 PAYMENT_FAILED: show error inline, session stays active

7. Success screen — View Receipt CTA
   → GET /orders/:order_id
```

### Subscription Management Flow

```
Home / My Plan tab:
  → GET /subscriptions/me  (show status banner)

Skip a Day screen:
  → GET /subscriptions/me/deliveries
  → POST /subscriptions/me/deliveries/:date/skip
  → DELETE /subscriptions/me/deliveries/:date/skip  (undo)

Pause:
  → POST /subscriptions/me/pause  (with start_date + end_date)
  → POST /subscriptions/me/resume  (with resume_date)

Cancel:
  → POST /subscriptions/me/cancel

Switch meal type:
  → PATCH /subscriptions/me/meal-type

Billing & Wallet screen:
  → GET /users/wallet  (header balance)
  → GET /users/wallet/transactions  (transaction list)

Referral screen (Profile tab):
  → GET /referrals/me  (or GET /users/referral)
  → Use whatsapp_share_text for native share sheet
```

### Session Expiry Handling

The checkout session expires after **10 minutes**. The client should:

1. Display a countdown timer (from `expires_at` field)
2. On expiry (or any `410 SESSION_EXPIRED` response): route to **Payment Timeout** screen
3. Plan selection preference is remembered — `GET /plans/active` will still show `is_last_plan: true`

### Promo Code UX Rules

- Show a text field with a "Validate" button
- On keystroke / blur: call `POST /referrals/validate` for instant feedback (doesn't affect the session)
- On "Apply" tap: call `POST /checkout/session/:id/promo`
- If `promo_locked: true` in the response: **grey out and disable the entire promo field** for this session
- Display the running `promo_attempt_count` to the user ("X attempts remaining")

### Wallet Credit Display

- Always show wallet credit when `wallet_balance_sar > 0` on the plan selection and payment screens
- Wallet credit **cannot be opted out** — it's auto-applied
- Label it: "Wallet credit applied (-SAR X)" in the order summary

---

## Seeding Plans (Required for Testing)

Before testing purchase flows, seed the `plans` table. Example SQL:

```sql
INSERT INTO plans (id, name, slug, price_sar, meal_count, price_per_meal_sar, skip_days_allowed, pause_days_allowed, is_most_popular, is_active, created_at, updated_at)
VALUES
  (gen_random_uuid(), 'Try It',     'try_it',    28,   1,  28.00, 1,   1,   false, true, NOW(), NOW()),
  (gen_random_uuid(), 'Week Plan',  'week',      125,  5,  25.00, 15,  15,  false, true, NOW(), NOW()),
  (gen_random_uuid(), 'Month Plan', 'month',     500,  22, 22.70, 66,  66,  true,  true, NOW(), NOW()),
  (gen_random_uuid(), 'Quarterly',  'quarterly', 1300, 66, 19.70, 198, 198, false, true, NOW(), NOW());
```

And a sample referral promo code:

```sql
INSERT INTO promo_codes (id, code, type, discount_sar, owner_user_id, valid_for_plan_slug, max_uses, times_used, is_active, created_at, updated_at)
VALUES
  (gen_random_uuid(), 'AHMED15', 'referral', 100, '<user-uuid>', NULL, 100, 0, true, NOW(), NOW());
```

---

## Files Changed Summary

| Layer | Files |
|---|---|
| Migrations | `20260521000001-create-plan-payment-tables.js`, `20260521000002-create-subscription-tables.js`, `20260520000003-add-referral-code-to-users.js` |
| Sequelize Models | `PlanModel`, `PromoCodeModel`, `CheckoutSessionModel`, `PaymentMethodModel`, `OrderModel`, `SubscriptionModel`, `DeliveryDayModel`, `PublicHolidayModel`, `WalletTransactionModel`, `UserReferralModel` |
| Core Entities | All 10 new entity interfaces |
| Entity Gateways | `Plan`, `CheckoutSession`, `PromoCode`, `PaymentMethod`, `Order`, `Subscription`, `DeliveryDay`, `PublicHoliday`, `Wallet`, `Referral` |
| Persistence Services | `plan-persistence.service.ts`, `checkout-session-persistence.service.ts`, `payment-method-persistence.service.ts`, `order-persistence.service.ts`, `subscription-persistence.service.ts`, `public-holiday-persistence.service.ts`, `wallet-persistence.service.ts`, `referral-persistence.service.ts` |
| Query Use Cases | `GetPlans`, `GetActivePlans`, `GetCheckoutSession`, `GetDeliveryStartDates`, `GetPaymentMethods`, `GetOrder`, `GetSubscription`, `GetSubscriptionDeliveries`, `GetWallet`, `GetWalletTransactions`, `GetReferral`, `GetPublicHolidays` |
| Command Use Cases | `CreateCheckoutSession`, `ApplyPromoCode`, `RemovePromoCode`, `AddPaymentMethod`, `RemovePaymentMethod`, `CreateOrder`, `SkipDelivery`, `UndoSkipDelivery`, `PauseSubscription`, `ResumeSubscription`, `CancelSubscription`, `SwitchMealType`, `ValidateReferral` |
| DTOs | 8 new DTO classes |
| Controllers | `PlansController`, `CheckoutController`, `PaymentController`, `OrdersController`, `SubscriptionsController`, `ReferralsController`, `ConfigController` |
| Wiring | `tokens.ts`, `coreadapter.service.ts`, `coreadapter.module.ts`, `usecases/index.ts`, `http.module.ts` |
| Extensions | `delivery.controller.ts` (added `/start-dates`), `user.controller.ts` (added wallet + referral), `domain.errors.ts` (9 new error classes) |
