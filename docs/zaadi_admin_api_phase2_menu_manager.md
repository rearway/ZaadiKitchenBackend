# Zaadi Kitchen — Admin API Documentation
## Phase 2: Menu Manager · Meal Library

**Base URL:** `{{base_url}}` → `http://localhost:3000/api/v1`
**Auth:** All `/admin/*` endpoints require `Authorization: Bearer {{admin_access_token}}` with `role: admin`.
**Content-Type:** `application/json`

> **Phased release plan**
> | Phase | Modules |
> |---|---|
> | Phase 1 | Auth · Dashboard · Daily Ops ✓ |
> | **Phase 2** (this doc) | Menu Manager · Meal Library ← |
> | Phase 3 | Customer Management · Revenue |
> | Phase 4 | Comms & Automations · Areas & Buildings |

---

## Table of Contents

1. [Menu Manager — Week Planner](#1-menu-manager--week-planner)
   - 1.1 GET /admin/menu/weeks
   - 1.2 GET /admin/menu/weeks/:week_id
   - 1.3 POST /admin/menu/weeks/:week_id/slots/:slot_id/assign
   - 1.4 DELETE /admin/menu/weeks/:week_id/slots/:slot_id
   - 1.5 POST /admin/menu/weeks/:week_id/publish
2. [Meal Library](#2-meal-library)
   - 2.1 GET /admin/meals
   - 2.2 GET /admin/meals/:meal_id
   - 2.3 POST /admin/meals
   - 2.4 PATCH /admin/meals/:meal_id
   - 2.5 PATCH /admin/meals/:meal_id/status
   - 2.6 POST /admin/meals/import
3. [Error Reference](#3-error-reference)

---

## Overview: How the 2-week planner works

The admin always manages two weeks simultaneously:

- **Week N (Current week):** Published and read-only. The grid is rendered at 45% opacity with no interaction. This is what customers are actively receiving meals from.
- **Week N+1 (Next week):** Editable. Admin fills 5 days × 2 slots (Executive + Salad) = 10 slots. Week N+1 is published manually — it does not auto-publish.

When Sunday arrives and Week N becomes Week N-1 (past), Week N+1 becomes the new Current Week and Week N+2 becomes editable. Navigation arrows (`‹ W22`, `W25 ›`) allow viewing past and future weeks for reference.

**Slot addressing:** Each slot is uniquely addressed by `week_id` + `delivery_date` + `meal_type`. For example: Week 24, Tuesday 7 May, Executive slot.

---

## 1. Menu Manager — Week Planner

### 1.1 `GET /admin/menu/weeks`

Returns the list of weeks visible in the planner. Used to render the two-week grid and the navigation arrows.

**Auth:** Required — `admin` role

**Query Parameters**

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `from_week` | integer | No | ISO week number. Defaults to current week (N). |
| `count` | integer | No | Number of weeks to return. Default `2` (current + next). Max `8`. |

**Response `200 OK`**

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
      "fill_status": {
        "filled_days": 5,
        "total_days": 5,
        "label": "Published ✓"
      }
    },
    {
      "week_id": "w2025-24",
      "week_number": 24,
      "label": "Week 24",
      "date_range": "Sun 12 – Thu 16 May",
      "date_from": "2025-05-12",
      "date_to": "2025-05-16",
      "status": "draft",
      "is_current_week": false,
      "is_editable": true,
      "fill_status": {
        "filled_days": 4,
        "total_days": 5,
        "label": "4 of 5 days filled"
      }
    }
  ],
  "nav": {
    "prev_week": "w2025-22",
    "next_week": "w2025-25"
  }
}
```

**`status` values**

| Value | Description |
|-------|-------------|
| `draft` | In progress. Not visible to customers. |
| `published` | Live. Visible to customers in the Menu tab and Home screen. |
| `past` | Archived. Read-only reference. |

---

### 1.2 `GET /admin/menu/weeks/:week_id`

Returns the full 5-day slot grid for a single week. This is the data source for rendering the planner columns (Sun–Thu, 2 slots each).

**Auth:** Required — `admin` role

**Path Parameters**

| Parameter | Description |
|-----------|-------------|
| `week_id` | Week identifier (e.g. `w2025-24`) |

**Response `200 OK`**

```json
{
  "week_id": "w2025-24",
  "week_number": 24,
  "status": "draft",
  "is_editable": true,
  "days": [
    {
      "delivery_date": "2025-05-12",
      "day_label": "Sun",
      "date_label": "12 May",
      "slots": [
        {
          "slot_id": "slot_w24_sun_exec",
          "meal_type": "executive",
          "meal_type_label": "Exec",
          "meal": {
            "meal_id": "meal_01JK2ABX",
            "name_en": "Lamb Kabsa",
            "kcal": 550
          },
          "is_filled": true,
          "is_editable": true
        },
        {
          "slot_id": "slot_w24_sun_salad",
          "meal_type": "salad",
          "meal_type_label": "Salad",
          "meal": null,
          "is_filled": false,
          "is_editable": true
        }
      ]
    },
    {
      "delivery_date": "2025-05-13",
      "day_label": "Mon",
      "date_label": "13 May",
      "slots": [
        {
          "slot_id": "slot_w24_mon_exec",
          "meal_type": "executive",
          "meal_type_label": "Exec",
          "meal": {
            "meal_id": "meal_01JK2ACX",
            "name_en": "Chicken Mandi",
            "kcal": 490
          },
          "is_filled": true,
          "is_editable": true
        },
        {
          "slot_id": "slot_w24_mon_salad",
          "meal_type": "salad",
          "meal_type_label": "Salad",
          "meal": null,
          "is_filled": false,
          "is_editable": true
        }
      ]
    }
  ],
  "publish_ready": false,
  "publish_blocked_reason": "1 slot unfilled (Sun Salad)"
}
```

**Business Rules**
- `is_editable: false` on all slots when the week is `published` (current week). The grid renders at 45% opacity.
- `publish_ready: true` only when all 10 slots (5 days × 2 types) are filled.
- `publish_blocked_reason` explains why publishing is blocked when `publish_ready: false`.

---

### 1.3 `POST /admin/menu/weeks/:week_id/slots/:slot_id/assign`

Assigns a meal to a specific slot. This is the "Assign Dish Modal" confirm action.

**Auth:** Required — `admin` role

**Path Parameters**

| Parameter | Description |
|-----------|-------------|
| `week_id` | Week identifier |
| `slot_id` | Slot identifier from `GET /admin/menu/weeks/:week_id` |

**Request Body**

```json
{
  "meal_id": "meal_01JK2ABX"
}
```

**Response `200 OK`**

```json
{
  "slot_id": "slot_w24_sun_salad",
  "meal_type": "salad",
  "delivery_date": "2025-05-12",
  "meal": {
    "meal_id": "meal_01JK2ABX",
    "name_en": "Ch. Fattoush",
    "kcal": 380
  },
  "week_fill_status": {
    "filled_days": 5,
    "total_days": 5,
    "publish_ready": true
  }
}
```

**Response `409 Conflict` — Meal already used this week**

```json
{
  "error": "MEAL_ALREADY_USED",
  "message": "Ch. Fattoush is already assigned to Mon (Executive) this week. Each meal can only appear once per week.",
  "used_on_day": "Mon",
  "used_in_slot": "executive"
}
```

**Response `422 Unprocessable Entity` — Draft meal**

```json
{
  "error": "MEAL_IS_DRAFT",
  "message": "Draft meals cannot be assigned to week slots. Activate the meal first."
}
```

**Business Rules**
- Each meal can appear **at most once** per week across both meal types (F26 annotation 2). A meal assigned on Monday Executive cannot be re-used anywhere else in the same week.
- Only `active` meals can be assigned. Draft meals are excluded from the picker entirely (F30 annotation 2).
- Replacing a slot (assigning to a slot that already has a meal) is allowed — the old meal is displaced with no confirmation required.

---

### 1.4 `DELETE /admin/menu/weeks/:week_id/slots/:slot_id`

Clears a meal assignment from a slot, returning it to empty state.

**Auth:** Required — `admin` role

**Response `200 OK`**

```json
{
  "slot_id": "slot_w24_sun_salad",
  "meal": null,
  "is_filled": false,
  "week_fill_status": {
    "filled_days": 4,
    "total_days": 5,
    "publish_ready": false
  }
}
```

**Business Rules**
- Cannot clear slots on published weeks (`is_editable: false`).
- Clearing a slot on a draft week does not require confirmation.

---

### 1.5 `POST /admin/menu/weeks/:week_id/publish`

Publishes a complete week's menu. Once published, the meals become visible to customers in the Menu tab and Home screen meal strip for the relevant dates.

**Auth:** Required — `admin` role

**Request Body** — None required.

**Response `200 OK`**

```json
{
  "week_id": "w2025-24",
  "status": "published",
  "published_at": "2025-05-09T11:30:00Z",
  "published_by": "Mohammed Al-Qahtani",
  "customer_visible_from": "2025-05-12"
}
```

**Response `409 Conflict` — Not all slots filled**

```json
{
  "error": "WEEK_NOT_COMPLETE",
  "message": "Cannot publish. 1 slot is still unfilled.",
  "unfilled_slots": [
    { "slot_id": "slot_w24_sun_salad", "day": "Sun 12 May", "meal_type": "salad" }
  ]
}
```

**Business Rules**
- Publishing is irreversible. Once published, the week status cannot revert to `draft`.
- Meals in a published week can only be changed by contacting the development team (no admin UI for this in v1).
- Published meals immediately become available in `GET /menu/week` (customer-facing endpoint).

---

## 2. Meal Library

The Meal Library is the database of all dishes. Meals exist independently of any week schedule. Admin creates meals here, then assigns them to week slots in the planner.

**Meal lifecycle:**
```
[Add Dish] → status: draft
     ↓ (Activate)
status: active  ←→  status: draft   (toggle Active ↔ Draft)
```
New meals always save as `draft` regardless of how they were created (manual or XLSX import). Admin must explicitly activate a meal before it can be assigned to a week slot.

---

### 2.1 `GET /admin/meals`

Returns the paginated list of all meals in the library. Used by the Meal Library tab and the Assign Dish Modal picker.

**Auth:** Required — `admin` role

**Query Parameters**

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `status` | string | No | `all` (default), `active`, or `draft`. |
| `meal_type` | string | No | `all` (default), `executive`, or `salad`. |
| `q` | string | No | Search by dish name (EN or AR). |
| `page` | integer | No | Default `1`. |
| `per_page` | integer | No | Default `20`, max `50`. |
| `context` | string | No | `picker` — when called from the Assign Dish Modal. Returns only `active` meals and excludes meals already used in `exclude_week_id`. |
| `exclude_week_id` | string | No | Used with `context=picker`. Dishes already assigned to this week are returned with `already_used: true` and shown greyed out in the picker. |

**Response `200 OK`**

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
    },
    {
      "meal_id": "meal_01JK2XYZ",
      "name_en": "Harira Soup",
      "name_ar": "حريرة",
      "meal_type": "executive",
      "kcal": 320,
      "status": "draft",
      "already_used": null,
      "used_on_day": null
    }
  ],
  "pagination": {
    "page": 1,
    "per_page": 20,
    "total": 14,
    "total_pages": 1
  }
}
```

**Business Rules**
- In `context=picker`, only `active` meals are returned. `draft` meals are excluded entirely.
- `already_used: true` means the meal is already in another slot of the target week. It appears greyed with "Used — [Day]" in the picker and cannot be selected.
- Default sort: most recently activated first.

---

### 2.2 `GET /admin/meals/:meal_id`

Returns full detail of a single meal including all fields and past week usage.

**Auth:** Required — `admin` role

**Response `200 OK`**

```json
{
  "meal_id": "meal_01JK2ABX",
  "name_en": "Lamb Kabsa",
  "name_ar": "كبسة لحم",
  "meal_type": "executive",
  "kcal": 550,
  "macros": {
    "protein_g": 38,
    "carbs_g": 62,
    "fat_g": 14
  },
  "chef_note": "Slow-cooked for 4 hours with saffron rice and dried lime.",
  "key_ingredients": ["Lamb", "Saffron rice", "Dried lime"],
  "emoji": "🍛",
  "status": "active",
  "photo_url": null,
  "created_at": "2025-04-01T10:00:00Z",
  "activated_at": "2025-04-02T09:00:00Z",
  "last_served": "2025-05-05",
  "times_served": 8
}
```

---

### 2.3 `POST /admin/meals`

Creates a new meal. Always saves as `draft` regardless of the request body.

**Auth:** Required — `admin` role

**Request Body**

```json
{
  "name_en": "Lamb Kabsa",
  "name_ar": "كبسة لحم",
  "meal_type": "executive",
  "kcal": 550,
  "macros": {
    "protein_g": 38,
    "carbs_g": 62,
    "fat_g": 14
  },
  "chef_note": "Slow-cooked for 4 hours with saffron rice and dried lime.",
  "key_ingredients": ["Lamb", "Saffron rice", "Dried lime"],
  "emoji": "🍛"
}
```

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `name_en` | string | Yes | English dish name. Max 80 characters. |
| `name_ar` | string | No | Arabic dish name. Max 80 characters. |
| `meal_type` | string | Yes | `executive` or `salad` |
| `kcal` | integer | Yes | Total calories. |
| `macros.protein_g` | number | No | Protein in grams. |
| `macros.carbs_g` | number | No | Carbohydrates in grams. |
| `macros.fat_g` | number | No | Fat in grams. |
| `chef_note` | string | No | Admin-authored note shown on the customer meal detail screen. |
| `key_ingredients` | array of strings | No | List of main ingredients. Shown on full-screen meal detail. |
| `emoji` | string | No | Single emoji used as meal thumbnail. Default `🍛`. |

**Response `201 Created`**

```json
{
  "meal_id": "meal_01JK3NEW",
  "name_en": "Lamb Kabsa",
  "status": "draft",
  "created_at": "2025-05-09T11:00:00Z"
}
```

**Business Rules**
- `status` is always `draft` on creation. No `status` field should be passed in the request body.
- Photo upload is manual via a separate process (not a field in this endpoint). In v1 there is no photo API.

---

### 2.4 `PATCH /admin/meals/:meal_id`

Updates meal fields. All fields are optional (partial update).

**Auth:** Required — `admin` role

**Request Body** — Any subset of the fields from `POST /admin/meals`.

```json
{
  "chef_note": "Updated: now slow-cooked for 5 hours.",
  "kcal": 560
}
```

**Response `200 OK`**

Returns the full updated meal object (same shape as `GET /admin/meals/:meal_id`).

**Business Rules**
- Updates to `name_en`, `name_ar`, `kcal`, `macros` on an **active** meal take effect immediately — customers will see the updated values on the meal detail screen.
- Updates to a meal that is **already published in a current week** require confirmation from the admin before saving (`confirm_published_edit: true` in the request body). If omitted and the meal is in a published week, a `409` is returned with a warning.

**Request Body with confirmation**

```json
{
  "chef_note": "Updated note.",
  "confirm_published_edit": true
}
```

**Response `409 Conflict` — Without confirmation**

```json
{
  "error": "MEAL_IN_PUBLISHED_WEEK",
  "message": "This meal is currently in the published menu for W23 (Sun 5 – Thu 9 May). Editing it will update what customers see immediately. Pass confirm_published_edit: true to proceed.",
  "affected_weeks": ["w2025-23"]
}
```

---

### 2.5 `PATCH /admin/meals/:meal_id/status`

Toggles a meal between `active` and `draft`. This is the "Activate" / "→ Draft" button in the Meal Library table.

**Auth:** Required — `admin` role

**Request Body**

```json
{
  "status": "active"
}
```

**Response `200 OK`**

```json
{
  "meal_id": "meal_01JK2XYZ",
  "previous_status": "draft",
  "status": "active",
  "updated_at": "2025-05-09T12:00:00Z"
}
```

**Response `409 Conflict` — Draft-ing a published week's meal**

```json
{
  "error": "MEAL_IN_PUBLISHED_WEEK",
  "message": "This meal is in the published menu for W23. Moving it to Draft will remove it from the customer-visible menu. Pass confirm_published_edit: true to proceed.",
  "affected_weeks": ["w2025-23"]
}
```

**Business Rules**
- Moving a meal to `draft` that is assigned to a **future draft week** is allowed without confirmation — the slot simply becomes empty and requires reassignment before that week can be published.
- Moving a meal to `draft` that is in a **published current week** requires `confirm_published_edit: true` (F30 annotation 3). Once confirmed, the meal is removed from customer-visible data for remaining days of that week.
- Moving a meal to `active` from `draft` has no impact on any week — the meal becomes available for future week planning only.

---

### 2.6 `POST /admin/meals/import`

Bulk-imports meals from an XLSX file. All imported meals are saved as `draft`. Photo upload always requires manual action after import.

**Auth:** Required — `admin` role

**Request** — `multipart/form-data`

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `file` | file | Yes | `.xlsx` file. Max 5 MB. |

**XLSX expected columns (case-insensitive headers):**

| Column | Required | Notes |
|--------|----------|-------|
| `name_en` | Yes | English dish name |
| `name_ar` | No | Arabic dish name |
| `meal_type` | Yes | `executive` or `salad` |
| `kcal` | Yes | Integer |
| `protein_g` | No | |
| `carbs_g` | No | |
| `fat_g` | No | |
| `chef_note` | No | |
| `key_ingredients` | No | Comma-separated string, e.g. "Lamb, Rice, Lime" |
| `emoji` | No | Single emoji character |

**Response `200 OK`**

```json
{
  "imported_count": 8,
  "skipped_count": 1,
  "errors": [
    {
      "row": 5,
      "field": "meal_type",
      "message": "Invalid meal_type 'main'. Must be 'executive' or 'salad'."
    }
  ],
  "all_saved_as": "draft",
  "note": "Photos must be uploaded manually. No auto-activation."
}
```

**Business Rules**
- All imported meals are saved as `draft` regardless of any status column in the file (F31 annotation 4).
- Rows with missing required fields (`name_en`, `meal_type`, `kcal`) are skipped and reported in `errors`.
- Valid rows are imported even if some rows fail. Partial import is allowed.
- Max 100 rows per import.

---

## 3. Error Reference

### HTTP status codes

| Code | When used |
|------|-----------|
| `200 OK` | Successful GET, POST, PATCH, DELETE with body |
| `201 Created` | New meal created |
| `401 Unauthorized` | Missing or expired token |
| `403 Forbidden` | Wrong role for endpoint |
| `404 Not Found` | Meal, slot, or week ID not found |
| `409 Conflict` | Meal already used in week; meal in published week without confirmation |
| `422 Unprocessable Entity` | Validation errors, draft meal assignment attempt |

### Domain error codes — Phase 2

| Error code | Endpoint | Description |
|---|---|---|
| `MEAL_ALREADY_USED` | POST .../slots/:slot_id/assign | Meal already in another slot of the same week |
| `MEAL_IS_DRAFT` | POST .../slots/:slot_id/assign | Cannot assign a draft meal to a week slot |
| `WEEK_NOT_COMPLETE` | POST .../publish | Not all 10 slots are filled |
| `WEEK_ALREADY_PUBLISHED` | POST .../publish | Week is already published |
| `SLOT_NOT_EDITABLE` | DELETE .../slots/:slot_id | Slot is in a published (read-only) week |
| `MEAL_IN_PUBLISHED_WEEK` | PATCH /meals/:id, PATCH /meals/:id/status | Meal is in a published week; confirmation required |

---

## Appendix — Screen-to-endpoint map (Phase 2)

| Screen | Frame | Endpoints |
|--------|-------|-----------|
| Menu Manager — Week Planner | F25 | GET /admin/menu/weeks |
| Week grid (W23 + W24) | F25 | GET /admin/menu/weeks/:week_id (×2) |
| Assign Dish Modal | F26 | GET /admin/meals?context=picker&exclude_week_id=... |
| Confirm assignment | F26 | POST .../slots/:slot_id/assign |
| Clear a slot | F27 | DELETE .../slots/:slot_id |
| Publish week | F28, F29 | POST .../publish |
| Meal Library list | F30 | GET /admin/meals |
| Add dish manually | F31, F32 | POST /admin/meals |
| Edit dish | F31 | PATCH /admin/meals/:meal_id |
| Activate / Draft toggle | F30 | PATCH /admin/meals/:meal_id/status |
| XLSX import | F31, F33 | POST /admin/meals/import |

---

*Document version: 1.0 — Phase 2: Menu Manager · Meal Library*
*Previous: Phase 1 — Auth · Dashboard · Daily Operations*
*Next: Phase 3 — Customer Management · Revenue Dashboard*
