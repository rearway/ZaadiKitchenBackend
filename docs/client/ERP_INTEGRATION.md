# ERP integration API (Platio-compatible)

**Base path:** `/api/v1/integrations/erp`  
**Auth:** Required on every request. Missing or invalid key → `401 Unauthorized`.

```http
Authorization: ApiKey <ERP_API_KEY>
```

or

```http
X-Api-Key: <ERP_API_KEY>
```

Server env: `ERP_API_KEY` (required in production), `ERP_CUTOFF_TIME_KSA` (default `19:00`), `ERP_TIMEZONE` (default `Asia/Riyadh`).

---

## Endpoints (only these four)

| Method | Path | Purpose |
|--------|------|---------|
| GET | `/menus` | Live menu catalog |
| GET | `/customers` | Live customers |
| POST | `/payments` | Confirmed orders paid in date range |
| POST | `/daily-orders` | Production list for a delivery day |

---

## Pagination

Query (GET) or body (POST): `offset` (default 0), `limit` (default 50, max 100).

Response includes:

```json
"pagination": { "offset": 0, "limit": 50, "total": 120 }
```

---

## 1. GET `/menus`

**Response `data[]` fields:** `code`, `name`, `description`, `status` (`draft` | `active`).

Always current data; no cutoff.

---

## 2. GET `/customers`

**Response `data[]` fields:** `code`, `name`, `mobile`, `statusCode`

| statusCode | Meaning |
|------------|---------|
| 1 | Active customer with active subscription |
| 0 | Inactive, deleted, or no active subscription |

Always current data; no cutoff.

---

## 3. POST `/payments`

**Body:**

```json
{
  "dateFrom": "20/07/2026",
  "dateTo": "21/07/2026",
  "offset": 0,
  "limit": 50
}
```

Dates: `DD/MM/YYYY` or `YYYY-MM-DD`. Filter is **order confirmed timestamp** in KSA. No cutoff shifting.

**Response `data[]` fields:** `customerCode`, `menuCode`, `totalCount`, `amount`

- `menuCode` on payments is the **plan slug** (product identifier for the subscription purchase).
- `amount` is total paid for that order (string/decimal as returned).

---

## 4. POST `/daily-orders`

**Body:**

```json
{
  "date": "20/07/2026",
  "offset": 0,
  "limit": 50
}
```

- `date` optional — delivery day (`DD/MM/YYYY` or `YYYY-MM-DD`).
- Omit `date` → server picks the current default delivery workday (see cutoff below).

**Response:**

```json
{
  "meta": {
    "requestedDate": "2026-07-21",
    "resolvedDeliveryDate": "2026-07-21",
    "cutoffAt": "2026-07-20T16:00:00.000Z",
    "frozen": true,
    "cutoffApplied": true,
    "timezone": "Asia/Riyadh"
  },
  "data": [
    { "customerCode": "C7X2P1", "menuCode": "MK3F9A", "amount": "22" }
  ],
  "pagination": { "offset": 0, "limit": 50, "total": 10 }
}
```

**`data[]` fields:** `customerCode`, `menuCode`, `amount` (per-meal price from plan).

### Cutoff rules

- Cutoff for delivery day **D** = **day before D** at `ERP_CUTOFF_TIME_KSA` (default 19:00 KSA).
- **Before** cutoff for **D**: live list for **D** (`frozen: false`).
- **On/after** cutoff for **D**: same **D**, final list (`frozen: true`).
- Explicit `date` is never auto-changed to another day; only the default (omitted `date`) advances to the next workday after cutoff.

Delivery workdays: Sunday–Thursday, excluding `public_holidays`.

---

## Codes

- **Meal `code` / daily `menuCode`:** `meals.erp_code` (e.g. `MK3F9A`).
- **Customer `code`:** `users.erp_customer_code` (e.g. `C7X2P1`).

Assigned automatically for new meals and customers; existing rows backfilled via migration.

---

## Postman

Import **`Zaadi_Kitchen_ERP_Integration.postman_collection.json`** from the repo root.

Collection variables:

| Variable | Example |
|----------|---------|
| `base_url` | `https://devapi.zaadikitchen.com/api/v1` |
| `erp_api_key` | value of server `ERP_API_KEY` |
