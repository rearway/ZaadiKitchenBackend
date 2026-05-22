# Zaadi Kitchen API Documentation
## Home Screen Module · Meal Detail & Menu Module

**Base URL:** `{{base_url}}` → `http://localhost:3000/api/v1`  
**Auth:** All endpoints require `Authorization: Bearer {{access_token}}` unless noted.  
**Content-Type:** `application/json`

---

## Table of Contents

1. [Dependent APIs (shared prerequisites)](#1-dependent-apis-shared-prerequisites)
   - 1.1 GET /meals/:meal_id
2. [Home Screen Module (F23–F30)](#2-home-screen-module-f23f30)
   - 2.1 GET /home
   - 2.2 GET /home/this-week
3. [Meal Detail & Menu Module (F31–F36)](#3-meal-detail--menu-module-f31f36)
   - 3.1 GET /menu
   - 3.2 GET /menu/week
   - 3.3 GET /meals/:meal_id

---

## Overview

### How the Home screen works

The Home screen is a **single composite endpoint** (`GET /home`) that returns all the data needed to render any of the four subscription states in one call. The client does not need to know the user's state before calling it — the response includes a `subscription_status` field that drives which layout variant to render.

**State → layout mapping (colour rules from F23–F26):**

| `subscription_status` | Banner colour | Hero tone | Primary CTA |
|---|---|---|---|
| `none` | Red | Red hero — action needed | "Start for SAR 28 →" |
| `active` | Black | Black — settled state | Delivery location "Edit" |
| `expired` | Red | Red — action needed | "Renew →" |
| `paused` | Black | Black — intentional stop | "Resume →" |
| `cancelled` | Black | Black — winding down | Deliveries continue until end date |

### Meal data architecture

Meals are **admin-defined** and assigned to delivery dates on a schedule. The client always fetches meals by date range — it never needs to know meal IDs upfront. The `GET /menu/week` endpoint returns both this week (N) and next week (N+1) in a single call, which is all the Menu tab ever displays.

`GET /home/this-week` is a lighter version that returns only the current week's cards for the Home screen meal strip — it reuses the same meal objects but with a delivery-state overlay per card.

---

## 1. Dependent APIs (shared prerequisites)

### 1.1 `GET /meals/:meal_id`

Returns the full detail for a single meal. This is the data source for **both** the bottom sheet (Home card tap) and the full screen (Menu card tap). The client does not need to call different endpoints for the two presentation modes — both render from this same response. The `view_mode` is purely a client-side routing decision.

**Auth:** Required

**Path Parameters**

| Parameter | Description |
|-----------|-------------|
| `meal_id` | UUID of the meal |

**Response `200 OK`**

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
  "key_ingredients": [
    "Lamb",
    "Saffron rice",
    "Dried lime"
  ],
  "delivery_date": "2025-05-05"
}
```

| Field | Notes |
|-------|-------|
| `name_ar` | Arabic name displayed below the English title (Tajawal font, F32) |
| `chef_note` | Set by admin. Shown in italic grey box. `null` if admin left it blank. |
| `key_ingredients` | Full-screen view only (F33). Bottom sheet does not show this array. |
| `delivery_date` | The date this meal is scheduled. Used by the client to determine if the Skip action should be shown and whether the cutoff has passed. |

**Response `404 Not Found`**

```json
{
  "error": "MEAL_NOT_FOUND",
  "message": "Meal not found."
}
```

**Business Rules**
- The **Skip action is shown** when `delivery_date` >= today AND the current server time is before 18:00 AST the day prior to `delivery_date`, AND the user has an active subscription with skip days remaining.
- **Past meal rows** open read-only — no Skip button (F33). The client uses `delivery_date` to determine this; there is no separate flag.
- The bottom sheet (from Home card tap) shows: name, `name_ar`, meal type pill, kcal pill, macros row (kcal / protein / carbs / fat), `chef_note`, and the Skip action.
- The full screen (from Menu card tap) additionally shows `key_ingredients`.
- No salad add-on in v1 (F32).

---

## 2. Home Screen Module (F23–F30)

**Screen coverage:** Home — Unsubscribed (F23), Home — Active (F24), Home — Expired (F25), Home — Paused (F26).

**Flow summary:**
```
App open
  → GET /home                    (renders header banner per subscription_status)
  → GET /home/this-week          (renders meal strip cards)
  → tap meal card → GET /meals/:meal_id   (opens bottom sheet)
```

---

### 2.1 `GET /home`

Returns everything needed to render the Home screen header banner and the subscription-state-aware UI sections. This is a composite response — it aggregates subscription, delivery location, wallet, and user data so the client makes a single call on app open.

**Auth:** Required

**Response `200 OK` — Unsubscribed user**

```json
{
  "user": {
    "first_name": "Ahmed",
    "language": "EN"
  },
  "subscription_status": "none",
  "subscription": null,
  "delivery_location": null,
  "wallet_balance_sar": 0,
  "banner": {
    "theme": "red",
    "headline": "Fresh lunch, delivered daily.",
    "subtext": "From our kitchen to your desk. Every day.",
    "primary_cta": {
      "label": "Start for SAR 28 →",
      "action": "navigate_plan_selection"
    },
    "secondary_cta": {
      "label": "Browse menu →",
      "action": "navigate_menu_tab"
    }
  },
  "quick_actions": null,
  "plans": [
    {
      "id": "try_it",
      "name": "Try It",
      "price_sar": 28,
      "meal_count": 1,
      "price_per_meal_sar": 28.00,
      "is_most_popular": false,
      "is_current_plan": false,
      "cta_label": "Subscribe →"
    },
    {
      "id": "week",
      "name": "Week Plan",
      "price_sar": 125,
      "meal_count": 5,
      "price_per_meal_sar": 25.00,
      "is_most_popular": false,
      "is_current_plan": false,
      "cta_label": "Subscribe →"
    },
    {
      "id": "month",
      "name": "Month Plan",
      "price_sar": 500,
      "meal_count": 22,
      "price_per_meal_sar": 22.70,
      "is_most_popular": true,
      "is_current_plan": false,
      "cta_label": "Subscribe →"
    },
    {
      "id": "quarterly",
      "name": "Quarterly",
      "price_sar": 1300,
      "meal_count": 66,
      "price_per_meal_sar": 19.70,
      "is_most_popular": false,
      "is_current_plan": false,
      "cta_label": "Subscribe →"
    }
  ]
}
```

**Response `200 OK` — Active subscriber**

```json
{
  "user": {
    "first_name": "Ahmed",
    "language": "EN"
  },
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
    "plan_label": "Month Plan · Executive",
    "greeting": "Good morning, Ahmed 👋",
    "days_remaining_label": "17 days left",
    "end_date_label": "Ends 3 Jun",
    "location_label": "📍 Al Nakheel Tower · Floor 7",
    "location_edit_action": "navigate_edit_location"
  },
  "quick_actions": [
    {
      "id": "skip",
      "label": "Skip a day",
      "icon": "⏭",
      "subtext": "Before 6 PM cutoff · No charge",
      "action": "navigate_skip_screen",
      "theme": "red_tint"
    },
    {
      "id": "pause",
      "label": "Pause anytime",
      "icon": "⏸",
      "subtext": "Freeze your plan · No charge",
      "action": "open_pause_modal",
      "theme": "grey"
    }
  ],
  "plans": [
    {
      "id": "try_it",
      "name": "Try It",
      "price_sar": 28,
      "meal_count": 1,
      "price_per_meal_sar": 28.00,
      "is_most_popular": false,
      "is_current_plan": false,
      "cta_label": "Switch →"
    },
    {
      "id": "month",
      "name": "Month Plan",
      "price_sar": 500,
      "meal_count": 22,
      "price_per_meal_sar": 22.70,
      "is_most_popular": true,
      "is_current_plan": true,
      "cta_label": "Switch →"
    }
  ]
}
```

**Response `200 OK` — Expired subscriber**

```json
{
  "subscription_status": "expired",
  "subscription": {
    "plan_name": "Month Plan",
    "meal_type": "executive",
    "end_date": "2025-04-28"
  },
  "banner": {
    "theme": "red",
    "status_pill": "Expired",
    "primary_cta": {
      "label": "Renew →",
      "action": "navigate_plan_selection_returning"
    }
  },
  "plans": [
    {
      "id": "try_it",
      "name": "Try It",
      "price_sar": 28,
      "meal_count": 1,
      "price_per_meal_sar": 28.00,
      "is_most_popular": false,
      "is_last_plan": false,
      "cta_label": "Renew →"
    },
    {
      "id": "month",
      "name": "Month Plan",
      "price_sar": 500,
      "meal_count": 22,
      "price_per_meal_sar": 22.70,
      "is_most_popular": true,
      "is_last_plan": true,
      "cta_label": "Renew →"
    }
  ]
}
```

**Response `200 OK` — Paused subscriber**

```json
{
  "subscription_status": "paused",
  "subscription": {
    "subscription_id": "sub_01JM3XYZ",
    "plan_name": "Month Plan",
    "meal_type": "executive",
    "paused_since": "2025-04-28",
    "days_frozen": 14,
    "pause_ceiling_date": "2025-07-04"
  },
  "banner": {
    "theme": "black",
    "status_pill": "Paused",
    "pause_label": "14 days frozen · Paused 28 Apr",
    "primary_cta": {
      "label": "Resume →",
      "action": "open_resume_modal"
    }
  },
  "quick_actions": [
    {
      "id": "resume",
      "label": "Resume Now",
      "icon": "▶️",
      "action": "open_resume_modal",
      "theme": "red_tint"
    },
    {
      "id": "browse_menu",
      "label": "Browse Menu",
      "icon": "🍽",
      "action": "navigate_menu_tab",
      "theme": "white"
    }
  ],
  "plans": [
    {
      "id": "month",
      "name": "Month Plan",
      "price_sar": 500,
      "meal_count": 22,
      "price_per_meal_sar": 22.70,
      "is_most_popular": true,
      "is_current_plan": true,
      "cta_label": "Switch →"
    }
  ]
}
```

**`subscription_status` values and their plan CTA labels**

| Status | Plans section heading | CTA label on each plan row |
|---|---|---|
| `none` | "Plans" | "Subscribe →" |
| `active` | "Your Plan" | "Switch →" (current plan row highlighted with red left border) |
| `expired` | "Renew Your Plan" | "Renew →" |
| `paused` | "Your Plan" | "Switch →" (current plan highlighted) |
| `cancelled` | "Renew Your Plan" | "Renew →" |

**Business Rules**
- `plans` array always returns all 4 plans in the same order (Try It → Week → Month → Quarterly).
- The plans section heading and CTA labels are server-driven via `cta_label` so they can be updated without an app release.
- `quick_actions` for active users route directly to live actions (Skip screen, Pause modal) — not informational modals. Unsubscribed users get the same ⏭ / ⏸ chips but they open informational modals (static content, no API needed).
- `wallet_balance_sar` is included on active/expired states only so the credit strip can be rendered on the Home hero without a separate wallet call.

---

### 2.2 `GET /home/this-week`

Returns the meal cards for the **this-week horizontal strip** on the Home screen. Called after `GET /home` to populate the scrollable meal row. Returns today through the end of the current working week (Sun–Thu), with a delivery-state overlay on each card.

**Auth:** Required

**Response `200 OK`**

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
      "action": {
        "type": "open_meal_detail",
        "cta_label": "Subscribe →"
      }
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
      "action": {
        "type": "open_meal_detail",
        "cta_label": "Subscribe →"
      }
    },
    {
      "meal_id": "meal_01JK2ADX",
      "name_en": "Chicken Mandi",
      "meal_type": "executive",
      "kcal": 490,
      "emoji": "🍛",
      "delivery_date": "2025-05-07",
      "day_label": "Tue",
      "card_state": "upcoming",
      "card_border": "default",
      "action": {
        "type": "open_meal_detail",
        "cta_label": "Subscribe →"
      }
    }
  ]
}
```

**`card_state` values and their UI behaviour**

| `card_state` | When used | Opacity | CTA shown |
|---|---|---|---|
| `today` | Today's date (all states) | 100% | Varies by `subscription_status` |
| `upcoming` | Future days this week | 100% | Varies by `subscription_status` |
| `skipped` | Day is skipped (active subscriber) | 100% | None (day is marked skipped) |
| `past` | Dates before today (active, delivered) | 100% | None (read-only on tap) |
| `browse_only` | Any day when subscription is paused | 100% | "Browse only" label, no action |
| `past_greyed` | Dates before today that were not delivered or were skipped in full | 45% opacity | None |

**`action.cta_label` by subscription status**

| `subscription_status` | `cta_label` |
|---|---|
| `none` | "Subscribe →" |
| `active` (skippable day) | "Skip →" |
| `active` (past cutoff or skip limit reached) | — (no CTA, greyed) |
| `active` (already skipped) | "Undo" |
| `expired` | "Renew →" |
| `paused` | "Browse only" (not a button) |

**Business Rules**
- This endpoint returns the **current working week only** (Sun–Thu). For next week, the client uses `GET /menu/week`.
- The meal strip is always visible and cards are always tappable (F23 annotation 3): cards open `GET /meals/:meal_id` regardless of subscription state.
- For paused subscribers, cards show "Browse only" — tapping still opens Meal Detail in read-only mode with no Skip action (F26 annotation 5).
- For expired subscribers, cards still tap through to Meal Detail but the bottom sheet renders in read-only mode with no Skip action (F25 annotation 2).

---

## 3. Meal Detail & Menu Module (F31–F36)

**Screen coverage:** Meal Detail — Bottom Sheet (F32), Meal Detail — Full Screen (F33), Menu — 10-Day Horizontal View (F34–F36).

**Flow summary:**
```
Home card tap  → GET /meals/:meal_id → renders as bottom sheet
Menu card tap  → GET /meals/:meal_id → renders as full screen

Menu tab load  → GET /menu/week      → both week strips (this week + next week)
Menu card tap  → GET /meals/:meal_id → full screen
```

---

### 3.1 `GET /menu`

Returns light metadata for the Menu tab header — the active filter state and the current week range labels. Used to render the tab header (filter chips: All / Executive / Salad) and section headings ("This week · Sun 5 – Thu 9 May" and "Next week · Sun 12 – Thu 16 May").

**Auth:** Required

**Response `200 OK`**

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

> **Note:** This endpoint is optional — clients that compute week ranges client-side do not need to call it. It is included for teams that want server-driven date labels (e.g. for future localisation of date formats). The meal cards themselves come from `GET /menu/week`.

---

### 3.2 `GET /menu/week`

Returns the full 10-day meal schedule for both the current week (N) and the next working week (N+1). This is the primary data endpoint for the Menu tab. Both week strips are returned in one call to avoid a second round-trip when the user scrolls to "Next week."

**Auth:** Required

**Query Parameters**

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `meal_type` | string | No | One of: `all`, `executive`, `salad`. Default `all`. Maps to the filter tabs. |

**Response `200 OK`**

```json
{
  "this_week": {
    "label": "This week · Sun 5 – Thu 9 May",
    "date_from": "2025-05-05",
    "date_to": "2025-05-09",
    "days": [
      {
        "meal_id": "meal_01JK2ABX",
        "name_en": "Lamb Kabsa",
        "meal_type": "executive",
        "kcal": 550,
        "emoji": "🍛",
        "delivery_date": "2025-05-05",
        "day_label": "Sun 5",
        "card_state": "past",
        "is_today": false,
        "skip_available": false,
        "skip_reason": "past_cutoff"
      },
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
      },
      {
        "meal_id": "meal_01JK2ADX",
        "name_en": "Chicken Mandi",
        "meal_type": "executive",
        "kcal": 490,
        "emoji": "🍛",
        "delivery_date": "2025-05-07",
        "day_label": "Tue 7",
        "card_state": "upcoming",
        "is_today": false,
        "skip_available": true,
        "skip_reason": null
      }
    ]
  },
  "next_week": {
    "label": "Next week · Sun 12 – Thu 16 May",
    "date_from": "2025-05-12",
    "date_to": "2025-05-16",
    "days": [
      {
        "meal_id": "meal_01JK2AEX",
        "name_en": "Kofta Platter",
        "meal_type": "executive",
        "kcal": 520,
        "emoji": "🍛",
        "delivery_date": "2025-05-12",
        "day_label": "Sun 12",
        "card_state": "upcoming",
        "is_today": false,
        "skip_available": true,
        "skip_reason": null
      },
      {
        "meal_id": "meal_01JK2AFX",
        "name_en": "Salmon Bowl",
        "meal_type": "salad",
        "kcal": 360,
        "emoji": "🥗",
        "delivery_date": "2025-05-13",
        "day_label": "Mon 13",
        "card_state": "upcoming",
        "is_today": false,
        "skip_available": true,
        "skip_reason": null
      }
    ]
  }
}
```

**`card_state` values in Menu context**

| `card_state` | UI behaviour | Opacity |
|---|---|---|
| `today` | Red border (`1.5px solid red`). `day_label` = "TODAY" in red. Skip button active if `skip_available: true`. | 100% |
| `past` | Standard border, greyed. `day_label` = "Sun 5" format. No action button shown — empty placeholder area. Card still tappable (read-only Meal Detail). | 45% |
| `upcoming` | Standard border. `day_label` = "Tue 7" format. Skip button active if `skip_available: true`. | 100% |
| `skipped` | Shown on skipped days. No Skip button — card still tappable. | 100% |

**`skip_reason` values (when `skip_available: false`)**

| Value | Condition |
|---|---|
| `past_cutoff` | Current time is after 18:00 AST the day before this delivery date |
| `skip_limit_reached` | User has used all their `skip_days_allowed` |
| `not_subscribed` | User has no active subscription |
| `subscription_paused` | Subscription is currently paused |
| `subscription_expired` | Subscription has expired |
| `subscription_cancelled` | Subscription has been cancelled |
| `already_skipped` | Day is already in skipped state |

**Business Rules**
- The Menu tab is **accessible in all subscription states** — including unsubscribed, expired, and paused (F34 annotation 4). For unsubscribed and expired users, `skip_available` is always `false` with reason `not_subscribed` or `subscription_expired`.
- Filter tabs (All / Executive / Salad) apply to **both week strips simultaneously** (F34 annotation 1). Filtering is done server-side via the `meal_type` query parameter; the client does not need to filter locally.
- Past meal cards (before today) are returned at 45% opacity with no Skip button area — the button placeholder is empty (F34 annotation 2).
- The "← scroll" label visible in the UI is a static client-side element; it does not come from the API.
- For `next_week`, Skip buttons are always active for all days (they are always in the future), unless a subscription-level constraint applies (`skip_limit_reached`, `not_subscribed`, etc.).

---

### 3.3 `GET /meals/:meal_id`

Documented in §1.1. This is the single endpoint called from both Home card taps (renders as bottom sheet) and Menu card taps (renders as full screen). The `view_mode` (bottom sheet vs full screen) is a client routing decision, not an API concern.

**Summary of what each presentation shows:**

| Field | Bottom sheet (F32) | Full screen (F33) |
|---|---|---|
| `name_en` | ✅ | ✅ |
| `name_ar` | ✅ (Tajawal, below title) | ✅ |
| Meal type pill | ✅ | ✅ |
| kcal pill | ✅ | ✅ |
| Macros row (kcal / protein / carbs / fat) | ✅ | ✅ (abbreviated: kcal + protein only) |
| `chef_note` | ✅ | ✅ |
| `key_ingredients` | ❌ | ✅ |
| Skip action (sticky footer) | ✅ (if `skip_available`) | ✅ (sticky at bottom, F33) |
| Back button | ❌ (dismissible sheet) | ✅ (top-left `←`) |

---

## 4. Error Reference

### Standard error envelope

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
| `200 OK` | Success | All GET endpoints |
| `401 Unauthorized` | Missing or invalid token | Any authenticated endpoint |
| `404 Not Found` | Resource not found | `GET /meals/:meal_id` with invalid ID |

### Domain error codes

| `error` code | Endpoint | Description |
|---|---|---|
| `MEAL_NOT_FOUND` | GET /meals/:meal_id | Meal ID does not exist |

> Most errors in this module are **state-driven**, not HTTP errors. For example, a card with `skip_available: false` is not an error — it is a valid response with a `skip_reason`. The client uses these flags to render the correct UI state rather than receiving a 4xx.

---

## Appendix — Screen-to-endpoint map

| Screen | Frame | Endpoints called |
|---|---|---|
| Home — Unsubscribed | F23 | `GET /home`, `GET /home/this-week` |
| Home — Active | F24 | `GET /home`, `GET /home/this-week` |
| Home — Expired | F25 | `GET /home`, `GET /home/this-week` |
| Home — Paused | F26 | `GET /home`, `GET /home/this-week` |
| Meal Detail — Bottom Sheet | F32 | `GET /meals/:meal_id` |
| Meal Detail — Full Screen | F33 | `GET /meals/:meal_id` |
| Menu Tab | F34 | `GET /menu` *(optional)*, `GET /menu/week` |
| Menu — card tap | F35, F36 | `GET /meals/:meal_id` |

---

*Document version: 1.0 — Home Screen (F23–F30) · Meal Detail & Menu (F31–F36)*  
*Previous: Plan & Payment (F10–F22) · Subscription Management (F37–F56)*  
*Next: Feedback & Support (F57–F63)*
