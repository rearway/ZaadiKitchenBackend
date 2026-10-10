# Revenue Dashboard — Backend Implementation & Business Answers

This document answers the frontend spec questions using the master doc (`docs/master/ZaadiKitchen_MasterDoc_Part3 (1).html`, section C6) and describes what the backend implements.

## Endpoints

| Method | Path | Role | Purpose |
|--------|------|------|---------|
| GET | `/api/v1/admin/revenue/summary` | ADMIN | MRR, tiles, plan bars, KPI cards |
| GET | `/api/v1/admin/revenue/daily?month=YYYY-MM` | ADMIN | Daily revenue chart + month list |
| GET | `/api/v1/admin/customers?...` | ADMIN, OPS | Extended with `filter`, `plan`, `status=churned` |

All responses use `{ "data": { ... } }`. Revenue fields are snake_case.

## Business definitions (answers for frontend)

### MRR

**Definition:** Sum of `plan.price_sar` for all subscriptions with `status IN ('active', 'paused')` and `end_date >= today` (Asia/Riyadh).

- Includes paused subscribers (still in billing cycle).
- Excludes expired/cancelled subscriptions.
- Not prorated — full plan price per active billing cycle.
- **% change:** Compared to MRR on the **last day of the prior calendar month** (master doc: “prior full month”).

### Churned count (tile + filter)

**Definition:** Customer whose **latest** subscription is `expired`, `end_date + 3 days <= today` (KSA), and they have **no newer subscription**.

- Paused customers are **not** churned.
- Cancelled but not yet expired are **not** churned until `end_date` passes + 3-day grace.
- Tile shows **total currently churned customers**, not “churned today”.
- Filter: `GET /admin/customers?filter=churned` or `?status=churned`.

### New today

**Definition:** Customer whose **first-ever** subscription has `start_date = today` (Asia/Riyadh).

- Filter: `GET /admin/customers?filter=new`.

### Active tile

**Definition:** Subscriptions with `status = 'active'` and `end_date >= today`. Paused subs are excluded from this count (master doc).

### Daily revenue

**Definition:** Sum of `orders.total_paid_sar` where `status = 'confirmed'`, bucketed by order `created_at` date in **Asia/Riyadh**.

- Gross confirmed payments (net of wallet credit already reflected in `total_paid_sar`).
- Refunds are not modeled in v1 — no adjustment.
- **Week window:** Mon–Sun week containing today for the current month; for past months, the last Mon–Sun week with Monday inside that month (frontend prototype shape).
- Future days in the week return `revenue_sar: 0` (actuals only in v1; master doc projected revenue is a future enhancement).

### Avg skip rate

**Display value:** `AVG(skip_days_used)` across active subscriptions (master doc: skips per subscriber in current billing cycle).

**Change badge:** Delta of `(skipped delivery_days in last 7 days / active subs)` minus the same ratio for the prior 7 days (`vs last week`).

### Salad meal %

**Definition:** `%` of active subscribers with `meal_type = 'salad'` (not delivered meals, not add-ons).

### Plan IDs

Database slugs (use these in API + customer filters):

| UI label | `plan_id` | `?plan=` value |
|----------|-----------|----------------|
| Month | `month` | `month` |
| Weekly | `week` | `week` (alias `weekly` accepted) |
| Quarterly | `quarterly` | `quarterly` |
| Try It | `try_it` | `try_it` |

**Note:** Frontend spec suggested `weekly`; the seeded slug is `week`. API returns `plan_id: "week"` with `plan_label: "Weekly"`.

## Timezone

All “today”, “new today”, and daily buckets use **Asia/Riyadh**.

## RBAC

Revenue endpoints return **403** for OPS role. Customer list remains available to OPS.
