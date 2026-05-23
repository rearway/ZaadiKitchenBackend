# Zaadi Kitchen — Admin API Documentation
## Phase 1: Authentication · Dashboard · Daily Operations

**Base URL:** `{{base_url}}` → `http://localhost:3000/api/v1`
**Auth:** All `/admin/*` endpoints require `Authorization: Bearer {{admin_access_token}}`.
**Role guard:** Role is embedded in the token. The server rejects requests made with the wrong role's token with `403 Forbidden`.
**Content-Type:** `application/json`

> **Phased release plan**
> | Phase | Modules | Status |
> |---|---|---|
> | **Phase 1** (this doc) | Auth · Dashboard · Daily Ops | ← You are here |
> | Phase 2 | Menu Manager · Meal Library | |
> | Phase 3 | Customer Management · Revenue | |
> | Phase 4 | Comms & Automations · Areas & Buildings | |

---

## Table of Contents

1. [Authentication (shared — Admin, Ops, Driver)](#1-authentication)
   - 1.1 POST /auth/admin/otp/send
   - 1.2 POST /auth/admin/otp/verify
   - 1.3 POST /auth/admin/logout
2. [Dashboard Home (Admin only)](#2-dashboard-home)
   - 2.1 GET /admin/dashboard
3. [Daily Operations — Admin View](#3-daily-operations--admin-view)
   - 3.1 GET /admin/daily-ops
   - 3.2 POST /admin/daily-ops/pipeline/advance
   - 3.3 GET /admin/daily-ops/issues
   - 3.4 POST /admin/daily-ops/issues/:issue_id/credit
   - 3.5 POST /admin/daily-ops/issues/:issue_id/reject
4. [Daily Operations — Ops/Kitchen View](#4-daily-operations--opskitchen-view)
   - 4.1 GET /ops/daily-ops
   - 4.2 POST /ops/daily-ops/pipeline/advance
5. [Delivery Labels](#5-delivery-labels)
   - 5.1 GET /admin/daily-ops/labels
   - 5.2 GET /admin/daily-ops/labels/:label_id/download
6. [Error Reference](#6-error-reference)

---

## 1. Authentication

Three roles share the same OTP sign-in flow: **Administrator**, **Ops/Kitchen**, and **Driver**. The role is selected on the login screen before the OTP is sent, and is embedded in the returned access token. Post-login routing is role-dependent:

| Role | Routes to |
|------|-----------|
| `admin` | Dashboard Home (`/dashboard`) |
| `ops` | Daily Ops — Ops view (`/daily-ops`) |
| `driver` | My Deliveries (`/rider/deliveries`) |

> **Note:** `POST /auth/admin/login` (email + password) in the existing Postman collection is a legacy endpoint for admin email login. The role-based OTP flow below is the primary login path shown in the UI (F1–F3). Both can coexist.

---

### 1.1 `POST /auth/admin/otp/send`

Sends a 4-digit OTP to the given phone number for the selected role. Uses the same rate-limit rules as the customer app: max 3 requests per 10-minute window, 30-minute lock after limit.

**Auth:** None

**Request Body**

```json
{
  "phone": "+966551234567",
  "role": "admin"
}
```

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `phone` | string | Yes | E.164 format. Must be a registered staff number for the given role. |
| `role` | string | Yes | One of: `admin`, `ops`, `driver` |

**Response `200 OK`**

```json
{
  "phone": "+966551234567",
  "role": "admin",
  "expires_in_seconds": 300,
  "resend_available_at": "2025-05-05T09:46:00Z"
}
```

**Response `403 Forbidden` — Phone not registered for role**

```json
{
  "error": "PHONE_NOT_REGISTERED",
  "message": "This phone number is not registered for the Admin role."
}
```

**Response `429 Too Many Requests` — Rate limit hit**

```json
{
  "error": "OTP_RATE_LIMIT",
  "message": "Too many requests. Try again after 30 minutes.",
  "retry_after": "2025-05-05T10:16:00Z"
}
```

**Business Rules**
- OTP is always delivered via WhatsApp (no SMS option for staff login).
- Phone numbers must be pre-registered in the staff directory by an admin.
- Rate limit and OTP TTL (5 min) are identical to the customer app flow.

---

### 1.2 `POST /auth/admin/otp/verify`

Verifies the 4-digit OTP and returns role-scoped access and refresh tokens.

**Auth:** None

**Request Body**

```json
{
  "phone": "+966551234567",
  "role": "admin",
  "code": "4821"
}
```

**Response `200 OK`**

```json
{
  "access_token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
  "refresh_token": "dGhpcyBpcyBhIHJlZnJlc2ggdG9rZW4...",
  "expires_in": 3600,
  "role": "admin",
  "staff": {
    "id": "staff_01JM",
    "name": "Mohammed Al-Qahtani",
    "initials": "M",
    "role": "admin"
  },
  "redirect_to": "/admin/dashboard"
}
```

| `role` | `redirect_to` |
|--------|--------------|
| `admin` | `/admin/dashboard` |
| `ops` | `/ops/daily-ops` |
| `driver` | `/rider/deliveries` |

**Response `401 Unauthorized` — Wrong code**

```json
{
  "error": "INVALID_OTP",
  "message": "Incorrect code. Please try again.",
  "attempts_remaining": 3
}
```

**Business Rules**
- Max 5 invalid attempts before the code is invalidated (same as customer app).
- `role` in the response is included in the JWT payload so every subsequent request is role-validated server-side without a DB lookup.

---

### 1.3 `POST /auth/admin/logout`

Revokes all active sessions for the authenticated staff member. Clears all devices.

**Auth:** Required (any admin role)

**Request Body** — None required.

**Response `200 OK`**

```json
{
  "message": "All sessions revoked."
}
```

> This is the existing `POST /auth/admin/logout` from the Postman collection, documented here with the correct response shape.

---

## 2. Dashboard Home

### 2.1 `GET /admin/dashboard`

Returns all data needed to populate the 6-tile grid on the Admin Dashboard Home. Each tile has a `label` (static) and `sub_label` (live data). The `daily_ops` tile includes a live `open_issues_count` badge.

**Auth:** Required — `admin` role only. Returns `403` for `ops` or `driver` tokens.

**Response `200 OK`**

```json
{
  "date_label": "Sunday, 5 May 2025",
  "greeting": "Good morning",
  "staff_name": "Mohammed Al-Qahtani",
  "tiles": [
    {
      "id": "daily_ops",
      "icon": "📋",
      "label": "Daily Ops",
      "sub_label": "63 meals today · Locked ✓",
      "open_issues_count": 3,
      "route": "/admin/daily-ops"
    },
    {
      "id": "revenue",
      "icon": "💰",
      "label": "Revenue",
      "sub_label": "MRR: SAR 18,400",
      "open_issues_count": null,
      "route": "/admin/revenue"
    },
    {
      "id": "menu_manager",
      "icon": "🍽",
      "label": "Menu Manager",
      "sub_label": "W23 · 4 of 5 days filled",
      "open_issues_count": null,
      "route": "/admin/menu"
    },
    {
      "id": "customers",
      "icon": "👥",
      "label": "Customers",
      "sub_label": "142 active subscribers",
      "open_issues_count": null,
      "route": "/admin/customers"
    },
    {
      "id": "comms",
      "icon": "📢",
      "label": "Comms",
      "sub_label": "5 automations active",
      "open_issues_count": null,
      "route": "/admin/comms"
    },
    {
      "id": "areas",
      "icon": "📍",
      "label": "Areas & Buildings",
      "sub_label": "3 active · 1 coming soon",
      "open_issues_count": null,
      "route": "/admin/areas"
    }
  ]
}
```

**Business Rules**
- `open_issues_count` is non-null only on the `daily_ops` tile. The badge is hidden when the value is `0`.
- `sub_label` values are live: meal count updates after the 6 PM cutoff; MRR is the current month's total; Menu fill status reflects how many days of the current week's next-scheduled week are filled; Customer count is active subscribers only; Comms count reflects enabled automations; Areas count is `active + coming soon` summary.
- This endpoint is `admin`-role only. The `ops` role is routed directly to `/ops/daily-ops` on login and never sees this screen.

---

## 3. Daily Operations — Admin View

**Screen coverage:** Daily Ops Admin (F7–F11, F13)

The Admin view of Daily Ops has three zones:
- **Zone A — Production Pipeline:** 3-stage tracker (Locked → Dispatch → Delivered) with advance actions.
- **Zone B — Meal Breakdown:** Executive vs Salad count table.
- **Zone C — Issues Queue:** Admin-only. Open customer issues with Credit / Reject actions.

---

### 3.1 `GET /admin/daily-ops`

Returns all data for the Admin Daily Ops screen for a given date. Defaults to today.

**Auth:** Required — `admin` role

**Query Parameters**

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `date` | date (YYYY-MM-DD) | No | Delivery date. Defaults to today. Only `today` and `yesterday` tabs are shown in the UI. |

**Response `200 OK`**

```json
{
  "date": "2025-05-05",
  "date_label": "Today — Sun 5 May",
  "pipeline": {
    "stage": "dispatch",
    "stages": [
      { "id": "locked", "label": "Locked", "status": "done" },
      { "id": "dispatch", "label": "Dispatch", "status": "active" },
      { "id": "delivered", "label": "Delivered", "status": "pending" }
    ],
    "locked_at": "2025-05-04T18:00:00Z",
    "locked_note": "Cutoff passed at 6:00 PM · Meal count frozen at 63 deliveries",
    "can_advance": true,
    "advance_label": "Mark as Dispatched →"
  },
  "meal_breakdown": {
    "total": 63,
    "rows": [
      { "type": "executive", "label": "Executive", "count": 41, "pct": 65 },
      { "type": "salad", "label": "Salad", "count": 22, "pct": 35 }
    ]
  },
  "issues_queue": {
    "open_count": 3,
    "issues": [
      {
        "issue_id": "iss_01JM",
        "customer_name": "Sara Al-Mutairi",
        "customer_phone": "+966 50 234 5678",
        "issue_type": "quality",
        "issue_type_label": "Quality issue",
        "description": "Meal was cold on arrival.",
        "submitted_at": "2025-05-05T12:45:00Z",
        "delivery_date": "2025-05-05",
        "meal_name": "Lamb Kabsa",
        "plan_price_sar": 28
      }
    ]
  }
}
```

**`pipeline.stage` values**

| Value | Meaning |
|-------|---------|
| `pending` | Pre-cutoff; meal count not yet locked |
| `locked` | Past 6 PM cutoff; count frozen |
| `dispatch` | Meals dispatched with riders |
| `delivered` | All deliveries confirmed |

**Business Rules**
- `can_advance: false` when the pipeline is already at `delivered`, or when the required preconditions are not met (e.g., not all labels printed before advancing to dispatch).
- Issues queue (`issues_queue`) is present only in the Admin view. The Ops/Kitchen view receives the same response shape but with `issues_queue: null`.

---

### 3.2 `POST /admin/daily-ops/pipeline/advance`

Advances the production pipeline to the next stage. The stages advance in sequence: `locked → dispatch → delivered`.

**Auth:** Required — `admin` or `ops` role

**Request Body**

```json
{
  "date": "2025-05-05",
  "from_stage": "locked",
  "to_stage": "dispatch"
}
```

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `date` | date | Yes | The delivery date being advanced. |
| `from_stage` | string | Yes | Current stage. Server validates this matches the actual current stage before advancing (optimistic concurrency guard). |
| `to_stage` | string | Yes | Target stage. Must be the immediate next stage. |

**Response `200 OK`**

```json
{
  "date": "2025-05-05",
  "previous_stage": "locked",
  "current_stage": "dispatch",
  "advanced_at": "2025-05-05T09:41:00Z",
  "advanced_by": "Mohammed Al-Qahtani"
}
```

**Response `409 Conflict` — Stage mismatch**

```json
{
  "error": "STAGE_MISMATCH",
  "message": "Pipeline is currently at 'dispatch', not 'locked'. Refresh and try again."
}
```

**Business Rules**
- Advancing to `dispatch` triggers the **Delivery Confirmed** push notification automation — once per customer whose meal is being dispatched that day.
- Advancing to `delivered` marks the day as complete. The **End-of-Day Feedback** push notification fires at 3:00 PM regardless of this flag (time-based, not stage-based).
- Stage can only advance forward, never backward.

---

### 3.3 `GET /admin/daily-ops/issues`

Returns the open issues queue for a given date. Used to populate Zone C of the Admin Daily Ops screen. Also used for the live badge count on the Dashboard tile.

**Auth:** Required — `admin` role only

**Query Parameters**

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `date` | date | No | Filter issues by delivery date. Defaults to today. |
| `status` | string | No | `open` (default) or `all`. |

**Response `200 OK`**

```json
{
  "open_count": 3,
  "issues": [
    {
      "issue_id": "iss_01JM",
      "customer_id": "usr_01JK",
      "customer_name": "Sara Al-Mutairi",
      "customer_phone": "+966 50 234 5678",
      "delivery_address": "Olaya Business Park · Floor 3",
      "issue_type": "quality",
      "issue_type_label": "Quality issue",
      "description": "Meal was cold on arrival.",
      "submitted_at": "2025-05-05T12:45:00Z",
      "delivery_date": "2025-05-05",
      "meal_name": "Lamb Kabsa",
      "meal_type": "executive",
      "plan_price_sar": 28,
      "status": "open",
      "resolved_at": null,
      "resolution": null
    }
  ]
}
```

**`issue_type` values (from customer report screen)**

| Value | Label |
|-------|-------|
| `missing` | Missing item |
| `quality` | Quality issue |
| `wrong_order` | Wrong order |
| `late` | Late delivery |
| `other` | Other |

---

### 3.4 `POST /admin/daily-ops/issues/:issue_id/credit`

Resolves an issue with a wallet credit. Credits the specified amount to the customer's wallet, marks the issue as resolved, and sends a push notification to the customer.

**Auth:** Required — `admin` role only

**Path Parameters**

| Parameter | Description |
|-----------|-------------|
| `issue_id` | Issue ID from the issues queue |

**Request Body**

```json
{
  "credit_sar": 28,
  "note": "Meal quality did not meet our standards. Credited full meal value."
}
```

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `credit_sar` | number | Yes | Amount to credit to the customer's wallet in SAR. Suggested default: the plan's per-meal price. |
| `note` | string | No | Internal note visible in the customer's issue history. Not shown to the customer. |

**Response `200 OK`**

```json
{
  "issue_id": "iss_01JM",
  "status": "resolved",
  "resolution": "credit",
  "credit_sar": 28,
  "resolved_at": "2025-05-05T14:10:00Z",
  "resolved_by": "Mohammed Al-Qahtani",
  "customer_notified": true
}
```

**Business Rules**
- Crediting adds `credit_sar` to the customer's wallet immediately. The transaction appears in `GET /users/wallet/transactions` as `type: "credit"` with `label: "Issue credit"`.
- A push notification is sent to the customer: "Your issue has been resolved. SAR X has been added to your wallet."
- Once resolved, the issue is removed from the open queue (no longer counted in the Dashboard badge).

---

### 3.5 `POST /admin/daily-ops/issues/:issue_id/reject`

Rejects an issue without a credit. Marks it as resolved with `resolution: "rejected"` and sends a push notification to the customer.

**Auth:** Required — `admin` role only

**Request Body**

```json
{
  "reason": "Unable to verify the reported issue based on kitchen records.",
  "note": "Kitchen confirmed meal was prepared and packed at correct temperature."
}
```

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `reason` | string | Yes | Reason shown to the customer in the push notification. Keep concise. |
| `note` | string | No | Internal note. Not shown to the customer. |

**Response `200 OK`**

```json
{
  "issue_id": "iss_01JM",
  "status": "resolved",
  "resolution": "rejected",
  "resolved_at": "2025-05-05T14:15:00Z",
  "resolved_by": "Mohammed Al-Qahtani",
  "customer_notified": true
}
```

---

## 4. Daily Operations — Ops/Kitchen View

The Ops/Kitchen view is a restricted version of the same `/admin/daily-ops` data. It contains:
- Production Pipeline (same as admin) with advance action.
- Meal Breakdown (same as admin).
- **No issues queue** — the section is not rendered at all, not greyed out.

All Ops endpoints are prefixed `/ops/` to enforce role isolation at the routing level.

---

### 4.1 `GET /ops/daily-ops`

Returns the Ops/Kitchen view of the Daily Ops screen.

**Auth:** Required — `ops` role only

**Query Parameters** — same as `GET /admin/daily-ops` (`date` optional).

**Response `200 OK`**

```json
{
  "date": "2025-05-05",
  "date_label": "Today — Sun 5 May",
  "pipeline": {
    "stage": "dispatch",
    "stages": [
      { "id": "locked", "label": "Locked", "status": "done" },
      { "id": "dispatch", "label": "Dispatch", "status": "active" },
      { "id": "delivered", "label": "Delivered", "status": "pending" }
    ],
    "locked_note": "Cutoff passed at 6:00 PM · Meal count frozen at 63 deliveries",
    "can_advance": true,
    "advance_label": "Mark as Dispatched →"
  },
  "meal_breakdown": {
    "total": 63,
    "rows": [
      { "type": "executive", "label": "Executive", "count": 41, "pct": 65 },
      { "type": "salad", "label": "Salad", "count": 22, "pct": 35 }
    ]
  },
  "issues_queue": null
}
```

**Business Rules**
- Response shape is identical to `GET /admin/daily-ops` except `issues_queue` is always `null`.
- Ops can export the daily sheet and print labels (same label endpoints as admin).
- Ops cannot see yesterday's tab — only today (single tab, no date navigation).

---

### 4.2 `POST /ops/daily-ops/pipeline/advance`

Ops-role version of pipeline advance. Same request/response shape as `POST /admin/daily-ops/pipeline/advance`.

**Auth:** Required — `ops` role only

> **Note:** Both admin and ops can advance the pipeline. The server records `advanced_by` to track which role/user performed the action. This is shared state — if admin advances, ops will see the updated stage on next fetch.

---

## 5. Delivery Labels

Labels are generated server-side as PDFs. The client requests a label list, then triggers a download for the full set or individual labels.

---

### 5.1 `GET /admin/daily-ops/labels`

Returns the list of delivery labels for a given date, with optional filters for meal type and area. Used to render the Label List screen (F14–F17) and power the bulk download button.

**Auth:** Required — `admin` or `ops` role

**Query Parameters**

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `date` | date | No | Defaults to today. |
| `meal_type` | string | No | One of: `all`, `executive`, `salad`. Default `all`. |
| `area_id` | string | No | Filter by a single delivery area UUID. |

**Response `200 OK`**

```json
{
  "date": "2025-05-05",
  "total_count": 63,
  "filtered_count": 41,
  "bulk_download_label": "Download Exec Labels (41)",
  "areas": [
    {
      "area_id": "area_01",
      "area_name": "Al Nakheel",
      "count": 28,
      "area_download_label": "Download Al Nakheel (28)",
      "labels": [
        {
          "label_id": "lbl_01JM001",
          "order_ref": "#ZK-2025-05-05-0041",
          "customer_name": "Ahmed Al-Rashidi",
          "meal_type": "executive",
          "building": "Al Nakheel Tower",
          "floor": "Floor 7",
          "desk_area": "Desk B12",
          "gate": "Main entrance",
          "delivery_preference": "hand_to_me",
          "delivery_date": "2025-05-05"
        }
      ]
    },
    {
      "area_id": "area_02",
      "area_name": "Olaya Business District",
      "count": 35,
      "area_download_label": "Download Olaya (35)",
      "labels": []
    }
  ]
}
```

**Business Rules**
- Labels are grouped by area. Within each area, sorted alphabetically by `building` then `floor`.
- `filtered_count` reflects the active `meal_type` filter. `bulk_download_label` text updates accordingly: "Download All Labels (63)", "Download Exec Labels (41)", or "Download Salad Labels (22)".
- `area_download_label` respects the active `meal_type` filter (e.g. "Download Exec Al Nakheel (18)").

---

### 5.2 `GET /admin/daily-ops/labels/download`

Generates and returns a PDF of delivery labels. Supports bulk (all), filtered (by meal type), per-area, or individual label downloads.

**Auth:** Required — `admin` or `ops` role

**Query Parameters**

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `date` | date | No | Defaults to today. |
| `meal_type` | string | No | One of: `all`, `executive`, `salad`. Default `all`. |
| `area_id` | string | No | Filter to a single area. |
| `label_id` | string | No | Download a single label. If provided, `meal_type` and `area_id` are ignored. |

**Response `200 OK`**

Returns a PDF binary.

```
Content-Type: application/pdf
Content-Disposition: attachment; filename="zaadi-labels-2025-05-05-exec.pdf"
```

**Label content (from F18 annotation):**

Each label contains:
- Zaadi Kitchen logo
- Meal type colour band (Executive = red, Salad = green)
- Customer full name (large)
- Building · Floor · Desk/Area
- Gate / entrance note
- Delivery preference (Hand to me / Reception)
- Delivery date
- Order reference number (`#ZK-YYYY-MM-DD-NNNN`)

**Business Rules**
- Labels are sorted by area, then building, then floor within the PDF.
- PDF is generated on-demand; not cached. Large label sets (> 100) may take 2–3 seconds.
- Individual label download (via `label_id`) returns a single-page PDF.

---

## 6. Error Reference

### Standard error envelope

```json
{
  "error": "ERROR_CODE",
  "message": "Human-readable description for the developer.",
  "details": {}
}
```

### HTTP status codes

| Code | When used |
|------|-----------|
| `200 OK` | Successful GET, POST with body response |
| `401 Unauthorized` | Missing or expired token |
| `403 Forbidden` | Valid token but wrong role for this endpoint |
| `404 Not Found` | Resource ID not found (issue, label, etc.) |
| `409 Conflict` | Pipeline stage mismatch on advance |
| `422 Unprocessable Entity` | Validation error (missing field, invalid value) |
| `429 Too Many Requests` | OTP rate limit exceeded |

### Domain error codes — Phase 1

| Error code | Endpoint | Description |
|---|---|---|
| `PHONE_NOT_REGISTERED` | POST /auth/admin/otp/send | Phone is not in the staff directory for the given role |
| `OTP_RATE_LIMIT` | POST /auth/admin/otp/send | 3 OTP requests within 10-minute window |
| `INVALID_OTP` | POST /auth/admin/otp/verify | Wrong code entered |
| `STAGE_MISMATCH` | POST .../pipeline/advance | `from_stage` does not match actual current stage |
| `ISSUE_ALREADY_RESOLVED` | POST .../issues/:id/credit or /reject | Issue was already resolved by another admin |

---

## Appendix — Screen-to-endpoint map (Phase 1)

| Screen | Frame | Endpoints |
|--------|-------|-----------|
| Role Selection | F1–F3 | POST /auth/admin/otp/send |
| OTP Verification | F1–F3 | POST /auth/admin/otp/verify |
| Dashboard Home | F5–F6 | GET /admin/dashboard |
| Daily Ops — Admin | F7–F11 | GET /admin/daily-ops |
| Pipeline Advance | F9–F10 | POST /admin/daily-ops/pipeline/advance |
| Issues Queue | F11 | GET /admin/daily-ops/issues |
| Credit Modal | F12 | POST /admin/daily-ops/issues/:id/credit |
| Reject Modal | F13 | POST /admin/daily-ops/issues/:id/reject |
| Label List | F14–F17 | GET /admin/daily-ops/labels |
| Label Download | F15, F17, F18 | GET /admin/daily-ops/labels/download |
| Daily Ops — Ops | F7–F9 (Ops) | GET /ops/daily-ops |
| Ops Pipeline Advance | F9 (Ops) | POST /ops/daily-ops/pipeline/advance |

---

*Document version: 1.0 — Phase 1: Auth · Dashboard · Daily Operations*
*Next: Phase 2 — Menu Manager · Meal Library*
