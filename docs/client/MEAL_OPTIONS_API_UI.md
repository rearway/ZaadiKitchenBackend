# Meal options — frontend integration (Oct 2026)

Customer still receives **one meal per delivery day**. Admin can now put **up to 3 Executive and 3 Salad dishes** on a day, mark a **default**, and the customer can **pick a dish** on their stream before cutoff.

Skip / pause / plans are unchanged. Same cutoff as skip: **18:00 KSA the day before delivery**.

---

## Product rules (UI)

| Rule | What to show |
|------|----------------|
| One dish per day | Card face = `effective_meal` (what they will receive) |
| Both menus visible | Always show `executive_options` and `salad_options` |
| Their stream | `meal_type` on the day is Executive **or** Salad (plan / per-day switch) |
| Pick a dish | Any dish on that day (Executive or Salad). Enable picker when `can_change === true`. Picking the other stream **switches that day** to that stream |
| No pick | Kitchen uses the **default** (starred option) |
| Switch Executive ↔ Salad | Existing `PATCH .../salad` or `PATCH .../meal-type`. That **clears** the dish pick |
| After cutoff | Picker locked. Kitchen still uses the last valid pick or the default |

**Resolution (do not re-implement on the client):** valid pick → default → only/first filled dish. Live meal fields only (pending admin edits are not shown to customers).

---

## Customer app — APIs

Same URLs as before, **new JSON shape**. New pick endpoints.

| Method | Path | Use |
|--------|------|-----|
| `GET` | `/menu/week` | Menu tab: **one row per date**, both streams |
| `GET` | `/menu` | Unchanged (week labels + filter chips) |
| `GET` | `/meals/:meal_id?delivery_date=` | Dish detail + select flags |
| `GET` | `/home/this-week` | Home strip: **one card per date** = effective dish |
| `GET` | `/subscriptions/me/deliveries` | Calendar: `meal_id`, `meal_name`, `can_change` |
| `GET` | `/subscriptions/me/deliveries/:date/meal-choice` | Open the picker |
| `PUT` | `/subscriptions/me/deliveries/:date/meal-choice` | Save `{ "meal_id": "uuid" }` |

### `GET /menu/week` — one card per day

```json
{
  "this_week": {
    "days": [
      {
        "delivery_date": "2026-10-20",
        "meal_type": "executive",
        "meal_id": "uuid-picked-or-default",
        "name_en": "Lamb Kabsa",
        "effective_meal": { "meal_id": "...", "name_en": "Lamb Kabsa", "kcal": 520 },
        "selected_meal_id": "uuid or null",
        "can_change": true,
        "executive_options": [
          { "meal_id": "...", "name_en": "Lamb Kabsa", "is_default": true, "is_selected": false },
          { "meal_id": "...", "name_en": "Chicken Biryani", "is_default": false, "is_selected": true }
        ],
        "salad_options": [{ "meal_id": "...", "is_default": true, "is_selected": false }],
        "skip_available": true,
        "is_deliverable": true
      }
    ]
  }
}
```

- **Breaking:** `days` is no longer one card per slot. Group by `delivery_date`.
- `meal_type` query is accepted but **both streams are always returned**.
- Skip / undo still use the existing day flags on this card (`skip_available`, `undoable`, `is_skipped`).

### Meal picker — `GET` / `PUT .../meal-choice`

Dedicated APIs for the dish picker. Date is `YYYY-MM-DD` (same as skip). JWT required.

**`GET /subscriptions/me/deliveries/:delivery_date/meal-choice`**

```json
{
  "delivery_date": "2026-10-20",
  "meal_type": "executive",
  "selected_meal_id": null,
  "default_meal_id": "uuid-default",
  "can_change": true,
  "cutoff_at": "2026-10-19T15:00:00.000Z",
  "effective_meal": {
    "meal_id": "uuid-default",
    "name_en": "Lamb Kabsa",
    "meal_type": "executive",
    "kcal": 520,
    "emoji": "🍖",
    "photo_url": null
  },
  "options": [
    { "meal_id": "uuid-default", "name_en": "Lamb Kabsa", "meal_type": "executive", "kcal": 520, "emoji": "🍖", "photo_url": null, "is_default": true, "is_selected": false },
    { "meal_id": "uuid-other", "name_en": "Chicken Biryani", "meal_type": "executive", "kcal": 480, "emoji": "🍗", "photo_url": null, "is_default": false, "is_selected": false }
  ],
  "executive_options": [],
  "salad_options": []
}
```

| Field | UI |
|-------|----|
| `options` | **All** dishes that day (Executive + Salad) — bind the picker to this |
| `executive_options` / `salad_options` | Same list split by stream |
| `selected_meal_id` | `null` if they never picked (kitchen uses default) |
| `default_meal_id` | Star / “Chef’s pick” |
| `effective_meal` | What they will receive right now |
| `can_change` | Enable Select only when `true` (false after cutoff, skipped/paused, or fewer than 2 dishes) |
| `cutoff_at` | ISO UTC of 18:00 KSA the day before |

**`PUT /subscriptions/me/deliveries/:delivery_date/meal-choice`**

```json
{ "meal_id": "uuid-other" }
```

**200**

```json
{
  "delivery_date": "2026-10-20",
  "meal_type": "executive",
  "selected_meal_id": "uuid-other",
  "effective_meal": { "meal_id": "uuid-other", "name_en": "Chicken Biryani", "meal_type": "executive", "kcal": 480, "emoji": "🍗", "photo_url": null }
}
```

`meal_id` must be on the menu that day (either stream). If they pick a Salad dish while on Executive, the day switches to Salad and that dish is saved (and the reverse). `PATCH .../salad` / `PATCH .../meal-type` still clear the pick.

| Status | When |
|--------|------|
| `404` | No subscription, or no delivery on that date |
| `422 PAST_CUTOFF` | After 18:00 KSA the day before |
| `400` | Dish not on that day’s menu, or day is not `scheduled` (skipped / paused / delivered) |

Flow: open picker with GET → show `options` if `can_change` → PUT chosen `meal_id` → refresh menu/home from `effective_meal`. If `can_change === false`, show `effective_meal` read-only.

### `GET /meals/:meal_id`

Pass `delivery_date` from the card. Extra flags:

| Field | UI |
|-------|----|
| `is_effective` | This is what they get |
| `is_selected` | They already picked this |
| `is_default` | Admin default |
| `can_select` | Show **Select** (then `PUT meal-choice`) |

### Home / deliveries / ratings / history

No new screens. `meal_id` / `meal_name` / `photo_url` are already the **effective** dish (pick or default). Home cards also include `executive_options`, `salad_options`, `can_change` if you want a picker from Home.

---

## Admin portal (already shipped with this backend)

Meals: `draft` → `active` (then assignable). Editing an active meal saves **pending** (`status: updated`); live menu does not change until **Activate** with `confirm_published_edit: true`. Show a confirm popup: this applies to every day that dish is on, including past cutoff.

Planner: min **1+1**, max **3+3** per day; each stream needs a default. **Draft and published weeks can add/remove/replace dishes** (`is_editable: true` — do not unpublish, or customers lose the week). `past` weeks stay locked. Published weeks must keep at least one Executive and one Salad on each day (`409 CANNOT_CLEAR_LAST_STREAM_MEAL`). The same dish cannot appear twice on the same date (`409 MEAL_ALREADY_ON_DAY`).

- `POST /admin/menu/weeks/:week_id/days/:date/slots` `{ meal_type, meal_id? }`
- `PATCH /admin/menu/weeks/:week_id/days/:date/default` `{ meal_type, meal_id }`

Daily ops `meal_breakdown.rows` is **per dish** (`meal_id`, `label` = dish name), not only Executive vs Salad. Labels / export / rider responses include **`meal_name`** (effective dish: pick or default) and **`customer_phone`** for contact. ERP daily-orders maps the selected/default dish code.

---

## What not to change

- Skip, undo, pause, cancel, plans, checkout
- One delivery per customer per day
- Cutoff time (6 PM KSA day before)
