# Zaadi Kitchen (Platio Kitchen) — Complete API Testing Guide

This guide is for a QA / testing agent that runs the Postman collections:

- `Zaadi_Kitchen_Mobile_App.postman_collection.json` (customer and rider app)
- `Zaadi_Kitchen_Admin_Portal.postman_collection.json` (admin and ops portal)

Everything in this document is taken from the backend code (`src/gateways/http/*.controller.ts`, DTOs, and use cases under `src/core/usecases/`). If an older doc disagrees with this one, this one wins. If the API behaves differently from this guide, report it as a bug, with the request, the response and the section number.

---

## Table of contents

0. [Before you start: environment, conventions, test data](#0-before-you-start)
1. [Core concepts you must understand](#1-core-concepts)
2. [Auth (OTP, admin login, tokens)](#2-auth)
3. [User profile, language, delivery locations, account deletion](#3-user-profile-and-account)
4. [Delivery areas, buildings, start dates, holidays, devices](#4-delivery-areas-start-dates-config-devices)
5. [Plans](#5-plans)
6. [Checkout, promo, payment methods, orders](#6-checkout-promo-payment-orders)
7. [Plan upgrade (plan change / promotion)](#7-plan-upgrade)
8. [Subscription: GET /subscriptions/me and all its fields](#8-subscription-me)
9. [Deliveries list, skip, undo skip](#9-deliveries-skip-undo)
10. [Pause, cancel pause, resume](#10-pause-cancel-pause-resume)
11. [Cancel subscription and expiry job](#11-cancel-subscription-and-expiry)
12. [Meal type switch and salad toggle](#12-meal-type-switch-and-salad-toggle)
13. [Customer menu, meal detail, meal choice (select a dish)](#13-customer-menu-and-meal-choice)
14. [Home and This Week](#14-home)
15. [History, ratings, pending ratings](#15-history-and-ratings)
16. [Delivery issues (customer side)](#16-customer-issues)
17. [Wallet, billing, referrals](#17-wallet-billing-referrals)
18. [Admin: meal library](#18-admin-meal-library)
19. [Admin: menu manager (weeks, slots, publish)](#19-admin-menu-manager)
20. [Admin / Ops: daily operations, issues queue, labels, export](#20-daily-operations)
21. [Rider (driver) app](#21-rider)
22. [Admin: customers](#22-admin-customers)
23. [Admin: dashboard and revenue](#23-dashboard-and-revenue)
24. [Admin: comms (automations, broadcast)](#24-comms)
25. [Admin: areas and buildings](#25-admin-areas-and-buildings)
26. [Admin: plan pricing (price and max price)](#26-admin-plan-pricing)
27. [ERP integration and internal jobs](#27-erp-and-internal-jobs)
28. [End-to-end test scenarios (run in order)](#28-end-to-end-scenarios)
29. [Known quirks: expected behaviour, not bugs](#29-known-quirks)
30. [Error code reference](#30-error-code-reference)
31. [Endpoint checklist (coverage matrix)](#31-endpoint-checklist)

---

## 0. Before you start

### 0.1 Base URL and Postman variables

- The `base_url` Postman variable **already includes `/api/v1`**, for example `https://<host>/api/v1`.
- Exceptions without `/api/v1`: `GET /health`, `POST /internal/jobs/expire-subscriptions`, and Swagger at `GET /api`.

**Mobile collection variables:** `base_url`, `access_token`, `refresh_token`, `area_id`, `building_id`, `session_id`, `payment_method_id`, `order_id`, `meal_id`, `location_id`, `delivery_day_id`, `delivery_date`.

**Admin collection variables:** `base_url`, `admin_access_token`, `admin_refresh_token`, `ops_access_token`, `area_id`, `building_id`, `meal_id`, `week_id`, `slot_id`, `customer_id`, `issue_id`, `rider_phone`, `rider_access_token`, `delivery_id`, `delivery_date`, `daily_ops_date`.

Set the variables from responses as you go: `session_id` from checkout, `order_id` from orders, `week_id` from the weeks list, and so on.

### 0.2 Environment flags that change behaviour

Ask the backend owner what the target environment uses. These change expected results.

| Env var | Default | Effect for testing |
|---|---|---|
| `SKIP_OTP` | `true` when unset | `true`: the OTP is not sent anywhere, only logged, and `otpCode` is returned in the send response. `false`: a real WhatsApp (Twilio) or SMS (AWS SNS) message is sent. |
| `OTP_RETURN_CODE_IN_RESPONSE` | `false` | `true`: `otpCode` is returned in the response **even when** the real message is sent. Use this for testing on the real channel. |
| `OTP_ALLOW_INDIAN_PHONES` | `false` in code (`true` in `.env.example`) | `true`: `+91XXXXXXXXXX` numbers (10 digits) are accepted in addition to Saudi `+966XXXXXXXXX` numbers (9 digits). |
| `OTP_REVIEW_ENABLED` / `OTP_REVIEW_ACCOUNTS` | `false` | Fixed OTP codes for review phones, e.g. `+966500000101:1234,+966500000102:1234`. Review phones skip rate limits and can verify without calling send first. |
| `TWILIO_ACCOUNT_SID`, `TWILIO_AUTH_TOKEN`, `TWILIO_WHATSAPP_FROM` (+ optional `TWILIO_WHATSAPP_CONTENT_SID`) | — | Required for `channel: "whatsapp"` when `SKIP_OTP=false`. If missing, send returns 400 `VALIDATION_ERROR`. |
| `USE_MOCK_PAYMENT` | `true` | `true`: every payment succeeds and any token is accepted. `false`: real Moyasar. |
| `SKIP_SNS` | `false` | `true`: push notifications are only logged. |
| `INTERNAL_JOB_SECRET` | — | Header `x-internal-secret` for the internal expiry job. |
| `ERP_API_KEY` | — | Header `x-api-key: <key>` or `Authorization: ApiKey <key>` for ERP routes. |
| `ERP_CUTOFF_TIME_KSA` | `19:00` | ERP daily-orders freeze time. |

### 0.3 Time rules (critical)

- All business time is **KSA, Asia/Riyadh, UTC+3**.
- **Delivery days are Sunday–Thursday** (the Saudi work week). Friday and Saturday never have deliveries. Public holidays (table `public_holidays`) are also skipped.
- **The customer action cutoff is 18:00 KSA on the calendar day before the delivery** (that is 15:00 UTC). Before the cutoff, the customer can skip, undo a skip, change the dish, toggle salad, or start a pause on that date. After the cutoff, those actions return `422 PAST_CUTOFF` or show `skip_reason: "past_cutoff"`.
  - Example: delivery on Tue 2026-10-27. The cutoff is Mon 2026-10-26 18:00 KSA.
  - For a Sunday delivery, the cutoff is Saturday 18:00 KSA.
- **Meal type switch effective date:** before 18:00 KSA it takes effect tomorrow. At or after 18:00 KSA it takes effect the day after tomorrow.
- **The admin daily-ops pipeline** locks a delivery date at the same cutoff (18:00 KSA the day before).

### 0.4 Response and error conventions

- **There is no global response wrapper.** Each endpoint returns its own shape. Some return `{ message, data }`, some `{ data }`, some a raw object such as `{ plans }`, `{ start_dates }` or `{ holidays }`. Assert the shape documented per endpoint.
- **Key casing is mixed.** Most new endpoints use snake_case. Some older ones return camelCase entities (auth, profile, delivery locations, issues, customers list, ratings and history). This is documented per endpoint and is expected.
- **Domain error shape:**
  ```json
  { "statusCode": 409, "errorCode": "SKIP_LIMIT_REACHED", "message": "...", "details": { }, "operation": "skip-delivery" }
  ```
- **DTO validation errors** (wrong types, missing fields, **unknown extra fields**, because `forbidNonWhitelisted` is on) use the Nest default shape and have no `errorCode`:
  ```json
  { "statusCode": 400, "message": ["phone must be ..."], "error": "Bad Request" }
  ```
- **Auth errors:**
  - A missing or invalid JWT gives `401 { "statusCode": 401, "message": "Unauthorized" }`.
  - A valid JWT with the wrong role gives `403 Forbidden`.
  - Neither has an `errorCode`.
- A POST without an explicit status code returns **201** (for example `otp/send`, `otp/verify`, `refresh`, `checkout/session`, `orders`). Most action POSTs on subscriptions return **200**.
- **Auth header:** `Authorization: Bearer <token>`.

### 0.5 Seeded test data

| What | Value |
|---|---|
| Admin user | `admin@zaadikitchen.com` / `Admin@123` (role ADMIN) |
| Plans | `try_it`, `week`, `month`, `quarterly` (slugs; see section 5) |
| Play Store review customer | `+966500000101` (CUSTOMER) |
| Play Store review driver | `+966500000102` (DRIVER) |

There are **no seeded** areas, buildings, holidays, OPS users or meals. Create areas, buildings and meals through the admin APIs (sections 18, 19, 25). An OPS user and extra DRIVER users must be created in the DB by the backend owner. Drivers log in with OTP. ADMIN and OPS log in with email and password.

---

## 1. Core concepts

### 1.1 Plans

| Slug (`plan_id`) | Meals (`meal_count`) | Seed price (SAR) | Skip/pause days allowed |
|---|---|---|---|
| `try_it` | 1 | 28 | 1 |
| `week` | 5 | 125 | 15 |
| `month` | 22 | 500 | 66 |
| `quarterly` | 66 | 1300 | 198 |

The admin can change prices (section 26). Plans can show a discount: `max_price_sar` is the struck-through price, and `discount_percent = round((max_price_sar - price_sar) / max_price_sar × 100)`. Both are `null` when there is no max price or when the max price is not higher than the price.

The legacy slug `weekly` is treated as `week`.

### 1.2 Meal types (streams)

Each delivery day has two streams: **`executive`** and **`salad`**. A subscription has a default `meal_type`. Each delivery day row also has its own `meal_type`, which can be changed per day.

### 1.3 Flex days: one shared pool for skip and pause

Skips and pauses draw from **one shared pool**. This is the most important number on the subscription:

| Field | Formula |
|---|---|
| `skip_pause_days_allowed` | `min(skip_days_allowed, pause_days_allowed)` (copied from the plan at purchase) |
| `skip_pause_days_used` | `max(skip_days_used, pause_days_used)` (both DB counters are kept equal) |
| `skip_pause_days_remaining` | `max(0, allowed − used)` |

- One skip uses **1** flex day.
- A pause uses **one flex day per working day inside the pause range** (Sun–Thu, excluding holidays). Calendar days are not counted.
- Undoing a skip refunds 1. Cancelling a scheduled pause refunds every working day. Resuming early refunds the unused working days.
- The API mirrors the same values in three sets of keys: `skip_days_*`, `pause_days_*` and `skip_pause_days_*`. **All three sets must always be equal.** Assert this on every subscription response.

### 1.4 Subscription status

| Status | Meaning |
|---|---|
| `active` | Normal. Deliveries happen. A scheduled pause that has not started yet keeps the status `active`. |
| `paused` | A pause is **in effect**: the start-day cutoff has passed. Reads flip `active` to `paused` automatically. |
| `cancelled` | The customer cancelled. **Deliveries continue until `end_date`.** The customer can still skip, pause and choose meals until `end_date`, but cannot upgrade or buy a new plan. |
| `expired` | `end_date` has passed and the expiry job ran. The customer can buy a new plan. |

Transitions:

- `active` → `paused` happens automatically after the pause-start cutoff.
- `paused` → `active` happens via resume.
- `active` → `cancelled` happens via cancel.
- Any of `active`, `paused` or `cancelled` → `expired` happens via the expiry job when `end_date < today`.

**Service period:** the subscription is "in service" while `status != expired` and `end_date >= today (KSA)`. Skip, pause and meal choice are allowed only in the service period **and** when the status is `active` or `cancelled`.

### 1.5 Delivery day status (`delivery_days.status`)

| Value | Meaning |
|---|---|
| `scheduled` | An upcoming meal day. This is the only status that can be skipped, have its dish changed, or be salad-toggled. |
| `skipped` | The customer skipped it, and a makeup day was added after `end_date`. |
| `paused` | The day is inside a pause window. |
| `delivered` | The rider marked it delivered. |
| `past_cutoff` | Ops state: after the cutoff. It still counts for kitchen and rider. |

### 1.6 `skip_reason`, `skip_available`, `undoable`, `is_deliverable`, `can_change`

These flags appear on deliveries, the menu week, home this-week and meal detail.

| Flag | Meaning |
|---|---|
| `skip_available` (old alias `skippable`) | `true` when this day can be skipped right now. |
| `skip_reason` | `null` when skipping is allowed. Otherwise it gives the reason (table below). |
| `is_skipped` | The day is already skipped. |
| `undoable` | `true` only when the day is skipped **and** the cutoff has not passed. |
| `is_deliverable` | A subscription exists, the day's stream matches, and the day status is `scheduled`. In other words, a meal will be delivered that day. |
| `can_change` | The customer can change the dish for that day. Requires: subscription active or cancelled-in-service, day `scheduled`, before the cutoff, and **at least 2 dishes in total** on that date across both streams. |

`skip_reason` values, in priority logic:

| Value | When |
|---|---|
| `null` | Skip allowed |
| `not_subscribed` | The user has no subscription |
| `subscription_expired` | Subscription `expired` |
| `subscription_cancelled` | Cancelled **and** past `end_date` |
| `subscription_paused` | Subscription status is `paused` |
| `day_paused` | This day's row is `paused` (inside a scheduled pause) |
| `already_skipped` | This day is already `skipped` |
| `no_delivery` | No `delivery_days` row for this date (outside the plan, Fri/Sat, holiday) |
| `past_cutoff` | After 18:00 KSA the day before, or the day is `delivered` / `past_cutoff` |
| `skip_limit_reached` | Flex days remaining = 0 |
| `meal_type_mismatch` | The menu slot stream differs from the day's stream (rare on cards) |

There is **no** `holiday` value. Holidays have no delivery row, so they show `no_delivery`.

### 1.7 Skip makeup (end date moves)

When a day is skipped, the meal is **not lost**. A makeup delivery day is added at the first working day after `max(end_date, skipped_date)`, skipping Fri/Sat and holidays. Then `end_date` moves to that day and `total_meal_days` increases by 1. Undoing the skip deletes the makeup day (if it is still `scheduled`) and moves `end_date` back.

### 1.8 Effective dish for a day

Resolution order:

1. The customer's pick (`selected_meal_id`), if that dish is still on the menu that date.
2. Otherwise, the admin **default** dish for that day's stream.
3. Otherwise, the first dish in that stream.

Customers only see **published** menu weeks.

---

## 2. Auth

### 2.1 `POST /auth/otp/send` (public)

Body:

```json
{ "phone": "+966501234567", "channel": "whatsapp" }
```

- `phone`: Saudi `+966` followed by exactly 9 digits. `+91` followed by 10 digits is allowed only if `OTP_ALLOW_INDIAN_PHONES=true`. Anything else returns 400 `"Phone must be in Saudi format: +966XXXXXXXXX"` (or a Saudi/India message).
- `channel`: `whatsapp` or `sms`. WhatsApp goes through Twilio. SMS goes through AWS SNS.

Response **201**:

```json
{ "message": "...", "data": { "phone": "+9665...", "channel": "whatsapp", "expiresInSeconds": 120, "otpCode": "1234" } }
```

- `expiresInSeconds` is always **120**. The `OTP_EXPIRY_SECONDS` env var is not used.
- `otpCode` is present only when `SKIP_OTP=true`, the phone is a review phone, or `OTP_RETURN_CODE_IN_RESPONSE=true`.
- The OTP is 4 digits.

Rules:

- **Rate limit:** at most 3 sends per phone in a rolling 10 minutes. The 4th send returns **429 `RATE_LIMIT_EXCEEDED`** with `details.lockedUntil` and locks the phone for 30 minutes. While locked, every send returns 429. Review phones are exempt.
- WhatsApp with `SKIP_OTP=false`, no Twilio config, and not a review phone returns 400 `VALIDATION_ERROR` "WhatsApp OTP is not configured…".
- If Twilio or SNS fails, the API **still returns success**. The failure is only logged. A missing message with a 201 is an environment or Twilio problem, not an API bug.

Tests:

- A valid Saudi number.
- An Indian number with the flag on and off.
- An invalid format.
- An invalid channel.
- An extra unknown field gives 400.
- The 4th send in 10 minutes gives 429.
- A review phone returns a fixed code.

### 2.2 `POST /auth/otp/verify` (public)

Body: `{ "phone": "+966501234567", "code": "1234" }`. `code` must be exactly 4 characters.

Response **201** `{ message, data }`. `data` contains:

| Field | Meaning |
|---|---|
| `user` | camelCase user: `id`, `phone`, `email`, `fullName`, `role`, `languagePreference`, `isActive`, `onboardingComplete`, ... (no password) |
| `user.onboardingComplete` | **Here** it means "has a primary delivery location". |
| `accessToken` | JWT. The mobile token lasts **36500 days** (effectively never expires). |
| `refreshToken` | UUID stored in the DB. It expires after `JWT_REFRESH_EXPIRATION_MOBILE` (default 30d). |
| `tokenType` | `"Bearer"` |
| `accessExpiresIn`, `refreshExpiresIn` | Seconds |
| `isNewUser` | `true` if this phone did not exist and a CUSTOMER was just created with `fullName: "New User"`. |

Rules and errors:

- Wrong code: 400 `OTP_INVALID`. The attempt is counted, but there is **no** lockout on verify.
- No active session, or the code is expired (more than 120s): 400 `OTP_EXPIRED`.
- A phone that belongs to ADMIN or OPS: 401 `AUTHENTICATION_ERROR` ("Admin and Ops accounts must use email and password").
- A deactivated user (`isActive=false`): 401 `AUTHENTICATION_ERROR`.
- A DRIVER phone logs in normally. This is how riders log in.
- A review phone with its fixed code works even without calling send.

Save `access_token` and `refresh_token`.

### 2.3 `POST /auth/admin/login` (public)

Body: `{ "email": "admin@zaadikitchen.com", "password": "Admin@123" }`. Only **ADMIN** or **OPS** users can log in here. Any other role, a wrong password, or an inactive user returns 401 `AUTHENTICATION_ERROR`. The response includes `accessToken`, `refreshToken` and `user`. The admin access token uses `JWT_ACCESS_EXPIRATION` (short, e.g. 15m), so refresh it when you get a 401.

### 2.4 `POST /auth/refresh` (public)

Body: `{ "refreshToken": "<uuid>" }`. Response 201 `{ message: "Token refreshed successfully", data: { accessToken } }`. The new access token uses `JWT_ACCESS_EXPIRATION`. An invalid, revoked or expired token, or an inactive user, returns 401 `AUTHENTICATION_ERROR`.

### 2.5 `POST /auth/logout` (JWT)

Body: `{ "refreshToken": "..." }`. Response 201 `{ message: "Logged out successfully" }`. It revokes that refresh token and is idempotent. After it, `/auth/refresh` with that token returns 401.

### 2.6 `POST /auth/admin/logout` (JWT, ADMIN)

Revokes **all** refresh tokens for the admin.

---

## 3. User profile and account

All routes need a JWT.

### 3.1 `GET /users/profile`

200 `{ message, data: { ...user (camelCase), onboardingComplete, pendingReviewCount } }`.

- `onboardingComplete` **here** means `fullName` is set and is not `"New User"`. This is a different rule from verify (see quirks).
- `pendingReviewCount` is the number of delivered meals not yet rated (0 if there is no subscription).

### 3.2 `POST /users/profile`

Body (both optional): `{ "fullName": "Ali Test", "email": "ali@test.com" }`. `fullName` must be 2–80 characters.

- An email used by another user returns 400 `VALIDATION_ERROR` with `details.fields.email`.
- Setting a real name generates the user's referral code.

### 3.3 `PATCH /users/preferences/language`

Body: `{ "language": "EN" }` or `"AR"`. Response 200 `{ message, data: { language } }`.

### 3.4 Delivery locations

| Method + path | Notes |
|---|---|
| `POST /users/delivery-location` | Body: `areaId` (UUID, required); **either** `buildingId` (UUID from the building list) **or** `building` (free text, ≤200); optional `floor`, `deskArea`, `gate`, `deliveryPreference` (`hand_to_me` default, or `reception`), `riderNotes`. 201. The new location becomes **primary**. The response includes `areaName` and `onboardingComplete: true`. |
| `GET /users/delivery-location` | 200 `{ message, data: [...] }`, primary first. |
| `PATCH /users/delivery-location/:id` | Any field optional. 200. Changing the area clears `buildingId`. |
| `PATCH /users/delivery-location/:id/primary` | 200. Makes it primary and un-primaries the others. |
| `DELETE /users/delivery-location/:id` | 200. If the primary was deleted, the newest remaining one becomes primary. |

Errors:

- The area does not exist or is not `active`: 400 `VALIDATION_ERROR`.
- `buildingId` belongs to a different area: 400.
- Neither building field was given: 400.
- An unknown location id: 404 `RESOURCE_NOT_FOUND`.
- Another user's location: **403 `UNAUTHORIZED`**.

### 3.5 `POST /users/me/delete-account`

Body: `{ "confirm": true }`. `confirm` must be exactly `true`. Any other value returns 400.

Response 200 `{ message, data: { deleted_at, subscription_cancelled } }`.

Effects:

- An active subscription is cancelled (`subscription_cancelled: true`).
- All locations are deleted.
- All refresh tokens are revoked.
- Devices are deactivated.
- The user is anonymised: phone becomes `deleted:<id>`, name becomes `Deleted User`, and `isActive=false`.

Calling it again returns 200 "Account already deleted". ADMIN or OPS get **401** `AUTHENTICATION_ERROR`. A DRIVER is allowed. After deletion, the same phone can sign up again as a new user.

---

## 4. Delivery areas, start dates, config, devices

All routes need a JWT.

| Endpoint | Response and rules |
|---|---|
| `GET /delivery/areas` | 200 `{ message, data: { areas: [{ id, name, description, status, ... }] } }`. **Only `active` areas.** |
| `GET /delivery/areas/search?q=olaya` | 200 `{ message, data: { areas, query, isOutOfZone } }`. A case-insensitive name match. `isOutOfZone=true` when there are 0 matches. An empty `q` returns 400. |
| `POST /delivery/areas/out-of-zone` | Body `{ "areaName": "Hittin" }` (2–100 characters). 201. At most **3 per user, ever**. The 4th returns **429 `SUBMISSION_LIMIT`**. Shown to the admin in section 25. |
| `GET /delivery/areas/:area_id/buildings?q=` | 200 `{ message, data: { areaId, areaName, buildings: [{ id, areaId, name, floorsCount }] } }`. An unknown area returns 404. |
| `GET /delivery/start-dates?from=&limit=` | 200 `{ start_dates: [{ date, label, is_next_working_day, is_available, unavailable_reason? }] }`. Sun–Thu only. The earliest is tomorrow. `limit` defaults to 14 (max 30). Holidays have `is_available:false` and `unavailable_reason:"Public holiday"`. No `message` wrapper. |
| `GET /config/public-holidays?year=2026` | 200 `{ holidays: [{ date, name }] }`. Empty unless holidays were inserted in the DB. |
| `POST /devices/register` | Body `{ "platform": "ios" \| "android", "deviceToken": "..." }`. 200 `{ message, data: device }`. Creates an SNS endpoint (mocked if `SKIP_SNS=true`). |
| `GET /health` (no `/api/v1`, no auth) | 200 `{ status: "ok", timestamp }` |

---

## 5. Plans

### 5.1 `GET /plans` (JWT)

200:

```json
{ "plans": [ {
  "id": "month", "name": "Month Plan",
  "price_sar": 500, "max_price_sar": 1000, "discount_percent": 50,
  "meal_count": 22, "price_per_meal_sar": 22.73,
  "skip_days_allowed": 66, "pause_days_allowed": 66, "is_most_popular": true
} ] }
```

- `id` is the **slug**.
- `price_sar` is the **actual price charged**.
- `max_price_sar` is the struck-through "was" price, or `null`.
- `discount_percent` is computed (see 1.1), or `null`.
- `price_per_meal_sar` is `price_sar / meal_count`, rounded to 2 decimals.

### 5.2 `GET /plans/active` (JWT)

The same plan objects, plus `is_last_plan` (the user's last confirmed order used this plan) and `wallet_balance_sar`.

Tests: after the admin sets `max_price_sar` (section 26), check that `discount_percent` appears here and on `/home` `plans[]`.

---

## 6. Checkout, promo, payment, orders

**Order of calls for a purchase:**

1. `GET /plans/active`
2. `GET /delivery/start-dates`
3. `POST /checkout/session`
4. (optional) `POST /referrals/validate`, then `POST /checkout/session/:id/promo`
5. `GET /checkout/session/:id`
6. `GET /payment/methods`
7. `POST /orders`

### 6.1 `POST /checkout/session`

Body: `{ "plan_id": "month", "meal_type": "executive" }`. `meal_type` is `executive` or `salad`.

Response **201**:

| Field | Meaning |
|---|---|
| `session_id` | Save as `session_id`. |
| `plan_id` | Slug |
| `base_price_sar` | Plan `price_sar` (on an upgrade, the **new** plan price) |
| `wallet_credit_sar` | Automatically `min(wallet balance, amount due)` |
| `promo_discount_sar` | 0 at creation |
| `total_due_sar` | The amount that will be charged |
| `promo_code`, `promo_attempt_count`, `promo_locked` | `null`, `0`, `false` initially |
| `expires_at` | About **10 minutes** later |
| `promotion` | `true` if this is a plan upgrade (section 7) |
| `prior_plan_credit_sar`, `current_plan_id` | Upgrade only, otherwise `null` |

Formulas:

- New purchase: `total_due_sar = base_price_sar − wallet_credit_sar`.
- Upgrade: see section 7.

Rules:

- Creating a session **expires all previous sessions** of the user.
- An unknown or inactive plan returns 404 `RESOURCE_NOT_FOUND`.
- An existing subscription that is `paused` or `cancelled` (even cancelled with future deliveries) returns **422 `ACTIVE_SUBSCRIPTION_CHECKOUT_BLOCKED`**.
- An existing `active` subscription with the same plan returns 422 `SAME_PLAN_NOT_ALLOWED`. A lower plan returns 422 `PLAN_PROMOTION_NOT_ALLOWED`. A higher plan creates an upgrade session.
- An `expired` subscription allows a normal new purchase.

### 6.2 `GET /checkout/session/:session_id`

Returns the same pricing fields, **except** there are no `promotion`, `prior_plan_credit_sar` or `current_plan_id` fields, and **`plan_id` is the internal UUID, not the slug** (a known inconsistency). An expired or missing session returns **410 `SESSION_EXPIRED`**.

### 6.3 `POST /checkout/session/:session_id/promo`

Body: `{ "code": "ALI123" }`.

Response 200: `session_id`, `promo_code`, `discount_type` (`referral` or `promo`), `promo_discount_sar`, `total_due_sar`, `promo_attempt_count`, `promo_locked`.

Discounts:

- Referral code: `promo_discount_sar = round(plan price × 0.20)`.
- Promo code: the fixed `discount_sar` from the promo record.
- `total_due_sar = max(0, base − wallet − promo_discount)`.

Errors:

- 410 `SESSION_EXPIRED`.
- 422 `INVALID_CODE`: unknown, inactive or used-up code. Counts as a failed attempt.
- 422 `PLAN_MISMATCH`: the promo is restricted to another plan. Counts as a failed attempt.
- 422 `NOT_NEW_USER`: a referral code used by a user who already has a confirmed order.
- **423 `PROMO_LOCKED`**: returned on the 5th failed attempt and on any attempt after that, even with a valid code.

### 6.4 `DELETE /checkout/session/:session_id/promo`

200 `{ session_id, promo_code: null, promo_discount_sar: 0, total_due_sar }`, where the total is recomputed as `base − wallet`.

### 6.5 Payment methods

| Endpoint | Notes |
|---|---|
| `GET /payment/methods` | Returns this user's **saved** cards (`id`, `type`, `label`, `is_default`, `is_last_used`). Empty array when none are saved. With `USE_MOCK_PAYMENT=true`, `POST /orders` still accepts `00000000-0000-0000-0000-000000000001` (mada), `...0002` (visa), `...0003` (apple_pay). Those ids are rejected when mock payments are off. |
| `POST /payment/methods` | Body `{ "type": "mada\|visa\|mastercard\|stc_pay\|apple_pay", "token": "tok_x" }`. 201 `{ id, type, label, ... }`. Saved cards **do not appear** in the GET list. |
| `DELETE /payment/methods/:method_id` | 204. Another user's method or an unknown id returns 404. |

### 6.6 `POST /orders`

Body: `{ "session_id": "...", "payment_method_id": "00000000-0000-0000-0000-000000000001", "start_date": "2026-10-25" }`. `start_date` is `YYYY-MM-DD`. Pick one with `is_available:true` from start-dates. The server does **not** re-validate it.

Response **201**:

| Field | Meaning |
|---|---|
| `order_id`, `subscription_id` | Save both |
| `status` | `confirmed` |
| `is_new_user` | `true` if this is the user's first confirmed order |
| `plan_id`, `meal_type`, `meal_count`, `start_date`, `first_delivery_label` | |
| `summary.plan_price_sar`, `summary.wallet_credit_sar`, `summary.promo_discount_sar`, `summary.promo_code`, `summary.discount_label`, `summary.total_paid_sar` | Price breakdown |

Side effects on a new purchase:

- The order is `confirmed`.
- The subscription is `active`, with `meal_count` delivery days on working days (holidays skipped).
- `end_date` is the last delivery date.
- If a wallet credit was used, a wallet **debit** is recorded.
- If a referral code was used, the **referrer gets a wallet credit of `round(plan price × 0.10)`** and a referral record is created.

Errors:

- 409 `CHECKOUT_ALREADY_COMPLETED` (the same session paid twice).
- 410 `SESSION_EXPIRED`.
- 404 for an unknown payment method.
- 422 `ACTIVE_SUBSCRIPTION_CHECKOUT_BLOCKED`.
- 402 `PAYMENT_FAILED`. Real Moyasar only. The session stays usable.

### 6.7 `GET /orders/:order_id`

200: `order_id`, `subscription_id`, `status`, `plan_id`, `meal_type`, `meal_count`, `start_date`, `summary`, `payment_method {type,label}`, `created_at`. An unknown id returns 404.

---

## 7. Plan upgrade

### 7.1 `GET /subscriptions/me/plan-change-options`

200:

| Field | Meaning |
|---|---|
| `current_plan_id` | Current slug, or `null` |
| `subscription_status` | Status, or `null` |
| `start_date` | Subscription start |
| `allowed_plan_ids` | The plans the user may upgrade to |
| `promotion_available` | `allowed_plan_ids.length > 0` |
| `blocked_reason` | The reason upgrades are blocked, or `null` |

Upgrade matrix (**upgrades only, no downgrades**). The tier order is `try_it < week < month < quarterly`.

| Current | `allowed_plan_ids` |
|---|---|
| `try_it` | `week`, `month`, `quarterly` |
| `week` | `month`, `quarterly` |
| `month` | `quarterly` |
| `quarterly` | `[]`, with `blocked_reason` "You are already on the highest plan tier." |

- A status other than `active` (paused or cancelled) gives `allowed_plan_ids: []` and `blocked_reason` "Plan upgrades are only available while your subscription is active."
- No subscription gives everything `null` or empty, `promotion_available:false` and `blocked_reason:null`.

### 7.2 Upgrade checkout

Call `POST /checkout/session` with a higher `plan_id` while `active`. The response has `promotion: true`.

| Value | Formula |
|---|---|
| `prior_plan_credit_sar` | The **total paid on the previous order** (`total_paid_sar`). Not prorated. |
| `base_price_sar` | New plan price |
| amount after credit | `max(0, new price − prior_plan_credit_sar)` |
| `wallet_credit_sar` | `min(wallet, amount after credit)` |
| `total_due_sar` | `amount after credit − wallet_credit_sar` |

Example: week paid 125 SAR, upgrading to month at 500 gives `total_due_sar = 375` (with wallet 0).

### 7.3 What `POST /orders` does on an upgrade

- The **same `subscription_id`** is kept. `start_date` is unchanged, and the `start_date` sent by the client is ignored.
- The plan, `meal_type`, `total_meal_days`, `skip_days_allowed` and `pause_days_allowed` change to the new plan.
- Delivery days are rebuilt from the original start for the new `meal_count`. Missing days are added, extra **scheduled** days are removed, and delivered days are kept.
- **Used** skip and pause days are **not reset**. Only the allowance increases, so the remaining count goes up.
- No referral reward is given on an upgrade. A new order row is created.

Tests:

- try_it to week: check `GET /subscriptions/me` has `total_meal_days`, new `end_date`, `skip_pause_days_allowed` = 15 and the same `subscription_id`.
- Same plan returns 422.
- A downgrade returns 422.
- An upgrade while paused or cancelled returns 422 `ACTIVE_SUBSCRIPTION_CHECKOUT_BLOCKED`.

---

## 8. Subscription: `GET /subscriptions/me`

JWT. Returns the latest subscription with status `active`, `paused` or `cancelled`. If there is none (no subscription, or only expired ones), it returns **404 `RESOURCE_NOT_FOUND`**. Reading this endpoint can flip `active` to `paused` once a scheduled pause has started.

| Field | Meaning, and how to verify |
|---|---|
| `subscription_id` | UUID |
| `plan_id` / `plan_name` | **The current plan** slug and name |
| `meal_type` | The subscription's default stream (`executive` or `salad`) |
| `status` | `active`, `paused` or `cancelled` (see 1.4) |
| `start_date` / `end_date` | Plan window. `end_date` **moves later** on each skip (makeup) and on lapsed pause days after resume. |
| `total_meal_days` | Meals in the plan plus added makeup days |
| `delivered_count` | Meals delivered so far |
| `skipped_count` | Days skipped |
| `remaining_count` | `max(0, total_meal_days − delivered_count − skipped_count)`, i.e. **meals still to come** |
| `days_remaining` | **The same number** as `remaining_count` (a meal count, not calendar days) |
| `skip_days_allowed` / `skip_days_used` / `skip_days_remaining` | The flex pool (see 1.3). "Skip count left" is `skip_days_remaining`. |
| `pause_days_allowed` / `pause_days_used` / `pause_days_remaining` | **The same pool**, so the same numbers |
| `skip_pause_days_allowed` / `_used` / `_remaining` | **The same pool**, the canonical names |
| `pause_scheduled` | `true` when a pause is booked but its start cutoff has not passed. The status is still `active`. |
| `paused_from` / `paused_until` | The pause window, or `null` |
| `pause_ceiling_date` | The pause end at the time it was booked |
| `paused_days` | The list of working dates inside the pause window (holidays excluded) |
| `cancel_pause_available` | `true` when `pause_scheduled` is true. Use cancel pause, not resume. |
| `pause_date_picker` | Bounds for booking a **new** pause (below) |
| `resume_date_picker` | Bounds for resuming an **in-effect** pause (below) |

`pause_date_picker`:

- `visible`: `true` only if the subscription can use skip/pause, flex remaining > 0, there is no pause booked yet, and there is a valid start date.
- `start_min`: the earliest allowed pause start (≥ today and ≥ plan start, with that day's cutoff not passed).
- `start_max`: `end_date` plus flex remaining working days.
- `max_working_days_in_range`: the flex remaining.

`resume_date_picker` is shown only when the status is `paused` and the pause has started, and the `paused_until` cutoff has not passed:

- `min`: the day after `paused_from`.
- `max`: `paused_until`.
- `suggested_date`: the next working day from tomorrow, within the range.

**Is skip available?** That is decided per day: see `skip_available` and `skip_reason` on deliveries, the menu week and home. Overall, skip is possible only when the status is `active` or `cancelled`-in-service and `skip_pause_days_remaining > 0`.

Assertions on every call:

- All three counter sets are equal.
- `remaining_count == days_remaining`.
- `remaining_count == total_meal_days − delivered_count − skipped_count`.

---

## 9. Deliveries, skip, undo

### 9.1 `GET /subscriptions/me/deliveries?from=YYYY-MM-DD&to=YYYY-MM-DD`

200 `{ deliveries: [...], skip_limit_reached }`. `skip_limit_reached` is `true` when flex remaining = 0. No subscription returns 404.

Each delivery has:

- `date`, `label` (e.g. `Sun 12 Jun · Today`)
- `meal_id`, `meal_name`, `photo_url` (the **effective** dish)
- `meal_type` (this day's stream)
- `status` (1.5)
- `selected_meal_id`
- `can_change`, `skip_available`, `skippable`, `skip_reason`, `undoable`, `is_skipped` (1.6)

### 9.2 `POST /subscriptions/me/deliveries/:delivery_date/skip`

No body. Response 200:

```json
{ "date": "2026-10-27", "status": "skipped", "undoable": true,
  "skip_days_used": 1, "skip_days_remaining": 14, "makeup_date": "2026-11-03" }
```

The checks run in this order:

1. The subscription is `active` or `cancelled`-in-service. Otherwise 400 `VALIDATION_ERROR` "Only active subscriptions…". **A paused subscription fails here.**
2. Before the cutoff (18:00 KSA the day before). Otherwise **422 `PAST_CUTOFF`**.
3. Flex remaining > 0. Otherwise **409 `SKIP_LIMIT_REACHED`** with `details.skip_days_used` and `skip_days_remaining: 0`.
4. A delivery row exists for the date. Otherwise 404 `RESOURCE_NOT_FOUND`.
5. The row is `scheduled`. Otherwise 400 `VALIDATION_ERROR` (already skipped, paused, delivered).

Effects:

- The day becomes `skipped`.
- A makeup day is added (1.7). `end_date` and `total_meal_days` go up by 1.
- Flex used goes up by 1 and `skipped_count` by 1.
- An audit entry `skip_delivery` is written.

### 9.3 `DELETE /subscriptions/me/deliveries/:delivery_date/skip` (undo)

Response 200 `{ date, status: "scheduled", skip_days_used, skip_days_remaining }`.

Errors:

- After the cutoff: 422 `PAST_CUTOFF`.
- No skipped row on that date: 404 `RESOURCE_NOT_FOUND`.

Effects:

- The day goes back to `scheduled`.
- The makeup day is deleted if it is still `scheduled`, and `end_date` and `total_meal_days` go back.
- Flex used goes down by 1 and `skipped_count` by 1.

Tests:

- Skip, then GET `/me`: `end_date` +1 working day, remaining −1.
- Undo: everything back to the earlier values.
- Skip on Thursday: the makeup lands on the next Sunday or later, never Fri/Sat.
- `try_it` (1 flex day): the second skip returns 409.
- Skip after the cutoff returns 422.
- Skip a Friday returns 404.

---

## 10. Pause, cancel pause, resume

### 10.1 `POST /subscriptions/me/pause`

Body: `{ "start_date": "2026-11-01", "end_date": "2026-11-05" }`.

Rules (any failure returns 400 `VALIDATION_ERROR` with `details.fields`, unless noted):

- The subscription is `active` or `cancelled`-in-service.
- **No pause is already booked.** Only one pause window at a time.
- `end_date >= start_date`.
- `start_date >= today (KSA)` and `>= subscription start_date`.
- The start day's cutoff has not passed (18:00 KSA the day before `start_date`).
- `end_date <= end_date of subscription + flex remaining working days`.
- At least 1 working day in the range.
- The number of working days in the range ≤ flex remaining. Otherwise **409 `PAUSE_LIMIT_EXCEEDED`** with `details.pause_days_remaining` and `skip_pause_days_remaining`.

Response 200: `subscription_id`, `status` (still `active`), `paused_from`, `paused_until`, `pause_ceiling_date`, `pause_scheduled: true`, `paused_days[]`, and the flex counters.

Effects:

- `scheduled` days in the range become `paused`.
- Flex used goes up by the number of working days.
- An audit entry `pause_subscription` is written.

After the start-day cutoff passes, the next read of `/me` or `/home` shows `status: "paused"`.

### 10.2 `POST /subscriptions/me/pause/cancel`

Only while `pause_scheduled` is true (before the pause starts). If the pause has already started, it returns 400 "Use resume instead". With no pause, it returns 400.

Effects:

- The `paused` days go back to `scheduled`.
- **All** working days are refunded to flex.
- The pause fields are cleared and the status is `active`.

The response contains the flex counters. Audit: `cancel_pause`.

### 10.3 `POST /subscriptions/me/resume`

Body: `{ "resume_date": "2026-11-03" }`. Only when the pause **is in effect** (status `paused`). If it has not started yet, it returns 400 "cancel pause instead".

Rules (400 on failure):

- `resume_date` ≥ the day after `paused_from`, and ≤ `paused_until`.
- It is a working day and not a holiday.
- The cutoff for `paused_until` has not passed.

Effects:

- Days from `resume_date` to `paused_until` go back to `scheduled`.
- **Unused working days are refunded** to flex.
- **Lapsed days** (paused days before the resume date that were not delivered) are added as new days after `end_date`, so `end_date` moves later.
- The pause fields are cleared and the status becomes `active` (or stays `cancelled`).

Response 200: `resume_date`, `first_delivery_label`, the flex counters, `lapsed_days`, `new_end_date`, `status`.

Tests:

- Pause Sun–Thu (5 working days): flex used +5, `pause_scheduled:true`, status `active`, deliveries in range `paused` with `skip_reason:"day_paused"`.
- Cancel pause: flex back.
- Pause Fri–Sat only: 400 (0 working days).
- Pause longer than remaining: 409.
- A second pause while one is booked: 400.
- Resume mid-pause: a refund appears, `new_end_date` is later.

---

## 11. Cancel subscription and expiry

### 11.1 `POST /subscriptions/me/cancel`

Response 200:

```json
{ "subscription_id": "...", "status": "cancelled", "deliveries_continue_until": "2026-11-20", "refund_sar": 0, "message": "..." }
```

- There is **no refund** (`refund_sar` is always 0).
- `end_date` is unchanged, and deliveries continue until it.
- The customer can still skip, pause and choose meals until `end_date`.
- The customer cannot upgrade, and **cannot buy a new plan until it expires** (422 `ACTIVE_SUBSCRIPTION_CHECKOUT_BLOCKED`).
- Cancelling again, or cancelling an expired subscription, returns 400.

### 11.1b `POST /subscriptions/me/resubscribe`

No body. **200** when undoing a cancel while still in the paid period:

```json
{ "subscription_id": "...", "status": "active", "end_date": "2026-11-20", "message": "Your subscription is active again." }
```

- Allowed only when `status === 'cancelled'` and `end_date >= today` (KSA), same service window as skip/pause.
- Sets `status` back to `active`. No payment, no change to `end_date` or delivery days.
- Audit: `resubscribe_subscription`.
- **400** `VALIDATION_ERROR` if already `active`, if `paused` (use resume), or if cancelled but past `end_date` (use checkout renew).
- **404** if no subscription.

### 11.2 `POST /internal/jobs/expire-subscriptions` (no `/api/v1`)

Header: `x-internal-secret: <INTERNAL_JOB_SECRET>`. A wrong secret returns 401.

Body (optional): `{ "as_of_date": "YYYY-MM-DD" }`. The default is today (KSA).

It sets `expired` on every `active`, `paused` or `cancelled` subscription with **`end_date < as_of_date`** (strictly less). Response `{ expired_count, as_of_date }`.

After this, `GET /subscriptions/me` returns 404, `/home` shows `subscription_status: "expired"` with a Renew CTA, and checkout works again.

---

## 12. Meal type switch and salad toggle

### 12.1 `PATCH /subscriptions/me/meal-type`

Body:

```json
{ "meal_type": "salad", "apply_to": "all" }
{ "meal_type": "executive", "apply_to": "specific", "specific_days": ["2026-10-28", "2026-10-29"] }
```

- `effective_from`: before 18:00 KSA it is **tomorrow**. At or after 18:00 KSA it is **the day after tomorrow**.
- `apply_to: "all"`: changes every `scheduled` day from `effective_from` onwards **and** the subscription's default `meal_type`.
- `apply_to: "specific"`: `specific_days` is required, non-empty, has unique dates, and every date must be ≥ `effective_from`. Otherwise 400.
- The days that are changed **lose any custom dish pick** (`selected_meal_id` is cleared).
- There is no status check: it works for a cancelled-in-service subscription too.

Response 200: `subscription_id`, `meal_type`, `applied_to`, `effective_from`, `message`.

Tests:

- At 17:59 KSA vs 18:00 KSA, `effective_from` differs by one day.
- A specific day earlier than `effective_from` returns 400.
- After `all`, `/me` shows the new `meal_type`, and deliveries from `effective_from` show the new stream.

### 12.2 `PATCH /subscriptions/me/deliveries/:delivery_date/salad`

Body: `{ "enabled": true }`. `true` means salad, `false` means executive, **for that one date only**.

Response 200 `{ date, meal_type }`.

Rules:

- The day must exist (404) and be `scheduled` (400).
- Before the cutoff, otherwise 422 `PAST_CUTOFF`.
- The pick on that day is cleared.

---

## 13. Customer menu and meal choice

### 13.1 `GET /menu`

200: `this_week` and `next_week`, each `{ label, date_from, date_to }` (Sun–Thu), plus `filter_options` `[{ id: "all"|"executive"|"salad", label, is_default }]`, with `all` as the default.

### 13.2 `GET /menu/week?meal_type=all`

200 `{ this_week: {label, date_from, date_to, days[]}, next_week: {...} }`.

- The `meal_type` query is accepted but **ignored**: both streams are always returned.
- Only dates that have **published** menu slots appear, up to 5 + 5 days. A draft week is invisible to customers.
- On Friday and Saturday, "this week" means the next Sun–Thu.

Each day:

| Field | Meaning |
|---|---|
| `delivery_date`, `day_label` (`TODAY` or `Mon 14`), `is_today` | |
| `card_state` | `today`, `upcoming`, `past` or `skipped` |
| `meal_type` | This day's stream: from the delivery row, or the subscription default when there is no row |
| `meal_id`, `name_en`, `kcal`, `emoji`, `photo_url`, `effective_meal` | The effective dish (1.8) |
| `selected_meal_id` | The customer's pick, or `null` |
| `can_change` | Whether the dish can be changed (1.6) |
| `executive_options[]`, `salad_options[]` | `{ meal_id, name_en, meal_type, kcal, emoji, photo_url, is_default, is_selected }` |
| `skip_available`, `skip_reason`, `undoable`, `is_skipped`, `is_deliverable` | 1.6. A day without a delivery row gives `skip_reason:"no_delivery"` and `is_deliverable:false`. |

### 13.3 `GET /meals/:meal_id?delivery_date=YYYY-MM-DD`

200:

- Dish info: `meal_id`, `name_en`, `name_ar`, `meal_type`, `emoji`, `photo_url`, `kcal`, `macros {protein_g, carbs_g, fat_g}`, `chef_note`, `key_ingredients`.
- Day info: `delivery_date`, the skip flags, `is_deliverable`.
- Selection info: `is_default`, `is_selected`, `is_effective` (this dish is what will be delivered), `can_select` (equal to `can_change`), `selected_meal_id`.

An unknown meal returns 404.

### 13.4 `GET /subscriptions/me/deliveries/:delivery_date/meal-choice`

200:

- `delivery_date`, `meal_type`, `selected_meal_id`
- `default_meal_id` (the admin default for the stream)
- `can_change`
- `cutoff_at` (ISO, 18:00 KSA the day before)
- `effective_meal`
- `options[]` (both streams), `executive_options[]`, `salad_options[]`

No subscription, or no delivery row for the date, returns 404.

### 13.5 `PUT /subscriptions/me/deliveries/:delivery_date/meal-choice`

Body: `{ "meal_id": "<uuid>" }`. Response 200 `{ delivery_date, meal_type, selected_meal_id, effective_meal }`.

- The customer can pick **any dish on that date's published menu, from either stream**.
- If the picked dish is from the other stream, **that day's `meal_type` switches** (e.g. an executive subscriber picks a salad dish, and the day becomes `salad`). Other days are unchanged.

Errors:

- The subscription is not active/cancelled-in-service, the day is not `scheduled`, or the dish is not on that date's menu: 400 `VALIDATION_ERROR`.
- After the cutoff: 422 `PAST_CUTOFF`.
- No row: 404.

Tests:

- Pick the second executive dish: GET menu week shows `is_selected` on it and `effective_meal` = it.
- Pick a salad dish on an executive day: `meal_type` becomes `salad` and labels/rider show the salad name.
- After the cutoff: 422.
- A dish from another date: 400.

---

## 14. Home

### 14.1 `GET /home`

200:

| Field | Meaning |
|---|---|
| `user.first_name` | The first word of `fullName`, or `"there"` |
| `user.language` | `EN` or `AR` |
| `subscription_status` | `none`, `active`, `paused`, `cancelled` or `expired` |
| `subscription` | Varies by status (below) |
| `delivery_location` | Primary building, floor, area, or `null` |
| `wallet_balance_sar` | |
| `banner` | Theme, texts and CTA. Red for none or expired, black for active or paused. |
| `quick_actions` | Skip/pause actions when active or cancelled-in-service. Resume when paused. Browse/subscribe otherwise. |
| `plans[]` | Plans with `price_sar`, `max_price_sar`, `discount_percent`, `cta_label`, `is_current_plan`, `is_last_plan` |

`subscription` when active or cancelled-in-service:

- `subscription_id`, `plan_name`, `meal_type`
- `days_remaining` (= `remaining_count` from `/me`)
- `end_date`, `end_date_label`
- `skip_days_remaining`, `pause_days_remaining`, `skip_pause_days_remaining` (equal)
- `pause_scheduled`, `paused_from`, `paused_until`

When paused, it also has `paused_since`, `days_frozen` and `pause_ceiling_date`. When expired or out of service, it is minimal: `plan_name`, `meal_type`, `end_date`.

Assert that home's `days_remaining` equals `/subscriptions/me` `remaining_count`.

### 14.2 `GET /home/this-week`

200 `{ week_label: "This Week's Meals", cards: [...] }`. The current Sun–Thu week (Fri/Sat show next week), dates from today onwards.

Each card:

- The effective dish, `delivery_date`, `day_label`
- `card_state`: `today`, `upcoming`, `skipped`, `past`, `browse_only` or `past_greyed`
- `card_border`
- The skip flags, `is_deliverable`, `can_change`
- `executive_options`, `salad_options`
- `action { type: "open_meal_detail", cta_label }`

Paused gives browse only. No subscription gives a Subscribe CTA. Expired gives a Renew CTA.

---

## 15. History and ratings

| Endpoint | Notes |
|---|---|
| `GET /subscriptions/me/history?page=1&per_page=20&period=last_30_days` | `period` is `last_30_days` or `last_90_days`. `per_page` max 50. Response is **camelCase** `{ data: { entries: [{ deliveryDayId, date, mealType, mealName, photoUrl, kcal, status, stars, tags }], pagination: { page, perPage, total, totalPages } } }`. Only `delivered` and `skipped` days. |
| `GET /subscriptions/me/pending-ratings` | `{ data: [...] }`, at most **5**, newest first. Delivered days with no rating. No subscription gives `{ data: [] }`. |
| `GET /subscriptions/me/ratings?page&per_page` | `{ data: { ratings: [...camelCase], pagination } }` |
| `POST /meals/:meal_id/rating` | Body `{ "deliveryDayId": "<uuid>", "stars": 1-5, "tags": ["Great portion"] }`. 201 `{ message, data }`. |

Rating rules:

- Valid tags are exactly `"Great portion"`, `"Too spicy"`, `"Too salty"` and `"Small portion"`. Others return 400.
- The delivery day must be **`delivered`** and belong to the user. Otherwise 400 or 404.
- A second rating for the same day returns **409 `RATING_ALREADY_SUBMITTED`**.
- After rating, the day disappears from pending-ratings and `pendingReviewCount` drops.

---

## 16. Customer issues

### `POST /subscriptions/me/issues`

Body (**camelCase**):

```json
{ "deliveryDate": "2026-10-27", "issueType": "not_delivered", "description": "optional ≤500" }
```

- `issueType` is one of `wrong_order`, `quality_issue`, `not_delivered`, `damaged`.
- Response **201** `{ message: "Issue reported successfully", data: { id, userId, subscriptionId, deliveryDate, issueType, status: "open", ... } }`.
- An active subscription is required (404 otherwise).
- There is **no** cutoff check, duplicate check, or check that a delivery exists on that date. Duplicates are allowed.
- The issue appears in the admin issues queue for that `delivery_date` (section 20). The admin either **credits** it (the customer wallet gets an "Issue credit" and the status becomes `credited`) or **rejects** it (status `rejected`, no money).

Rider issues (section 21) are a **separate** table and do **not** appear in this queue.

---

## 17. Wallet, billing, referrals

| Endpoint | Response |
|---|---|
| `GET /users/wallet` | `{ balance_sar, currency: "SAR", auto_applied_at_checkout: true }`. The balance is the sum of all transactions. |
| `GET /users/wallet/transactions?page&per_page` | `{ transactions: [{ id, type: credit\|debit, amount_sar (debits negative), label, description, created_at }], pagination: { page, per_page, total, total_pages } }` |
| `GET /users/billing/transactions` | Wallet ledger, orders and referral rewards merged. Each has `category`: `wallet_ledger`, `subscription_payment` or `referral_reward`. |
| `GET /users/billing/payments` | Confirmed orders only (`subscription_payment`, debit = `total_paid_sar`) |
| `GET /users/billing/referrals` | Referral reward credits |
| `GET /referrals/me` (also `GET /users/referral`) | `{ referral_code, friends_joined, total_earned_sar, reward_rate_pct: 10, whatsapp_share_text, referred_friends: [{ name, joined_at, plan_name, reward_sar }] }` |
| `POST /referrals/validate` | Body `{ "code": "...", "plan_id": "month" }`. **Always 200**. Valid: `{ valid: true, code, discount_type, discount_sar, discount_pct (20 for referral, null for promo), description }`. Invalid: `{ valid: false, error_code }` where `error_code` is `INVALID_CODE`, `CODE_ALREADY_USED`, `PLAN_MISMATCH` or `NOT_NEW_USER`. |

Wallet transaction sources:

| Source | type / label |
|---|---|
| Referral reward | credit / `Referral reward` |
| Admin credit | credit / `Admin Credit` |
| Issue credit | credit / `Issue credit` |
| Checkout | debit / the plan name, or `{plan} upgrade` |

Referral rules:

- Referral codes are for **new users only** (no confirmed order yet).
- The friend gets **20%** off the plan price.
- The referrer gets **10%** of the plan price as wallet credit **when the friend's order succeeds**.
- A user cannot use their own code. Validate a code, then apply it at checkout.

---

## 18. Admin meal library

Roles: **ADMIN, OPS**. Base: `/admin/meals`.

Meal status:

- `draft`: new, not usable on a menu.
- `active`: live.
- `updated`: live, with pending edits that are not yet applied.

| Endpoint | Notes |
|---|---|
| `GET /admin/meals?status=all&meal_type=all&q=&page=1&per_page=20&context=picker` | `status`: `all`, `active`, `draft` or `updated`. `context=picker` returns only assignable meals (active and updated). `per_page` max 50. Response `{ meals: [{ meal_id, name_en, name_ar, meal_type, kcal, status, photo_url, has_pending_changes, ... }], pagination }`. |
| `GET /admin/meals/:meal_id` | Full detail, including `macros`, `pending` (unapplied edits), `times_served`, `last_served`. 404 if unknown. |
| `POST /admin/meals` (multipart/form-data) | Fields: `name_en` (required, 1–80), `name_ar`, `meal_type` (`executive` or `salad`), `kcal` (positive int), `macros[protein_g]` etc., `chef_note`, `key_ingredients[]`, `emoji`; optional file field **`image`**. 201 `{ message, data: { id, nameEn, status: "draft", ... } }`. A duplicate `name_en` (case-insensitive) returns **409 `RESOURCE_ALREADY_EXISTS`**. |
| `PATCH /admin/meals/:meal_id` | Edits `name_en`, `name_ar`, `kcal`, `macros`, `chef_note`, `key_ingredients`, `emoji`, `photo_url`. A **draft** meal updates immediately. An **active** meal stores the changes as pending and the status becomes `updated`, with the live menu unchanged until it is re-activated. |
| `PATCH /admin/meals/:meal_id/status` | Body `{ "status": "active"\|"draft", "confirm_published_edit": true }`. Rules below. |
| `GET /admin/meals/:meal_id/photo-upload-url?content_type=image/jpeg` | `content_type` is required: `image/jpeg`, `image/png` or `image/webp`. Returns `{ upload_url (S3 presigned PUT), photo_url, expires_in_seconds: 300 }`. |
| `DELETE /admin/meals/:meal_id` | **Draft meals only.** Active or updated returns 400 `VALIDATION_ERROR`. |
| `POST /admin/meals/import` (multipart, field **`file`**, XLSX) | Columns: `name_en` (required), `meal_type`, `kcal`, `name_ar`, `protein_g`, `carbs_g`, `fat_g`, `chef_note`, `key_ingredients` (comma-separated), `emoji`. At most **100 rows**, first sheet only. 201 `{ imported_count, skipped_count, errors: [{row, field, message}], all_saved_as: "draft" }`. |

Status change rules:

| Change | Rule |
|---|---|
| `draft` → `active` | Always allowed |
| `updated` → `active` | Applies the pending edits. Requires `confirm_published_edit: true`, otherwise **409 `MEAL_IN_PUBLISHED_WEEK`**. |
| `active` → `draft` | If the meal is on a published current or next week, requires the confirm flag. Otherwise 409 `MEAL_IN_PUBLISHED_WEEK` with `details.affected_weeks` and `affects_live_menu`. |

The response contains `meal_id`, `previous_status`, `status`, `pending_applied`, `affects_live_menu` and `affected_weeks`.

---

## 19. Admin menu manager

Roles: **ADMIN, OPS**. Base: `/admin/menu`.

`week_id` format: `w{isoYear}-{isoWeek}`, e.g. `w2026-43`. A week runs Sun–Thu. Statuses:

- `draft`: customers cannot see it.
- `published`: visible to customers, and **still editable**.
- `past`: ended and **locked**.

Day rules:

- Per day, per stream: **at least 1 and at most 3 dishes**.
- Each stream needs one **default** dish.
- **The same dish cannot appear twice on the same date**, in either stream.

| Endpoint | Notes |
|---|---|
| `GET /admin/menu/weeks?from_week=w2026-43&count=2` | `count` 1–8, default 2. Automatically creates the current and next week. Response `weeks[]` with `week_id`, `label`, `date_from`, `date_to`, `status`, `is_current_week`, `is_editable`, `fill_status`, plus `nav.prev_week` and `nav.next_week`. |
| `GET /admin/menu/weeks/:week_id` | `week_id`, `status`, `is_editable`, `publish_ready`, `publish_blocked_reason`, `days[]`. Each day has `delivery_date`, `default_meal_id {executive, salad}`, `can_add_executive`, `can_add_salad`, `executive_slots[]`, `salad_slots[]`. Each slot has `slot_id`, `meal_type`, `is_default`, `meal`, `is_filled`, `is_editable`. Each day starts with one empty slot per stream. |
| `POST /admin/menu/weeks/:week_id/days/:date/slots` | Body `{ "meal_type": "executive", "meal_id": "<optional>" }`. Adds a 2nd or 3rd slot. Response `slot_id`, `meal`, `week_fill_status`. |
| `POST /admin/menu/weeks/:week_id/slots/:slot_id/assign` | Body `{ "meal_id": "..." }`. The first dish in a stream becomes the default automatically. |
| `PATCH /admin/menu/weeks/:week_id/days/:date/default` | Body `{ "meal_type": "salad", "meal_id": "..." }`. The meal must already be on that stream that day. |
| `DELETE /admin/menu/weeks/:week_id/slots/:slot_id` | Clears the dish. Extra slots (2nd and 3rd) are removed. |
| `POST /admin/menu/weeks/:week_id/publish` | Response `{ week_id, status: "published", published_at, published_by, customer_visible_from }`. |
| `POST /admin/menu/weeks/:week_id/unpublish` | Only from `published`. Response `{ message, data }` (camelCase week). Customers no longer see it. |

Errors:

| errorCode | HTTP | When |
|---|---|---|
| `SLOT_NOT_EDITABLE` | 422 | Any change on a `past` week |
| `MEAL_IS_DRAFT` | 422 | Assigning a draft meal |
| `MEAL_ALREADY_ON_DAY` | 409 | The same dish already on that date, in any stream |
| `DAY_MEAL_TYPE_LIMIT` | 409 | Adding a 4th slot to a stream |
| `CANNOT_CLEAR_DEFAULT` | 409 | Clearing the default while other dishes exist in the stream. Change the default first. |
| `CANNOT_CLEAR_LAST_STREAM_MEAL` | 409 | On a **published** week, clearing the only dish of a stream that day |
| `WEEK_NOT_COMPLETE` | 409 | Publishing when a day is missing a stream, a default, or has a draft meal. The message is like `"Mon: Salad missing"`. |
| `WEEK_ALREADY_PUBLISHED` | 409 | Publishing twice |
| `RESOURCE_NOT_FOUND` | 404 | Unknown week, slot or meal, or a date outside the week |
| `VALIDATION_ERROR` | 400 | Unpublishing a week that is not published |

Publish readiness, per date that has slots:

- ≥1 executive and ≥1 salad dish.
- ≤3 of each.
- Both defaults set.
- No draft meals.

**Changes on a published week are visible to customers immediately.**

---

## 20. Daily operations

Delivery date filter (query, all daily-ops GETs):

- `day=today|tomorrow` (KSA, default today).
- Or `delivery_date=YYYY-MM-DD`, which takes priority. `date` is an old alias.
- Labels and export only allow **today to today+7**. Outside that range they return 400 `VALIDATION_ERROR` (`DATE_OUT_OF_RANGE`).

Role matrix:

| Endpoint | ADMIN | OPS |
|---|---|---|
| `GET /admin/daily-ops` | ✅ | ❌ 403 |
| `GET /ops/daily-ops` | ❌ 403 | ✅ |
| `POST /admin/daily-ops/pipeline/advance` | ✅ | ✅ |
| `POST /ops/daily-ops/pipeline/advance` | ❌ | ✅ |
| `GET /admin/daily-ops/issues`, `POST .../issues/:id/credit`, `POST .../issues/:id/reject` | ✅ | ❌ |
| `GET /admin/daily-ops/labels`, `/labels/download`, `/export` | ✅ | ✅ |
| `GET /ops/daily-ops/labels`, `/labels/download` | ❌ | ✅ |

### 20.1 Pipeline

| Stage | How it is reached | `can_advance` |
|---|---|---|
| `pending` | Before the cutoff (18:00 KSA the day before the delivery) | false |
| `locked` | Automatically after the cutoff | true, to `dispatch` |
| `dispatch` | Manual advance | true, to `delivered` |
| `delivered` | Manual advance | false |

### 20.2 `GET /admin/daily-ops` (and `/ops/daily-ops`)

200:

- `date`, `date_label`
- `pipeline { stage, stages[{id,label,status: done|active|pending}], locked_at (admin only), locked_note, can_advance, advance_label }`
- `meal_breakdown { total, rows[{ type, meal_id, label, count, pct }] }`: how many of each dish to cook
- `issues_queue`: the admin version has `{ open_count, issues[] }`, the ops version has `null`

### 20.3 `POST .../pipeline/advance`

Body: `{ "date": "2026-10-27", "from_stage": "locked", "to_stage": "dispatch" }`.

Response `{ date, previous_stage, current_stage, advanced_at, advanced_by }`.

Errors:

- `from_stage` is not the current stage (including advancing while still `pending`): **409 `STAGE_MISMATCH`**.
- `to_stage` is not the next stage: 400 `VALIDATION_ERROR`.

### 20.4 Issues queue

- `GET /admin/daily-ops/issues?delivery_date=...&status=open|all`. Default `open`.
- Each issue has `issue_id`, `customer_id`, `customer_name`, `customer_phone`, `delivery_address`, `issue_type`, `issue_type_label`, `description`, `submitted_at`, `delivery_date`, `meal_name`, `meal_type`, `plan_price_sar`, `status` (`open`, `credited` or `rejected`), `resolved_at`, `resolution`.
- `POST /admin/daily-ops/issues/:issue_id/credit`, body `{ "credit_sar": 25, "note": "optional" }`. `credit_sar` is **1–500**.
  - Response `{ issue_id, status: "resolved", resolution: "credit", credit_sar, resolved_at, resolved_by, customer_notified: true }`.
  - The customer gets a wallet credit with label `Issue credit` and a push notification.
- `POST /admin/daily-ops/issues/:issue_id/reject`, body `{ "reason": "required", "note": "optional" }`. `resolution: "rejected"`, no wallet change, and the customer gets a push notification.
- Errors: unknown issue returns 404. A second credit or reject returns **409 `ISSUE_ALREADY_RESOLVED`**.

### 20.5 Labels

`GET .../labels?delivery_date=...&meal_type=all|executive|salad&area_id=<uuid>`

Response:

- `date`, `date_label`, `day`, `total_count`, `filtered_count`, `bulk_download_label`
- `areas[{ area_id, area_name, count, labels[] }]`

Each label:

- `label_id` (= delivery day id, = the rider's `delivery_id`), `order_ref`
- `customer_name`, **`customer_phone`**
- `meal_type`, **`meal_name`** (the effective dish, including the customer pick)
- `building`, `floor`, `desk_area`, `gate`, `delivery_preference`, `delivery_date`

`GET .../labels/download` takes the same filters plus `label_id` (one label) and returns a **PDF**. An unknown `label_id` returns 404.

`GET /admin/daily-ops/export` returns **XLSX** `platio-delivery-sheet-{date}.xlsx` with the columns Customer Name, Phone, Building, Floor, Desk/Area, Gate, Meal Type, Meal Name, Rider Notes. The row count should equal labels `filtered_count`.

Tests:

- Skipped and paused days must **not** appear in labels.
- A customer's cross-stream pick shows the picked dish name and stream.

---

## 21. Rider

Role: **DRIVER** (log in with OTP using the driver's phone, e.g. review `+966500000102`). Base: `/rider`.

| Endpoint | Notes |
|---|---|
| `GET /rider/deliveries?date=YYYY-MM-DD&area_id=` | The default date is the **UTC** date, so always pass `date`. Response `{ date, rider_name, total_deliveries, delivered_count, pending_count, deliveries: [{ delivery_id, customer_name, customer_phone, building, floor, desk_area, delivery_preference, rider_notes, area, meal_type, meal_name, status: pending\|delivered, delivered_at }] }`. It lists **all** deliveries for the date, not only this rider's. |
| `POST /rider/deliveries/:delivery_id/delivered` | Response `{ message, data: { delivery_id, status: "delivered", delivered_at } }`. Unknown id returns **404 `DELIVERY_NOT_FOUND`**. A second call returns **409 `ALREADY_DELIVERED`**. It does **not** require the pipeline to be at `dispatch`. If the `delivery_confirmed` automation is on, the customer gets a push notification. |
| `POST /rider/deliveries/:delivery_id/issue` | Body `{ "issue_type": "customer_not_found\|wrong_address\|access_denied\|other", "notes": "≤300" }`. 201 `{ message, data: { rider_issue_id, delivery_id, issue_type, notes, reported_at } }`. Stored separately. **Not** in the admin issues queue. |

After delivered:

- The customer's delivery shows `status: "delivered"`.
- `/me` `delivered_count` +1 and `remaining_count` −1.
- The day appears in history and in pending-ratings.

A CUSTOMER token on rider routes returns 403.

---

## 22. Admin customers

Base `/admin/customers`.

| Endpoint | Roles | Notes |
|---|---|---|
| `GET /admin/customers?q=&status=&filter=&plan=&page=&per_page=` | ADMIN, OPS | Options below. Response `{ data: { customers: [camelCase: id, fullName, phone, subscriptionStatus, planName, ...], pagination: { page, perPage, total, totalPages } } }` |
| `GET /admin/customers/:id` | ADMIN, OPS | `{ data: { id, fullName, phone, email, isActive, createdAt, subscription {...skip/pause counts}, walletBalanceSar, primaryAddress, openIssueCount } }`. 404 if unknown. |
| `GET /admin/customers/:id/history` | ADMIN, OPS | `{ data: { subscriptions[], deliveries[], issues[] (with creditedAmountSar, rejectionReason) } }` |
| `POST /admin/customers/:id/deactivate` | **ADMIN only** | `{ message: "Customer deactivated successfully" }`. Sets `is_active=false`, after which OTP verify returns 401. A non-customer id returns 404. |
| `POST /admin/customers/:id/wallet/credit` | ADMIN, OPS | Body `{ "amountSar": 50, "note": "required" }`. `amountSar` is 1–500. Response `{ message: "Wallet credited successfully" }`. The wallet gets `Admin Credit`, and the customer gets a push notification. |

List filters:

- `status`: `active`, `paused`, `cancelled`, `expired` or `churned`.
- `filter`: `new` (the first subscription started today) or `churned` (expired 3+ days ago with no newer subscription).
- `plan`: `try_it`, `week`, `weekly`, `month` or `quarterly`.
- `per_page`: max 50.

---

## 23. Dashboard and revenue

| Endpoint | Roles | Response |
|---|---|---|
| `GET /admin/dashboard/stats` | ADMIN, OPS | `{ activeCustomers, openIssues, menuWeekStatus: { weekLabel, statusText } }` |
| `GET /admin/revenue/summary` | **ADMIN only** | `{ data: { mrr { amount_sar, change_pct, change_direction, comparison_label }, subscriber_counts { active, new_today, churned }, subscribers_by_plan[{ plan_id, plan_label, count }], key_metrics { avg_skip_rate, salad_meal_pct }, as_of } }` |
| `GET /admin/revenue/daily?month=2026-10` | **ADMIN only** | `month` is required (`YYYY-MM`). `{ data: { month, month_label, days[{ date, day_label, revenue_sar, is_today }], available_months[] } }` |

An OPS token on revenue returns 403.

---

## 24. Comms

All **ADMIN only**. Base `/admin/comms`.

| Endpoint | Notes |
|---|---|
| `GET /admin/comms/automations` | `{ data: { automations: [{ id, name, description, icon, is_enabled, channel: "push" }] } }`. The ids are `delivery_confirmed`, `eod_feedback`, `renewal_reminder`, `referral_reward` and `lapsed_reactivation`. |
| `PATCH /admin/comms/automations/:automationId` | Body `{ "is_enabled": false }`. An unknown id returns 404. |
| `GET /admin/comms/broadcast/segments` | `{ segments: [{ segment_id, label, recipient_count }] }`. The ids are `all_subscribers`, `active`, `paused` and `delivering_today`. |
| `GET /admin/comms/broadcast/segments/:segmentId/count` | `{ segment_id, recipient_count }` |
| `POST /admin/comms/broadcast` | Body `{ "segment_id": "active", "message": "1-200 chars" }`. Sends a push to each device in the segment. An unknown segment returns 404. An empty segment returns 400 `VALIDATION_ERROR` (`details.error: "SEGMENT_EMPTY"`). |
| `POST /admin/communications/broadcast` (legacy) | Body `{ "title": "...", "body": "..." }`. Sends to the SNS broadcast topic. |

Test: turn `delivery_confirmed` off, mark a delivery as delivered, and check that no push is sent (see the logs when `SKIP_SNS=true`).

---

## 25. Admin areas and buildings

Roles: **ADMIN, OPS**. Base `/admin/areas`.

| Endpoint | Notes |
|---|---|
| `GET /admin/areas?status=` | `{ summary, areas }`. The status is `active`, `coming_soon` or `paused`. |
| `POST /admin/areas` | Create an area (name, coverage, status). A duplicate name returns **409 `RESOURCE_ALREADY_EXISTS`**. |
| `PATCH /admin/areas/:area_id` | Body `{ name?, coverage?, status?, confirm_activation? }`. Changing to `active` from another status **without** `confirm_activation: true` returns **409 `ACTIVATION_REQUIRES_CONFIRMATION`**. |
| `GET /admin/areas/:area_id/buildings` | List |
| `POST /admin/areas/:area_id/buildings` | Body `{ "name": "Tower A" }` |
| `PATCH /admin/areas/:area_id/buildings/:building_id` | Rename |
| `DELETE /admin/areas/:area_id/buildings/:building_id` | Delete |
| `GET /admin/areas/out-of-zone-requests?page&per_page` | Customer out-of-zone submissions, grouped by area name with counts |

Test:

- An area in `coming_soon` or `paused` does **not** appear in customer `GET /delivery/areas`, and saving a location in it returns 400.
- Activating it with confirm makes it appear.

---

## 26. Admin plan pricing

| Endpoint | Roles | Notes |
|---|---|---|
| `GET /admin/plans` | ADMIN, OPS | `{ plans: [{ id, slug, name, price_sar, max_price_sar, discount_percent, meal_count, price_per_meal_sar, is_most_popular, is_active, updated_at }] }` |
| `PATCH /admin/plans/:plan_id` | **ADMIN only** | `plan_id` is a slug (`try_it`, `week`, `month`, `quarterly`) or a UUID. Body `{ "price_sar": 50, "max_price_sar": 100 }`. Both are optional, but at least one is required. `max_price_sar: null` removes the discount. |

Rules:

- `price_sar` is the **real price charged at checkout**.
- `max_price_sar` is display only (shown struck through).
- `price_sar > 0`.
- `max_price_sar >= price_sar`. Otherwise 400 `VALIDATION_ERROR`.
- An empty body returns 400.
- An unknown plan returns **404 `PLAN_NOT_FOUND`**.
- `price_per_meal_sar` is recomputed.

Response `{ message: "Plan pricing updated successfully", data: <plan view> }`.

Test: set week to price 50 and max 100. Then:

- `GET /plans`, `/plans/active` and `/home` show `price_sar:50`, `max_price_sar:100` and `discount_percent:50`.
- `POST /checkout/session` for week gives `base_price_sar: 50`.
- Set `max_price_sar: null`, and `discount_percent` becomes `null`.
- OPS calling PATCH gets 403.

---

## 27. ERP and internal jobs

ERP auth: header `x-api-key: <ERP_API_KEY>` or `Authorization: ApiKey <key>`. A wrong or missing key returns 401. Base `/integrations/erp`.

| Endpoint | Input | Output |
|---|---|---|
| `GET /integrations/erp/menus?offset=0&limit=50` | `limit` 1–100 | `data[{ code, name, description, status }]`, `pagination` |
| `GET /integrations/erp/customers?offset&limit` | | `data[{ code, name, mobile, statusCode }]` |
| `POST /integrations/erp/payments` | `{ dateFrom, dateTo }` (`DD/MM/YYYY` or `YYYY-MM-DD`), pagination | `data[{ customerCode, menuCode, totalCount, amount }]` |
| `POST /integrations/erp/daily-orders` | `{ date? }`, pagination | `meta { requestedDate, resolvedDeliveryDate, cutoffAt, frozen, cutoffApplied, timezone }`, `data[{ customerCode, menuCode, amount }]`. After `ERP_CUTOFF_TIME_KSA` (default 19:00) on the day before, `frozen` is true. |

Internal job: see 11.2.

---

## 28. End-to-end scenarios

Run these in order. Each step lists what to assert.

### Scenario A: set up data (admin)

1. `POST /auth/admin/login`, then save `admin_access_token`.
2. `POST /admin/areas` (status active, or patch it with `confirm_activation:true`), then `POST /admin/areas/:id/buildings`. Save `area_id` and `building_id`.
3. Create at least **2 executive and 2 salad** meals (`POST /admin/meals`), then `PATCH .../status {status:"active"}` on each.
4. `GET /admin/menu/weeks`, then save `week_id` (current and next).
5. For each Sun–Thu day of **both** weeks:
   - Assign executive dish 1 and salad dish 1 to the existing slots.
   - Add a second executive slot with dish 2 (this makes `can_change` true).
6. `POST /admin/menu/weeks/:week_id/publish` for both weeks. Expect `status: "published"`.
7. Optionally, `PATCH /admin/plans/week { price_sar, max_price_sar }`.

### Scenario B: new customer onboarding and purchase

1. `POST /auth/otp/send` (get `otpCode` from the response or the phone), then `POST /auth/otp/verify`. Assert `isNewUser:true` and `onboardingComplete:false`.
2. `POST /users/profile {fullName}`. `GET /users/profile` shows `onboardingComplete:true`.
3. `GET /delivery/areas`, `GET /delivery/areas/:id/buildings`, then `POST /users/delivery-location`.
4. `GET /plans/active`, then `GET /delivery/start-dates` (pick the first available date).
5. `POST /checkout/session {plan_id:"week", meal_type:"executive"}`. Assert `total_due_sar = base_price_sar − wallet_credit_sar`.
6. `GET /payment/methods`, then `POST /orders`. Assert 201, `status:"confirmed"` and `is_new_user:true`.
7. `GET /subscriptions/me`. Assert:
   - `status:"active"`, `plan_id:"week"`, `total_meal_days:5`.
   - `remaining_count:5`, `skip_pause_days_allowed:15`, `skip_pause_days_remaining:15`.
   - `end_date` is the 5th working day from start.
8. `GET /home`. Assert `subscription_status:"active"` and `days_remaining:5`.

### Scenario C: skip and undo

Use a delivery date whose cutoff has not passed.

1. `GET /subscriptions/me/deliveries`. Pick a day with `skip_available:true`.
2. `POST .../skip`. Assert `makeup_date` is after the old `end_date` and on a working day, and `skip_days_remaining` went down by 1.
3. `GET /me`: `end_date` = `makeup_date`, `skipped_count:1`, `remaining_count:4`, `total_meal_days:6`.
4. `GET /menu/week`: the day shows `card_state:"skipped"`, `skip_reason:"already_skipped"` and `undoable:true`.
5. `DELETE .../skip`. All values are restored.
6. Negative: skip a day after its cutoff (422), skip a Friday (404), skip twice (400).

### Scenario D: dish selection and stream switching

1. `GET .../meal-choice` for an upcoming date. Assert `can_change:true` and that the options list both streams.
2. `PUT .../meal-choice` with executive dish 2. Assert `selected_meal_id` and that `effective_meal` is dish 2.
3. `PUT` with a salad dish. Assert `meal_type:"salad"` for that day only.
4. Admin: labels for that date show the salad `meal_name` and `meal_type:"salad"`.
5. `PATCH /subscriptions/me/deliveries/:date/salad {enabled:false}`. The day goes back to executive and the pick is cleared.
6. `PATCH /subscriptions/me/meal-type {meal_type:"salad", apply_to:"all"}`. Check `effective_from` against the 18:00 KSA rule.

### Scenario E: pause, cancel pause, resume

1. `GET /me`: `pause_date_picker.visible:true`. Note `start_min` and `start_max`.
2. `POST /pause` with a range of 3 working days. Assert `pause_scheduled:true`, status `active`, and flex used +3.
3. `GET /deliveries`: the days in the range are `paused` with `skip_reason:"day_paused"`.
4. `POST /pause/cancel`. Flex is restored and the days are `scheduled` again.
5. Pause again with a start date where the cutoff is close. After the start cutoff, `GET /me` shows `status:"paused"` and `resume_date_picker` is present.
6. `POST /resume {resume_date: resume_date_picker.suggested_date}`. Assert `lapsed_days`, `new_end_date` and the flex refund.
7. Negative: a pause longer than the remaining flex (409 `PAUSE_LIMIT_EXCEEDED`), a second pause while one is booked (400), a pause on Fri–Sat only (400), resume before the pause starts (400).

### Scenario F: plan upgrade

1. With an active `week` subscription: `GET /subscriptions/me/plan-change-options` gives `allowed_plan_ids:["month","quarterly"]`.
2. `POST /checkout/session {plan_id:"month"}`. Assert `promotion:true`, `prior_plan_credit_sar` = the amount paid for week, and `total_due_sar = month price − credit − wallet`.
3. `POST /orders`. The `subscription_id` is the same. `GET /me` shows `plan_id:"month"`, `total_meal_days:22` and `skip_pause_days_allowed:66`, with `skip_pause_days_used` unchanged.
4. Negative: same plan (422 `SAME_PLAN_NOT_ALLOWED`), `week` from `month` (422 `PLAN_PROMOTION_NOT_ALLOWED`).

### Scenario G: delivery day operations

1. Admin `GET /admin/daily-ops?delivery_date=D`. Before the cutoff, `stage:"pending"`. After it, `stage:"locked"`. `meal_breakdown.total` = the number of scheduled meals.
2. `GET /admin/daily-ops/labels?delivery_date=D`. Check `customer_phone` and `meal_name`. Download the PDF and the XLSX.
3. Advance `locked → dispatch → delivered`. A wrong `from_stage` returns 409 `STAGE_MISMATCH`.
4. Rider: OTP login, then `GET /rider/deliveries?date=D`, then `POST .../delivered`. A second call returns 409.
5. Customer: `GET /me` shows `delivered_count` +1. `GET /subscriptions/me/pending-ratings` includes the day. `POST /meals/:meal_id/rating` returns 201. A second rating returns 409.
6. Customer: `POST /subscriptions/me/issues` for D.
7. Admin: `GET /admin/daily-ops/issues?delivery_date=D` shows the issue. `POST .../credit {credit_sar:25}`. Customer `GET /users/wallet` shows +25 and the transaction label `Issue credit`. A second credit returns 409 `ISSUE_ALREADY_RESOLVED`.

### Scenario H: referral

1. User A: `GET /referrals/me` and get `referral_code`.
2. New user B: `POST /referrals/validate {code, plan_id:"month"}` gives `valid:true` and `discount_pct:20`.
3. B: checkout, apply the promo, then order. Assert `promo_discount_sar = round(price × 0.2)`.
4. A: `GET /users/wallet` increases by `round(price × 0.1)`, and `GET /referrals/me` shows `friends_joined` +1.
5. Negative: B (who now has an order) validates another referral code and gets `NOT_NEW_USER`. Five invalid codes at checkout give 423 `PROMO_LOCKED`.

### Scenario I: cancel and expire

1. `POST /subscriptions/me/cancel`. The response has `deliveries_continue_until` = `end_date`.
2. Skip still works (in service). `plan-change-options` is blocked. `POST /checkout/session` returns 422.
3. `POST /internal/jobs/expire-subscriptions {as_of_date: <day after end_date>}` gives `expired_count ≥ 1`.
4. `GET /me` returns 404. `/home` shows `subscription_status:"expired"`. Checkout works again.

### Scenario J: menu manager rules

1. Assign the same dish to executive and salad on the same date: 409 `MEAL_ALREADY_ON_DAY`.
2. Assign a draft meal: 422 `MEAL_IS_DRAFT`.
3. Add a 4th executive slot: 409 `DAY_MEAL_TYPE_LIMIT`.
4. Publish a week with a day missing salad: 409 `WEEK_NOT_COMPLETE` with a message naming the day.
5. On a published week, clear the only salad dish of a day: 409 `CANNOT_CLEAR_LAST_STREAM_MEAL`.
6. Clear a default while other dishes exist: 409 `CANNOT_CLEAR_DEFAULT`.
7. Edit a published week (add a dish). The customer `GET /menu/week` shows it immediately.
8. Unpublish. The customer no longer sees that week.
9. Deactivate an active meal used on a published week without confirm: 409 `MEAL_IN_PUBLISHED_WEEK`. With `confirm_published_edit:true` it succeeds.

---

## 29. Known quirks

Do not report these as bugs. Report them only if the behaviour is **different** from what is written here.

1. `onboardingComplete` means "has a primary location" in `/auth/otp/verify`, but "name set" in `/users/profile`.
2. `GET /checkout/session/:id` returns `plan_id` as a UUID, while the POST returns the slug.
3. `GET /checkout/session/:id` and `GET /orders/:id` do not check ownership.
4. A cancelled subscription blocks new checkout until the expiry job marks it `expired`.
5. Applying a promo on an **upgrade** session recomputes the total as `base − wallet − promo` and ignores `prior_plan_credit_sar`. Avoid combining them, or flag it if you test it.
6. `/menu/week?meal_type=` is ignored, and both streams are always returned.
7. The rider list's default date is UTC, so always pass `date`. The rider list shows all deliveries for the date, not only that rider's.
8. Marking delivered does not require the pipeline stage to be `dispatch`.
9. Customer issues have no duplicate or cutoff checks. Rider issues are not in the admin queue.
10. `days_remaining` is a meal count, not a calendar count.
11. OTP expiry is always 120s, whatever `OTP_EXPIRY_SECONDS` says. Verify has no attempt lockout.
12. Delete account for ADMIN or OPS returns 401 (not 403).
13. Saved payment methods do not show in `GET /payment/methods` (a hardcoded list).
14. Key casing is mixed between endpoints (camelCase on auth, profile, locations, issues, history, ratings and the customers list).
15. The OTP send API returns success even if Twilio or SNS delivery failed. Check the server logs.

---

## 30. Error code reference

| errorCode | HTTP | Typical trigger |
|---|---|---|
| (Nest default, no errorCode) | 400 | DTO validation, unknown fields |
| (Nest default) | 401 / 403 | Missing JWT / wrong role |
| `VALIDATION_ERROR` | 400 | Business rule failures (pause/resume rules, cancel twice, meal not on menu, amount limits, etc.) |
| `OTP_INVALID` / `OTP_EXPIRED` | 400 | OTP verify |
| `AUTHENTICATION_ERROR` | 401 | Login, refresh, admin phone on OTP, deactivated user |
| `PAYMENT_FAILED` | 402 | Gateway decline |
| `UNAUTHORIZED` | 403 | Another user's delivery location |
| `RESOURCE_NOT_FOUND` | 404 | No subscription, day, meal, week, issue, customer, plan |
| `PLAN_NOT_FOUND` | 404 | Admin plan pricing |
| `DELIVERY_NOT_FOUND` | 404 | Rider |
| `SKIP_LIMIT_REACHED` | 409 | No flex days left |
| `PAUSE_LIMIT_EXCEEDED` | 409 | Pause longer than flex remaining |
| `CHECKOUT_ALREADY_COMPLETED` | 409 | Paying the same session twice |
| `RATING_ALREADY_SUBMITTED` | 409 | Second rating |
| `STAGE_MISMATCH` | 409 | Pipeline advance |
| `ISSUE_ALREADY_RESOLVED` | 409 | Second credit/reject |
| `ALREADY_DELIVERED` | 409 | Rider |
| `ACTIVATION_REQUIRES_CONFIRMATION` | 409 | Area activation |
| `RESOURCE_ALREADY_EXISTS` | 409 | Duplicate meal or area name |
| `MEAL_ALREADY_ON_DAY`, `DAY_MEAL_TYPE_LIMIT`, `CANNOT_CLEAR_DEFAULT`, `CANNOT_CLEAR_LAST_STREAM_MEAL`, `WEEK_NOT_COMPLETE`, `WEEK_ALREADY_PUBLISHED`, `MEAL_IN_PUBLISHED_WEEK` | 409 | Menu manager and meal library |
| `SESSION_EXPIRED` | 410 | Checkout session older than 10 min, or replaced |
| `PAST_CUTOFF` | 422 | Skip, undo, meal choice or salad toggle after 18:00 KSA the day before |
| `SLOT_NOT_EDITABLE`, `MEAL_IS_DRAFT` | 422 | Menu manager |
| `INVALID_CODE`, `PLAN_MISMATCH`, `NOT_NEW_USER` | 422 | Promo apply |
| `SAME_PLAN_NOT_ALLOWED`, `PLAN_PROMOTION_NOT_ALLOWED`, `ACTIVE_SUBSCRIPTION_CHECKOUT_BLOCKED` | 422 | Checkout with an existing subscription |
| `PROMO_LOCKED` | 423 | 5 failed promo attempts |
| `RATE_LIMIT_EXCEEDED` | 429 | OTP send |
| `SUBMISSION_LIMIT` | 429 | 4th out-of-zone request |
| `INTERNAL_ERROR` | 500 | Unexpected. Always report it. |

---

## 31. Endpoint checklist

Tick each one as tested. Endpoints marked ⚠ are **missing from the Admin Postman collection**. Add requests for them.

**Mobile app (customer)**

- Auth: `POST /auth/otp/send`, `POST /auth/otp/verify`, `POST /auth/refresh`, `POST /auth/logout`
- Users:
  - `GET/POST /users/profile`, `PATCH /users/preferences/language`
  - `GET/POST /users/delivery-location`, `PATCH/DELETE /users/delivery-location/:id`, `PATCH /users/delivery-location/:id/primary`
  - `POST /users/me/delete-account`
  - `GET /users/wallet`, `GET /users/wallet/transactions`, `GET /users/billing/transactions`, `GET /users/billing/payments`, `GET /users/billing/referrals`, `GET /users/referral`
- Delivery: `GET /delivery/areas`, `GET /delivery/areas/search`, `POST /delivery/areas/out-of-zone`, `GET /delivery/areas/:area_id/buildings`, `GET /delivery/start-dates`
- Plans: `GET /plans`, `GET /plans/active`
- Checkout: `POST /checkout/session`, `GET /checkout/session/:id`, `POST/DELETE /checkout/session/:id/promo`
- Payment: `GET/POST /payment/methods`, `DELETE /payment/methods/:id`
- Orders: `POST /orders`, `GET /orders/:order_id`
- Subscriptions:
  - `GET /subscriptions/me`, `GET /subscriptions/me/plan-change-options`, `GET /subscriptions/me/deliveries`
  - `POST/DELETE /subscriptions/me/deliveries/:date/skip`
  - `GET/PUT /subscriptions/me/deliveries/:date/meal-choice`, `PATCH /subscriptions/me/deliveries/:date/salad`
  - `POST /subscriptions/me/pause`, `POST /subscriptions/me/pause/cancel`, `POST /subscriptions/me/resume`, `POST /subscriptions/me/cancel`, `POST /subscriptions/me/resubscribe`
  - `PATCH /subscriptions/me/meal-type`
  - `GET /subscriptions/me/history`, `GET /subscriptions/me/pending-ratings`, `GET /subscriptions/me/ratings`
  - `POST /subscriptions/me/issues`
- Home: `GET /home`, `GET /home/this-week`
- Menu: `GET /menu`, `GET /menu/week`, `GET /meals/:meal_id`, `POST /meals/:meal_id/rating`
- Referrals: `GET /referrals/me`, `POST /referrals/validate`
- Misc: `GET /config/public-holidays`, `POST /devices/register`, `GET /health`

**Rider (DRIVER)**

- `GET /rider/deliveries`, `POST /rider/deliveries/:id/delivered`, `POST /rider/deliveries/:id/issue`

**Admin portal**

- Auth: `POST /auth/admin/login`, `POST /auth/refresh`, `POST /auth/admin/logout`
- Dashboard: ⚠ `GET /admin/dashboard/stats`
- Customers: `GET /admin/customers`, `GET /admin/customers/:id`, `GET /admin/customers/:id/history`, `POST /admin/customers/:id/deactivate`, `POST /admin/customers/:id/wallet/credit`
- Meals: `GET /admin/meals`, `GET /admin/meals/:id`, `POST /admin/meals`, `PATCH /admin/meals/:id`, `PATCH /admin/meals/:id/status`, `GET /admin/meals/:id/photo-upload-url`, ⚠ `DELETE /admin/meals/:id`, `POST /admin/meals/import`
- Menu:
  - `GET /admin/menu/weeks`, `GET /admin/menu/weeks/:week_id`
  - `POST /admin/menu/weeks/:week_id/days/:date/slots`, `PATCH /admin/menu/weeks/:week_id/days/:date/default`
  - `POST /admin/menu/weeks/:week_id/slots/:slot_id/assign`, `DELETE /admin/menu/weeks/:week_id/slots/:slot_id`
  - `POST /admin/menu/weeks/:week_id/publish`, ⚠ `POST /admin/menu/weeks/:week_id/unpublish`
- Daily ops:
  - `GET /admin/daily-ops`, `POST /admin/daily-ops/pipeline/advance`
  - `GET /admin/daily-ops/issues`, `POST /admin/daily-ops/issues/:id/credit`, `POST /admin/daily-ops/issues/:id/reject`
  - `GET /admin/daily-ops/labels`, `GET /admin/daily-ops/labels/download`, `GET /admin/daily-ops/export`
- Ops: `GET /ops/daily-ops`, `POST /ops/daily-ops/pipeline/advance`, `GET /ops/daily-ops/labels`, `GET /ops/daily-ops/labels/download`
- Revenue: `GET /admin/revenue/summary`, `GET /admin/revenue/daily`
- Comms: `GET /admin/comms/automations`, `PATCH /admin/comms/automations/:id`, ⚠ `GET /admin/comms/broadcast/segments`, ⚠ `GET /admin/comms/broadcast/segments/:id/count`, `POST /admin/comms/broadcast`, `POST /admin/communications/broadcast`
- Areas:
  - `GET/POST /admin/areas`, `PATCH /admin/areas/:id`
  - `GET/POST /admin/areas/:id/buildings`, `PATCH/DELETE /admin/areas/:id/buildings/:building_id`
  - `GET /admin/areas/out-of-zone-requests`
- Plans: ⚠ `GET /admin/plans`, ⚠ `PATCH /admin/plans/:plan_id`
- ERP: `GET /integrations/erp/menus`, `GET /integrations/erp/customers`, `POST /integrations/erp/payments`, `POST /integrations/erp/daily-orders`
- Internal: `POST /internal/jobs/expire-subscriptions`

**Role checks to run:**

- A CUSTOMER token on any `/admin/*` route returns 403.
- OPS on `/admin/daily-ops` GET, on issues, on revenue, on comms, on customer deactivate and on plan PATCH returns 403.
- ADMIN on `/ops/daily-ops` returns 403.
- A non-DRIVER on `/rider/*` returns 403.
- No token anywhere (except public auth, health, ERP and internal) returns 401.
