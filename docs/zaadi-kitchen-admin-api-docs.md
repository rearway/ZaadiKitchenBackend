# Zaadi Kitchen — Admin / Ops / Rider API Documentation

> **Scope:** All backend APIs for the Admin Portal, Ops/Kitchen Portal, and Rider Mobile App.
> **Version:** v1.0
> **Base URL:** `https://api.zaadiKitchen.com/v1`
> **Portal URL:** `admin.zaadikitchen.com`
> **Auth:** Bearer token (JWT) in `Authorization` header for all endpoints.
> **Content-Type:** `application/json` unless noted (file downloads differ).

---

## Table of Contents

1. [Conventions & Role System](#conventions--role-system)
2. [Authentication Module](#authentication-module)
   - [1. Send OTP (Staff)](#1-send-otp-staff)
   - [2. Verify OTP (Staff)](#2-verify-otp-staff)
   - [3. Refresh Token](#3-refresh-token)
   - [4. Logout](#4-logout)
3. [Dashboard Module](#dashboard-module)
   - [5. Get Dashboard Summary](#5-get-dashboard-summary)
4. [Daily Operations Module](#daily-operations-module)
   - [6. Get Daily Ops Summary](#6-get-daily-ops-summary)
   - [7. Advance Production Stage](#7-advance-production-stage)
   - [8. Export Delivery Sheet](#8-export-delivery-sheet)
   - [9. List Open Issues](#9-list-open-issues)
   - [10. Credit Customer Wallet](#10-credit-customer-wallet)
   - [11. Reject Customer Issue](#11-reject-customer-issue)
5. [Label Printing Module](#label-printing-module)
   - [12. List Labels](#12-list-labels)
   - [13. Download Label (Single)](#13-download-label-single)
   - [14. Download Labels by Area](#14-download-labels-by-area)
   - [15. Download All Labels](#15-download-all-labels)
   - [16. Get Label Preview Data](#16-get-label-preview-data)
6. [Revenue Dashboard Module](#revenue-dashboard-module)
   - [17. Get Revenue Summary](#17-get-revenue-summary)
   - [18. Get Daily Revenue Chart](#18-get-daily-revenue-chart)
   - [19. Get Plan Breakdown](#19-get-plan-breakdown)
7. [Menu Manager Module](#menu-manager-module)
   - [20. Get 2-Week Planner](#20-get-2-week-planner)
   - [21. Assign Dish to Slot](#21-assign-dish-to-slot)
   - [22. Remove Dish from Slot](#22-remove-dish-from-slot)
   - [23. Publish Week Menu](#23-publish-week-menu)
   - [24. List Meal Library](#24-list-meal-library)
   - [25. Create Dish](#25-create-dish)
   - [26. Update Dish](#26-update-dish)
   - [27. Set Dish Status](#27-set-dish-status)
   - [28. Import Dishes via XLSX](#28-import-dishes-via-xlsx)
8. [Customer Management Module](#customer-management-module)
   - [29. List Customers](#29-list-customers)
   - [30. Get Customer Detail](#30-get-customer-detail)
   - [31. Get Customer History](#31-get-customer-history)
9. [Comms & Automations Module](#comms--automations-module)
   - [32. List Automation Toggles](#32-list-automation-toggles)
   - [33. Update Automation Toggle](#33-update-automation-toggle)
   - [34. Get Broadcast Segments](#34-get-broadcast-segments)
   - [35. Send Broadcast](#35-send-broadcast)
10. [Areas & Buildings Module](#areas--buildings-module)
    - [36. List Areas (Admin)](#36-list-areas-admin)
    - [37. Create Area](#37-create-area)
    - [38. Update Area](#38-update-area)
    - [39. List Buildings for Area](#39-list-buildings-for-area)
    - [40. Add Building](#40-add-building)
    - [41. Update Building](#41-update-building)
    - [42. Delete Building](#42-delete-building)
11. [Rider App Module](#rider-app-module)
    - [43. Get My Deliveries (Rider)](#43-get-my-deliveries-rider)
    - [44. Mark Delivery as Delivered](#44-mark-delivery-as-delivered)
    - [45. Rider Report Issue](#45-rider-report-issue)
12. [Error Reference](#error-reference)
13. [Role Permission Matrix](#role-permission-matrix)

---

## Conventions & Role System

### Response Envelope

```json
{
  "success": true,
  "data": {},
  "error": null,
  "meta": {}
}
```

### Roles

| Role | Value | Access |
|---|---|---|
| Administrator | `admin` | Full access to all sections |
| Ops / Kitchen | `ops` | Daily Ops (no issues queue) + Labels only. No Dashboard Home. |
| Driver / Rider | `driver` | Rider app only — My Deliveries, Mark Delivered, Issue Report |

Role is embedded in the JWT payload as the `role` claim. The backend enforces role access on every endpoint. Attempting to call a forbidden resource returns `403 FORBIDDEN`.

### HTTP Status Codes

| Code | Meaning |
|---|---|
| `200` | OK |
| `201` | Created |
| `204` | No Content (successful delete) |
| `400` | Bad Request |
| `401` | Unauthorized — missing or invalid token |
| `403` | Forbidden — role does not have access |
| `404` | Not Found |
| `409` | Conflict — state violation (e.g. publishing incomplete week) |
| `429` | Too Many Requests |
| `500` | Internal Server Error |

---

## Authentication Module

Staff authentication uses the same OTP infrastructure as the customer app, with an additional `role` field. A single shared login screen handles all three roles. The role is embedded in the JWT on successful verification.

### 1. Send OTP (Staff)

Sends a 4-digit OTP via WhatsApp to the staff phone number. Rate limiting is identical to the customer app: max 3 requests per 10-minute window, 30-minute lock on breach.

```
POST /staff/auth/otp/send
```

**No authentication required.**

#### Request Body

```json
{
  "phone": "+966512345678",
  "role": "admin"
}
```

| Field | Type | Required | Description |
|---|---|---|---|
| `phone` | string | YES | E.164 format |
| `role` | enum | YES | `"admin"`, `"ops"`, or `"driver"` |

#### Success Response `200`

```json
{
  "success": true,
  "data": {
    "otp_id": "otp_staff_01HXYZ1234",
    "role": "admin",
    "expires_in": 120,
    "resend_available_at": "2024-01-15T09:51:00Z"
  }
}
```

#### Error Responses

| Status | Code | Description |
|---|---|---|
| `400` | `INVALID_PHONE` | Not valid E.164 |
| `400` | `INVALID_ROLE` | Must be `admin`, `ops`, or `driver` |
| `403` | `PHONE_NOT_REGISTERED` | Phone not registered as staff for this role |
| `429` | `OTP_RATE_LIMIT` | Includes `retry_after` (seconds) and `locked_until` (ISO 8601) |

---

### 2. Verify OTP (Staff)

Validates the 4-digit OTP. On success returns a JWT with the `role` claim embedded. Client routes to the correct landing screen based on `role`.

```
POST /staff/auth/otp/verify
```

**No authentication required.**

#### Request Body

```json
{
  "otp_id": "otp_staff_01HXYZ1234",
  "phone": "+966512345678",
  "role": "admin",
  "code": "7291"
}
```

#### Success Response `200`

```json
{
  "success": true,
  "data": {
    "access_token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
    "refresh_token": "rft_staff_01HXYZ9999",
    "token_type": "Bearer",
    "access_expires_in": 28800,
    "refresh_expires_in": 2592000,
    "staff": {
      "id": "stf_01HXYZ5678",
      "phone": "+966512345678",
      "name": "Mohammed Al-Qahtani",
      "role": "admin"
    }
  }
}
```

> **Client routing on success:**
> - `role: "admin"` → Dashboard Home (`/dashboard`)
> - `role: "ops"` → Daily Ops (`/daily-ops`) — Dashboard Home is never shown to ops
> - `role: "driver"` → My Deliveries (Rider App)

#### Error Responses

| Status | Code | Description |
|---|---|---|
| `400` | `INVALID_OTP` | Code mismatch. Includes `attempts_remaining` (int). |
| `400` | `OTP_EXPIRED` | OTP no longer valid — must re-request |
| `400` | `OTP_ALREADY_USED` | Already verified |
| `429` | `OTP_ATTEMPTS_EXCEEDED` | 5 failed attempts — OTP invalidated, must re-request |

---

### 3. Refresh Token

Issues a new access token from a valid refresh token.

```
POST /staff/auth/token/refresh
```

**No authentication required.**

#### Request Body

```json
{
  "refresh_token": "rft_staff_01HXYZ9999"
}
```

#### Success Response `200`

```json
{
  "success": true,
  "data": {
    "access_token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
    "access_expires_in": 28800
  }
}
```

---

### 4. Logout

Revokes the refresh token and invalidates the session.

```
POST /staff/auth/logout
```

**Requires authentication.**

#### Request Body

```json
{
  "refresh_token": "rft_staff_01HXYZ9999"
}
```

#### Success Response `200`

```json
{
  "success": true,
  "data": { "message": "Logged out successfully" }
}
```

---

## Dashboard Module

> **Role:** `admin` only. Ops and Driver are never routed here — enforced server-side.

### 5. Get Dashboard Summary

Returns live data for all 6 dashboard tiles. The `open_issues_count` drives the real-time red badge on the Daily Ops tile (hidden when 0).

```
GET /admin/dashboard/summary
```

**Requires authentication. Role: `admin`.**

#### Success Response `200`

```json
{
  "success": true,
  "data": {
    "daily_ops": {
      "meal_count_today": 63,
      "production_stage": "locked",
      "open_issues_count": 3
    },
    "revenue": {
      "mrr_sar": 18400
    },
    "menu": {
      "current_week_label": "W23",
      "slots_filled": 4,
      "slots_total": 5
    },
    "customers": {
      "active_count": 142
    },
    "comms": {
      "active_automations_count": 5
    },
    "areas": {
      "active_count": 3,
      "coming_soon_count": 1,
      "paused_count": 0
    }
  }
}
```

| Field | Notes |
|---|---|
| `open_issues_count` | Real-time unresolved customer issues. Hidden in UI when 0. |
| `production_stage` | `"locked"`, `"dispatch"`, or `"delivered"` |
| `slots_filled` / `slots_total` | Current week planner, max 5 working days |

---

## Daily Operations Module

### 6. Get Daily Ops Summary

Returns the full daily ops view: production pipeline, meal breakdown, and (admin only) open issues queue. Ops role gets the same response minus the `open_issues` key.

```
GET /admin/ops/daily?date={YYYY-MM-DD}
```

**Requires authentication. Role: `admin` or `ops`.**

#### Query Parameters

| Param | Type | Required | Description |
|---|---|---|---|
| `date` | date | NO | Defaults to today. Format: `YYYY-MM-DD` |

#### Success Response `200`

```json
{
  "success": true,
  "data": {
    "date": "2024-05-05",
    "pipeline": {
      "stages": ["locked", "dispatch", "delivered"],
      "current_stage": "locked",
      "locked_at": "2024-05-04T18:00:00Z",
      "meal_count_frozen_at": 63
    },
    "meal_breakdown": {
      "executive": { "count": 41, "percentage": 65 },
      "salad": { "count": 22, "percentage": 35 },
      "total": 63
    },
    "open_issues": [
      {
        "issue_id": "iss_01HXYZ111",
        "customer_id": "usr_01HXYZ5678",
        "customer_name": "Ahmed Al-Rashidi",
        "customer_initials": "A",
        "issue_type": "wrong_order",
        "submitted_at": "2024-05-05T11:46:00Z",
        "minutes_ago": 14
      }
    ]
  }
}
```

> `open_issues` key is **present and populated** for `admin`. For `ops` the key is **entirely absent** — not empty, not null. It is simply not rendered.

#### Pipeline Stage Reference

| Stage | Meaning |
|---|---|
| `locked` | Post-6 PM cutoff. Meal count is frozen. No further count changes. |
| `dispatch` | Meals are dispatched to riders. |
| `delivered` | All deliveries complete for the day. |

---

### 7. Advance Production Stage

Moves the pipeline to the next sequential stage. Strictly ordered: `locked → dispatch → delivered`. No skipping allowed.

```
POST /admin/ops/daily/advance-stage
```

**Requires authentication. Role: `admin` or `ops`.**

#### Request Body

```json
{
  "date": "2024-05-05",
  "from_stage": "locked",
  "to_stage": "dispatch"
}
```

| Field | Type | Required | Notes |
|---|---|---|---|
| `date` | date | YES | Must be today |
| `from_stage` | enum | YES | Server validates this matches current state (optimistic lock guard) |
| `to_stage` | enum | YES | Must be the immediate next stage |

#### Success Response `200`

```json
{
  "success": true,
  "data": {
    "date": "2024-05-05",
    "previous_stage": "locked",
    "current_stage": "dispatch",
    "advanced_at": "2024-05-05T09:15:00Z"
  }
}
```

#### Error Responses

| Status | Code | Description |
|---|---|---|
| `400` | `INVALID_STAGE_TRANSITION` | Skipping stages or reversing |
| `400` | `STAGE_MISMATCH` | `from_stage` does not match current server state |
| `400` | `ALREADY_DELIVERED` | Cannot advance past `delivered` |

---

### 8. Export Delivery Sheet

Triggers an immediate download of the full delivery list as an XLSX spreadsheet. Counts reflect the frozen Locked stage.

```
GET /admin/ops/daily/export?date={YYYY-MM-DD}
```

**Requires authentication. Role: `admin` or `ops`.**

#### Success Response `200`

```
Content-Type: application/vnd.openxmlformats-officedocument.spreadsheetml.sheet
Content-Disposition: attachment; filename="zaadi-delivery-2024-05-05.xlsx"
```

XLSX binary stream. Columns: customer name, building, floor, desk/area, meal type, meal name, delivery preference, rider notes, area.

---

### 9. List Open Issues

Returns unresolved customer issues sorted by submission time (oldest first). Admin only — Ops receives `403`.

```
GET /admin/ops/issues?status={status}&date={YYYY-MM-DD}
```

**Requires authentication. Role: `admin` only.**

#### Query Parameters

| Param | Type | Description |
|---|---|---|
| `status` | enum | `"open"` (default) or `"archived"` |
| `date` | date | Defaults to today |

#### Success Response `200`

```json
{
  "success": true,
  "data": {
    "issues": [
      {
        "issue_id": "iss_01HXYZ111",
        "customer_id": "usr_01HXYZ5678",
        "customer_name": "Ahmed Al-Rashidi",
        "customer_initials": "A",
        "issue_type": "wrong_order",
        "issue_label": "Wrong order",
        "description": null,
        "delivery_date": "2024-05-05",
        "meal_name": "Lamb Kabsa",
        "submitted_at": "2024-05-05T11:46:00Z",
        "status": "open"
      }
    ],
    "total_open": 2
  }
}
```

#### Issue Type Enum

| Value | UI Label |
|---|---|
| `wrong_order` | Wrong order |
| `quality_issue` | Quality issue |
| `not_delivered` | Not delivered |
| `late_delivery` | Late delivery |

---

### 10. Credit Customer Wallet

Credits a customer wallet to resolve an issue. Credit applied immediately. Push notification sent to customer. Issue archived and removed from queue. Cannot be re-actioned.

```
POST /admin/ops/issues/{issue_id}/credit
```

**Requires authentication. Role: `admin` only.**

#### Request Body

```json
{
  "amount_sar": 28
}
```

| Field | Type | Required | Constraints |
|---|---|---|---|
| `amount_sar` | number | YES | 1 to 30. Enforced max SAR 30. |

#### Success Response `200`

```json
{
  "success": true,
  "data": {
    "issue_id": "iss_01HXYZ111",
    "resolution": "credited",
    "amount_credited_sar": 28,
    "customer_id": "usr_01HXYZ5678",
    "new_wallet_balance_sar": 28,
    "push_notification_sent": true,
    "resolved_at": "2024-05-05T12:05:00Z"
  }
}
```

#### Error Responses

| Status | Code | Description |
|---|---|---|
| `400` | `AMOUNT_EXCEEDS_MAX` | Exceeds SAR 30 |
| `400` | `INVALID_AMOUNT` | Must be > 0 |
| `404` | `ISSUE_NOT_FOUND` | Not found |
| `409` | `ISSUE_ALREADY_RESOLVED` | Already credited or rejected |

---

### 11. Reject Customer Issue

Rejects an issue with a required reason. No push notification is sent to the customer. Issue archived immediately. Cannot be reopened.

```
POST /admin/ops/issues/{issue_id}/reject
```

**Requires authentication. Role: `admin` only.**

#### Request Body

```json
{
  "reason": "not_valid",
  "notes": "Order delivered correctly per rider confirmation."
}
```

| Field | Type | Required | Constraints |
|---|---|---|---|
| `reason` | enum | YES | See reason values below |
| `notes` | string | NO | Max 200 characters. Internal only — never shown to customer. |

#### Rejection Reason Enum

| Value | UI Label |
|---|---|
| `not_valid` | Not a valid issue |
| `duplicate` | Duplicate report |
| `outside_policy` | Outside policy |

#### Success Response `200`

```json
{
  "success": true,
  "data": {
    "issue_id": "iss_01HXYZ222",
    "resolution": "rejected",
    "reason": "not_valid",
    "notes": "Order delivered correctly per rider confirmation.",
    "push_notification_sent": false,
    "resolved_at": "2024-05-05T12:10:00Z"
  }
}
```

#### Error Responses

| Status | Code | Description |
|---|---|---|
| `400` | `REASON_REQUIRED` | Reject reason must be provided |
| `400` | `INVALID_REASON` | Must be one of the three valid values |
| `409` | `ISSUE_ALREADY_RESOLVED` | Cannot re-action |

---

## Label Printing Module

> **Role:** `admin` and `ops`. Label counts reflect the frozen Locked stage — never change after the 6 PM cutoff.

### 12. List Labels

Returns the full label list for a given date, filterable by meal type and area. Grouped by area for the table view.

```
GET /admin/labels?date={YYYY-MM-DD}&meal_type={type}&area_id={id}
```

**Requires authentication. Role: `admin` or `ops`.**

#### Query Parameters

| Param | Type | Description |
|---|---|---|
| `date` | date | Defaults to today |
| `meal_type` | enum | `"executive"`, `"salad"`, or omit for all |
| `area_id` | string | Filter by specific area |

#### Success Response `200`

```json
{
  "success": true,
  "data": {
    "date": "2024-05-05",
    "total_count": 63,
    "areas": [
      {
        "area_id": "area_01ALNAKHEEL",
        "area_name": "Al Nakheel",
        "label_count": 28,
        "labels": [
          {
            "label_id": "lbl_01HXYZ001",
            "customer_id": "usr_01HXYZ5678",
            "customer_name": "Ahmed Al-Rashidi",
            "building": "Al Nakheel Tower",
            "floor": "Floor 7",
            "desk_area": "Desk B12",
            "delivery_preference": "hand_to_me",
            "rider_notes": "Call me on arrival",
            "meal_type": "executive",
            "meal_name": "Lamb Kabsa",
            "kcal": 550
          }
        ]
      }
    ]
  }
}
```

---

### 13. Download Label (Single)

Downloads a printable PDF sticker for a single delivery.

```
GET /admin/labels/{label_id}/download
```

**Requires authentication. Role: `admin` or `ops`.**

#### Success Response `200`

```
Content-Type: application/pdf
Content-Disposition: attachment; filename="label-ahmed-al-rashidi-2024-05-05.pdf"
```

PDF binary. Dimensions: **100×60mm**. Contents: customer name, building, floor, desk, meal type, meal name, date, Zaadi branding.

---

### 14. Download Labels by Area

Single PDF with all labels for one area, sorted by building/floor order.

```
GET /admin/labels/download/area/{area_id}?date={YYYY-MM-DD}
```

**Requires authentication. Role: `admin` or `ops`.**

#### Success Response `200`

```
Content-Type: application/pdf
Content-Disposition: attachment; filename="labels-al-nakheel-2024-05-05.pdf"
```

---

### 15. Download All Labels

Single PDF containing all labels for the day, grouped by area.

```
GET /admin/labels/download/all?date={YYYY-MM-DD}
```

**Requires authentication. Role: `admin` or `ops`.**

#### Success Response `200`

```
Content-Type: application/pdf
Content-Disposition: attachment; filename="labels-all-2024-05-05.pdf"
```

---

### 16. Get Label Preview Data

Returns structured data to render a single sticker preview in the browser (100×60mm layout).

```
GET /admin/labels/{label_id}/preview
```

**Requires authentication. Role: `admin` or `ops`.**

#### Success Response `200`

```json
{
  "success": true,
  "data": {
    "label_id": "lbl_01HXYZ001",
    "customer_name": "Ahmed Al-Rashidi",
    "building": "Al Nakheel Tower",
    "floor": "Floor 7",
    "desk_area": "Desk B12",
    "meal_type": "executive",
    "meal_name": "Lamb Kabsa",
    "kcal": 550,
    "date": "2024-05-05",
    "dimensions_mm": { "width": 100, "height": 60 }
  }
}
```

---

## Revenue Dashboard Module

> **Role:** `admin` only.

### 17. Get Revenue Summary

MRR with month-over-month change percentage, subscriber stats, and avg skip rate. Subscriber stat cards are tappable in the UI and link to a pre-filtered Customer List.

```
GET /admin/revenue/summary?month={YYYY-MM}
```

**Requires authentication. Role: `admin`.**

#### Query Parameters

| Param | Type | Description |
|---|---|---|
| `month` | string | Format `YYYY-MM`. Defaults to current month. |

#### Success Response `200`

```json
{
  "success": true,
  "data": {
    "month": "2024-05",
    "mrr_sar": 18400,
    "mrr_change_pct": 12.4,
    "mrr_change_direction": "up",
    "subscribers": {
      "active": 142,
      "new_today": 7,
      "churned_this_month": 3
    },
    "avg_skip_rate_pct": 11.2
  }
}
```

> `churned` = subscription expired + no renewal within 3 days.

---

### 18. Get Daily Revenue Chart

Daily revenue bars for the chart widget. Supports `this_week` and `last_30_days`.

```
GET /admin/revenue/chart?period={period}
```

**Requires authentication. Role: `admin`.**

#### Query Parameters

| Param | Values | Default |
|---|---|---|
| `period` | `"this_week"`, `"last_30_days"` | `"this_week"` |

#### Success Response `200`

```json
{
  "success": true,
  "data": {
    "period": "this_week",
    "bars": [
      { "date": "2024-05-05", "day_label": "Sun", "revenue_sar": 3100 },
      { "date": "2024-05-06", "day_label": "Mon", "revenue_sar": 3900 },
      { "date": "2024-05-07", "day_label": "Tue", "revenue_sar": 4200 },
      { "date": "2024-05-08", "day_label": "Wed", "revenue_sar": 3600 },
      { "date": "2024-05-09", "day_label": "Thu", "revenue_sar": 3400 }
    ]
  }
}
```

---

### 19. Get Plan Breakdown

Subscriber count per plan type, for the horizontal bar breakdown.

```
GET /admin/revenue/plan-breakdown?month={YYYY-MM}
```

**Requires authentication. Role: `admin`.**

#### Success Response `200`

```json
{
  "success": true,
  "data": {
    "month": "2024-05",
    "plans": [
      { "plan_type": "month", "label": "Month Plan", "count": 95, "percentage": 67 },
      { "plan_type": "week",  "label": "Week Plan",  "count": 32, "percentage": 23 },
      { "plan_type": "trial", "label": "Trial",      "count": 15, "percentage": 10 }
    ]
  }
}
```

---

## Menu Manager Module

> **Role:** `admin` only. The planner covers current week (N, read-only if published) and Week N+1 (editable). Week navigation supports planning up to W+4. Sunday–Thursday layout only (Saudi working week).

### 20. Get 2-Week Planner

Returns the planner grid for two consecutive weeks. Each day has `executive` and `salad` slots.

```
GET /admin/menu/planner?week={week_number}&year={year}
```

**Requires authentication. Role: `admin`.**

#### Query Parameters

| Param | Type | Default |
|---|---|---|
| `week` | integer | Current ISO week |
| `year` | integer | Current year |

#### Success Response `200`

```json
{
  "success": true,
  "data": {
    "weeks": [
      {
        "week_number": 23,
        "year": 2024,
        "label": "W23",
        "status": "published",
        "is_editable": false,
        "slots_filled": 10,
        "slots_total": 10,
        "all_slots_filled": true,
        "days": [
          {
            "date": "2024-05-05",
            "day_label": "Sun",
            "slots": [
              {
                "slot_id": "slot_W23_SUN_EXEC",
                "meal_type": "executive",
                "dish_id": "dish_01LAMB",
                "dish_name": "Lamb Kabsa",
                "kcal": 550,
                "is_filled": true
              },
              {
                "slot_id": "slot_W23_SUN_SALAD",
                "meal_type": "salad",
                "dish_id": "dish_01GREEK",
                "dish_name": "Greek Salad",
                "kcal": 320,
                "is_filled": true
              }
            ]
          }
        ]
      },
      {
        "week_number": 24,
        "year": 2024,
        "label": "W24",
        "status": "draft",
        "is_editable": true,
        "slots_filled": 2,
        "slots_total": 10,
        "all_slots_filled": false,
        "days": []
      }
    ]
  }
}
```

> `status`: `"draft"` (editable) or `"published"` (locked, read-only). Published weeks cannot be unpublished.

---

### 21. Assign Dish to Slot

Assigns an Active dish to a slot. Replaces any existing dish in that slot. Draft dishes and dishes already used elsewhere in the same week cannot be assigned.

```
PUT /admin/menu/slots/{slot_id}/assign
```

**Requires authentication. Role: `admin`.**

#### Request Body

```json
{
  "dish_id": "dish_01SALEEG"
}
```

#### Success Response `200`

```json
{
  "success": true,
  "data": {
    "slot_id": "slot_W24_TUE_EXEC",
    "dish_id": "dish_01SALEEG",
    "dish_name": "Saleeg Rice",
    "kcal": 510,
    "assigned_at": "2024-05-05T10:30:00Z"
  }
}
```

#### Error Responses

| Status | Code | Description |
|---|---|---|
| `400` | `DISH_NOT_ACTIVE` | Dish is in Draft status |
| `409` | `DISH_ALREADY_USED_THIS_WEEK` | Same dish assigned on another day this week. Includes `used_on_day`. |
| `403` | `WEEK_PUBLISHED` | Slot belongs to a published (locked) week |
| `404` | `SLOT_NOT_FOUND` | Slot ID not found |

---

### 22. Remove Dish from Slot

Clears a slot back to empty. Only on draft weeks.

```
DELETE /admin/menu/slots/{slot_id}/assign
```

**Requires authentication. Role: `admin`.**

#### Success Response `204` No Content

---

### 23. Publish Week Menu

Publishes the week's menu, making it immediately visible in the customer app Menu tab. All 10 slots (5 days × Executive + Salad) must be filled. Cannot be unpublished.

```
POST /admin/menu/weeks/publish
```

**Requires authentication. Role: `admin`.**

#### Request Body

```json
{
  "week_number": 24,
  "year": 2024
}
```

#### Success Response `200`

```json
{
  "success": true,
  "data": {
    "week_number": 24,
    "year": 2024,
    "status": "published",
    "published_at": "2024-05-05T10:45:00Z",
    "visible_in_customer_app": true
  }
}
```

#### Error Responses

| Status | Code | Description |
|---|---|---|
| `409` | `SLOTS_INCOMPLETE` | Not all 10 slots filled. Includes `unfilled_slots` array. |
| `409` | `ALREADY_PUBLISHED` | Week already published |

---

### 24. List Meal Library

All dishes in the library. Filterable by status. Used in the library management view and as the source for the Assign Dish picker (which shows only Active dishes).

```
GET /admin/menu/dishes?status={status}&q={query}
```

**Requires authentication. Role: `admin`.**

#### Query Parameters

| Param | Type | Description |
|---|---|---|
| `status` | enum | `"active"`, `"draft"`, or omit for all |
| `q` | string | Search by dish name |

#### Success Response `200`

```json
{
  "success": true,
  "data": {
    "dishes": [
      {
        "dish_id": "dish_01LAMB",
        "name": "Lamb Kabsa",
        "kcal": 550,
        "protein_g": 38,
        "status": "active",
        "photo_url": "https://cdn.zaadikitchen.com/dishes/lamb-kabsa.jpg",
        "created_at": "2024-01-10T00:00:00Z"
      }
    ],
    "total": 24,
    "active_count": 18,
    "draft_count": 6
  }
}
```

---

### 25. Create Dish

Creates a new dish. **Always saved as `draft`** regardless of any input — admin must explicitly activate via [Set Dish Status](#27-set-dish-status). Photos must be uploaded separately (manual only — XLSX import does not support photos).

```
POST /admin/menu/dishes
```

**Requires authentication. Role: `admin`.**

#### Request Body

```json
{
  "name": "Stuffed Vine Leaves",
  "kcal": 480,
  "protein_g": 28,
  "carbs_g": 55,
  "fat_g": 14,
  "description": "Traditional stuffed vine leaves with rice and herbs.",
  "allergens": ["gluten"]
}
```

| Field | Type | Required | Constraints |
|---|---|---|---|
| `name` | string | YES | Max 100 chars |
| `kcal` | integer | YES | |
| `protein_g` | number | YES | |
| `carbs_g` | number | NO | |
| `fat_g` | number | NO | |
| `description` | string | NO | Max 500 chars |
| `allergens` | string[] | NO | |

#### Success Response `201`

```json
{
  "success": true,
  "data": {
    "dish_id": "dish_03NEW",
    "name": "Stuffed Vine Leaves",
    "status": "draft",
    "photo_url": null,
    "created_at": "2024-05-05T11:00:00Z"
  }
}
```

---

### 26. Update Dish

Updates dish metadata. Changes to `name` or `kcal` do not retroactively update already-published menu data.

```
PATCH /admin/menu/dishes/{dish_id}
```

**Requires authentication. Role: `admin`.**

#### Request Body (all fields optional)

```json
{
  "name": "Stuffed Vine Leaves — Classic",
  "kcal": 490,
  "description": "Updated description."
}
```

#### Success Response `200`

```json
{
  "success": true,
  "data": {
    "dish_id": "dish_03NEW",
    "name": "Stuffed Vine Leaves — Classic",
    "updated_at": "2024-05-05T11:15:00Z"
  }
}
```

---

### 27. Set Dish Status

Toggles a dish between `active` and `draft`. Deactivating a dish that is assigned to a published week requires explicit confirmation via `confirm_impact: true`.

```
PATCH /admin/menu/dishes/{dish_id}/status
```

**Requires authentication. Role: `admin`.**

#### Request Body

```json
{
  "status": "active",
  "confirm_impact": false
}
```

#### Error Responses

| Status | Code | Description |
|---|---|---|
| `409` | `CONFIRM_IMPACT_REQUIRED` | Dish is in a published week. Re-send with `confirm_impact: true`. Response includes `affected_weeks` array. |

---

### 28. Import Dishes via XLSX

Bulk imports dishes from a spreadsheet file. All imported dishes are created as `draft`. Photos are excluded from import and must be added manually.

```
POST /admin/menu/dishes/import
Content-Type: multipart/form-data
```

**Requires authentication. Role: `admin`.**

#### Form Data

| Field | Type | Notes |
|---|---|---|
| `file` | file | `.xlsx` only. Max 5MB. |

#### Success Response `200`

```json
{
  "success": true,
  "data": {
    "imported_count": 12,
    "failed_count": 1,
    "all_status": "draft",
    "failures": [
      { "row": 5, "reason": "Missing required field: kcal" }
    ]
  }
}
```

---

## Customer Management Module

> **Role:** `admin` only.

### 29. List Customers

Paginated, searchable, filterable customer list. Supports pre-filtered entry when navigating from the Revenue drilldown (e.g. `status=churned`).

```
GET /admin/customers?q={query}&status={status}&plan_type={type}&page={n}&per_page={n}
```

**Requires authentication. Role: `admin`.**

#### Query Parameters

| Param | Type | Description |
|---|---|---|
| `q` | string | Search by name or phone |
| `status` | enum | `"active"`, `"churned"`, `"paused"`, `"expired"` |
| `plan_type` | enum | `"executive"`, `"salad"` |
| `page` | integer | Default 1 |
| `per_page` | integer | Default 20, max 100 |

#### Success Response `200`

```json
{
  "success": true,
  "data": {
    "customers": [
      {
        "customer_id": "usr_01HXYZ5678",
        "name": "Ahmed Al-Rashidi",
        "phone": "+966512345678",
        "status": "active",
        "plan_type": "executive",
        "plan_end_date": "2024-05-31",
        "wallet_balance_sar": 0,
        "open_issue_count": 0,
        "is_churned": false
      }
    ],
    "total": 142,
    "page": 1,
    "per_page": 20
  }
}
```

> `is_churned: true` when subscription expired with no renewal within 3 days. Churned rows render at 60% opacity in the UI.

---

### 30. Get Customer Detail

Expanded inline detail for a single customer: plan, wallet, delivery address, issue summary. Rendered on row expand in the customer list.

```
GET /admin/customers/{customer_id}
```

**Requires authentication. Role: `admin`.**

#### Success Response `200`

```json
{
  "success": true,
  "data": {
    "customer_id": "usr_01HXYZ5678",
    "name": "Ahmed Al-Rashidi",
    "phone": "+966512345678",
    "email": "ahmed@example.com",
    "status": "active",
    "plan": {
      "type": "executive",
      "period": "month",
      "start_date": "2024-05-01",
      "end_date": "2024-05-31"
    },
    "wallet_balance_sar": 28,
    "delivery_location": {
      "area_name": "Al Nakheel",
      "building": "Al Nakheel Tower, King Fahad Rd",
      "floor": "Floor 7",
      "desk_area": "Desk B12",
      "delivery_preference": "hand_to_me"
    },
    "issue_summary": {
      "total_issues": 2,
      "credited_count": 1,
      "rejected_count": 1
    }
  }
}
```

---

### 31. Get Customer History

Full history panel: all subscription periods, delivery records, skipped days, and resolved issues with resolution details.

```
GET /admin/customers/{customer_id}/history
```

**Requires authentication. Role: `admin`.**

#### Success Response `200`

```json
{
  "success": true,
  "data": {
    "customer_id": "usr_01HXYZ5678",
    "subscriptions": [
      {
        "subscription_id": "sub_01HXYZ001",
        "plan_type": "executive",
        "period": "month",
        "start_date": "2024-05-01",
        "end_date": "2024-05-31",
        "status": "active",
        "skipped_days": ["2024-05-10", "2024-05-15"],
        "delivered_count": 12,
        "skipped_count": 2
      }
    ],
    "resolved_issues": [
      {
        "issue_id": "iss_01HXYZ111",
        "issue_type": "wrong_order",
        "submitted_at": "2024-05-05T11:46:00Z",
        "resolution": "credited",
        "amount_credited_sar": 28,
        "resolved_at": "2024-05-05T12:05:00Z"
      }
    ]
  }
}
```

---

## Comms & Automations Module

> **Role:** `admin` only. All notifications are **push only** — no WhatsApp or SMS for admin-triggered comms.

### 32. List Automation Toggles

Returns the state of all 5 automation triggers. All default to `is_active: true`.

```
GET /admin/comms/automations
```

**Requires authentication. Role: `admin`.**

#### Success Response `200`

```json
{
  "success": true,
  "data": {
    "automations": [
      {
        "automation_id": "auto_delivery_confirmed",
        "name": "Delivery Confirmed",
        "description": "Trigger: Driver taps Mark as Delivered",
        "channel": "push",
        "is_active": true
      },
      {
        "automation_id": "auto_plan_expiring",
        "name": "Plan Expiring Soon",
        "description": "Trigger: 2 days before plan end date",
        "channel": "push",
        "is_active": true
      },
      {
        "automation_id": "auto_skip_reminder",
        "name": "Skip Reminder",
        "description": "Trigger: Day before delivery, if not already skipped",
        "channel": "push",
        "is_active": true
      },
      {
        "automation_id": "auto_wallet_credited",
        "name": "Wallet Credited",
        "description": "Trigger: Admin credits customer wallet via issue resolution",
        "channel": "push",
        "is_active": true
      },
      {
        "automation_id": "auto_renewal_success",
        "name": "Renewal Successful",
        "description": "Trigger: Successful subscription renewal payment",
        "channel": "push",
        "is_active": true
      }
    ]
  }
}
```

---

### 33. Update Automation Toggle

Enables or disables a single automation independently.

```
PATCH /admin/comms/automations/{automation_id}
```

**Requires authentication. Role: `admin`.**

#### Request Body

```json
{
  "is_active": false
}
```

#### Success Response `200`

```json
{
  "success": true,
  "data": {
    "automation_id": "auto_delivery_confirmed",
    "is_active": false,
    "updated_at": "2024-05-05T13:00:00Z"
  }
}
```

---

### 34. Get Broadcast Segments

Returns all available broadcast segments with live recipient counts. Count of 0 disables the Send button in the UI.

```
GET /admin/comms/broadcast/segments
```

**Requires authentication. Role: `admin`.**

#### Success Response `200`

```json
{
  "success": true,
  "data": {
    "segments": [
      {
        "segment_id": "seg_delivering_today",
        "label": "Delivering Today",
        "description": "Customers with a meal being delivered today",
        "recipient_count": 63
      },
      {
        "segment_id": "seg_all_active",
        "label": "All Active Subscribers",
        "recipient_count": 142
      },
      {
        "segment_id": "seg_expiring_this_week",
        "label": "Expiring This Week",
        "recipient_count": 11
      },
      {
        "segment_id": "seg_paused",
        "label": "Paused Subscriptions",
        "recipient_count": 8
      }
    ]
  }
}
```

---

### 35. Send Broadcast

Sends a push notification to a segment. CTA label in UI shows live recipient count. Disabled when count = 0.

```
POST /admin/comms/broadcast/send
```

**Requires authentication. Role: `admin`.**

#### Request Body

```json
{
  "segment_id": "seg_delivering_today",
  "message": "Your meal is being prepared and will be delivered by 12:30 PM. Enjoy!"
}
```

| Field | Type | Required | Constraints |
|---|---|---|---|
| `segment_id` | string | YES | Must be a valid segment ID |
| `message` | string | YES | Max 500 characters |

#### Success Response `200`

```json
{
  "success": true,
  "data": {
    "broadcast_id": "bcast_01HXYZ9999",
    "segment_id": "seg_delivering_today",
    "recipient_count": 63,
    "channel": "push",
    "sent_at": "2024-05-05T10:00:00Z"
  }
}
```

#### Error Responses

| Status | Code | Description |
|---|---|---|
| `400` | `EMPTY_SEGMENT` | 0 recipients — cannot send |
| `400` | `MESSAGE_TOO_LONG` | Exceeds 500 characters |

---

## Areas & Buildings Module

> **Role:** `admin` only.

### 36. List Areas (Admin)

Returns all areas across all statuses, including Coming Soon and Paused (unlike the customer-facing endpoint which returns Active only). Includes customer count per area.

```
GET /admin/areas?status={status}
```

**Requires authentication. Role: `admin`.**

#### Query Parameters

| Param | Values |
|---|---|
| `status` | `"active"`, `"coming_soon"`, `"paused"`, or omit for all |

#### Success Response `200`

```json
{
  "success": true,
  "data": {
    "summary": {
      "active_count": 3,
      "coming_soon_count": 1,
      "paused_count": 0
    },
    "areas": [
      {
        "area_id": "area_01ALNAKHEEL",
        "name": "Al Nakheel",
        "coverage_description": "Offices & business towers",
        "status": "active",
        "customer_count": 52
      },
      {
        "area_id": "area_02ALZAHRA",
        "name": "Al Zahra",
        "coverage_description": "Residential & offices",
        "status": "coming_soon",
        "customer_count": 0
      }
    ]
  }
}
```

---

### 37. Create Area

Creates a new delivery area.

```
POST /admin/areas
```

**Requires authentication. Role: `admin`.**

#### Request Body

```json
{
  "name": "Al Zahra",
  "coverage_description": "Residential & offices",
  "status": "coming_soon"
}
```

| Field | Type | Required | Constraints |
|---|---|---|---|
| `name` | string | YES | Max 100 chars |
| `coverage_description` | string | NO | Max 200 chars |
| `status` | enum | YES | `"active"`, `"coming_soon"`, or `"paused"` |

#### Success Response `201`

```json
{
  "success": true,
  "data": {
    "area_id": "area_04ALZAHRA",
    "name": "Al Zahra",
    "status": "coming_soon",
    "created_at": "2024-05-05T14:00:00Z"
  }
}
```

---

### 38. Update Area

Updates area fields. **Activating a `coming_soon` or `paused` area to `active` requires `confirm_activation: true`** — the UI shows a warning block before allowing this action. Downgrading from Active to Coming Soon/Paused does not require confirmation.

```
PATCH /admin/areas/{area_id}
```

**Requires authentication. Role: `admin`.**

#### Request Body

```json
{
  "status": "active",
  "coverage_description": "Residential offices and business towers",
  "confirm_activation": true
}
```

| Field | Type | Required | Notes |
|---|---|---|---|
| `name` | string | NO | |
| `coverage_description` | string | NO | |
| `status` | enum | NO | `"active"`, `"coming_soon"`, `"paused"` |
| `confirm_activation` | boolean | NO | Required as `true` only when transitioning to `"active"` |

#### Success Response `200`

```json
{
  "success": true,
  "data": {
    "area_id": "area_02ALZAHRA",
    "name": "Al Zahra",
    "status": "active",
    "updated_at": "2024-05-05T14:10:00Z",
    "visible_in_customer_onboarding": true
  }
}
```

#### Error Responses

| Status | Code | Description |
|---|---|---|
| `409` | `CONFIRM_ACTIVATION_REQUIRED` | Must pass `confirm_activation: true` to activate |

---

### 39. List Buildings for Area

Returns admin-managed buildings for an area. These populate the customer onboarding auto-suggest. Customer free-text entries are never stored here.

```
GET /admin/areas/{area_id}/buildings
```

**Requires authentication. Role: `admin`.**

#### Success Response `200`

```json
{
  "success": true,
  "data": {
    "area_id": "area_01ALNAKHEEL",
    "area_name": "Al Nakheel",
    "buildings": [
      { "building_id": "bld_01", "name": "Al Nakheel Tower, King Fahad Rd" },
      { "building_id": "bld_02", "name": "Nakheel Business Park Tower A" },
      { "building_id": "bld_03", "name": "Al Nakheel Plaza, Office Tower" }
    ]
  }
}
```

---

### 40. Add Building

Adds a new building. Immediately available in customer onboarding auto-suggest on creation.

```
POST /admin/areas/{area_id}/buildings
```

**Requires authentication. Role: `admin`.**

#### Request Body

```json
{
  "name": "Al Nakheel Gate Tower"
}
```

| Field | Constraints |
|---|---|
| `name` | Required. Max 200 characters. |

#### Success Response `201`

```json
{
  "success": true,
  "data": {
    "building_id": "bld_04",
    "area_id": "area_01ALNAKHEEL",
    "name": "Al Nakheel Gate Tower",
    "created_at": "2024-05-05T14:30:00Z"
  }
}
```

---

### 41. Update Building

Updates a building name. Reflected in customer auto-suggest immediately. Does **not** retroactively update existing customer saved addresses, labels, or historical records.

```
PATCH /admin/areas/{area_id}/buildings/{building_id}
```

**Requires authentication. Role: `admin`.**

#### Request Body

```json
{
  "name": "Al Nakheel Gate Tower — Block B"
}
```

#### Success Response `200`

```json
{
  "success": true,
  "data": {
    "building_id": "bld_04",
    "name": "Al Nakheel Gate Tower — Block B",
    "updated_at": "2024-05-05T14:35:00Z",
    "retroactive_update": false
  }
}
```

---

### 42. Delete Building

Removes building from the auto-suggest list only. Existing customer delivery addresses referencing this building are **unaffected** — building name persists on all historical labels and address records.

```
DELETE /admin/areas/{area_id}/buildings/{building_id}
```

**Requires authentication. Role: `admin`.**

#### Success Response `200`

```json
{
  "success": true,
  "data": {
    "building_id": "bld_04",
    "deleted_from_auto_suggest": true,
    "existing_customer_addresses_affected": false
  }
}
```

---

## Rider App Module

> **Role:** `driver` only. Mobile phone UI. Rider sees only their own deliveries for today.

### 43. Get My Deliveries (Rider)

Returns today's assigned delivery list for the authenticated rider, sorted by area and building.

```
GET /rider/deliveries?date={YYYY-MM-DD}
```

**Requires authentication. Role: `driver`.**

#### Query Parameters

| Param | Default |
|---|---|
| `date` | Today |

#### Success Response `200`

```json
{
  "success": true,
  "data": {
    "date": "2024-05-05",
    "rider_name": "Faisal Al-Harbi",
    "total_deliveries": 21,
    "delivered_count": 5,
    "pending_count": 16,
    "deliveries": [
      {
        "delivery_id": "del_01HXYZ_A001",
        "customer_name": "Ahmed Al-Rashidi",
        "building": "Al Nakheel Tower, King Fahad Rd",
        "floor": "Floor 7",
        "desk_area": "Desk B12",
        "delivery_preference": "hand_to_me",
        "rider_notes": "Call me on arrival",
        "meal_type": "executive",
        "meal_name": "Lamb Kabsa",
        "status": "pending",
        "delivered_at": null
      }
    ]
  }
}
```

#### Delivery Status Values

| Value | Description |
|---|---|
| `pending` | Not yet delivered |
| `delivered` | Marked as delivered |

---

### 44. Mark Delivery as Delivered

Marks one delivery as delivered. Timestamp recorded server-side. Triggers `Delivery Confirmed` push notification to the customer if that automation is active.

```
POST /rider/deliveries/{delivery_id}/delivered
```

**Requires authentication. Role: `driver`.**

#### Request Body

Empty — no body required.

#### Success Response `200`

```json
{
  "success": true,
  "data": {
    "delivery_id": "del_01HXYZ_A001",
    "status": "delivered",
    "delivered_at": "2024-05-05T12:32:00Z",
    "customer_notification_sent": true
  }
}
```

#### Error Responses

| Status | Code | Description |
|---|---|---|
| `404` | `DELIVERY_NOT_FOUND` | Not assigned to this rider |
| `409` | `ALREADY_DELIVERED` | Cannot re-mark a delivered delivery |

---

### 45. Rider Report Issue

Rider flags a delivery problem (e.g. customer not found). This is an internal ops flag, separate from the customer-submitted issues queue.

```
POST /rider/deliveries/{delivery_id}/issue
```

**Requires authentication. Role: `driver`.**

#### Request Body

```json
{
  "issue_type": "customer_not_found",
  "notes": "Called twice, no answer. Left at reception."
}
```

| Field | Type | Required | Constraints |
|---|---|---|---|
| `issue_type` | enum | YES | See values below |
| `notes` | string | NO | Max 300 characters |

#### Rider Issue Type Enum

| Value | Label |
|---|---|
| `customer_not_found` | Customer not found |
| `wrong_address` | Wrong address |
| `access_denied` | Could not access building |
| `other` | Other |

#### Success Response `201`

```json
{
  "success": true,
  "data": {
    "rider_issue_id": "rider_iss_01HXYZ001",
    "delivery_id": "del_01HXYZ_A001",
    "issue_type": "customer_not_found",
    "notes": "Called twice, no answer. Left at reception.",
    "reported_at": "2024-05-05T12:35:00Z"
  }
}
```

---

## Error Reference

```json
{
  "success": false,
  "data": null,
  "error": {
    "code": "ERROR_CODE",
    "message": "Developer-facing description",
    "details": {}
  }
}
```

| Code | HTTP | Description |
|---|---|---|
| `INVALID_PHONE` | 400 | Not valid E.164 format |
| `INVALID_ROLE` | 400 | Must be `admin`, `ops`, or `driver` |
| `PHONE_NOT_REGISTERED` | 403 | Phone not registered as staff |
| `OTP_RATE_LIMIT` | 429 | Max 3 requests / 10-min window. Includes `retry_after`, `locked_until`. |
| `INVALID_OTP` | 400 | Code mismatch. Includes `attempts_remaining`. |
| `OTP_EXPIRED` | 400 | OTP no longer valid |
| `OTP_ATTEMPTS_EXCEEDED` | 429 | 5 failed attempts — OTP invalidated |
| `INVALID_STAGE_TRANSITION` | 400 | Cannot skip or reverse pipeline stages |
| `STAGE_MISMATCH` | 400 | `from_stage` does not match server state |
| `ALREADY_DELIVERED` | 409 | Cannot advance past `delivered` / re-mark delivery |
| `AMOUNT_EXCEEDS_MAX` | 400 | Wallet credit exceeds SAR 30 |
| `INVALID_AMOUNT` | 400 | Amount must be > 0 |
| `ISSUE_ALREADY_RESOLVED` | 409 | Issue already credited or rejected |
| `REASON_REQUIRED` | 400 | Reject reason must be provided |
| `INVALID_REASON` | 400 | Not a valid rejection reason |
| `SLOTS_INCOMPLETE` | 409 | Cannot publish — not all 10 slots filled. Includes `unfilled_slots`. |
| `ALREADY_PUBLISHED` | 409 | Week already published |
| `DISH_NOT_ACTIVE` | 400 | Draft dish cannot be assigned to a slot |
| `DISH_ALREADY_USED_THIS_WEEK` | 409 | Same dish used on another day this week. Includes `used_on_day`. |
| `WEEK_PUBLISHED` | 403 | Cannot edit slots on a published week |
| `CONFIRM_ACTIVATION_REQUIRED` | 409 | Area activation requires `confirm_activation: true` |
| `CONFIRM_IMPACT_REQUIRED` | 409 | Deactivating a published dish requires `confirm_impact: true`. Includes `affected_weeks`. |
| `EMPTY_SEGMENT` | 400 | Broadcast segment has 0 recipients |
| `MESSAGE_TOO_LONG` | 400 | Broadcast message exceeds 500 chars |
| `DELIVERY_NOT_FOUND` | 404 | Delivery not assigned to this rider |
| `FORBIDDEN` | 403 | Role does not have access to this endpoint |

---

## Role Permission Matrix

| Endpoint Group | Admin | Ops | Driver |
|---|:---:|:---:|:---:|
| Staff Auth (OTP send/verify/refresh/logout) | YES | YES | YES |
| Dashboard Summary | YES | NO | NO |
| Daily Ops — Pipeline & Meal Breakdown | YES | YES | NO |
| Daily Ops — Open Issues Queue | YES | NO | NO |
| Credit Issue | YES | NO | NO |
| Reject Issue | YES | NO | NO |
| Export Delivery Sheet | YES | YES | NO |
| Label List | YES | YES | NO |
| Label Download (single / area / all) | YES | YES | NO |
| Label Preview | YES | YES | NO |
| Revenue Summary | YES | NO | NO |
| Revenue Chart | YES | NO | NO |
| Plan Breakdown | YES | NO | NO |
| Menu Planner (view/assign/publish) | YES | NO | NO |
| Meal Library (CRUD, import) | YES | NO | NO |
| Customer List | YES | NO | NO |
| Customer Detail | YES | NO | NO |
| Customer History | YES | NO | NO |
| Automation Toggles | YES | NO | NO |
| Broadcast | YES | NO | NO |
| Areas CRUD | YES | NO | NO |
| Buildings CRUD | YES | NO | NO |
| Rider — My Deliveries | NO | NO | YES |
| Rider — Mark Delivered | NO | NO | YES |
| Rider — Report Issue | NO | NO | YES |

---

*Generated from Zaadi Kitchen Admin · Ops · Rider UI Screens v1. Covers 23 screens across F1–F49 feature references. Customer-facing APIs are documented separately in `zaadi-kitchen-api-docs.md`.*
