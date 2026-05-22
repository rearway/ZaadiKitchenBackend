# Zaadi Kitchen API Documentation
## Plan & Payment Module · Subscription Management Module

**Base URL:** `{{base_url}}` → `http://localhost:3000/api/v1`  
**Auth:** All endpoints require `Authorization: Bearer {{access_token}}` unless noted.  
**Content-Type:** `application/json`

---

## Table of Contents

1. [Dependent APIs (shared prerequisites)](#1-dependent-apis-shared-prerequisites)
   - 1.1 GET /config/public-holidays
   - 1.2 GET /plans
   - 1.3 POST /referrals/validate
   - 1.4 GET /referrals/me
2. [Plan & Payment Module (F10–F22)](#2-plan--payment-module-f10f22)
   - 2.1 GET /plans/active
   - 2.2 POST /checkout/session
   - 2.3 GET /checkout/session/:session_id
   - 2.4 POST /checkout/session/:session_id/promo
   - 2.5 DELETE /checkout/session/:session_id/promo
   - 2.6 GET /delivery/start-dates
   - 2.7 GET /payment/methods
   - 2.8 POST /payment/methods
   - 2.9 DELETE /payment/methods/:method_id
   - 2.10 POST /orders
   - 2.11 GET /orders/:order_id
3. [Subscription Management Module (F37–F56)](#3-subscription-management-module-f37f56)
   - 3.1 GET /subscriptions/me
   - 3.2 GET /subscriptions/me/deliveries
   - 3.3 POST /subscriptions/me/deliveries/:delivery_date/skip
   - 3.4 DELETE /subscriptions/me/deliveries/:delivery_date/skip
   - 3.5 POST /subscriptions/me/pause
   - 3.6 POST /subscriptions/me/resume
   - 3.7 POST /subscriptions/me/cancel
   - 3.8 PATCH /subscriptions/me/meal-type
   - 3.9 GET /users/wallet
   - 3.10 GET /users/wallet/transactions
   - 3.11 GET /users/referral
4. [Error Reference](#4-error-reference)

---

## 1. Dependent APIs (shared prerequisites)

These endpoints are consumed by both the Plan & Payment module and Subscription Management. They do not map to a single screen — they are shared infrastructure.

---

### 1.1 `GET /config/public-holidays`

Returns admin-managed public holiday dates. Used by the Payment page start-date picker to grey out non-working days. Holidays are set in the admin panel and change infrequently — clients should cache with a short TTL (e.g. 1 hour).

**Auth:** Required

**Query Parameters**

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `year` | integer | No | Filter by year. Defaults to current year. |

**Response `200 OK`**

```json
{
  "holidays": [
    {
      "date": "2025-04-23",
      "name": "Founding Day"
    },
    {
      "date": "2025-06-25",
      "name": "Eid Al-Adha"
    }
  ]
}
```

**Business Rules**
- Holidays are Saudi-calendar specific (Hijri-mapped by admin).
- Fridays and Saturdays are always non-working and are excluded client-side; this endpoint covers only named holidays.

---

### 1.2 `GET /plans`

Returns all available meal plans with pricing and limits. Used by Plan Selection (new and returning) and the Payment summary. The response drives the entire plan-selection UI.

**Auth:** Required

**Response `200 OK`**

```json
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
      "id": "week",
      "name": "Week Plan",
      "price_sar": 125,
      "meal_count": 5,
      "price_per_meal_sar": 25.00,
      "skip_days_allowed": 15,
      "pause_days_allowed": 15,
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
    },
    {
      "id": "quarterly",
      "name": "Quarterly",
      "price_sar": 1300,
      "meal_count": 66,
      "price_per_meal_sar": 19.70,
      "skip_days_allowed": 198,
      "pause_days_allowed": 198,
      "is_most_popular": false
    }
  ]
}
```

**Business Rules**
- Prices are fixed; meal type (Executive / Salad) does not affect price.
- `skip_days_allowed` = `pause_days_allowed` = `meal_count` × 3 (matches the UI modal values: Try It=1, Week=15, Month=66, Quarterly=198).
- `is_most_popular` drives the "MOST POPULAR" badge on the Month Plan card.

---

### 1.3 `POST /referrals/validate`

Validates a referral or promo code entered at checkout and returns the discount amount. Used during Payment page code entry.

**Auth:** Required

**Request Body**

```json
{
  "code": "AHMED15",
  "plan_id": "month"
}
```

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `code` | string | Yes | Referral or promo code entered by the user. |
| `plan_id` | string | Yes | The plan the user is about to purchase. |

**Response `200 OK` — Valid code**

```json
{
  "valid": true,
  "code": "AHMED15",
  "discount_type": "referral",
  "discount_sar": 100,
  "description": "Referral discount"
}
```

**Response `200 OK` — Invalid code**

```json
{
  "valid": false,
  "error_code": "INVALID_CODE",
  "message": "This code doesn't exist or has already been used."
}
```

| `error_code` | Meaning |
|---|---|
| `INVALID_CODE` | Code not found or already redeemed |
| `NOT_NEW_USER` | Referral codes are valid for new users' first subscription only |
| `PLAN_MISMATCH` | Code is not valid for the selected plan |

**Business Rules**
- Referral codes are valid on a **new user's first subscription only** (F51).
- After 10 invalid attempts within a checkout session, the field is greyed out and locked. This lock is enforced by the checkout session (see §2.2), not this endpoint.
- Applying a valid code updates the checkout session total in real time.

---

### 1.4 `GET /referrals/me`

Returns the authenticated user's own referral code and referral stats. Used on the Referral screen (Profile tab).

**Auth:** Required

**Response `200 OK`**

```json
{
  "referral_code": "AHMED15",
  "friends_joined": 4,
  "total_earned_sar": 170,
  "reward_rate_pct": 10,
  "whatsapp_share_text": "Hey! Try Zaadi Kitchen — fresh lunch delivered to your desk every day. Use my code AHMED15 for SAR 100 off your first plan. 🍛"
}
```

**Business Rules**
- `reward_rate_pct` is 10% of the referred user's first plan value, credited as wallet balance.
- `whatsapp_share_text` is the pre-composed message used by the native WhatsApp share sheet (F52). Content is server-controlled so it can be updated without an app release.
- The referral code is unique per customer and does not expire.

---

## 2. Plan & Payment Module (F10–F22)

**Screen coverage:** Plan Selection (New · F10–F13), Plan Selection (Returning · F11), Payment & Checkout (F14–F20), Success Screens (F21–F22), Payment Timeout.

**Flow:**
```
GET /plans → POST /checkout/session → (optional) POST /session/:id/promo
  → GET /delivery/start-dates → GET /payment/methods
  → POST /orders → GET /orders/:id
```

---

### 2.1 `GET /plans/active`

Returns the list of currently purchasable plans with the calling user's last-used plan flagged. Drives the Plan Selection screen — returning users see the "YOUR LAST PLAN" tag.

**Auth:** Required

**Response `200 OK`**

```json
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
      "is_most_popular": false,
      "is_last_plan": false
    },
    {
      "id": "month",
      "name": "Month Plan",
      "price_sar": 500,
      "meal_count": 22,
      "price_per_meal_sar": 22.70,
      "skip_days_allowed": 66,
      "pause_days_allowed": 66,
      "is_most_popular": true,
      "is_last_plan": true
    }
  ],
  "wallet_balance_sar": 50.00
}
```

**Business Rules**
- `is_last_plan: true` appears on at most one plan per user (their most recent completed subscription).
- `wallet_balance_sar` is included so the UI can show the credit strip (F11, F18) without a separate wallet call.
- For a new user with no prior subscription, `is_last_plan` is `false` on all plans and `wallet_balance_sar` is `0`.

---

### 2.2 `POST /checkout/session`

Creates a checkout session for the selected plan. Returns a `session_id` with a 10-minute TTL. All subsequent payment page actions (promo, start date, pay) reference this session. On expiry the session is invalidated and the user is returned to Plan Selection.

**Auth:** Required

**Request Body**

```json
{
  "plan_id": "month",
  "meal_type": "executive"
}
```

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `plan_id` | string | Yes | One of: `try_it`, `week`, `month`, `quarterly` |
| `meal_type` | string | Yes | One of: `executive`, `salad` |

**Response `201 Created`**

```json
{
  "session_id": "sess_01JK2MNP3QRS4TUV5WXY6Z",
  "plan_id": "month",
  "meal_type": "executive",
  "base_price_sar": 500,
  "wallet_credit_sar": 50,
  "promo_discount_sar": 0,
  "total_due_sar": 450,
  "promo_code": null,
  "promo_attempt_count": 0,
  "promo_locked": false,
  "expires_at": "2025-05-05T10:51:00Z"
}
```

**Business Rules**
- Session TTL is **10 minutes** from creation. The client displays a countdown timer in the Payment page header.
- On expiry (`expires_at` passed), the session is soft-deleted; any attempt to use it returns `410 Gone`.
- `wallet_credit_sar` is auto-applied and cannot be opted out (F18). It reduces `total_due_sar` immediately.
- A user may only have **one active checkout session** at a time. Creating a new session invalidates any existing one.

---

### 2.3 `GET /checkout/session/:session_id`

Returns the current state of a checkout session. Clients poll or refetch this after any modification to recompute the order summary in real time.

**Auth:** Required

**Path Parameters**

| Parameter | Description |
|-----------|-------------|
| `session_id` | The checkout session ID returned from POST /checkout/session |

**Response `200 OK`**

Same shape as POST /checkout/session response.

**Response `410 Gone`**

```json
{
  "error": "SESSION_EXPIRED",
  "message": "This checkout session has expired. Please start again."
}
```

---

### 2.4 `POST /checkout/session/:session_id/promo`

Applies a promo or referral code to an active checkout session. Updates `promo_discount_sar` and `total_due_sar` in the session.

**Auth:** Required

**Request Body**

```json
{
  "code": "AHMED15"
}
```

**Response `200 OK` — Code applied**

```json
{
  "session_id": "sess_01JK2MNP3QRS4TUV5WXY6Z",
  "promo_code": "AHMED15",
  "discount_type": "referral",
  "promo_discount_sar": 100,
  "total_due_sar": 400,
  "promo_attempt_count": 1,
  "promo_locked": false
}
```

**Response `422 Unprocessable Entity` — Invalid code**

```json
{
  "error": "INVALID_CODE",
  "message": "This code doesn't exist or has already been used.",
  "promo_attempt_count": 3,
  "promo_locked": false
}
```

**Response `423 Locked` — Attempt limit reached**

```json
{
  "error": "PROMO_LOCKED",
  "message": "Too many invalid attempts. Promo field has been disabled for this session.",
  "promo_attempt_count": 10,
  "promo_locked": true
}
```

**Business Rules**
- Only **one promo code** per session. Applying a second code replaces the first.
- Field is **locked after 10 failed attempts** within a session (`promo_locked: true`). Lock does not reset — a new session is required.
- `promo_attempt_count` is only incremented on *invalid* codes; applying the same valid code again does not increment it.

---

### 2.5 `DELETE /checkout/session/:session_id/promo`

Removes the currently applied promo code from the session and recalculates `total_due_sar`.

**Auth:** Required

**Response `200 OK`**

```json
{
  "session_id": "sess_01JK2MNP3QRS4TUV5WXY6Z",
  "promo_code": null,
  "promo_discount_sar": 0,
  "total_due_sar": 450
}
```

---

### 2.6 `GET /delivery/start-dates`

Returns the list of valid delivery start dates for a new subscription. Used by the Payment page start-date picker. Only returns Sun–Thu dates; excludes public holidays and dates before tomorrow.

**Auth:** Required

**Query Parameters**

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `from` | date (YYYY-MM-DD) | No | Earliest date to return. Defaults to tomorrow. |
| `limit` | integer | No | Number of dates to return. Default `14`, max `30`. |

**Response `200 OK`**

```json
{
  "start_dates": [
    {
      "date": "2025-05-05",
      "label": "Sunday, 5 May 2025",
      "is_next_working_day": true,
      "is_available": true
    },
    {
      "date": "2025-05-06",
      "label": "Monday, 6 May 2025",
      "is_next_working_day": false,
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

**Business Rules**
- Working days are **Sunday through Thursday** only (KSA work week).
- `is_next_working_day: true` is set on exactly one date — the system default, which is pre-selected in the UI.
- Public holidays sourced from `/config/public-holidays` are returned with `is_available: false` so clients can grey them out.

---

### 2.7 `GET /payment/methods`

Returns all saved payment methods for the authenticated user. The last-used method is flagged to pre-select it in the Payment page.

**Auth:** Required

**Response `200 OK`**

```json
{
  "payment_methods": [
    {
      "id": "pm_abc123",
      "type": "mada",
      "label": "Mada ····4242",
      "is_default": true,
      "is_last_used": true
    },
    {
      "id": "pm_def456",
      "type": "apple_pay",
      "label": "Apple Pay",
      "is_default": false,
      "is_last_used": false
    }
  ]
}
```

**Supported `type` values:** `mada`, `apple_pay`, `visa`, `mastercard`, `stc_pay`

**Business Rules**
- The method with `is_last_used: true` is pre-selected in the UI (F19).
- For first-time users with no saved methods, `payment_methods` is an empty array and the client prompts card entry.

---

### 2.8 `POST /payment/methods`

Saves a new payment method (tokenised). Used when a user adds a card at checkout.

**Auth:** Required

**Request Body**

```json
{
  "type": "mada",
  "token": "tok_sandbox_xxxxxxxxxxxx"
}
```

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `type` | string | Yes | One of: `mada`, `visa`, `mastercard`, `stc_pay`. Note: `apple_pay` is handled natively and does not go through this endpoint. |
| `token` | string | Yes | Payment gateway token from the client-side SDK. |

**Response `201 Created`**

```json
{
  "id": "pm_ghi789",
  "type": "mada",
  "label": "Mada ····4242",
  "is_default": false,
  "is_last_used": false
}
```

---

### 2.9 `DELETE /payment/methods/:method_id`

Removes a saved payment method.

**Auth:** Required

**Response `204 No Content`**

---

### 2.10 `POST /orders`

Confirms the checkout session and creates the order. This is the "Pay" button action. Triggers payment processing, creates the subscription, and sends the success screen data.

**Auth:** Required

**Request Body**

```json
{
  "session_id": "sess_01JK2MNP3QRS4TUV5WXY6Z",
  "payment_method_id": "pm_abc123",
  "start_date": "2025-05-05"
}
```

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `session_id` | string | Yes | Active checkout session ID. |
| `payment_method_id` | string | Yes | The payment method to charge. |
| `start_date` | date (YYYY-MM-DD) | Yes | First delivery date, must be a date from `/delivery/start-dates`. |

**Response `201 Created`**

```json
{
  "order_id": "ord_01JM3NOP4RST5UVW6XYZ7A",
  "subscription_id": "sub_01JM3XYZ",
  "status": "confirmed",
  "is_new_user": true,
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

**Response `402 Payment Required` — Payment failed**

```json
{
  "error": "PAYMENT_FAILED",
  "message": "Your payment could not be processed. Please check your card details and try again."
}
```

**Response `410 Gone` — Session expired**

```json
{
  "error": "SESSION_EXPIRED",
  "message": "Your 10-minute checkout session has expired. Your plan selection is saved — just start checkout again."
}
```

**Business Rules**
- `is_new_user` drives which success screen to show: new user ("Your first Zaadi meal! 🎉") vs returning ("You're back! ✅") (F21, F22).
- On `201`, the checkout session is automatically invalidated.
- On `402`, the session remains active (timer continues). The client does not need to create a new session.
- On `410`, the client routes to the Payment Timeout screen. Plan selection preference is remembered (`/plans/active` will still show `is_last_plan`).
- The referral code reward (10% wallet credit for the referrer) is credited asynchronously after payment confirmation — not in this response.

---

### 2.11 `GET /orders/:order_id`

Returns a single order with full summary. Used by the "View receipt" CTA on the Returning success screen (F22).

**Auth:** Required

**Response `200 OK`**

```json
{
  "order_id": "ord_01JM3NOP4RST5UVW6XYZ7A",
  "subscription_id": "sub_01JM3XYZ",
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
  "payment_method": {
    "type": "mada",
    "label": "Mada ····4242"
  },
  "created_at": "2025-05-05T09:41:00Z"
}
```

---

## 3. Subscription Management Module (F37–F56)

**Screen coverage:** My Plan Tab (F37), Skip a Day (F37–F39), Pause & Resume & Cancel (F40–F44), Switch Meal Type (F45), Edit Delivery Location (F46 — uses existing `PATCH /users/delivery-location`), Profile & Account (F49), Referral (F51–F52), Billing & Wallet (F53–F56).

---

### 3.1 `GET /subscriptions/me`

Returns the active (or most recent) subscription for the authenticated user. Drives the My Plan tab header and Home screen state banners.

**Auth:** Required

**Response `200 OK`**

```json
{
  "subscription_id": "sub_01JM3XYZ",
  "plan_id": "month",
  "plan_name": "Month Plan",
  "meal_type": "executive",
  "status": "active",
  "total_meal_days": 22,
  "delivered_count": 14,
  "skipped_count": 3,
  "remaining_count": 5,
  "days_remaining": 17,
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

**`status` values**

| Status | Home screen state | My Plan tab state |
|--------|-------------------|-------------------|
| `active` | Active banner | Normal controls |
| `paused` | Paused banner with Resume CTA | Toggle is ON |
| `cancelled` | Deliveries continue until `end_date` | Cancel note shown |
| `expired` | Expired → Renew CTA | Renew CTA |

---

### 3.2 `GET /subscriptions/me/deliveries`

Returns the list of all delivery days for the current subscription with their status. Used by the Skip a Day screen.

**Auth:** Required

**Query Parameters**

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `from` | date | No | Filter start. Defaults to subscription start date. |
| `to` | date | No | Filter end. Defaults to subscription end date. |

**Response `200 OK`**

```json
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
      "skippable": true,
      "undoable": true
    },
    {
      "date": "2025-05-07",
      "label": "Tue 7 May",
      "meal_name": "Kofta Platter",
      "meal_type": "executive",
      "status": "scheduled",
      "skippable": false,
      "skip_reason": "skip_limit_reached"
    }
  ],
  "skip_limit_reached": true
}
```

**`status` values**

| Status | UI representation |
|--------|-------------------|
| `scheduled` | Available to skip (if `skippable: true`) |
| `skipped` | Red border card; "Undo" button if `undoable: true` |
| `delivered` | Normal card, no action |
| `past_cutoff` | Greyed card, no action |
| `paused` | Shown on pause days |

**`skip_reason` values (when `skippable: false`)**

| Reason | Description |
|--------|-------------|
| `past_cutoff` | Cutoff time (6 PM day before) has passed |
| `skip_limit_reached` | User has exhausted their `skip_days_allowed` |
| `already_skipped` | Day is already skipped (use undo instead) |

**Business Rules**
- Skip cutoff is **6 PM the day before** delivery (F37).
- Skip limits by plan: Try It=1, Week=15, Month=66, Quarterly=198. Limits reset on renewal.
- `undoable: true` only when `status === "skipped"` AND the skip cutoff has not yet passed.

---

### 3.3 `POST /subscriptions/me/deliveries/:delivery_date/skip`

Skips a single delivery day. `delivery_date` is in `YYYY-MM-DD` format.

**Auth:** Required

**Request Body** — None required.

**Response `200 OK`**

```json
{
  "date": "2025-05-06",
  "status": "skipped",
  "undoable": true,
  "skip_days_used": 4,
  "skip_days_remaining": 62
}
```

**Response `409 Conflict`**

```json
{
  "error": "SKIP_LIMIT_REACHED",
  "message": "You've used all your skip days for this plan period.",
  "skip_days_used": 66,
  "skip_days_remaining": 0
}
```

**Response `422 Unprocessable Entity`**

```json
{
  "error": "PAST_CUTOFF",
  "message": "The skip cutoff (6 PM the day before delivery) has passed for this date."
}
```

---

### 3.4 `DELETE /subscriptions/me/deliveries/:delivery_date/skip`

Undoes a skip. Only valid if the skip cutoff for that date has not yet passed.

**Auth:** Required

**Response `200 OK`**

```json
{
  "date": "2025-05-06",
  "status": "scheduled",
  "skip_days_used": 3,
  "skip_days_remaining": 63
}
```

**Response `422 Unprocessable Entity`**

```json
{
  "error": "PAST_CUTOFF",
  "message": "The undo cutoff (6 PM the day before delivery) has passed for this date."
}
```

---

### 3.5 `POST /subscriptions/me/pause`

Pauses the subscription for a specified date range. Delivery days within the range are frozen — no deliveries, no charge.

**Auth:** Required

**Request Body**

```json
{
  "start_date": "2025-05-12",
  "end_date": "2025-05-18"
}
```

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `start_date` | date | Yes | First day of pause. Must be a future working day. |
| `end_date` | date | Yes | Last day of pause. Must not exceed the plan's `pause_days_allowed` from `start_date`. |

**Response `200 OK`**

```json
{
  "subscription_id": "sub_01JM3XYZ",
  "status": "paused",
  "paused_from": "2025-05-12",
  "paused_until": "2025-05-18",
  "pause_ceiling_date": "2025-05-18",
  "pause_days_used": 5,
  "pause_days_remaining": 61
}
```

**Response `409 Conflict`**

```json
{
  "error": "PAUSE_LIMIT_EXCEEDED",
  "message": "The requested pause exceeds your remaining pause days (61 days).",
  "pause_days_remaining": 61
}
```

**Business Rules**
- Maximum pause days = `pause_days_allowed` for the plan (same as skip limit values).
- If the user does not manually resume by the `pause_ceiling_date`, **remaining pause days lapse** — they are not automatically added back (F41, F43).
- There is **no auto-resume**; the subscription stays paused until the user calls POST /resume.
- A paused subscription's `end_date` does not extend — frozen days are consumed from the remaining count.

---

### 3.6 `POST /subscriptions/me/resume`

Resumes a paused subscription. The client offers two options: "Resume from tomorrow" (default) or "Choose a specific start date."

**Auth:** Required

**Request Body**

```json
{
  "resume_date": "2025-05-20"
}
```

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `resume_date` | date | Yes | Date deliveries should resume. Use tomorrow's date for the default option. Must be a working day (Sun–Thu). |

**Response `200 OK`**

```json
{
  "subscription_id": "sub_01JM3XYZ",
  "status": "active",
  "resume_date": "2025-05-20",
  "first_delivery_label": "Tuesday, 20 May",
  "pause_days_used": 5
}
```

**Business Rules**
- No charge on resume.
- After resume, the Home screen displays "Active" (not "Resumed") per annotation F42.
- A push notification is sent to the user confirming the resume date.

---

### 3.7 `POST /subscriptions/me/cancel`

Cancels the subscription. Deliveries continue until the paid `end_date`. No refund for remaining days. Plan will not auto-renew.

**Auth:** Required

**Request Body** — None required.

**Response `200 OK`**

```json
{
  "subscription_id": "sub_01JM3XYZ",
  "status": "cancelled",
  "deliveries_continue_until": "2025-05-30",
  "refund_sar": 0,
  "message": "Your plan has been cancelled. Deliveries will continue until 30 May."
}
```

**Business Rules**
- The cancel modal lists all 3 consequences before the user confirms (F44):
  1. Deliveries continue until `deliveries_continue_until`.
  2. No refund for remaining days.
  3. Plan will not renew.
- A "Contact Support →" link is shown in the modal; cancellation via this endpoint is the self-serve flow only.

---

### 3.8 `PATCH /subscriptions/me/meal-type`

Switches the meal type (Executive ↔ Salad) for the active subscription. Can apply to all remaining days or specific days of the week.

**Auth:** Required

**Request Body**

```json
{
  "meal_type": "salad",
  "apply_to": "all",
  "specific_days": null
}
```

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `meal_type` | string | Yes | One of: `executive`, `salad` |
| `apply_to` | string | Yes | One of: `all` (entire remaining subscription) or `specific` (specific delivery days) |
| `specific_days` | array of dates | No | Required when `apply_to` is `specific`. List of `YYYY-MM-DD` dates. |

**Request Body — Specific days example**

```json
{
  "meal_type": "salad",
  "apply_to": "specific",
  "specific_days": ["2025-05-13", "2025-05-14", "2025-05-15"]
}
```

**Response `200 OK`**

```json
{
  "subscription_id": "sub_01JM3XYZ",
  "meal_type": "salad",
  "applied_to": "all",
  "effective_from": "2025-05-07",
  "message": "Meal type updated to Salad from Wed 7 May onwards."
}
```

**Business Rules**
- Changes before **6 PM apply to the next delivery**; changes after 6 PM take effect the day after next (F45).
- The subscription `meal_type` in GET /subscriptions/me reflects the globally active type. Individual day overrides are visible in GET /subscriptions/me/deliveries.
- Price does not change when switching meal type.

---

### 3.9 `GET /users/wallet`

Returns the user's current wallet balance. Used by the Billing & Wallet screen header and the Plan Selection credit strip.

**Auth:** Required

**Response `200 OK`**

```json
{
  "balance_sar": 50.00,
  "currency": "SAR",
  "auto_applied_at_checkout": true
}
```

**Business Rules**
- Wallet credit is **automatically applied** at checkout with no opt-out (F18, F53).
- Balance is credited from: referral rewards (10% of referred user's plan) and issue resolution credits (admin-applied).

---

### 3.10 `GET /users/wallet/transactions`

Returns the paginated wallet transaction history. Used by the Billing & Wallet screen transactions list.

**Auth:** Required

**Query Parameters**

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `page` | integer | No | Page number. Defaults to `1`. |
| `per_page` | integer | No | Results per page. Default `20`, max `50`. |

**Response `200 OK`**

```json
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
    },
    {
      "id": "txn_003",
      "type": "credit",
      "amount_sar": 20,
      "label": "Issue credit",
      "description": "Quality issue · 2 May",
      "created_at": "2025-05-02T14:30:00Z"
    }
  ],
  "pagination": {
    "page": 1,
    "per_page": 20,
    "total": 3,
    "total_pages": 1
  }
}
```

**`type` values:** `credit` (positive, shown in red on the UI), `debit` (negative)

---

### 3.11 `GET /users/referral`

Alias for `GET /referrals/me` (documented in §1.4). Included here as it is accessed from the Profile tab. Both routes return the same response shape.

---

## 4. Error Reference

### Standard error envelope

All error responses follow this structure:

```json
{
  "error": "ERROR_CODE",
  "message": "Human-readable description for the developer.",
  "details": {}
}
```

### HTTP status codes used in this document

| Code | Meaning | When used |
|------|---------|-----------|
| `200 OK` | Success | GETs, PATCHes, DELETEs with a body |
| `201 Created` | Resource created | POST /checkout/session, POST /orders, POST /payment/methods |
| `204 No Content` | Success, no body | DELETE /payment/methods/:id |
| `400 Bad Request` | Validation error | Missing required fields, invalid types |
| `401 Unauthorized` | Missing or invalid token | Any authenticated endpoint with no/expired token |
| `402 Payment Required` | Payment gateway failure | POST /orders |
| `404 Not Found` | Resource not found | Invalid IDs in path |
| `409 Conflict` | Business rule conflict | Skip limit reached, pause limit exceeded |
| `410 Gone` | Session expired | POST /orders with expired session_id, GET /checkout/session after TTL |
| `422 Unprocessable Entity` | Semantically invalid | Past cutoff skip attempt, invalid promo code |
| `423 Locked` | Rate limit / lock | Promo field locked after 10 failed attempts |

### Domain error codes quick reference

| `error` code | Module | Description |
|---|---|---|
| `SESSION_EXPIRED` | Payment | Checkout session TTL (10 min) elapsed |
| `PAYMENT_FAILED` | Payment | Gateway declined the transaction |
| `INVALID_CODE` | Promo | Promo/referral code not found or already used |
| `NOT_NEW_USER` | Promo | Referral code attempted by an existing subscriber |
| `PROMO_LOCKED` | Promo | 10 invalid attempts exhausted for the session |
| `SKIP_LIMIT_REACHED` | Subscription | All skip days for the plan period used |
| `PAST_CUTOFF` | Subscription | 6 PM day-before cutoff has passed |
| `PAUSE_LIMIT_EXCEEDED` | Subscription | Requested pause range exceeds remaining pause days |

---

*Document version: 1.0 — Plan & Payment (F10–F22) · Subscription Management (F37–F56)*  
*Next: Home Screen (F23–F30) · Meal Detail & Menu (F31–F36) · Feedback & Support (F57–F63)*
