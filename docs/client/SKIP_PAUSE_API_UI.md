# Skip / pause / flex — API changes for UI (Oct 2026)

Share this with mobile/web. Product rules: [SKIP_PAUSE_FLEX.md](./SKIP_PAUSE_FLEX.md).

## New endpoint

| Method | Path | Body | When |
|--------|------|------|------|
| `POST` | `/api/v1/subscriptions/me/pause/cancel` | _(none)_ | User scheduled a pause but it has **not** started yet (before pause-start 6 PM KSA cutoff). |

**200 response**

```json
{
  "subscription_id": "uuid",
  "status": "active",
  "pause_days_used": 0,
  "pause_days_remaining": 63,
  "skip_days_used": 0,
  "skip_days_remaining": 63,
  "skip_pause_days_remaining": 63
}
```

**Errors:** `400` no pause to cancel; `400` pause already started (use resume); `404` no subscription.

---

## Behavior changes (not new paths)

| Flow | Before (UI assumption) | Now |
|------|------------------------|-----|
| After `POST /pause` | `status` → `paused` immediately | `status` stays **`active`** until **6 PM KSA the day before** `start_date`. Use `pause_scheduled: true`. |
| Skip vs pause allowance | Separate counters could diverge | **One pool:** `skip_days_used === pause_days_used`, same `*_remaining`. Prefer `skip_pause_days_remaining`. |
| Pause charge | Sometimes calendar days | **Working days** Sun–Thu in range (holidays excluded) → `paused_days[]`. |
| `GET /subscriptions/me` `days_remaining` | Could look like calendar days to `end_date` | **Meal days left:** `total_meal_days - delivered_count - skipped_count` (same as `remaining_count`). |

---

## Day-level flags (use everywhere)

Present on **deliveries**, **menu/week cards**, **home/this-week cards**, **meal detail** (with `delivery_date`).

| Field | Type | UI rule |
|-------|------|---------|
| `skip_available` | boolean | Show **Skip** when `true` |
| `undoable` | boolean | Show **Undo skip** when `true` |
| `is_skipped` | boolean | Skipped styling when `true` |
| `skip_reason` | string \| null | Tooltip / disabled state when skip blocked; `null` if skip allowed |

`skip_reason` values: `past_cutoff`, `skip_limit_reached`, `not_subscribed`, `subscription_paused`, `subscription_expired`, `subscription_cancelled` (cancelled **after** `end_date` only — in-cycle cancel behaves like active for skip/pause), `already_skipped`, `meal_type_mismatch`, `day_paused`.

**Deliveries only:** `skippable` is deprecated — mirror of `skip_available`.

**Paused subscription:** `is_skipped` is **`false`** on read APIs even if DB status was `skipped` (show pause/browse, not skip state).

**Menu week:** `card_state` = `skipped` only when `is_skipped === true`.

**Home this week:** when `status === paused`, cards use `card_state: browse_only` (not skipped).

---

## Changed responses by endpoint

### `GET /subscriptions/me`

**Added**

- `skip_pause_days_allowed`, `skip_pause_days_used`, `skip_pause_days_remaining`
- `pause_scheduled` (boolean) — future pause booked, still `active`
- `paused_days` (string[]) — working dates in current pause window
- `pause_ceiling_date` (nullable)

**Changed**

- `skip_days_*` and `pause_days_*` always reflect the **shared** flex pool (same used/remaining).
- `days_remaining` = meal days remaining (not calendar).

**Example (scheduled pause, not started)**

```json
{
  "subscription_id": "…",
  "status": "active",
  "pause_scheduled": true,
  "paused_from": "2026-06-10",
  "paused_until": "2026-06-20",
  "pause_ceiling_date": "2026-06-20",
  "paused_days": ["2026-06-10", "2026-06-11", "2026-06-14"],
  "skip_days_used": 5,
  "skip_days_remaining": 61,
  "pause_days_used": 5,
  "pause_days_remaining": 61,
  "skip_pause_days_remaining": 61,
  "days_remaining": 12,
  "remaining_count": 12
}
```

---

### `GET /subscriptions/me/deliveries`

**Per item added:** `skip_available`, `undoable`, `is_skipped`, `skip_reason` (always set).

**Deprecated:** rely on `skip_available` instead of `skippable` only.

```json
{
  "deliveries": [
    {
      "date": "2026-06-05",
      "label": "Thu 5 Jun",
      "meal_name": "Grilled chicken",
      "photo_url": "https://…",
      "meal_type": "executive",
      "status": "scheduled",
      "skip_available": true,
      "skippable": true,
      "skip_reason": null,
      "undoable": false,
      "is_skipped": false
    }
  ],
  "skip_limit_reached": false
}
```

---

### `POST /subscriptions/me/deliveries/:date/skip`

Unchanged shape; `skip_days_used` / `skip_days_remaining` use flex pool. Optional `makeup_date` for plan extension.

```json
{
  "date": "2026-06-05",
  "status": "skipped",
  "undoable": true,
  "skip_days_used": 4,
  "skip_days_remaining": 62,
  "makeup_date": "2026-07-15"
}
```

---

### `DELETE /subscriptions/me/deliveries/:date/skip`

```json
{
  "date": "2026-06-05",
  "status": "scheduled",
  "skip_days_used": 3,
  "skip_days_remaining": 63
}
```

---

### `POST /subscriptions/me/pause`

**Changed:** response `status` is usually **`active`** with `pause_scheduled: true`.

```json
{
  "subscription_id": "…",
  "status": "active",
  "paused_from": "2026-06-10",
  "paused_until": "2026-06-20",
  "pause_ceiling_date": "2026-06-20",
  "pause_scheduled": true,
  "paused_days": ["2026-06-10", "2026-06-11", "2026-06-14"],
  "pause_days_used": 5,
  "pause_days_remaining": 61,
  "skip_days_used": 5,
  "skip_days_remaining": 61,
  "skip_pause_days_remaining": 61
}
```

---

### `POST /subscriptions/me/resume`

Body: `{ "resume_date": "YYYY-MM-DD" }` — earliest **tomorrow** (KSA), on or before `paused_until`, before pause-end cutoff.

**Added fields:** `skip_days_*`, `skip_pause_days_remaining`, `lapsed_days`, `new_end_date`.

```json
{
  "subscription_id": "…",
  "status": "active",
  "resume_date": "2026-06-15",
  "first_delivery_label": "Sunday, 15 Jun",
  "pause_days_used": 2,
  "pause_days_remaining": 64,
  "skip_days_used": 2,
  "skip_days_remaining": 64,
  "skip_pause_days_remaining": 64,
  "lapsed_days": 0,
  "new_end_date": "2026-08-30"
}
```

---

### `GET /home`

`subscription` blob when **active** adds: `pause_scheduled`, `paused_from`, `paused_until`, unified `skip_pause_days_remaining` (and matching skip/pause remaining).

When **paused**, same unified remaining fields; existing `paused_since` / `days_frozen` unchanged.

---

### `GET /home/this-week`

Each card **added:** `skip_available`, `undoable`, `is_skipped`, `skip_reason`.

CTA: `Skip →` when `skip_available`; `Undo` when `undoable`; `Browse only` when sub paused.

---

### `GET /menu/week`

Each day card **added:** `undoable`, `is_skipped` (plus existing `skip_available`, `skip_reason`).

---

### `GET /meals/:meal_id`

**Query:** `?delivery_date=YYYY-MM-DD` **recommended** so skip flags match that day.

**Added:** `skip_available`, `undoable`, `is_skipped`, `skip_reason`.

Without `delivery_date`, flags may default to blocked (`not_subscribed`).

---

## UI checklist

1. Use `skip_pause_days_remaining` for one allowance meter.
2. After pause submit, show “Pause scheduled” if `pause_scheduled`, not “Paused”.
3. Offer **Cancel pause** only when `pause_scheduled === true` (call `POST …/pause/cancel`).
4. Offer **Resume** only when `status === 'paused'`.
5. Drive Skip/Undo from flags, not from `status` alone on delivery rows.
6. Pass `delivery_date` into meal detail from menu/home cards.
