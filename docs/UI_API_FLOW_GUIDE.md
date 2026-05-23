# Zaadi Kitchen — Unified API Flow Guide
> **For:** UI / Mobile Developers  
> **Version:** 1.0 (generated 2026-05-22)  
> **Base URL:** `http://localhost:3000/api/v1` (dev) · `https://api.zaadiKitchen.com/api/v1` (prod)  
> **Auth:** `Authorization: Bearer <access_token>` on all protected endpoints  
> **Content-Type:** `application/json`

---

## Table of Contents

1. [Conventions](#1-conventions)
2. [Session & Auth — Customer App](#2-session--auth--customer-app)
3. [Onboarding Flow](#3-onboarding-flow)
4. [Plans & Checkout Flow](#4-plans--checkout-flow)
5. [Subscription Management](#5-subscription-management)
6. [Wallet & Referrals](#6-wallet--referrals)
7. [Home Screen Module](#7-home-screen-module)
8. [Menu & Meal Detail Module](#8-menu--meal-detail-module)
9. [Admin / Ops Portal](#9-admin--ops-portal)
10. [Complete Endpoint Index](#10-complete-endpoint-index)
11. [Misalignments & Deviations from Spec](#11-misalignments--deviations-from-spec)

---

## 1. Conventions

### Response Envelope

Every response follows this shape:

```json
{
  "message": "Human-readable result",
  "data": {}
}
```

Errors follow:

```json
{
  "success": false,
  "error": {
    "code": "ERROR_CODE",
    "message": "Description"
  }
}
```

### HTTP Status Codes

| Code | Meaning |
|---|---|
| `200` | OK |
| `201` | Created |
| `400` | Validation failed / business rule violation |
| `401` | Missing or invalid token |
| `403` | Authenticated but not authorized (wrong role) |
| `404` | Resource not found |
| `429` | Rate limit hit |
| `500` | Server error |

### Roles

| Role | Login Method | App |
|---|---|---|
| `CUSTOMER` | OTP (phone) | Mobile App |
| `DRIVER` | OTP (phone) | Rider App |
| `ADMIN` | Email + Password | Admin Portal |
| `OPS` | Email + Password | Ops Portal |

### Phone Format
All phone numbers must be **E.164** format: `+966512345678`

---

## 2. Session & Auth — Customer App

### Forever Session
The mobile app receives a **100-year JWT access token** on first login. There is **no need to call the refresh endpoint** for normal use. The token is only invalidated on explicit logout.

Store the `access_token` securely (iOS Keychain / Android Keystore).

---

### 2.1 Send OTP
```
POST /auth/otp/send
No auth required
```

**Request:**
```json
{
  "phone": "+966512345678",
  "channel": "whatsapp"
}
```
`channel`: `"whatsapp"` | `"sms"`

**Response `200`:**
```json
{
  "message": "OTP sent successfully",
  "data": {
    "otpId": "otp_01HXYZ1234ABCD",
    "expiresIn": 120,
    "resendAvailableAt": "2024-01-15T09:51:00Z"
  }
}
```

**Errors:**

| Code | Meaning |
|---|---|
| `INVALID_PHONE` | Not valid E.164 |
| `UNSUPPORTED_COUNTRY` | Only +966 supported |
| `OTP_RATE_LIMIT` | 3 requests per 10 min → 30 min lock |

---

### 2.2 Verify OTP
```
POST /auth/otp/verify
No auth required
```

**Request:**
```json
{
  "phone": "+966512345678",
  "code": "4821"
}
```

> ⚠️ **Note:** The `otp_id` field from the spec is **not required** in the request body — the backend looks up the active session by phone number.

**Response `200`:**
```json
{
  "message": "Logged in successfully",
  "data": {
    "isNewUser": false,
    "accessToken": "eyJhbGci...",
    "refreshToken": "rft_01HXYZ9999ABCD",
    "tokenType": "Bearer",
    "accessExpiresIn": 3153600000,
    "refreshExpiresIn": 2592000,
    "user": {
      "id": "usr_01HXYZ5678",
      "phone": "+966512345678",
      "fullName": "Ahmed Al-Rashidi",
      "email": null,
      "role": "CUSTOMER",
      "languagePreference": "EN",
      "isActive": true,
      "onboardingComplete": false
    }
  }
}
```

**Routing logic based on response:**

```
isNewUser = true  → Name Entry screen (POST /users/profile)
isNewUser = false + onboardingComplete = false → Area Selection screen
isNewUser = false + onboardingComplete = true  → Home screen
```

`accessExpiresIn: 3153600000` = 100 years in seconds. Treat this token as permanent. Do not call refresh automatically.

**Errors:**

| Code | Meaning |
|---|---|
| `OTP_INVALID` | Wrong code. Includes `attemptsRemaining` |
| `OTP_EXPIRED` | Code expired — re-request |
| `OTP_ALREADY_USED` | Already verified |
| `OTP_ATTEMPTS_EXCEEDED` | 5 wrong attempts — re-request OTP |
| `AUTHENTICATION_ERROR` | Admin/Ops cannot log in via OTP |

---

### 2.3 Refresh Token *(Mobile rarely needs this)*
```
POST /auth/refresh
No auth required
```

**Request:**
```json
{ "refreshToken": "rft_01HXYZ9999ABCD" }
```

**Response `200`:**
```json
{
  "data": { "accessToken": "eyJhbGci..." }
}
```

> Since the mobile access token lasts 100 years, this endpoint is only needed in edge cases (e.g. forced re-auth after security event). The refresh token itself expires in 30 days.

---

### 2.4 Logout
```
POST /auth/logout
🔒 Requires auth
```

**Request:**
```json
{ "refreshToken": "rft_01HXYZ9999ABCD" }
```

**Response `200`:**
```json
{ "message": "Logged out successfully" }
```

Revokes the refresh token. The access token remains cryptographically valid (100-year exp) but is effectively dead once the app discards it locally.

---

### 9.0 Admin Login *(Admin Portal only)*
```
POST /auth/admin/login
No auth required
```

**Request:**
```json
{
  "email": "admin@zaadiKitchen.com",
  "password": "SecurePass123"
}
```

**Response `200`:**
```json
{
  "data": {
    "accessToken": "eyJhbGci...",
    "refreshToken": "rft_admin_xxx",
    "user": { "id": "...", "email": "...", "role": "ADMIN" }
  }
}
```

Admin tokens use the standard `JWT_ACCESS_EXPIRATION` (default 15 min) and must refresh using `POST /auth/refresh`.

---

## 3. Onboarding Flow

**Full new user sequence:**
```
POST /auth/otp/verify       → isNewUser: true
  ↓
POST /users/profile          → Set name
  ↓
GET  /delivery/areas         → Pick area
GET  /delivery/areas/search  → Search areas (as user types)
  ↓
GET  /delivery/areas/:id/buildings → Pick building
  ↓
POST /users/delivery-location → Complete onboarding (onboardingComplete: true)
  ↓
GET  /plans/active            → Plan selection
```

---

### 3.1 Create / Update Profile
```
POST /users/profile
🔒 Requires auth
```

**Request:**
```json
{
  "name": "Ahmed Al-Rashidi",
  "email": "ahmed@example.com"
}
```
`email` is optional. `name` is required for new users.

**Response `200`:**
```json
{
  "data": {
    "id": "usr_01HXYZ5678",
    "phone": "+966512345678",
    "fullName": "Ahmed Al-Rashidi",
    "email": "ahmed@example.com",
    "languagePreference": "EN",
    "isActive": true
  }
}
```

**Errors:** `NAME_REQUIRED` | `INVALID_EMAIL` | `NAME_TOO_SHORT`

---

### 3.2 Get Profile
```
GET /users/profile
🔒 Requires auth
```

Same response shape as above.

---

### 3.3 Update Language Preference
```
PATCH /users/preferences/language
🔒 Requires auth
```

**Request:**
```json
{ "language": "ar" }
```
Values: `"en"` | `"ar"`

**Response `200`:**
```json
{ "data": { "language": "ar" } }
```

---

### 3.4 List Active Delivery Areas
```
GET /delivery/areas
🔒 Requires auth
```

Optional query param: `?query=nakheel` (partial name filter)

**Response `200`:**
```json
{
  "data": {
    "areas": [
      { "id": "area_01ALNAKHEEL", "name": "Al Nakheel", "description": "...", "status": "active" }
    ]
  }
}
```

Only `"active"` areas are returned. `"coming_soon"` areas are excluded.

---

### 3.5 Search Delivery Areas
```
GET /delivery/areas/search?q=nakheel
🔒 Requires auth
```

**Response `200`:**
```json
{
  "data": {
    "areas": [...],
    "query": "nakheel",
    "isOutOfZone": false
  }
}
```

`isOutOfZone: true` when `areas` is empty — show the out-of-zone UI.

---

### 3.6 Submit Out-of-Zone Interest
```
POST /delivery/areas/out-of-zone
🔒 Requires auth
```

**Request:**
```json
{ "areaName": "Al Zahra" }
```

Max 3 submissions per session.

---

### 3.7 List Buildings for Area
```
GET /delivery/areas/:area_id/buildings
🔒 Requires auth
```

Optional: `?q=tower` for filtering.

**Response `200`:**
```json
{
  "data": {
    "areaId": "area_01ALNAKHEEL",
    "areaName": "Al Nakheel",
    "buildings": [
      { "id": "bld_01TOWER1", "name": "Al Nakheel Tower, King Fahad Rd" }
    ]
  }
}
```

---

### 3.8 Save Delivery Location
```
POST /users/delivery-location
🔒 Requires auth
```

**Two valid request shapes:**

**A — Building selected from list:**
```json
{
  "areaId": "area_01ALNAKHEEL",
  "buildingId": "bld_01TOWER1",
  "floor": "Floor 7",
  "deskArea": "Desk B12",
  "deliveryPreference": "hand_to_me",
  "riderNotes": "Call me on arrival"
}
```

**B — Custom building name typed by user:**
```json
{
  "areaId": "area_01ALNAKHEEL",
  "building": "My Custom Building Name",
  "floor": "Floor 3",
  "deliveryPreference": "reception"
}
```

> **Rules:**
> - `buildingId` OR `building` must be provided — not both required.
> - If `buildingId` is provided, building name is resolved from DB (canonical). Any client-sent `building` string is ignored.
> - `deliveryPreference`: `"hand_to_me"` (default) | `"reception"`

**Response `201`:**
```json
{
  "message": "Delivery location saved successfully",
  "data": {
    "id": "loc_01HXYZ9999",
    "userId": "usr_01HXYZ5678",
    "areaId": "area_01ALNAKHEEL",
    "areaName": "Al Nakheel",
    "buildingId": "bld_01TOWER1",
    "buildingName": "Al Nakheel Tower, King Fahad Rd",
    "floor": "Floor 7",
    "deskArea": "Desk B12",
    "deliveryPreference": "hand_to_me",
    "riderNotes": "Call me on arrival",
    "isPrimary": true,
    "onboardingComplete": true,
    "createdAt": "2024-01-15T09:42:00Z"
  }
}
```

`onboardingComplete: true` → route user to Plan Selection.

When a user adds a new address, the **new one becomes primary** and the old one's `isPrimary` is set to `false` automatically.

**Errors:** `AREA_REQUIRED` | `AREA_INVALID` | `BUILDING_REQUIRED` | `BUILDING_NOT_FOUND` | `BUILDING_AREA_MISMATCH`

---

### 3.9 Get Saved Delivery Locations
```
GET /users/delivery-location
🔒 Requires auth
```

Returns **all** saved addresses. Primary address is first in the array.

**Response `200`:**
```json
{
  "message": "Delivery locations retrieved successfully",
  "data": [
    {
      "id": "loc_01HXYZ9999",
      "areaId": "area_01ALNAKHEEL",
      "buildingName": "Al Nakheel Tower",
      "floor": "Floor 7",
      "deskArea": "Desk B12",
      "deliveryPreference": "hand_to_me",
      "isPrimary": true
    },
    {
      "id": "loc_01HXYZ8888",
      "areaId": "area_01OLAYA",
      "buildingName": "Olaya Tower",
      "floor": null,
      "isPrimary": false
    }
  ]
}
```

> Returns empty array `[]` when no location is saved (user mid-onboarding). No 404 is thrown.

---

## 4. Plans & Checkout Flow

**Screen sequence:**
```
GET  /plans/active                         → Plan Selection screen
GET  /config/public-holidays               → Fetch holidays (needed for start date calc)
GET  /delivery/start-dates                 → Available delivery start dates
POST /checkout/session                     → Create checkout session
  ↓
GET  /checkout/session/:id                 → Poll session state
POST /checkout/session/:id/promo           → Apply promo / referral code
DELETE /checkout/session/:id/promo         → Remove promo
  ↓
GET  /payment/methods                      → List saved cards
POST /payment/methods                      → Add card (Mada/Visa/etc.)
  ↓
POST /orders                               → Place order (charge card)
GET  /orders/:order_id                     → Confirm order status
```

---

### 4.1 Get Public Holidays
```
GET /config/public-holidays
🔒 Requires auth
```

Optional: `?year=2025`

**Response `200`:**
```json
{
  "data": {
    "holidays": [
      { "date": "2025-09-23", "name": "National Day", "nameAr": "اليوم الوطني" }
    ]
  }
}
```

---

### 4.2 Get Active Plans
```
GET /plans/active
🔒 Requires auth
```

**Response `200`:**
```json
{
  "data": {
    "plans": [
      {
        "id": "plan-uuid",
        "name": "Month Plan",
        "slug": "month",
        "priceSar": 500,
        "mealCount": 22,
        "pricePerMealSar": 22.73,
        "isMostPopular": true,
        "isActive": true
      }
    ]
  }
}
```

---

### 4.3 Get Delivery Start Dates
```
GET /delivery/start-dates
🔒 Requires auth
```

Returns the next N available delivery start dates, excluding weekends and public holidays.

**Response `200`:**
```json
{
  "data": {
    "startDates": ["2025-06-02", "2025-06-09", "2025-06-16"]
  }
}
```

---

### 4.4 Validate Referral Code *(optional, before checkout)*
```
POST /referrals/validate
🔒 Requires auth
```

**Request:**
```json
{ "code": "AHMED10" }
```

**Response `200`:**
```json
{
  "data": {
    "code": "AHMED10",
    "discountSar": 100,
    "type": "referral"
  }
}
```

**Errors:** `INVALID_CODE` | `CODE_ALREADY_USED` | `NOT_NEW_USER`

---

### 4.5 Create Checkout Session
```
POST /checkout/session
🔒 Requires auth
```

**Request:**
```json
{
  "planId": "plan-uuid",
  "mealType": "executive",
  "startDate": "2025-06-02"
}
```

`mealType`: `"executive"` | `"standard"` *(check your plan config for available types)*

**Response `201`:**
```json
{
  "data": {
    "sessionId": "sess-uuid-1",
    "planId": "plan-uuid",
    "mealType": "executive",
    "basePriceSar": 500,
    "walletCreditSar": 50,
    "promoDiscountSar": 0,
    "totalDueSar": 450,
    "promoCode": null,
    "status": "active",
    "expiresAt": "2025-06-02T10:10:00Z"
  }
}
```

Session expires in 10 minutes. Create a new one if expired.

---

### 4.6 Get Checkout Session
```
GET /checkout/session/:session_id
🔒 Requires auth
```

Same response shape as above. Poll this to get updated totals after applying/removing promo.

---

### 4.7 Apply Promo Code
```
POST /checkout/session/:session_id/promo
🔒 Requires auth
```

**Request:**
```json
{ "code": "AHMED10" }
```

**Response `200`:**
```json
{
  "data": {
    "sessionId": "sess-uuid-1",
    "promoCode": "AHMED10",
    "promoDiscountSar": 100,
    "totalDueSar": 400
  }
}
```

**Errors:** `INVALID_CODE` | `PROMO_LOCKED` (5 failed attempts locks promo field) | `SESSION_EXPIRED`

---

### 4.8 Remove Promo Code
```
DELETE /checkout/session/:session_id/promo
🔒 Requires auth
```

**Response `200`:** Updated session with `promoCode: null`, `promoDiscountSar: 0`.

---

### 4.9 Get Payment Methods
```
GET /payment/methods
🔒 Requires auth
```

**Response `200`:**
```json
{
  "data": {
    "methods": [
      {
        "id": "pm-uuid-1",
        "type": "mada",
        "label": "Mada ····4242",
        "isDefault": true,
        "isLastUsed": true
      }
    ]
  }
}
```

---

### 4.10 Add Payment Method
```
POST /payment/methods
🔒 Requires auth
```

**Request:**
```json
{
  "type": "mada",
  "token": "tok_xxxx",
  "label": "Mada ····4242"
}
```

`type`: `"mada"` | `"visa"` | `"mastercard"` | `"apple_pay"`

---

### 4.11 Delete Payment Method
```
DELETE /payment/methods/:method_id
🔒 Requires auth
```

**Response `200`:** `{ "message": "Payment method removed" }`

---

### 4.12 Place Order
```
POST /orders
🔒 Requires auth
```

**Request:**
```json
{
  "checkoutSessionId": "sess-uuid-1",
  "paymentMethodId": "pm-uuid-1"
}
```

**Response `201`:**
```json
{
  "data": {
    "orderId": "order-uuid-1",
    "status": "confirmed",
    "planName": "Month Plan",
    "mealType": "executive",
    "mealCount": 22,
    "startDate": "2025-06-02",
    "totalPaidSar": 450,
    "promoCode": "AHMED10",
    "discountLabel": "Referral - AHMED10",
    "gatewayPaymentId": "mock_pay_123",
    "isNewUser": true
  }
}
```

`isNewUser: true` → show welcome / first-order bonus UI.

**Errors:** `SESSION_EXPIRED` | `PAYMENT_FAILED` | `PLAN_MISMATCH`

---

### 4.13 Get Order
```
GET /orders/:order_id
🔒 Requires auth
```

Same shape as the order create response. Use for order confirmation screen.

---

## 5. Subscription Management

---

### 5.1 Get My Subscription
```
GET /subscriptions/me
🔒 Requires auth (CUSTOMER)
```

**Response `200`:**
```json
{
  "data": {
    "id": "sub-uuid-1",
    "planName": "Month Plan",
    "mealType": "executive",
    "status": "active",
    "startDate": "2025-06-02",
    "endDate": "2025-07-01",
    "totalMealDays": 22,
    "deliveredCount": 5,
    "skippedCount": 1,
    "skipDaysAllowed": 66,
    "skipDaysUsed": 1,
    "pauseDaysAllowed": 66,
    "pauseDaysUsed": 0,
    "pausedFrom": null,
    "pausedUntil": null
  }
}
```

`status`: `"active"` | `"paused"` | `"cancelled"` | `"completed"`

---

### 5.2 Get Delivery Schedule
```
GET /subscriptions/me/deliveries
🔒 Requires auth
```

Optional: `?month=2025-06`

**Response `200`:**
```json
{
  "data": {
    "deliveries": [
      {
        "id": "dd-uuid-1",
        "date": "2025-06-02",
        "status": "scheduled",
        "mealType": "executive",
        "mealName": "Grilled Chicken"
      },
      {
        "date": "2025-06-03",
        "status": "skipped"
      }
    ]
  }
}
```

`status`: `"scheduled"` | `"skipped"` | `"delivered"` | `"paused"`

---

### 5.3 Skip a Delivery Day
```
POST /subscriptions/me/deliveries/:delivery_date/skip
🔒 Requires auth
```

`:delivery_date` format: `2025-06-05`

**Response `200`:** `{ "message": "Delivery skipped" }`

**Errors:** `PAST_CUTOFF` (past cutoff time for that day) | `SKIP_LIMIT_REACHED` | `ALREADY_SKIPPED`

---

### 5.4 Undo Skip
```
DELETE /subscriptions/me/deliveries/:delivery_date/skip
🔒 Requires auth
```

**Response `200`:** `{ "message": "Skip reversed" }`

---

### 5.5 Pause Subscription
```
POST /subscriptions/me/pause
🔒 Requires auth
```

**Request:**
```json
{
  "pauseFrom": "2025-06-10",
  "pauseUntil": "2025-06-20"
}
```

**Response `200`:**
```json
{
  "data": {
    "status": "paused",
    "pausedFrom": "2025-06-10",
    "pausedUntil": "2025-06-20",
    "pauseDaysUsed": 10,
    "pauseDaysAllowed": 66
  }
}
```

**Errors:** `PAUSE_LIMIT_EXCEEDED` | `PAST_CUTOFF` | `ALREADY_PAUSED`

---

### 5.6 Resume Subscription
```
POST /subscriptions/me/resume
🔒 Requires auth
```

No request body.

**Response `200`:** `{ "data": { "status": "active", "resumedFrom": "2025-06-15" } }`

---

### 5.7 Cancel Subscription
```
POST /subscriptions/me/cancel
🔒 Requires auth
```

No request body.

**Response `200`:** `{ "data": { "status": "cancelled" } }`

---

### 5.8 Switch Meal Type
```
PATCH /subscriptions/me/meal-type
🔒 Requires auth
```

**Request:**
```json
{ "mealType": "standard" }
```

**Response `200`:** `{ "data": { "mealType": "standard" } }`

**Error:** `PLAN_MISMATCH` (chosen meal type not available in current plan)

---

## 6. Wallet & Referrals

---

### 6.1 Get Wallet Balance
```
GET /users/wallet
🔒 Requires auth
```

**Response `200`:**
```json
{
  "data": {
    "balanceSar": 150.00
  }
}
```

---

### 6.2 Get Wallet Transactions
```
GET /users/wallet/transactions
🔒 Requires auth
```

Optional: `?page=1&perPage=20`

**Response `200`:**
```json
{
  "data": {
    "transactions": [
      {
        "id": "txn-uuid-1",
        "type": "credit",
        "amountSar": 100,
        "description": "Referral reward — FRIEND10",
        "createdAt": "2025-06-01T10:00:00Z"
      }
    ]
  }
}
```

---

### 6.3 Get My Referral Info
```
GET /users/referral
🔒 Requires auth
```

**Response `200`:**
```json
{
  "data": {
    "referralCode": "AHMED10",
    "shareLink": "https://app.zaadiKitchen.com/ref/AHMED10",
    "totalReferrals": 3,
    "pendingRewards": 1,
    "earnedSar": 300
  }
}
```

---

### 6.4 Validate Referral Code *(also listed under checkout)*
```
POST /referrals/validate
🔒 Requires auth
```
See [4.4](#44-validate-referral-code-optional-before-checkout).

---

## 7. Home Screen Module

**Flow summary:**
```
App open
  → GET /home                    (header banner, subscription state, plans)
  → GET /home/this-week          (meal strip cards for this week)
  → tap meal card → GET /meals/:meal_id   (bottom sheet)
```

---

### 7.1 GET /home
```
GET /home
🔒 Requires auth
```

Composite endpoint. Returns everything needed to render the Home screen header for any subscription state. The client does not need to know the user's state before calling — `subscription_status` drives which layout variant to render.

**`subscription_status` values and banner themes:**

| `subscription_status` | Banner theme | Primary CTA |
|---|---|---|
| `none` | `red` | "Start for SAR 28 →" |
| `active` | `black` | Location "Edit" |
| `expired` | `red` | "Renew →" |
| `paused` | `black` | "Resume →" |
| `cancelled` | `black` | "Renew →" |

**Response `200 OK` — Unsubscribed:**
```json
{
  "user": { "first_name": "Ahmed", "language": "EN" },
  "subscription_status": "none",
  "subscription": null,
  "delivery_location": null,
  "wallet_balance_sar": null,
  "banner": {
    "theme": "red",
    "headline": "Fresh lunch, delivered daily.",
    "subtext": "From our kitchen to your desk. Every day.",
    "primary_cta": { "label": "Start for SAR 28 →", "action": "navigate_plan_selection" },
    "secondary_cta": { "label": "Browse menu →", "action": "navigate_menu_tab" }
  },
  "quick_actions": null,
  "plans": [
    { "id": "try_it", "name": "Try It", "price_sar": 28, "meal_count": 1, "price_per_meal_sar": 28.00, "is_most_popular": false, "cta_label": "Subscribe →" }
  ]
}
```

**Response `200 OK` — Active subscriber:**
```json
{
  "user": { "first_name": "Ahmed", "language": "EN" },
  "subscription_status": "active",
  "subscription": {
    "subscription_id": "sub_01JM3XYZ",
    "plan_name": "Month Plan",
    "meal_type": "executive",
    "days_remaining": 17,
    "end_date": "2025-06-03",
    "end_date_label": "Ends 3 Jun",
    "skip_days_remaining": 63,
    "pause_days_remaining": 63
  },
  "delivery_location": {
    "building": "Al Nakheel Tower",
    "floor": "Floor 7",
    "area_name": "Al Nakheel"
  },
  "wallet_balance_sar": 50.00,
  "banner": {
    "theme": "black",
    "plan_label": "Executive Plan",
    "greeting": "Good morning, Ahmed 👋",
    "days_remaining_label": "17 days left",
    "end_date_label": "Ends 3 Jun",
    "location_label": "📍 Al Nakheel Tower · Floor 7",
    "location_edit_action": "navigate_edit_location"
  },
  "quick_actions": [
    { "id": "skip", "label": "Skip a day", "icon": "⏭", "subtext": "Before 6 PM cutoff · No charge", "action": "navigate_skip_screen", "theme": "red_tint" },
    { "id": "pause", "label": "Pause anytime", "icon": "⏸", "subtext": "Freeze your plan · No charge", "action": "open_pause_modal", "theme": "grey" }
  ],
  "plans": [...]
}
```

> `wallet_balance_sar` is only populated for `active` and `expired` states. It is `null` for `none` and `paused`.

---

### 7.2 GET /home/this-week
```
GET /home/this-week
🔒 Requires auth
```

Returns the horizontal meal strip cards for the current working week (Sun–Thu). Only returns days from today onwards. Each card includes a delivery-state overlay.

**`card_state` values:**

| Value | When | Opacity |
|---|---|---|
| `today` | Today's date | 100% |
| `upcoming` | Future days this week | 100% |
| `skipped` | Day is skipped (active subscriber) | 100% |
| `past` | Dates before today | 100% |
| `browse_only` | Any day when subscription is paused | 100% |
| `past_greyed` | Before today, not delivered or skipped | 45% |

**Response `200 OK`:**
```json
{
  "week_label": "This Week's Meals",
  "cards": [
    {
      "meal_id": "meal_01JK2ABX",
      "name_en": "Lamb Kabsa",
      "meal_type": "executive",
      "kcal": 550,
      "emoji": "🍛",
      "delivery_date": "2025-05-05",
      "day_label": "TODAY",
      "card_state": "today",
      "card_border": "red",
      "action": { "type": "open_meal_detail", "cta_label": "Subscribe →" }
    },
    {
      "meal_id": "meal_01JK2ACX",
      "name_en": "Chicken Fattoush",
      "meal_type": "salad",
      "kcal": 380,
      "emoji": "🥗",
      "delivery_date": "2025-05-06",
      "day_label": "Mon",
      "card_state": "upcoming",
      "card_border": "default",
      "action": { "type": "open_meal_detail", "cta_label": "Skip →" }
    }
  ]
}
```

**`action.cta_label` by subscription status:**

| Status | CTA |
|---|---|
| `none` | "Subscribe →" |
| `active` (skippable) | "Skip →" |
| `active` (past cutoff or limit) | `null` |
| `expired` / `cancelled` | "Renew →" |
| `paused` | "Browse only" |

---

## 8. Menu & Meal Detail Module

**Flow summary:**
```
Menu tab load  → GET /menu           (optional — header labels, filter chips)
               → GET /menu/week      (both week strips, this week + next week)
Menu card tap  → GET /meals/:meal_id (full screen)
Home card tap  → GET /meals/:meal_id (bottom sheet)
```

---

### 8.1 GET /menu
```
GET /menu
🔒 Requires auth
```

Returns light metadata for the Menu tab header — week range labels and filter chip options. Optional: clients that compute week ranges client-side may skip this call.

**Response `200 OK`:**
```json
{
  "this_week": {
    "label": "This week · Sun 5 – Thu 9 May",
    "date_from": "2025-05-05",
    "date_to": "2025-05-09"
  },
  "next_week": {
    "label": "Next week · Sun 12 – Thu 16 May",
    "date_from": "2025-05-12",
    "date_to": "2025-05-16"
  },
  "filter_options": [
    { "id": "all", "label": "All", "is_default": true },
    { "id": "executive", "label": "Executive", "is_default": false },
    { "id": "salad", "label": "Salad", "is_default": false }
  ]
}
```

---

### 8.2 GET /menu/week
```
GET /menu/week?meal_type=all
🔒 Requires auth
```

Returns the full 10-day meal schedule for both the current and next working week. **Both week strips in one call** — no second round-trip when the user scrolls to "Next week."

**Query Parameters:**

| Parameter | Values | Default |
|---|---|---|
| `meal_type` | `all` \| `executive` \| `salad` | `all` |

Filtering is server-side — the client does not need to filter locally.

**`skip_reason` values (when `skip_available: false`):**

| Value | Condition |
|---|---|
| `past_cutoff` | After 18:00 AST the day before delivery |
| `skip_limit_reached` | All `skip_days_allowed` used |
| `not_subscribed` | No active subscription |
| `subscription_paused` | Subscription paused |
| `subscription_expired` | Subscription expired |
| `subscription_cancelled` | Subscription cancelled |
| `already_skipped` | Day already skipped |

**Response `200 OK`:**
```json
{
  "this_week": {
    "label": "This week · Sun 5 – Thu 9 May",
    "date_from": "2025-05-05",
    "date_to": "2025-05-09",
    "days": [
      {
        "meal_id": "meal_01JK2ACX",
        "name_en": "Chicken Fattoush",
        "meal_type": "salad",
        "kcal": 380,
        "emoji": "🥗",
        "delivery_date": "2025-05-06",
        "day_label": "TODAY",
        "card_state": "today",
        "is_today": true,
        "skip_available": true,
        "skip_reason": null
      }
    ]
  },
  "next_week": {
    "label": "Next week · Sun 12 – Thu 16 May",
    "date_from": "2025-05-12",
    "date_to": "2025-05-16",
    "days": [...]
  }
}
```

> **Note:** Only published weeks return meal data. If a week has not been published by the admin, its `days` array will be empty.

---

### 8.3 GET /meals/:meal_id
```
GET /meals/:meal_id
🔒 Requires auth
```

Returns full detail for a single meal. Used for **both** the bottom sheet (Home card tap) and the full screen (Menu card tap) — the `view_mode` is a client-side routing decision.

**Response `200 OK`:**
```json
{
  "meal_id": "meal_01JK2ABX",
  "name_en": "Lamb Kabsa",
  "name_ar": "كبسة لحم",
  "meal_type": "executive",
  "emoji": "🍛",
  "kcal": 550,
  "macros": {
    "protein_g": 38,
    "carbs_g": 62,
    "fat_g": 14
  },
  "chef_note": "Slow-cooked for 4 hours with saffron rice and dried lime.",
  "key_ingredients": ["Lamb", "Saffron rice", "Dried lime"],
  "delivery_date": "2025-05-05"
}
```

| Field | Bottom Sheet | Full Screen |
|---|---|---|
| `name_en` / `name_ar` | ✅ | ✅ |
| Meal type + kcal pill | ✅ | ✅ |
| `macros` row | ✅ | ✅ |
| `chef_note` | ✅ | ✅ |
| `key_ingredients` | ❌ | ✅ |
| Skip action | ✅ (if cutoff not passed) | ✅ |

`delivery_date` is `null` if the meal is not assigned to the current or next published week.

**Errors:** `RESOURCE_NOT_FOUND` (404)

---

## 9. Admin / Ops Portal

### Auth
Admin and Ops users authenticate with **email + password** (not OTP).

```
POST /auth/admin/login
POST /auth/refresh
POST /auth/admin/logout
```

See [Admin Login](#admin-login-admin-portal-only).

---

### 9.1 Area Management ✅ Implemented

**List All Areas (Admin view — includes all statuses)**
```
GET /admin/areas
🔒 ADMIN | OPS
```

Optional: `?status=active`

**Response `200`:**
```json
{
  "data": {
    "areas": [
      { "id": "...", "name": "Al Nakheel", "status": "active" },
      { "id": "...", "name": "Al Zahra", "status": "coming_soon" }
    ]
  }
}
```

---

**Create Area**
```
POST /admin/areas
🔒 ADMIN | OPS
```

**Request:**
```json
{
  "name": "Al Zahra",
  "description": "Southern residential district",
  "status": "coming_soon"
}
```

---

**Add Building to Area**
```
POST /admin/areas/:area_id/buildings
🔒 ADMIN | OPS
```

**Request:**
```json
{
  "name": "Al Zahra Tower 1",
  "floorsCount": 22
}
```

---

### 9.2 Meal Library ✅ Implemented

```
GET    /admin/meals                          → List / search meals
GET    /admin/meals/:meal_id                 → Meal detail
POST   /admin/meals                          → Create meal (always draft)
PATCH  /admin/meals/:meal_id                 → Update meal fields
PATCH  /admin/meals/:meal_id/status          → Activate or draft a meal
POST   /admin/meals/import                   → Bulk import from XLSX
```

**List meals — `GET /admin/meals`**

| Query param | Values | Default | Notes |
|---|---|---|---|
| `status` | `all` \| `active` \| `draft` | `all` | |
| `meal_type` | `all` \| `executive` \| `salad` | `all` | |
| `q` | string | — | Search by English or Arabic name |
| `page` | integer | `1` | |
| `per_page` | integer | `20` | Max `50` |
| `context` | `picker` | — | Picker mode: only `active` meals, excludes meals in `exclude_week_id` |
| `exclude_week_id` | string | — | Used with `context=picker`. Meals already in this week get `already_used: true` |

**Response `200 OK`:**
```json
{
  "meals": [
    {
      "meal_id": "meal_01JK2ABX",
      "name_en": "Lamb Kabsa",
      "name_ar": "كبسة لحم",
      "meal_type": "executive",
      "kcal": 550,
      "status": "active",
      "already_used": false,
      "used_on_day": null
    }
  ],
  "pagination": { "page": 1, "per_page": 20, "total": 14, "total_pages": 1 }
}
```

**Create meal — `POST /admin/meals`**

```json
{
  "name_en": "Lamb Kabsa",
  "name_ar": "كبسة لحم",
  "meal_type": "executive",
  "kcal": 550,
  "macros": { "protein_g": 38, "carbs_g": 62, "fat_g": 14 },
  "chef_note": "Slow-cooked for 4 hours.",
  "key_ingredients": ["Lamb", "Saffron rice"],
  "emoji": "🍛"
}
```

Response `201`: `{ "meal_id": "...", "name_en": "...", "status": "draft", "created_at": "..." }`

> `status` is always `draft` on creation. Activate separately via `PATCH /:id/status`.

**Update meal status — `PATCH /admin/meals/:meal_id/status`**

```json
{ "status": "active" }
```

When drafting a meal that is in a published week, the server returns `409 MEAL_IN_PUBLISHED_WEEK`. Re-send with `"confirm_published_edit": true` to override.

**Import meals — `POST /admin/meals/import`**

- Content-Type: `multipart/form-data`
- Field name: `file` (`.xlsx` file)
- Max 100 rows per import. Partial import is allowed (rows with errors are skipped).
- All imported meals are saved as `draft`.

Required columns: `name_en`, `meal_type` (`executive`|`salad`), `kcal`.
Optional: `name_ar`, `protein_g`, `carbs_g`, `fat_g`, `chef_note`, `key_ingredients` (comma-separated), `emoji`.

```json
{
  "imported_count": 8,
  "skipped_count": 2,
  "errors": [{ "row": 4, "field": "kcal", "message": "kcal must be a positive integer." }],
  "all_saved_as": "draft",
  "note": "Photos must be uploaded manually. No auto-activation."
}
```

**Domain errors:**

| Code | HTTP | Meaning |
|---|---|---|
| `MEAL_IS_DRAFT` | 422 | Assigning a draft meal to a week slot |
| `MEAL_IN_PUBLISHED_WEEK` | 409 | Drafting a meal that is in a published week |

---

### 9.3 Menu Manager ✅ Implemented

The planner always manages two working weeks simultaneously:

- **Current week (N):** Published and read-only. Rendered at 45% opacity.
- **Next week (N+1):** Editable. Admin fills 5 days × 2 slots (Executive + Salad) = **10 slots**. Manual publish.

Both weeks are auto-created on first access.

```
GET    /admin/menu/weeks                                   → List weeks (auto-creates current + next)
GET    /admin/menu/weeks/:week_id                          → Full slot grid for a week
POST   /admin/menu/weeks/:week_id/slots/:slot_id/assign    → Assign meal to slot
DELETE /admin/menu/weeks/:week_id/slots/:slot_id           → Clear slot
POST   /admin/menu/weeks/:week_id/publish                  → Publish week
```

**Week IDs** are formatted as `w{year}-{isoWeekNumber}` (e.g. `w2025-23`).  
**Slot IDs** are formatted as `slot_{weekId}_{day}_{type}` (e.g. `slot_w2025-23_sun_exec`).

**List weeks — `GET /admin/menu/weeks`**

| Query param | Default | Notes |
|---|---|---|
| `from_week` | current week | Week ID to start from (e.g. `w2025-23`) |
| `count` | `2` | Max `8` |

```json
{
  "weeks": [
    {
      "week_id": "w2025-23",
      "week_number": 23,
      "label": "Week 23 — Current",
      "date_range": "Sun 5 – Thu 9 May",
      "date_from": "2025-05-05",
      "date_to": "2025-05-09",
      "status": "published",
      "is_current_week": true,
      "is_editable": false,
      "fill_status": { "filled_days": 5, "total_days": 5, "label": "Published ✓" }
    },
    {
      "week_id": "w2025-24",
      "status": "draft",
      "is_editable": true,
      "fill_status": { "filled_days": 3, "total_days": 5, "label": "3 of 5 days filled" }
    }
  ],
  "nav": { "prev_week": "w2025-22", "next_week": "w2025-25" }
}
```

**Get week slot grid — `GET /admin/menu/weeks/:week_id`**

Returns the 5-day × 2-slot grid. When `is_editable: false` (published week), all slot `is_editable` flags are `false` — render at 45% opacity with no interactions.

```json
{
  "week_id": "w2025-24",
  "status": "draft",
  "is_editable": true,
  "days": [
    {
      "delivery_date": "2025-05-12",
      "day_label": "Sun",
      "date_label": "12 May",
      "slots": [
        { "slot_id": "slot_w2025-24_sun_exec", "meal_type": "executive", "meal_type_label": "Exec", "meal": { "meal_id": "...", "name_en": "Lamb Kabsa", "kcal": 550 }, "is_filled": true, "is_editable": true },
        { "slot_id": "slot_w2025-24_sun_salad", "meal_type": "salad", "meal_type_label": "Salad", "meal": null, "is_filled": false, "is_editable": true }
      ]
    }
  ],
  "publish_ready": false,
  "publish_blocked_reason": "2 slots unfilled"
}
```

**Assign meal — `POST /admin/menu/weeks/:week_id/slots/:slot_id/assign`**

```json
{ "meal_id": "meal_01JK2ABX" }
```

Returns updated slot + `week_fill_status: { filled_slots, total_slots, publish_ready }`.

**Publish week — `POST /admin/menu/weeks/:week_id/publish`**

- Requires all 10 slots to have a meal assigned.
- Sets `last_served` and increments `times_served` on all assigned meals.
- Irreversible.

```json
{
  "week_id": "w2025-24",
  "status": "published",
  "published_at": "2025-05-09T11:00:00Z",
  "published_by": "Admin User",
  "customer_visible_from": "2025-05-12"
}
```

**Domain errors:**

| Code | HTTP | Meaning |
|---|---|---|
| `WEEK_NOT_COMPLETE` | 409 | Not all 10 slots filled |
| `WEEK_ALREADY_PUBLISHED` | 409 | Week is already published |
| `SLOT_NOT_EDITABLE` | 422 | Slot's week is published or past |
| `MEAL_ALREADY_USED` | 409 | Meal already assigned in this week |

---

### 9.4 Not Yet Implemented ❌

The following are in the admin spec but have **no backend implementation** yet:

| Module | Endpoints |
|---|---|
| Dashboard | `GET /admin/dashboard/summary` |
| Daily Ops | `GET /admin/ops/daily-summary`, `POST /admin/ops/advance-stage`, `GET /admin/ops/export-delivery-sheet`, `GET /admin/ops/issues`, `POST /admin/ops/issues/:id/credit`, `POST /admin/ops/issues/:id/reject` |
| Label Printing | `GET /admin/labels`, `GET /admin/labels/:id/download`, `GET /admin/labels/area/:id/download`, `GET /admin/labels/download-all`, `GET /admin/labels/:id/preview` |
| Revenue Dashboard | `GET /admin/revenue/summary`, `GET /admin/revenue/daily-chart`, `GET /admin/revenue/plan-breakdown` |
| Customer Management | `GET /admin/customers`, `GET /admin/customers/:id`, `POST /admin/customers/:id/deactivate`, `POST /admin/customers/:id/wallet/credit` |
| Comms & Automations | `GET /admin/comms/automations`, `PUT /admin/comms/automations/:id` |
| Rider App | `GET /rider/deliveries/today`, `POST /rider/deliveries/:id/complete`, `POST /rider/deliveries/:id/issue` |

---

## 10. Complete Endpoint Index

### Health

| # | Method | Path | Auth | Status |
|---|---|---|---|---|
| 1 | GET | `/health` | None | ✅ |

### Customer App — All Endpoints

| # | Method | Path | Auth | Status |
|---|---|---|---|---|
| 1 | POST | `/auth/otp/send` | None | ✅ |
| 2 | POST | `/auth/otp/verify` | None | ✅ |
| 3 | POST | `/auth/refresh` | None | ✅ |
| 4 | POST | `/auth/logout` | JWT | ✅ |
| 5 | POST | `/users/profile` | JWT | ✅ |
| 6 | GET | `/users/profile` | JWT | ✅ |
| 7 | PATCH | `/users/preferences/language` | JWT | ✅ |
| 8 | GET | `/delivery/areas` | JWT | ✅ |
| 9 | GET | `/delivery/areas/search` | JWT | ✅ |
| 10 | POST | `/delivery/areas/out-of-zone` | JWT | ✅ |
| 11 | GET | `/delivery/areas/:area_id/buildings` | JWT | ✅ |
| 12 | POST | `/users/delivery-location` | JWT | ✅ |
| 13 | GET | `/users/delivery-location` | JWT | ✅ |
| 14 | GET | `/config/public-holidays` | JWT | ✅ |
| 15 | GET | `/plans/active` | JWT | ✅ |
| 16 | GET | `/plans` | JWT | ✅ |
| 17 | GET | `/delivery/start-dates` | JWT | ✅ |
| 18 | POST | `/referrals/validate` | JWT | ✅ |
| 19 | GET | `/referrals/me` | JWT | ✅ |
| 20 | POST | `/checkout/session` | JWT | ✅ |
| 21 | GET | `/checkout/session/:session_id` | JWT | ✅ |
| 22 | POST | `/checkout/session/:session_id/promo` | JWT | ✅ |
| 23 | DELETE | `/checkout/session/:session_id/promo` | JWT | ✅ |
| 24 | GET | `/payment/methods` | JWT | ✅ |
| 25 | POST | `/payment/methods` | JWT | ✅ |
| 26 | DELETE | `/payment/methods/:method_id` | JWT | ✅ |
| 27 | POST | `/orders` | JWT | ✅ |
| 28 | GET | `/orders/:order_id` | JWT | ✅ |
| 29 | GET | `/subscriptions/me` | JWT | ✅ |
| 30 | GET | `/subscriptions/me/deliveries` | JWT | ✅ |
| 31 | POST | `/subscriptions/me/deliveries/:date/skip` | JWT | ✅ |
| 32 | DELETE | `/subscriptions/me/deliveries/:date/skip` | JWT | ✅ |
| 33 | POST | `/subscriptions/me/pause` | JWT | ✅ |
| 34 | POST | `/subscriptions/me/resume` | JWT | ✅ |
| 35 | POST | `/subscriptions/me/cancel` | JWT | ✅ |
| 36 | PATCH | `/subscriptions/me/meal-type` | JWT | ✅ |
| 37 | GET | `/users/wallet` | JWT | ✅ |
| 38 | GET | `/users/wallet/transactions` | JWT | ✅ |
| 39 | GET | `/users/referral` | JWT | ✅ |
| 40 | GET | `/home` | JWT | ✅ |
| 41 | GET | `/home/this-week` | JWT | ✅ |
| 42 | GET | `/menu` | JWT | ✅ |
| 43 | GET | `/menu/week` | JWT | ✅ |
| 44 | GET | `/meals/:meal_id` | JWT | ✅ |

### Admin / Ops Portal — All Endpoints

| # | Method | Path | Role | Status |
|---|---|---|---|---|
| 1 | POST | `/auth/admin/login` | None | ✅ |
| 2 | POST | `/auth/refresh` | None | ✅ |
| 3 | POST | `/auth/admin/logout` | ADMIN | ✅ |
| 4 | GET | `/admin/areas` | ADMIN\|OPS | ✅ |
| 5 | POST | `/admin/areas` | ADMIN\|OPS | ✅ |
| 6 | POST | `/admin/areas/:id/buildings` | ADMIN\|OPS | ✅ |
| 7 | GET | `/admin/meals` | ADMIN\|OPS | ✅ |
| 8 | GET | `/admin/meals/:meal_id` | ADMIN\|OPS | ✅ |
| 9 | POST | `/admin/meals` | ADMIN\|OPS | ✅ |
| 10 | PATCH | `/admin/meals/:meal_id` | ADMIN\|OPS | ✅ |
| 11 | PATCH | `/admin/meals/:meal_id/status` | ADMIN\|OPS | ✅ |
| 12 | POST | `/admin/meals/import` | ADMIN\|OPS | ✅ |
| 13 | GET | `/admin/menu/weeks` | ADMIN\|OPS | ✅ |
| 14 | GET | `/admin/menu/weeks/:week_id` | ADMIN\|OPS | ✅ |
| 15 | POST | `/admin/menu/weeks/:week_id/slots/:slot_id/assign` | ADMIN\|OPS | ✅ |
| 16 | DELETE | `/admin/menu/weeks/:week_id/slots/:slot_id` | ADMIN\|OPS | ✅ |
| 17 | POST | `/admin/menu/weeks/:week_id/publish` | ADMIN\|OPS | ✅ |
| 18 | GET | `/admin/dashboard/summary` | ADMIN\|OPS | ❌ |
| 19 | GET | `/admin/ops/daily-summary` | ADMIN\|OPS | ❌ |
| 20 | POST | `/admin/ops/advance-stage` | ADMIN\|OPS | ❌ |
| 21 | GET | `/admin/ops/export-delivery-sheet` | ADMIN\|OPS | ❌ |
| 22 | GET | `/admin/ops/issues` | ADMIN\|OPS | ❌ |
| 23 | POST | `/admin/ops/issues/:id/credit` | ADMIN\|OPS | ❌ |
| 24 | POST | `/admin/ops/issues/:id/reject` | ADMIN\|OPS | ❌ |
| 25 | GET | `/admin/labels` | ADMIN\|OPS | ❌ |
| 26 | GET | `/admin/revenue/summary` | ADMIN | ❌ |
| 27 | GET | `/admin/revenue/daily-chart` | ADMIN | ❌ |
| 28 | GET | `/admin/revenue/plan-breakdown` | ADMIN | ❌ |
| 29 | GET | `/admin/customers` | ADMIN\|OPS | ❌ |
| 30 | GET | `/admin/customers/:id` | ADMIN\|OPS | ❌ |
| 31 | POST | `/admin/customers/:id/deactivate` | ADMIN | ❌ |
| 32 | POST | `/admin/customers/:id/wallet/credit` | ADMIN\|OPS | ❌ |
| 33 | GET | `/rider/deliveries/today` | DRIVER | ❌ |
| 34 | POST | `/rider/deliveries/:id/complete` | DRIVER | ❌ |
| 35 | POST | `/rider/deliveries/:id/issue` | DRIVER | ❌ |

---

## 11. Misalignments & Deviations from Spec

These are differences between the API design documents and the current implementation that UI developers must be aware of.

---

### 11.1 ⚠️ Refresh Token Endpoint Path

| | Path |
|---|---|
| **Spec says** | `POST /auth/token/refresh` |
| **Implemented as** | `POST /auth/refresh` |

**Use `/auth/refresh`.**

---

### 11.2 ⚠️ OTP Verify — `otp_id` Not Required in Request

| | Behaviour |
|---|---|
| **Spec says** | Send `otp_id` + `phone` + `code` |
| **Implemented as** | Send `phone` + `code` only — server looks up active session by phone |

**Do not send `otp_id`.**

---

### 11.3 ⚠️ GET /users/delivery-location Returns Array, Not Single Object

| | Response |
|---|---|
| **Spec says** | Single `DeliveryLocation` object |
| **Implemented as** | Array of all addresses — primary address is first (`isPrimary: true`) |

**Handle as array.** Show primary address as the default selected address.

---

### 11.4 ⚠️ Access Token Lifetime

| | Value |
|---|---|
| **Spec says** | `access_expires_in: 3600` (1 hour) |
| **Implemented as** | `accessExpiresIn: 3153600000` (100 years) |

**Do not schedule automatic refresh for mobile.** The session is permanent until logout.

---

### 11.5 ⚠️ Admin Auth — OTP vs Email/Password

| | Method |
|---|---|
| **Admin spec says** | OTP-based login for staff |
| **Implemented as** | Email + password via `POST /auth/admin/login` |

**Admin and Ops users must log in with email + password.**

---

### 11.6 ℹ️ Dual Referral Endpoints

Both of these exist and return referral data:
- `GET /users/referral` — user-facing referral summary
- `GET /referrals/me` — same data, alternate path

Either works. Prefer `/users/referral` for the customer app.

---

### 11.7 ℹ️ Response Field Naming Convention

The spec examples use `snake_case` field names (e.g. `is_new_user`, `access_token`).

The backend returns **`camelCase`** (e.g. `isNewUser`, `accessToken`).

**Map accordingly in your serialization layer.**

---

*Last updated: 2026-05-23*
