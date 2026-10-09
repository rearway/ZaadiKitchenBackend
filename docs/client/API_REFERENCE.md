# Zaadi Kitchen — API Reference (v1)

**Base path:** `/api/v1`  
**Development host:** `https://devapi.zaadikitchen.com`  
**Production host:** `https://api.zaadikitchen.com` (confirm with operations)

All paths below are relative to `{host}/api/v1` unless noted.

---

## 1. Conventions

### 1.1 Authentication

| Audience | Method |
|----------|--------|
| **Customer / Driver (mobile)** | `POST /auth/otp/send` → `POST /auth/otp/verify` → receive `access_token` + `refresh_token` |
| **Admin / Ops (portal)** | `POST /auth/admin/login` (email + password) |
| **Authenticated calls** | Header: `Authorization: Bearer <access_token>` |
| **Token refresh** | `POST /auth/refresh` with refresh token body (no access token required) |

Access tokens are short-lived; refresh tokens are longer-lived (mobile vs admin TTLs differ).

### 1.2 Request / response

- **Content-Type:** `application/json` unless documented otherwise (e.g. meal import uses `multipart/form-data`).
- Many endpoints return a top-level **`message`** plus **`data`** object or array.
- Errors use HTTP status codes and a JSON body (see §1.3).

### 1.3 Error shape

```json
{
  "statusCode": 404,
  "errorCode": "RESOURCE_NOT_FOUND",
  "message": "Area with identifier '…' not found",
  "operation": "get-buildings-for-area"
}
```

| HTTP | Typical `errorCode` | Meaning |
|------|---------------------|---------|
| 400 | `VALIDATION_ERROR` | Invalid input |
| 401 | `UNAUTHORIZED` | Missing or expired token |
| 403 | `FORBIDDEN` | Role not allowed |
| 404 | `RESOURCE_NOT_FOUND` | Entity missing |
| 409 | Various | Conflict (e.g. meal in published week) |
| 422 | Business rules | e.g. skip limit, inactive area on save |
| 429 | Rate limit | OTP / out-of-zone throttling |

The `operation` field maps to the server handler name for support correlation.

### 1.4 Roles

| Role | Access |
|------|--------|
| `CUSTOMER` | Mobile app APIs |
| `DRIVER` | Rider delivery APIs |
| `ADMIN` | Full admin portal |
| `OPS` | Operations (daily ops, areas, meals — subset of admin) |

### 1.5 Identifiers

- Most IDs are **UUIDs** (areas, users, meals, subscriptions).
- **Menu week ID:** string `w{year}-{week}` (e.g. `w2026-38`).
- **Menu slot ID:** string `slot_{weekId}_{day}_{type}` (e.g. `slot_w2026-38_mon_exec`).

### 1.6 Time & locale

- Delivery and subscription dates use **`YYYY-MM-DD`** (calendar dates).
- Skip cutoff is **6:00 PM KSA** the day before delivery (implemented in business logic).
- Work-week boundaries for menus follow **Saudi Arabia** work-week rules in code.

---

## 2. Health & config

| Method | Path | Auth | Description |
|--------|------|------|-------------|
| GET | `/health` | None | Liveness (on API host root, not under `/api/v1`) |
| GET | `/config/public-holidays` | JWT | List configured public holidays |

---

## 3. Authentication

| Method | Path | Auth | Description |
|--------|------|------|-------------|
| POST | `/auth/otp/send` | None | Send OTP (WhatsApp/SMS) |
| POST | `/auth/otp/verify` | None | Verify OTP; returns tokens + user |
| POST | `/auth/refresh` | None | Rotate access token |
| POST | `/auth/logout` | JWT | Revoke refresh token (customer) |
| POST | `/auth/admin/login` | None | Admin/ops login |
| POST | `/auth/admin/logout` | JWT | Admin logout |

**Detailed payloads:** see `docs/api_docs_auth.md`.

---

## 4. Customer — profile & account

| Method | Path | Auth | Description |
|--------|------|------|-------------|
| GET | `/users/profile` | JWT | Get profile |
| POST | `/users/profile` | JWT | Create/update profile (onboarding) |
| PATCH | `/users/preferences/language` | JWT | `EN` / `AR` |
| POST | `/users/me/delete-account` | JWT | Soft-delete & anonymize account (`confirm: true`) |
| POST | `/devices/register` | JWT | Register device for push (SNS) |

---

## 5. Customer — delivery location & areas

| Method | Path | Auth | Description |
|--------|------|------|-------------|
| GET | `/delivery/areas` | JWT | List **active** areas only |
| GET | `/delivery/areas/search?q=` | JWT | Search active areas by name |
| POST | `/delivery/areas/out-of-zone` | JWT | Submit interest for unserved area |
| GET | `/delivery/areas/:area_id/buildings` | JWT | Building suggestions (`?q=` optional). Works for `active`, `coming_soon`, and `paused` areas |
| GET | `/delivery/start-dates` | JWT | Valid subscription start dates (`from`, `limit` query) |
| POST | `/users/delivery-location` | JWT | Save primary delivery location (**area must be active**) |
| GET | `/users/delivery-location` | JWT | List saved locations |
| PATCH | `/users/delivery-location/:id` | JWT | Update location |
| DELETE | `/users/delivery-location/:id` | JWT | Remove location |
| PATCH | `/users/delivery-location/:id/primary` | JWT | Set primary |

---

## 6. Customer — plans, checkout, payment, orders

| Method | Path | Auth | Description |
|--------|------|------|-------------|
| GET | `/plans` | JWT | All plans |
| GET | `/plans/active` | JWT | Active plans for purchase |
| POST | `/checkout/session` | JWT | Start checkout session |
| GET | `/checkout/session/:session_id` | JWT | Get session totals |
| POST | `/checkout/session/:session_id/promo` | JWT | Apply promo code |
| DELETE | `/checkout/session/:session_id/promo` | JWT | Remove promo |
| GET | `/payment/methods` | JWT | Saved payment methods |
| POST | `/payment/methods` | JWT | Add payment method |
| DELETE | `/payment/methods/:method_id` | JWT | Remove payment method |
| POST | `/orders` | JWT | Place order (confirm checkout) |
| GET | `/orders/:order_id` | JWT | Order status / receipt fields |

**Payment gateway:** see `docs/PAYMENT_INTEGRATION_HANDOVER.md`.

---

## 7. Customer — referrals & wallet

| Method | Path | Auth | Description |
|--------|------|------|-------------|
| GET | `/referrals/me` | JWT | User referral code & stats |
| POST | `/referrals/validate` | JWT | Validate code at checkout |
| GET | `/users/wallet` | JWT | Wallet balance |
| GET | `/users/wallet/transactions` | JWT | Paginated ledger |
| GET | `/users/referral` | JWT | Referral summary (legacy/alternate shape) |

---

## 8. Customer — subscription & deliveries

| Method | Path | Auth | Description |
|--------|------|------|-------------|
| GET | `/subscriptions/me` | JWT | Current subscription summary |
| GET | `/subscriptions/me/plan-change-options` | JWT | Allowed upgrade plan slugs (active sub only). See [PLAN_PROMOTION.md](./PLAN_PROMOTION.md). |
| GET | `/subscriptions/me/deliveries` | JWT | Calendar (`from`, `to`) |
| POST | `/subscriptions/me/deliveries/:delivery_date/skip` | JWT | Skip a day |
| DELETE | `/subscriptions/me/deliveries/:delivery_date/skip` | JWT | Undo skip (before cutoff) |
| PATCH | `/subscriptions/me/deliveries/:delivery_date/salad` | JWT | Toggle salad for a day |
| POST | `/subscriptions/me/pause` | JWT | Schedule pause window (working days); stays `active` until pause-start cutoff. See [SKIP_PAUSE_FLEX.md](./SKIP_PAUSE_FLEX.md). |
| POST | `/subscriptions/me/pause/cancel` | JWT | Cancel scheduled future pause (no body) |
| POST | `/subscriptions/me/resume` | JWT | Resume from pause |
| POST | `/subscriptions/me/cancel` | JWT | Cancel subscription |
| PATCH | `/subscriptions/me/meal-type` | JWT | Change executive/salad for future days |
| GET | `/subscriptions/me/history` | JWT | Past meals (`page`, `per_page`, `period`) |
| GET | `/subscriptions/me/pending-ratings` | JWT | Delivered days awaiting rating |
| GET | `/subscriptions/me/ratings` | JWT | Rating history (paginated) |
| POST | `/subscriptions/me/issues` | JWT | Report delivery issue |

---

## 9. Customer — home & menu

| Method | Path | Auth | Description |
|--------|------|------|-------------|
| GET | `/home` | JWT | Home dashboard aggregate |
| GET | `/home/this-week` | JWT | This week meal cards |
| GET | `/menu` | JWT | Customer menu (published weeks) |
| GET | `/menu/week` | JWT | Week sections (this + next) |
| GET | `/meals/:meal_id` | JWT | Meal detail (`?delivery_date=` optional); includes skip flags |
| POST | `/meals/:meal_id/rating` | JWT | Submit rating for a delivery day |

---

## 10. Driver (rider) app

| Method | Path | Auth | Description |
|--------|------|------|-------------|
| GET | `/rider/deliveries` | JWT (DRIVER) | Deliveries for date (`date`, optional `area_id`) |
| POST | `/rider/deliveries/:delivery_id/delivered` | JWT (DRIVER) | Mark delivered |
| POST | `/rider/deliveries/:delivery_id/issue` | JWT (DRIVER) | Report access/customer issue |

---

## 11. Admin — dashboard & revenue

| Method | Path | Auth | Description |
|--------|------|------|-------------|
| GET | `/admin/dashboard/stats` | ADMIN \| OPS | Dashboard KPIs |
| GET | `/admin/revenue/summary` | ADMIN \| OPS | Revenue summary |
| GET | `/admin/revenue/daily` | ADMIN \| OPS | Daily revenue series |

---

## 12. Admin — delivery areas & buildings

| Method | Path | Auth | Description |
|--------|------|------|-------------|
| GET | `/admin/areas` | ADMIN \| OPS | List areas (`status` filter) |
| POST | `/admin/areas` | ADMIN \| OPS | Create area |
| PATCH | `/admin/areas/:area_id` | ADMIN \| OPS | Update name/status |
| GET | `/admin/areas/:area_id/buildings` | ADMIN \| OPS | List buildings |
| POST | `/admin/areas/:area_id/buildings` | ADMIN \| OPS | Add building |
| PATCH | `/admin/areas/:area_id/buildings/:building_id` | ADMIN \| OPS | Rename building |
| DELETE | `/admin/areas/:area_id/buildings/:building_id` | ADMIN \| OPS | Delete building |
| GET | `/admin/areas/out-of-zone-requests` | ADMIN \| OPS | Aggregated out-of-zone leads |

---

## 13. Admin — meals & menu

| Method | Path | Auth | Description |
|--------|------|------|-------------|
| GET | `/admin/meals` | ADMIN \| OPS | List meals (filters) |
| GET | `/admin/meals/:meal_id` | ADMIN \| OPS | Meal detail |
| POST | `/admin/meals` | ADMIN \| OPS | Create meal |
| PATCH | `/admin/meals/:meal_id` | ADMIN \| OPS | Update meal |
| PATCH | `/admin/meals/:meal_id/status` | ADMIN \| OPS | Activate/draft |
| DELETE | `/admin/meals/:meal_id` | ADMIN \| OPS | Delete meal |
| GET | `/admin/meals/:meal_id/photo-upload-url` | ADMIN \| OPS | Presigned S3 upload URL |
| POST | `/admin/meals/import` | ADMIN \| OPS | Bulk import (xlsx) |
| GET | `/admin/menu/weeks` | ADMIN \| OPS | List menu weeks |
| GET | `/admin/menu/weeks/:week_id` | ADMIN \| OPS | Week grid |
| POST | `/admin/menu/weeks/:week_id/slots/:slot_id/assign` | ADMIN \| OPS | Assign meal to slot |
| DELETE | `/admin/menu/weeks/:week_id/slots/:slot_id` | ADMIN \| OPS | Clear slot |
| POST | `/admin/menu/weeks/:week_id/publish` | ADMIN \| OPS | Publish week |
| POST | `/admin/menu/weeks/:week_id/unpublish` | ADMIN \| OPS | Unpublish week |

---

## 14. Admin — customers

| Method | Path | Auth | Description |
|--------|------|------|-------------|
| GET | `/admin/customers` | ADMIN \| OPS | Search/list customers |
| GET | `/admin/customers/:id` | ADMIN \| OPS | Customer detail |
| GET | `/admin/customers/:id/history` | ADMIN \| OPS | Activity history |
| POST | `/admin/customers/:id/deactivate` | ADMIN | Deactivate account |
| POST | `/admin/customers/:id/wallet/credit` | ADMIN \| OPS | Manual wallet credit |

---

## 15. Admin & ops — daily operations

| Method | Path | Auth | Description |
|--------|------|------|-------------|
| GET | `/admin/daily-ops` | ADMIN \| OPS | Ops board for date |
| POST | `/admin/daily-ops/pipeline/advance` | ADMIN \| OPS | Advance dispatch/delivered stage |
| GET | `/admin/daily-ops/issues` | ADMIN \| OPS | Customer delivery issues queue |
| POST | `/admin/daily-ops/issues/:issue_id/credit` | ADMIN \| OPS | Credit wallet for issue |
| POST | `/admin/daily-ops/issues/:issue_id/reject` | ADMIN \| OPS | Reject issue |
| GET | `/admin/daily-ops/labels` | ADMIN \| OPS | Label list (date filters) |
| GET | `/admin/daily-ops/labels/download` | ADMIN \| OPS | PDF labels |
| GET | `/admin/daily-ops/export` | ADMIN \| OPS | Delivery sheet export |
| GET | `/ops/daily-ops` | OPS | Ops mirror of daily board |
| POST | `/ops/daily-ops/pipeline/advance` | OPS | Advance pipeline |
| GET | `/ops/daily-ops/labels` | OPS | Labels |
| GET | `/ops/daily-ops/labels/download` | OPS | Label PDF |

---

## 16. Admin — communications

| Method | Path | Auth | Description |
|--------|------|------|-------------|
| GET | `/admin/comms/automations` | ADMIN \| OPS | List automation toggles |
| PATCH | `/admin/comms/automations/:automationId` | ADMIN \| OPS | Enable/disable automation |
| GET | `/admin/comms/broadcast/segments` | ADMIN \| OPS | Audience segments |
| GET | `/admin/comms/broadcast/segments/:segmentId/count` | ADMIN \| OPS | Segment size |
| POST | `/admin/comms/broadcast` | ADMIN \| OPS | Send broadcast push |
| POST | `/admin/communications/broadcast` | ADMIN | Legacy/alternate broadcast route |

**Details:** `docs/COMMS_API.md`.

---

## 17. Internal jobs (not for client apps)

| Method | Path | Auth | Description |
|--------|------|------|-------------|
| POST | `/internal/jobs/expire-subscriptions` | Shared secret header | Batch expire subscriptions |

Used by EventBridge/cron; not part of mobile or admin UI integration.

---

## 18. Representative payloads

### 18.1 List buildings for area

`GET /delivery/areas/{area_id}/buildings`

**Response `200`:**

```json
{
  "message": "Buildings fetched successfully",
  "data": {
    "areaId": "d319e8de-2a1c-48ba-9d06-62131ed72e67",
    "areaName": "Al Zahra",
    "buildings": [
      {
        "id": "…",
        "areaId": "…",
        "name": "Tower A",
        "floorsCount": null,
        "createdAt": "…",
        "updatedAt": "…"
      }
    ]
  }
}
```

### 18.2 Meal history

`GET /subscriptions/me/history?page=1&per_page=20&period=last_30_days`

**Query `period`:** `last_30_days` | `last_90_days` | omit for all time.

**Response `200`:**

```json
{
  "data": {
    "entries": [
      {
        "deliveryDayId": "…",
        "date": "2026-09-22",
        "mealType": "executive",
        "mealName": "Salmon Fillet with Quinoa",
        "photoUrl": "https://…/meals/{id}/photo.jpeg",
        "kcal": 560,
        "status": "delivered",
        "stars": null,
        "tags": []
      }
    ],
    "pagination": {
      "page": 1,
      "perPage": 20,
      "total": 1,
      "totalPages": 1
    }
  }
}
```

Meal name and photo are resolved from the **published menu** for that date and meal type when not stored on `delivery_days`.

### 18.3 Pending ratings

`GET /subscriptions/me/pending-ratings`

```json
{
  "data": [
    {
      "deliveryDayId": "…",
      "deliveryDate": "2026-09-22",
      "mealId": "…",
      "mealName": "…",
      "mealType": "executive",
      "kcal": 560,
      "emoji": "🐟",
      "photoUrl": "https://…"
    }
  ]
}
```

---

## 19. Swagger & Postman

| Tool | Location |
|------|----------|
| Swagger UI | `{host}/api` when API is running |
| Postman | Repository root collections (see [README](./README.md)) |

---

## 20. Changelog pointer

Feature-specific notes (account deletion, Play Store review OTP, revenue dashboard) live under `docs/` in the repository. This reference reflects the route map in `src/gateways/http/*.controller.ts` as of the pack publication date.
