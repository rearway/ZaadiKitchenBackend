# Zaadi Kitchen — Admin API Documentation

## Phase 3: Customer Management · Revenue Dashboard

## Phase 4: Comms & Automations · Areas & Buildings

**Base URL:** `{{base_url}}` → `http://localhost:3000/api/v1`
**Auth:** All `/admin/*` endpoints require `Authorization: Bearer {{admin_access_token}}` with `role: admin`.
**Content-Type:** `application/json`

> **Phased release plan**
> | Phase | Modules |
> |---|---|
> | Phase 1 | Auth · Dashboard · Daily Ops ✓ |
> | Phase 2 | Menu Manager · Meal Library ✓ |
> | **Phase 3** (this doc) | Customer Management · Revenue Dashboard ← |
> | **Phase 4** (this doc) | Comms & Automations · Areas & Buildings ← |

---

## Table of Contents — Phase 3

1. [Revenue Dashboard](#1-revenue-dashboard)
   - 1.1 GET /admin/revenue
   - 1.2 GET /admin/revenue/daily
2. [Customer Management](#2-customer-management)
   - 2.1 GET /admin/customers
   - 2.2 GET /admin/customers/:customer_id
   - 2.3 GET /admin/customers/:customer_id/history
   - 2.4 POST /admin/customers/:customer_id/wallet/credit

## Table of Contents — Phase 4

3. [Comms & Automations](#3-comms--automations)
   - 3.1 GET /admin/comms/automations
   - 3.2 PATCH /admin/comms/automations/:automation_id
   - 3.3 GET /admin/comms/broadcast/segments
   - 3.4 POST /admin/comms/broadcast
4. [Areas & Buildings](#4-areas--buildings)
   - 4.1 GET /admin/areas _(existing — extended)_
   - 4.2 POST /admin/areas _(existing — extended)_
   - 4.3 PATCH /admin/areas/:area_id
   - 4.4 GET /admin/areas/:area_id/buildings _(existing — extended)_
   - 4.5 POST /admin/areas/:area_id/buildings _(existing — extended)_
   - 4.6 PATCH /admin/areas/:area_id/buildings/:building_id
   - 4.7 DELETE /admin/areas/:area_id/buildings/:building_id
   - 4.8 GET /admin/areas/out-of-zone-requests
5. [Error Reference](#5-error-reference)

---

# Phase 3

## 1. Revenue Dashboard

### 1.1 `GET /admin/revenue`

Returns all KPIs for the Revenue Dashboard screen: MRR, subscriber stats, plan breakdown, and avg skip rate.

**Auth:** Required — `admin` role

**Query Parameters**

| Parameter | Type             | Required | Description                                                  |
| --------- | ---------------- | -------- | ------------------------------------------------------------ |
| `month`   | string (YYYY-MM) | No       | Month for MRR and plan breakdown. Defaults to current month. |

**Response `200 OK`**

```json
{
  "month": "2025-05",
  "month_label": "May 2025",
  "mrr": {
    "value_sar": 18400,
    "change_pct": 12.4,
    "change_direction": "up",
    "vs_label": "vs Apr"
  },
  "subscriber_stats": {
    "active": {
      "count": 142,
      "filter": "active"
    },
    "new_today": {
      "count": 7,
      "filter": "new_today"
    },
    "churned": {
      "count": 3,
      "filter": "churned",
      "churn_definition": "Expired + no renewal within 3 days"
    }
  },
  "plan_breakdown": [
    { "plan_id": "month", "plan_name": "Month", "count": 107, "pct": 75 },
    {
      "plan_id": "quarterly",
      "plan_name": "Quarterly",
      "count": 21,
      "pct": 15
    },
    { "plan_id": "week", "plan_name": "Week", "count": 11, "pct": 8 },
    { "plan_id": "try_it", "plan_name": "Try It", "count": 3, "pct": 2 }
  ],
  "avg_skip_rate": {
    "value": 2.3,
    "unit": "skips/subscriber",
    "change": -0.4,
    "change_direction": "down",
    "vs_label": "vs last week"
  }
}
```

**Business Rules**

- `change_pct` is month-over-month vs the prior **full** month, not month-to-date (F19 annotation 1).
- Tapping a `subscriber_stats` card routes to `GET /admin/customers` pre-filtered by the `filter` value (F20 annotation 2).
- Tapping a `plan_breakdown` bar routes to `GET /admin/customers` filtered by `plan_id`.
- `avg_skip_rate` trend compares the current week (Sun–Thu) against the prior working week.

---

### 1.2 `GET /admin/revenue/daily`

Returns daily revenue data for the bar chart. Supports period selection.

**Auth:** Required — `admin` role

**Query Parameters**

| Parameter | Type   | Required | Description                                                    |
| --------- | ------ | -------- | -------------------------------------------------------------- |
| `period`  | string | No       | `this_week` (default), `this_month`, `last_week`, `last_month` |

**Response `200 OK`**

```json
{
  "period": "this_week",
  "period_label": "This week",
  "bars": [
    {
      "date": "2025-05-04",
      "day_label": "Sun",
      "revenue_sar": 3100,
      "is_today": false,
      "is_projected": false
    },
    {
      "date": "2025-05-05",
      "day_label": "Mon",
      "revenue_sar": 3900,
      "is_today": false,
      "is_projected": false
    },
    {
      "date": "2025-05-06",
      "day_label": "Tue",
      "revenue_sar": 4200,
      "is_today": true,
      "is_projected": false
    },
    {
      "date": "2025-05-07",
      "day_label": "Wed",
      "revenue_sar": 3600,
      "is_today": false,
      "is_projected": true
    },
    {
      "date": "2025-05-08",
      "day_label": "Thu",
      "revenue_sar": 3400,
      "is_today": false,
      "is_projected": true
    }
  ]
}
```

**Business Rules**

- Today's bar uses the `red` colour variant; future (projected) bars use the faded red variant; past bars use green (F21 annotation 3).
- `is_projected: true` for any date after today within the selected period. Projected values are calculated based on active subscriptions with deliveries scheduled for that date.
- For `this_month` and `last_month`, returns one bar per day (up to 22 working days).

---

## 2. Customer Management

### 2.1 `GET /admin/customers`

Returns the paginated, filterable customer list. Supports search, status filter, and plan filter. Pre-filtered when arriving from Revenue drilldown (F34 annotation 3).

**Auth:** Required — `admin` role

**Query Parameters**

| Parameter  | Type    | Required | Description                                                                             |
| ---------- | ------- | -------- | --------------------------------------------------------------------------------------- |
| `q`        | string  | No       | Search by name or phone number.                                                         |
| `status`   | string  | No       | `active` (default), `all`, `paused`, `expired`, `churned`.                              |
| `plan_id`  | string  | No       | Filter by plan: `try_it`, `week`, `month`, `quarterly`.                                 |
| `filter`   | string  | No       | Shorthand from Revenue drilldown: `active`, `new_today`, `churned`. Overrides `status`. |
| `page`     | integer | No       | Default `1`.                                                                            |
| `per_page` | integer | No       | Default `30`, max `100`.                                                                |

**Response `200 OK`**

```json
{
  "total": 142,
  "filter_summary": "Active subscribers",
  "customers": [
    {
      "customer_id": "usr_01JK",
      "initials": "S",
      "name": "Sara Al-Mutairi",
      "phone": "+966 50 234 5678",
      "plan_id": "month",
      "plan_label": "Month",
      "subscription_status": "active",
      "days_remaining": 14,
      "days_label": "14 days left",
      "is_churned": false
    },
    {
      "customer_id": "usr_02KL",
      "initials": "K",
      "name": "Khalid Al-Dossari",
      "phone": "+966 54 987 6543",
      "plan_id": "week",
      "plan_label": "Week",
      "subscription_status": "expired",
      "days_remaining": null,
      "days_label": "Expired 28 Apr",
      "is_churned": true
    }
  ],
  "pagination": {
    "page": 1,
    "per_page": 30,
    "total": 142,
    "total_pages": 5
  }
}
```

**Business Rules**

- Churned rows are rendered at 60% opacity in the UI (F34 annotation 3). `is_churned: true` drives this.
- Churn definition: `subscription_status = expired` AND no renewal within 3 days of expiry.
- When arriving from a Revenue drilldown (e.g. clicking "142 Active"), the client passes `filter=active` which shows the same pre-filtered view with the chip pre-selected.

---

### 2.2 `GET /admin/customers/:customer_id`

Returns the inline-expanded row detail for a single customer. Used when a customer row is tapped (F35 annotation 1).

**Auth:** Required — `admin` role

**Response `200 OK`**

```json
{
  "customer_id": "usr_01JK",
  "name": "Ahmed Al-Rashidi",
  "phone": "+966 55 123 4567",
  "initials": "A",
  "current_subscription": {
    "plan_id": "month",
    "plan_name": "Month Plan",
    "subscription_status": "active",
    "end_date": "2025-06-03",
    "end_date_label": "Ends 3 Jun 2025"
  },
  "wallet_balance_sar": 50.0,
  "delivery_address": "📍 Al Nakheel Tower · Floor 7 · Desk B12",
  "issues_summary": {
    "total_issues": 1,
    "resolved_issues": 1,
    "total_credited_sar": 28,
    "summary_label": "1 resolved · Credited SAR 28"
  }
}
```

**Business Rules**

- This is a lightweight summary shown in the collapsed row. For full history, the client calls `GET /admin/customers/:id/history`.

---

### 2.3 `GET /admin/customers/:customer_id/history`

Returns the full customer history panel — all subscription periods, delivery records, skipped days, and resolved issues. Opened via "View History →" (F37 annotation 2).

**Auth:** Required — `admin` role

**Response `200 OK`**

```json
{
  "customer_id": "usr_01JK",
  "name": "Ahmed Al-Rashidi",
  "phone": "+966 55 123 4567",
  "joined_at": "2025-01-15T08:00:00Z",
  "subscriptions": [
    {
      "subscription_id": "sub_01JM3XYZ",
      "plan_name": "Month Plan",
      "meal_type": "executive",
      "start_date": "2025-05-05",
      "end_date": "2025-06-05",
      "status": "active",
      "total_deliveries": 22,
      "delivered": 14,
      "skipped": 3,
      "remaining": 5
    }
  ],
  "issues": [
    {
      "issue_id": "iss_01JM",
      "issue_type_label": "Quality issue",
      "delivery_date": "2025-05-05",
      "meal_name": "Lamb Kabsa",
      "resolution": "credit",
      "credit_sar": 28,
      "resolved_at": "2025-05-05T14:10:00Z",
      "resolved_by": "Mohammed Al-Qahtani"
    }
  ],
  "wallet": {
    "balance_sar": 50.0,
    "total_credited_sar": 28,
    "total_spent_sar": 500
  }
}
```

---

### 2.4 `POST /admin/customers/:customer_id/wallet/credit`

Manually credits the customer's wallet with an arbitrary amount. Used for goodwill credits outside of the issue resolution flow. Available from the customer detail panel.

**Auth:** Required — `admin` role

**Request Body**

```json
{
  "amount_sar": 50,
  "reason": "Compensation for recurring delivery delays in Al Nakheel area."
}
```

| Field        | Type   | Required | Description                                                      |
| ------------ | ------ | -------- | ---------------------------------------------------------------- |
| `amount_sar` | number | Yes      | Credit amount in SAR. Must be positive.                          |
| `reason`     | string | Yes      | Internal reason. Shown in wallet transaction history as `label`. |

**Response `200 OK`**

```json
{
  "customer_id": "usr_01JK",
  "credit_applied_sar": 50,
  "new_balance_sar": 100,
  "transaction_id": "txn_099"
}
```

---

# Phase 4

## 3. Comms & Automations

### 3.1 `GET /admin/comms/automations`

Returns the list of all push notification automations and their on/off state.

**Auth:** Required — `admin` role

**Response `200 OK`**

```json
{
  "automations": [
    {
      "automation_id": "auto_delivery_confirmed",
      "label": "Delivery Confirmed",
      "trigger_description": "Trigger: Driver taps Mark as Delivered",
      "channel": "push",
      "enabled": true
    },
    {
      "automation_id": "auto_eod_feedback",
      "label": "End-of-Day Feedback",
      "trigger_description": "Trigger: 3:00 PM daily to meal recipients",
      "channel": "push",
      "enabled": true
    },
    {
      "automation_id": "auto_renewal_reminder",
      "label": "Renewal Reminder",
      "trigger_description": "Trigger: 48 hrs before plan end date",
      "channel": "push",
      "enabled": true
    },
    {
      "automation_id": "auto_referral_reward",
      "label": "Referral Reward",
      "trigger_description": "Trigger: Referred friend's plan activates",
      "channel": "push",
      "enabled": true
    },
    {
      "automation_id": "auto_lapsed_reactivation",
      "label": "Lapsed Reactivation",
      "trigger_description": "Trigger: Expired + no renewal in 3 days",
      "channel": "push",
      "enabled": true
    }
  ],
  "total_enabled": 5
}
```

**Business Rules**

- All 5 automations default to `enabled: true`. Each is independently togglable.
- Channel is always `push` — no WhatsApp or SMS for automations in v1 (F39 annotation 1).
- `total_enabled` drives the "5 automations active" sub-label on the Dashboard Comms tile.

---

### 3.2 `PATCH /admin/comms/automations/:automation_id`

Toggles an automation on or off.

**Auth:** Required — `admin` role

**Request Body**

```json
{
  "enabled": false
}
```

**Response `200 OK`**

```json
{
  "automation_id": "auto_renewal_reminder",
  "enabled": false,
  "updated_at": "2025-05-09T11:00:00Z"
}
```

---

### 3.3 `GET /admin/comms/broadcast/segments`

Returns the list of available audience segments for a broadcast message, with live recipient counts.

**Auth:** Required — `admin` role

**Response `200 OK`**

```json
{
  "segments": [
    {
      "segment_id": "all_subscribers",
      "label": "All subscribers",
      "count": 142
    },
    {
      "segment_id": "active",
      "label": "Active",
      "count": 142
    },
    {
      "segment_id": "paused",
      "label": "Paused",
      "count": 8
    },
    {
      "segment_id": "delivering_today",
      "label": "Delivering Today",
      "count": 63,
      "description": "Customers receiving a delivery today — useful for same-day operational messages."
    }
  ]
}
```

**Business Rules**

- `delivering_today` segment is always today's date. It is not configurable (F41 annotation 1).
- Counts are live at time of request.
- The Send button is disabled when `count = 0` (F41 annotation 2).

---

### 3.4 `POST /admin/comms/broadcast`

Sends a push notification broadcast to a selected segment.

**Auth:** Required — `admin` role

**Request Body**

```json
{
  "segment_id": "delivering_today",
  "message": "Your lunch is on the way! Expected delivery between 12:00–1:00 PM. 🍱"
}
```

| Field        | Type   | Required | Description                                                |
| ------------ | ------ | -------- | ---------------------------------------------------------- |
| `segment_id` | string | Yes      | One of the IDs from `GET /admin/comms/broadcast/segments`. |
| `message`    | string | Yes      | Push notification body. Max 200 characters.                |

**Response `200 OK`**

```json
{
  "broadcast_id": "bcast_01JM",
  "segment_id": "delivering_today",
  "recipient_count": 63,
  "message": "Your lunch is on the way! Expected delivery between 12:00–1:00 PM. 🍱",
  "sent_at": "2025-05-05T11:41:00Z",
  "sent_by": "Mohammed Al-Qahtani"
}
```

**Response `422 Unprocessable Entity` — Message too long**

```json
{
  "error": "MESSAGE_TOO_LONG",
  "message": "Message exceeds 200 characters (current: 214)."
}
```

**Business Rules**

- Push only — no WhatsApp or SMS for broadcasts (F41 annotation 2).
- There is no scheduled send in v1. Broadcast is always immediate.
- No duplicate-send guard. Admin is responsible for avoiding double-sends.

---

## 4. Areas & Buildings

> **Note on existing Postman endpoints:**
> The Postman collection already has `GET /admin/areas`, `POST /admin/areas`, and `POST /admin/areas/:area_id/buildings`. These are documented here with their complete request/response shapes, plus the missing PATCH and DELETE endpoints added.

---

### 4.1 `GET /admin/areas` _(existing — extended)_

Returns all delivery areas with their status, customer counts, and summary stats. Supports status filter.

**Auth:** Required — `admin` role

**Query Parameters**

| Parameter | Type   | Required | Description                                        |
| --------- | ------ | -------- | -------------------------------------------------- |
| `status`  | string | No       | `all` (default), `active`, `coming_soon`, `paused` |

**Response `200 OK`**

```json
{
  "summary": {
    "active": 3,
    "coming_soon": 1,
    "paused": 0
  },
  "areas": [
    {
      "area_id": "area_01",
      "name": "Al Nakheel",
      "coverage": "Offices & towers",
      "status": "active",
      "customer_count": 28,
      "building_count": 12
    },
    {
      "area_id": "area_02",
      "name": "Olaya Business District",
      "coverage": "Offices & towers",
      "status": "active",
      "customer_count": 41,
      "building_count": 18
    },
    {
      "area_id": "area_03",
      "name": "Al Zahra",
      "coverage": "Residential & offices",
      "status": "coming_soon",
      "customer_count": 0,
      "building_count": 0
    }
  ]
}
```

---

### 4.2 `POST /admin/areas` _(existing — extended)_

Creates a new delivery area. New areas default to `coming_soon` status.

**Auth:** Required — `admin` role

**Request Body**

```json
{
  "name": "Downtown Riyadh",
  "coverage": "Core downtown area covering KAFD and surroundings",
  "status": "coming_soon"
}
```

| Field      | Type   | Required | Description                                                                                           |
| ---------- | ------ | -------- | ----------------------------------------------------------------------------------------------------- |
| `name`     | string | Yes      | Area display name.                                                                                    |
| `coverage` | string | No       | Short coverage description shown in the area list.                                                    |
| `status`   | string | No       | `coming_soon` (default) or `active`. Avoid creating areas as `active` unless all buildings are ready. |

**Response `201 Created`**

```json
{
  "area_id": "area_04",
  "name": "Downtown Riyadh",
  "status": "coming_soon",
  "created_at": "2025-05-09T12:00:00Z"
}
```

---

### 4.3 `PATCH /admin/areas/:area_id`

Updates area fields and/or status. Status change to `active` requires special handling (confirmation warning, F45 annotation 2).

**Auth:** Required — `admin` role

**Request Body**

```json
{
  "name": "Al Zahra",
  "coverage": "Residential & offices",
  "status": "active",
  "confirm_activation": true
}
```

| Field                | Type    | Required | Description                                                                                                          |
| -------------------- | ------- | -------- | -------------------------------------------------------------------------------------------------------------------- |
| `name`               | string  | No       | Updated area name.                                                                                                   |
| `coverage`           | string  | No       | Updated coverage description.                                                                                        |
| `status`             | string  | No       | `active`, `coming_soon`, or `paused`.                                                                                |
| `confirm_activation` | boolean | No       | Required when `status: "active"` and the area was not previously active. Acts as the "✓ Activate Area" confirmation. |

**Response `200 OK`**

```json
{
  "area_id": "area_03",
  "name": "Al Zahra",
  "status": "active",
  "updated_at": "2025-05-09T13:00:00Z",
  "customer_visible_immediately": true
}
```

**Response `409 Conflict` — Activating without confirmation**

```json
{
  "error": "ACTIVATION_REQUIRES_CONFIRMATION",
  "message": "Activating Al Zahra will make it immediately selectable by customers in the Area Search screen. Pass confirm_activation: true to proceed.",
  "warning": "Al Zahra will become immediately selectable by new customers on activation."
}
```

**Business Rules**

- Changing status to `active`: requires `confirm_activation: true`. The area becomes immediately visible in `GET /delivery/areas` (customer app) once activated (F45 annotation 2).
- Downgrading status (`active → coming_soon` or `active → paused`): no confirmation required. Existing customers with saved delivery locations in that area are not affected — their addresses remain.
- Changing `name` or `coverage` on an active area: takes effect immediately in customer-facing displays.

---

### 4.4 `GET /admin/areas/:area_id/buildings` _(existing — extended)_

Returns all buildings for a given area. Admin-added only. Customer free-text entries are never stored here.

**Auth:** Required — `admin` role

**Response `200 OK`**

```json
{
  "area_id": "area_01",
  "area_name": "Al Nakheel",
  "buildings": [
    {
      "building_id": "bld_001",
      "name": "Al Nakheel Tower, King Fahad Rd"
    },
    {
      "building_id": "bld_002",
      "name": "Nakheel Business Park Tower A"
    },
    {
      "building_id": "bld_003",
      "name": "Al Nakheel Plaza, Office Tower"
    }
  ],
  "total": 3
}
```

---

### 4.5 `POST /admin/areas/:area_id/buildings` _(existing — extended)_

Adds a new building to an area. The building immediately appears in the customer onboarding auto-suggest.

**Auth:** Required — `admin` role

**Request Body**

```json
{
  "name": "Al Nakheel Gate Tower"
}
```

**Response `201 Created`**

```json
{
  "building_id": "bld_004",
  "area_id": "area_01",
  "name": "Al Nakheel Gate Tower",
  "created_at": "2025-05-09T12:00:00Z"
}
```

---

### 4.6 `PATCH /admin/areas/:area_id/buildings/:building_id`

Renames a building. The updated name appears in customer onboarding immediately. Existing customer delivery addresses are not retroactively updated.

**Auth:** Required — `admin` role

**Request Body**

```json
{
  "name": "Al Nakheel Gate Tower (North Wing)"
}
```

**Response `200 OK`**

```json
{
  "building_id": "bld_004",
  "area_id": "area_01",
  "name": "Al Nakheel Gate Tower (North Wing)",
  "updated_at": "2025-05-09T13:00:00Z",
  "note": "Existing customer addresses are not updated retroactively."
}
```

---

### 4.7 `DELETE /admin/areas/:area_id/buildings/:building_id`

Removes a building from the auto-suggest list. Existing customer delivery addresses that reference this building are not affected — the building name remains on historical delivery labels and records.

**Auth:** Required — `admin` role

**Response `200 OK`**

```json
{
  "building_id": "bld_004",
  "deleted": true,
  "note": "Existing customer addresses referencing this building are not affected. The name continues to appear on historical delivery labels."
}
```

**Business Rules**

- Deleting a building only removes it from the onboarding auto-suggest. It does NOT change any saved customer delivery location records (F49 annotation 1).
- No cascade to customer subscriptions or delivery routes.

---

### 4.8 `GET /admin/areas/out-of-zone-requests`

Returns the list of area expansion interest submissions from customers who searched for an area not in the active list. Used by admin to prioritise expansion decisions.

**Auth:** Required — `admin` role

**Query Parameters**

| Parameter  | Type    | Required | Description                                          |
| ---------- | ------- | -------- | ---------------------------------------------------- |
| `page`     | integer | No       | Default `1`.                                         |
| `per_page` | integer | No       | Default `20`.                                        |
| `sort`     | string  | No       | `count_desc` (default) — most-requested areas first. |

**Response `200 OK`**

```json
{
  "total_requests": 47,
  "areas": [
    {
      "area_name": "Al Zahra",
      "request_count": 18,
      "first_requested": "2025-03-10",
      "last_requested": "2025-05-08"
    },
    {
      "area_name": "King Fahad District",
      "request_count": 11,
      "first_requested": "2025-04-01",
      "last_requested": "2025-05-07"
    },
    {
      "area_name": "KAFD",
      "request_count": 9,
      "first_requested": "2025-04-15",
      "last_requested": "2025-05-05"
    }
  ],
  "pagination": {
    "page": 1,
    "per_page": 20,
    "total": 47,
    "total_pages": 3
  }
}
```

**Business Rules**

- Submissions are deduplicated per area name (case-insensitive, trimmed). "Al Zahra" and "al zahra" are counted as one.
- Max 3 submissions per customer per session (enforced at `POST /delivery/areas/out-of-zone` — customer side).
- This is read-only data for admin planning. No action endpoint needed.

---

## 5. Error Reference

### HTTP status codes

| Code                       | When used                                            |
| -------------------------- | ---------------------------------------------------- |
| `200 OK`                   | Successful response                                  |
| `201 Created`              | Area or building created                             |
| `401 Unauthorized`         | Missing or expired token                             |
| `403 Forbidden`            | Wrong role                                           |
| `404 Not Found`            | Customer, area, building, or automation not found    |
| `409 Conflict`             | Activation without confirmation; duplicate area name |
| `422 Unprocessable Entity` | Message too long; missing required fields            |

### Domain error codes — Phase 3 & 4

| Error code                         | Endpoint                    | Description                                                   |
| ---------------------------------- | --------------------------- | ------------------------------------------------------------- |
| `ACTIVATION_REQUIRES_CONFIRMATION` | PATCH /admin/areas/:id      | Status change to `active` requires `confirm_activation: true` |
| `MESSAGE_TOO_LONG`                 | POST /admin/comms/broadcast | Broadcast message exceeds 200 characters                      |
| `SEGMENT_EMPTY`                    | POST /admin/comms/broadcast | Selected segment has 0 recipients                             |
| `AREA_NAME_EXISTS`                 | POST /admin/areas           | An area with this name already exists                         |

---

## Appendix — Screen-to-endpoint map (Phase 3 & 4)

**Phase 3 — Revenue & Customers**

| Screen                 | Frame   | Endpoints                               |
| ---------------------- | ------- | --------------------------------------- |
| Revenue Dashboard      | F19–F24 | GET /admin/revenue                      |
| Daily Revenue Chart    | F21     | GET /admin/revenue/daily                |
| Customer List          | F34–F36 | GET /admin/customers                    |
| Customer inline expand | F35     | GET /admin/customers/:id                |
| Customer history panel | F37     | GET /admin/customers/:id/history        |
| Manual wallet credit   | F37     | POST /admin/customers/:id/wallet/credit |

**Phase 4 — Comms & Areas**

| Screen               | Frame            | Endpoints                              |
| -------------------- | ---------------- | -------------------------------------- |
| Automations tab      | F39–F40          | GET /admin/comms/automations           |
| Toggle automation    | F39              | PATCH /admin/comms/automations/:id     |
| Broadcast tab        | F41              | GET /admin/comms/broadcast/segments    |
| Send broadcast       | F41              | POST /admin/comms/broadcast            |
| Area List            | F42–F43          | GET /admin/areas                       |
| Add Area             | F42              | POST /admin/areas                      |
| Edit Area            | F44–F45          | PATCH /admin/areas/:id                 |
| Building List        | F46–F47          | GET /admin/areas/:id/buildings         |
| Add Building         | F47, F48         | POST /admin/areas/:id/buildings        |
| Edit Building        | F47, F48         | PATCH /admin/areas/:id/buildings/:bid  |
| Delete Building      | F49              | DELETE /admin/areas/:id/buildings/:bid |
| Out-of-Zone Requests | (admin planning) | GET /admin/areas/out-of-zone-requests  |

---

_Document version: 1.0 — Phase 3: Customer Management · Revenue · Phase 4: Comms · Areas_
_Previous: Phase 2 — Menu Manager · Meal Library_
_Series complete — all 4 phases documented._
