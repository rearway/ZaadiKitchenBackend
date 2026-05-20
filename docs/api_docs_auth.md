# Zaadi Kitchen — Customer App API Documentation

> **Scope:** Onboarding & Authentication modules, plus all dependent APIs required to support them.  
> **Version:** v1.0  
> **Base URL:** `https://api.zaadiKitchen.com/v1`  
> **Auth:** Bearer token (JWT) in `Authorization` header for all authenticated endpoints.  
> **Content-Type:** `application/json` for all requests and responses unless noted.

---

## Table of Contents

1. [Conventions](#conventions)
2. [Authentication Module](#authentication-module)
   - [Send OTP](#1-send-otp)
   - [Verify OTP](#2-verify-otp)
   - [Refresh Token](#3-refresh-token)
   - [Logout](#4-logout)
3. [Onboarding Module](#onboarding-module)
   - [Create / Update Profile](#5-create--update-profile)
   - [Get Profile](#6-get-profile)
   - [App Language Preference](#7-app-language-preference)
4. [Area & Delivery Location Module](#area--delivery-location-module)
   - [List Active Delivery Areas](#8-list-active-delivery-areas)
   - [Search Delivery Areas](#9-search-delivery-areas)
   - [Submit Out-of-Zone Interest](#10-submit-out-of-zone-interest)
   - [List Buildings for Area](#11-list-buildings-for-area)
   - [Save Delivery Location](#12-save-delivery-location)
   - [Get Saved Delivery Location](#13-get-saved-delivery-location)
5. [Error Reference](#error-reference)
6. [Rate Limits](#rate-limits)
7. [Auth Flow Diagrams](#auth-flow-diagrams)

---

## Conventions

### Response Envelope

All responses follow this shape:

```json
{
  "success": true,
  "data": {},
  "error": null,
  "meta": {}
}
```

| Field | Type | Description |
|---|---|---|
| `success` | boolean | `true` on 2xx, `false` on any error |
| `data` | object \| array \| null | Response payload |
| `error` | object \| null | Present only on errors — see [Error Reference](#error-reference) |
| `meta` | object | Pagination, timestamps, request IDs etc. |

### HTTP Status Codes

| Code | Meaning |
|---|---|
| `200` | OK |
| `201` | Created |
| `400` | Bad Request — validation failed |
| `401` | Unauthorized — missing / invalid token |
| `403` | Forbidden — action not permitted |
| `404` | Not Found |
| `429` | Too Many Requests — rate limit hit |
| `500` | Internal Server Error |

### Phone Numbers

All phone numbers must be in **E.164 format** (e.g. `+966512345678`). The country code `+966` (Saudi Arabia) is the only supported country at launch.

---

## Authentication Module

### 1. Send OTP

Sends a 4-digit OTP to the customer via **WhatsApp** or **SMS**. This is the entry point for both sign-up and sign-in — the backend determines whether the phone number is new or existing after OTP verification.

```
POST /auth/otp/send
```

**No authentication required.**

#### Request Body

```json
{
  "phone": "+966512345678",
  "channel": "whatsapp"
}
```

| Field | Type | Required | Description |
|---|---|---|---|
| `phone` | string | ✅ | E.164 formatted phone number |
| `channel` | enum | ✅ | `"whatsapp"` or `"sms"` |

#### Success Response `200`

```json
{
  "success": true,
  "data": {
    "otp_id": "otp_01HXYZ1234ABCD",
    "channel": "whatsapp",
    "expires_in": 120,
    "resend_available_at": "2024-01-15T09:51:00Z"
  },
  "error": null,
  "meta": {
    "request_id": "req_abc123"
  }
}
```

| Field | Type | Description |
|---|---|---|
| `otp_id` | string | Opaque ID to pass to the verify endpoint |
| `channel` | string | Confirmed channel used |
| `expires_in` | integer | OTP validity in seconds (120s / 2 min) |
| `resend_available_at` | ISO 8601 | Earliest time the customer can request a resend |

#### Error Responses

| Status | Code | Message |
|---|---|---|
| `400` | `INVALID_PHONE` | Phone number is not valid E.164 |
| `400` | `UNSUPPORTED_COUNTRY` | Only +966 numbers supported |
| `429` | `OTP_RATE_LIMIT` | Max 3 OTP requests per 10-minute window. Includes `retry_after` (seconds) and `locked_until` (ISO 8601) in the error object |

> **Rate Limit Detail:** After 3 requests in a 10-minute window, the account is locked for **30 minutes**. Response will include:
> ```json
> {
>   "error": {
>     "code": "OTP_RATE_LIMIT",
>     "message": "Too many attempts. Try again after 30 min.",
>     "retry_after": 1800,
>     "locked_until": "2024-01-15T10:21:00Z"
>   }
> }
> ```

---

### 2. Verify OTP

Validates the 4-digit code entered by the customer. On success, returns a JWT access token and refresh token. The `is_new_user` flag tells the client which flow to route to.

```
POST /auth/otp/verify
```

**No authentication required.**

#### Request Body

```json
{
  "otp_id": "otp_01HXYZ1234ABCD",
  "phone": "+966512345678",
  "code": "4821"
}
```

| Field | Type | Required | Description |
|---|---|---|---|
| `otp_id` | string | ✅ | ID returned from `/auth/otp/send` |
| `phone` | string | ✅ | Must match the phone used in send |
| `code` | string | ✅ | 4-digit OTP entered by the user |

#### Success Response `200`

```json
{
  "success": true,
  "data": {
    "is_new_user": false,
    "access_token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
    "refresh_token": "rft_01HXYZ9999ABCD",
    "token_type": "Bearer",
    "access_expires_in": 3600,
    "refresh_expires_in": 2592000,
    "user": {
      "id": "usr_01HXYZ5678",
      "phone": "+966512345678",
      "name": "Ahmed Al-Rashidi",
      "email": "ahmed@example.com",
      "language": "en",
      "onboarding_complete": true
    }
  },
  "error": null
}
```

| Field | Type | Description |
|---|---|---|
| `is_new_user` | boolean | `true` → route to **Name Entry**; `false` → route to **Home** |
| `access_token` | string | JWT — include in `Authorization: Bearer <token>` header |
| `refresh_token` | string | Long-lived token to get new access tokens |
| `access_expires_in` | integer | Seconds until access token expires (3600 = 1 hr) |
| `refresh_expires_in` | integer | Seconds until refresh token expires (2592000 = 30 days) |
| `user.onboarding_complete` | boolean | `false` if name/area not yet set for a new returning-session user |

#### Error Responses

| Status | Code | Message |
|---|---|---|
| `400` | `INVALID_OTP` | Code does not match. Includes `attempts_remaining` |
| `400` | `OTP_EXPIRED` | Code has expired — customer must request a new one |
| `400` | `OTP_ALREADY_USED` | Code already successfully verified |
| `429` | `OTP_ATTEMPTS_EXCEEDED` | 5 invalid attempts — code invalidated. Customer must re-request |

> **Attempt Limit Detail:** After 5 invalid attempts the `otp_id` is invalidated and `INVALID_OTP` will no longer return `attempts_remaining`. Customer must call `/auth/otp/send` again (subject to rate limit window).

---

### 3. Refresh Token

Gets a new access token using the refresh token without requiring re-authentication.

```
POST /auth/token/refresh
```

**No authentication required.**

#### Request Body

```json
{
  "refresh_token": "rft_01HXYZ9999ABCD"
}
```

#### Success Response `200`

```json
{
  "success": true,
  "data": {
    "access_token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
    "access_expires_in": 3600
  },
  "error": null
}
```

#### Error Responses

| Status | Code | Message |
|---|---|---|
| `401` | `INVALID_REFRESH_TOKEN` | Token not found or tampered |
| `401` | `REFRESH_TOKEN_EXPIRED` | Token expired — user must re-authenticate |
| `403` | `REFRESH_TOKEN_REVOKED` | Token was revoked (e.g. logout from another session) |

---

### 4. Logout

Revokes the current refresh token and invalidates the session.

```
POST /auth/logout
```

**🔒 Requires authentication.**

#### Request Body

```json
{
  "refresh_token": "rft_01HXYZ9999ABCD"
}
```

#### Success Response `200`

```json
{
  "success": true,
  "data": {
    "message": "Logged out successfully"
  },
  "error": null
}
```

---

## Onboarding Module

### 5. Create / Update Profile

Called immediately after first OTP verification for new users (Name Entry screen). Also used to update profile fields later. `name` is required for new users; all fields are optional for updates.

```
POST /users/profile
```

**🔒 Requires authentication.**

#### Request Body

```json
{
  "name": "Ahmed Al-Rashidi",
  "email": "ahmed@example.com"
}
```

| Field | Type | Required | Constraints |
|---|---|---|---|
| `name` | string | ✅ (new users) | 2–80 characters, non-empty |
| `email` | string | ❌ | Valid email format if provided |

#### Success Response `200`

```json
{
  "success": true,
  "data": {
    "id": "usr_01HXYZ5678",
    "phone": "+966512345678",
    "name": "Ahmed Al-Rashidi",
    "email": "ahmed@example.com",
    "language": "en",
    "onboarding_complete": false,
    "created_at": "2024-01-15T09:41:00Z",
    "updated_at": "2024-01-15T09:41:00Z"
  },
  "error": null
}
```

> `onboarding_complete` remains `false` until a delivery location is also saved (see [Save Delivery Location](#12-save-delivery-location)).

#### Error Responses

| Status | Code | Message |
|---|---|---|
| `400` | `NAME_REQUIRED` | Name is required for new user profiles |
| `400` | `INVALID_EMAIL` | Email format is invalid |
| `400` | `NAME_TOO_SHORT` | Name must be at least 2 characters |

---

### 6. Get Profile

Returns the authenticated user's profile.

```
GET /users/profile
```

**🔒 Requires authentication.**

#### Success Response `200`

```json
{
  "success": true,
  "data": {
    "id": "usr_01HXYZ5678",
    "phone": "+966512345678",
    "name": "Ahmed Al-Rashidi",
    "email": "ahmed@example.com",
    "language": "en",
    "onboarding_complete": true,
    "created_at": "2024-01-15T09:41:00Z",
    "updated_at": "2024-01-15T09:41:00Z"
  },
  "error": null
}
```

---

### 7. App Language Preference

Updates the user's language preference. Affects all localised content returned by the API. Persists across sessions.

```
PATCH /users/preferences/language
```

**🔒 Requires authentication.**

#### Request Body

```json
{
  "language": "ar"
}
```

| Field | Type | Required | Description |
|---|---|---|---|
| `language` | enum | ✅ | `"en"` or `"ar"` |

#### Success Response `200`

```json
{
  "success": true,
  "data": {
    "language": "ar"
  },
  "error": null
}
```

#### Error Responses

| Status | Code | Message |
|---|---|---|
| `400` | `UNSUPPORTED_LANGUAGE` | Only `en` and `ar` are supported |

---

## Area & Delivery Location Module

These endpoints are required during onboarding (Area Search → Building Details) and are also used post-onboarding when a customer edits their delivery location.

---

### 8. List Active Delivery Areas

Returns all areas where delivery is currently active. "Coming Soon" areas are **not** included — they are only surfaced via the out-of-zone flow. No distance/km data is returned.

```
GET /delivery/areas
```

**🔒 Requires authentication.**

#### Query Parameters

| Param | Type | Required | Description |
|---|---|---|---|
| `query` | string | ❌ | Real-time filter string (partial area name). Min 1 char. |

#### Success Response `200`

```json
{
  "success": true,
  "data": {
    "areas": [
      {
        "id": "area_01ALNAKHEEL",
        "name": "Al Nakheel",
        "description": "Offices & business towers",
        "status": "active"
      },
      {
        "id": "area_01OLAYA",
        "name": "Olaya Business District",
        "description": "Offices & towers",
        "status": "active"
      },
      {
        "id": "area_01KAFD",
        "name": "King Abdullah Financial District",
        "description": "KAFD towers",
        "status": "active"
      }
    ]
  },
  "error": null
}
```

> **Note:** `status` will always be `"active"` in this response. Filter server-side — never expose `"coming_soon"` here.

---

### 9. Search Delivery Areas

Dedicated search endpoint for real-time filtering. Returns only active areas matching the query. Used as the customer types in the Area Search input.

```
GET /delivery/areas/search?q={query}
```

**🔒 Requires authentication.**

#### Query Parameters

| Param | Type | Required | Description |
|---|---|---|---|
| `q` | string | ✅ | Search string. Min 1 character. |

#### Success Response `200`

```json
{
  "success": true,
  "data": {
    "areas": [
      {
        "id": "area_01ALNAKHEEL",
        "name": "Al Nakheel",
        "description": "Offices & business towers",
        "status": "active"
      }
    ],
    "query": "nakheel",
    "is_out_of_zone": false
  },
  "error": null
}
```

| Field | Type | Description |
|---|---|---|
| `areas` | array | Matching active areas. Empty array `[]` if no match. |
| `is_out_of_zone` | boolean | `true` when `areas` is empty — triggers the out-of-zone UI state |

---

### 10. Submit Out-of-Zone Interest

Captures the area name entered by a customer whose area is not yet active. Used for expansion planning. **Does not allow the customer to proceed with ordering.** Max 3 submissions per session.

```
POST /delivery/areas/out-of-zone
```

**🔒 Requires authentication.**

#### Request Body

```json
{
  "area_name": "Al Zahra"
}
```

| Field | Type | Required | Constraints |
|---|---|---|---|
| `area_name` | string | ✅ | 2–100 characters |

#### Success Response `201`

```json
{
  "success": true,
  "data": {
    "message": "We'll notify you when we expand to this area.",
    "area_name": "Al Zahra"
  },
  "error": null
}
```

#### Error Responses

| Status | Code | Message |
|---|---|---|
| `400` | `AREA_NAME_REQUIRED` | Area name cannot be empty |
| `429` | `SUBMISSION_LIMIT` | Max 3 out-of-zone submissions per session |

---

### 11. List Buildings for Area

Returns the admin-curated list of buildings for a given area. Used to power the building auto-suggest on the Building Details screen. Customers can also free-type a building not in the list (max 200 chars).

```
GET /delivery/areas/{area_id}/buildings
```

**🔒 Requires authentication.**

#### Path Parameters

| Param | Type | Required | Description |
|---|---|---|---|
| `area_id` | string | ✅ | ID from the areas list |

#### Query Parameters

| Param | Type | Required | Description |
|---|---|---|---|
| `q` | string | ❌ | Optional filter for building name |

#### Success Response `200`

```json
{
  "success": true,
  "data": {
    "area_id": "area_01ALNAKHEEL",
    "area_name": "Al Nakheel",
    "buildings": [
      {
        "id": "bld_01TOWER1",
        "name": "Al Nakheel Tower, King Fahad Rd",
        "floors_count": null
      },
      {
        "id": "bld_01TOWER2",
        "name": "Al Wadi Tower",
        "floors_count": null
      }
    ]
  },
  "error": null
}
```

#### Error Responses

| Status | Code | Message |
|---|---|---|
| `404` | `AREA_NOT_FOUND` | Area ID does not exist or is not active |

---

### 12. Save Delivery Location

Saves the customer's delivery location (area + building details). Called when the customer taps **Save & Continue** on the Building Details screen. This is the final step of onboarding; sets `onboarding_complete = true` on the user record.

```
POST /users/delivery-location
```

**🔒 Requires authentication.**

#### Request Body

```json
{
  "area_id": "area_01ALNAKHEEL",
  "building": "Al Nakheel Tower, King Fahad Rd",
  "building_id": "bld_01TOWER1",
  "floor": "Floor 7",
  "desk_area": "Desk B12",
  "delivery_preference": "hand_to_me",
  "rider_notes": "Call me on arrival"
}
```

| Field | Type | Required | Constraints |
|---|---|---|---|
| `area_id` | string | ✅ | Must be a valid active area ID |
| `building` | string | ✅ | Building name. Max 200 characters |
| `building_id` | string | ❌ | If building was selected from suggestion list |
| `floor` | string | ❌ | Max 50 characters |
| `desk_area` | string | ❌ | Max 50 characters |
| `delivery_preference` | enum | ❌ | `"hand_to_me"` or `"reception"`. Defaults to `"hand_to_me"` |
| `rider_notes` | string | ❌ | Max 200 characters. Shown to rider on delivery list |

#### Success Response `201`

```json
{
  "success": true,
  "data": {
    "location_id": "loc_01HXYZ9999",
    "area_id": "area_01ALNAKHEEL",
    "area_name": "Al Nakheel",
    "building": "Al Nakheel Tower, King Fahad Rd",
    "floor": "Floor 7",
    "desk_area": "Desk B12",
    "delivery_preference": "hand_to_me",
    "rider_notes": "Call me on arrival",
    "is_primary": true,
    "created_at": "2024-01-15T09:42:00Z"
  },
  "error": null,
  "meta": {
    "onboarding_complete": true
  }
}
```

> `meta.onboarding_complete: true` signals the client to route the user forward to Plan Selection (new user) or Home (returning session).

#### Error Responses

| Status | Code | Message |
|---|---|---|
| `400` | `AREA_REQUIRED` | Area ID is required |
| `400` | `BUILDING_REQUIRED` | Building name is required |
| `400` | `BUILDING_TOO_LONG` | Building name exceeds 200 characters |
| `404` | `AREA_NOT_FOUND` | Area ID is not active |

---

### 13. Get Saved Delivery Location

Returns the customer's current primary delivery location. Used on Building Details when the customer returns to edit.

```
GET /users/delivery-location
```

**🔒 Requires authentication.**

#### Success Response `200`

```json
{
  "success": true,
  "data": {
    "location_id": "loc_01HXYZ9999",
    "area_id": "area_01ALNAKHEEL",
    "area_name": "Al Nakheel",
    "building": "Al Nakheel Tower, King Fahad Rd",
    "floor": "Floor 7",
    "desk_area": "Desk B12",
    "delivery_preference": "hand_to_me",
    "rider_notes": "Call me on arrival",
    "is_primary": true
  },
  "error": null
}
```

#### Error Responses

| Status | Code | Message |
|---|---|---|
| `404` | `LOCATION_NOT_SET` | No delivery location saved yet (user hasn't completed onboarding) |

---

## Error Reference

All error responses follow this shape:

```json
{
  "success": false,
  "data": null,
  "error": {
    "code": "ERROR_CODE",
    "message": "Human-readable message suitable for logging",
    "details": {}
  }
}
```

| Field | Description |
|---|---|
| `code` | Stable machine-readable string for client-side handling |
| `message` | English description for developer logs — **do not display directly in the app** |
| `details` | Optional extra context (field-level validation errors etc.) |

### Validation Error Example

```json
{
  "success": false,
  "data": null,
  "error": {
    "code": "VALIDATION_ERROR",
    "message": "Request validation failed",
    "details": {
      "fields": {
        "phone": "Must be in E.164 format",
        "channel": "Must be one of: whatsapp, sms"
      }
    }
  }
}
```

---

## Rate Limits

| Endpoint | Limit | Window | Lock Duration |
|---|---|---|---|
| `POST /auth/otp/send` | 3 requests | 10 minutes per phone | 30 minutes |
| `POST /auth/otp/verify` | 5 invalid attempts | Per `otp_id` | OTP invalidated — must re-request |
| `POST /delivery/areas/out-of-zone` | 3 submissions | Per session | Session block |

All rate-limited responses return HTTP `429` with the error object including `retry_after` (integer, seconds) and where applicable `locked_until` (ISO 8601 timestamp).

---

## Auth Flow Diagrams

### New User Flow

```
App Open
   │
   ▼
POST /auth/otp/send  ──── (phone, channel) ─────► OTP sent
   │
   ▼
POST /auth/otp/verify ─── (otp_id, code) ─────► { is_new_user: true, access_token, ... }
   │
   ▼
POST /users/profile  ──── (name, email?) ──────► Profile created
   │
   ▼
GET  /delivery/areas                            ► Active area list
   │
POST /delivery/areas/search?q=...              ► Real-time filtering
   │
   ▼  (area selected)
GET  /delivery/areas/{area_id}/buildings       ► Building suggestions
   │
   ▼
POST /users/delivery-location ── (area, building, ...) ► { onboarding_complete: true }
   │
   ▼
→ Plan Selection Screen
```

### Returning User Flow

```
App Open
   │
   ├── (has valid access_token?) ─────────────────► Home Screen
   │
   ├── (has valid refresh_token?)
   │       │
   │       ▼
   │   POST /auth/token/refresh ────────────────► New access_token → Home Screen
   │
   └── (no valid token)
           │
           ▼
       POST /auth/otp/send
           │
           ▼
       POST /auth/otp/verify ──── { is_new_user: false } ──► Home Screen
```

### OTP Rate Limit State Machine

```
Idle
 │
 ├── Request OTP ──────────────────── attempt_count += 1
 │                                          │
 │                              attempt_count < 3? ──► Wait for user to enter code
 │                                          │
 │                              attempt_count == 3? ──► Lock for 30 min
 │
 └── (after 30 min) ─────────────────────── Reset to Idle
```

---

*Generated from Zaadi Kitchen Customer App UI Screens v2. Covers Authentication (F1–F5) and Onboarding (F6–F9). Dependent area/location APIs added to complete the module.*