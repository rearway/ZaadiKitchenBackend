# Skip, pause, and flex allowance (mobile)

## One allowance pool

`skip_days_*` and `pause_days_*` always show the **same** used/remaining values. Prefer `skip_pause_days_remaining` if you want a single field.

Skip and pause both consume **flex** working days (Sun–Thu, holidays excluded).

## Day-level flags (deliveries, menu week, home, meal detail)

| Field | Meaning |
|-------|---------|
| `skip_available` | User may skip this day/meal now |
| `undoable` | User may undo skip (before 6 PM KSA day before delivery) |
| `is_skipped` | Day is currently skipped |
| `skip_reason` | Why skip is blocked, or `null` |

`skippable` on deliveries is deprecated; use `skip_available`.

## Skip

- `POST /subscriptions/me/deliveries/:date/skip`
- `DELETE /subscriptions/me/deliveries/:date/skip` (undo)
- Response may include `makeup_date` — extra scheduled working day after plan end.

## Pause

- `POST /subscriptions/me/pause` — `{ start_date, end_date }` schedules one window; subscription stays **`active`** until pause-start cutoff.
- `POST /subscriptions/me/pause/cancel` — no body; cancels scheduled pause before it starts.
- `POST /subscriptions/me/resume` — `{ resume_date }` when `status` is `paused`.

`GET /subscriptions/me` adds `pause_scheduled`, `paused_days[]`, and unified flex fields.

## UI

- Show Skip when `skip_available === true`
- Show Undo when `undoable === true`
- Do not assume `status: paused` immediately after scheduling pause
