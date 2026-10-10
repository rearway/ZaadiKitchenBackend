# Comms & Broadcast API

Admin-only endpoints for the `/comms` screen. All comms are **push only** (no WhatsApp/SMS).

Base path: `/api/v1/admin/comms`  
Auth: `Authorization: Bearer <admin_jwt>`  
Envelope: `{ "data": { ... } }`

## Automations

### `GET /admin/comms/automations`

Returns 5 toggleable automations with current enabled state.

Automation IDs (stable slugs):

| `id` | Default |
|------|---------|
| `delivery_confirmed` | ON |
| `eod_feedback` | ON |
| `renewal_reminder` | ON |
| `referral_reward` | ON |
| `lapsed_reactivation` | OFF |

Toggle state is stored in `comms_automations`. Last toggle records `updated_by_user_id` and `updated_at` on the row (no separate audit log table).

Disabling an automation stops **new** triggers immediately. Scheduled jobs (`eod_feedback`, `renewal_reminder`, `lapsed_reactivation`) are not yet wired to EventBridge — only `delivery_confirmed` and `referral_reward` are gated in code today.

### `PATCH /admin/comms/automations/:automationId`

Body: `{ "is_enabled": true | false }`

## Broadcast

### `GET /admin/comms/broadcast/segments`

Segment slugs:

- `all_subscribers`
- `active`
- `paused`
- `delivering_today` — delivery days scheduled for today (Asia/Riyadh)

### `GET /admin/comms/broadcast/segments/:segmentId/count`

Optional single-segment count refresh.

### `POST /admin/comms/broadcast`

Body:

```json
{
  "segment_id": "delivering_today",
  "message": "Your lunch is on the way!"
}
```

- `message` max 200 characters
- Returns `400` with `SEGMENT_EMPTY` details when segment has 0 recipients
- Send is **synchronous** — pushes to all devices in segment, then returns `status: "sent"`
- Broadcast history stored in `comms_broadcasts`

## Legacy endpoint

`POST /api/v1/admin/communications/broadcast` still exists (title/body, all-topic broadcast). Prefer the new segmented endpoint.
