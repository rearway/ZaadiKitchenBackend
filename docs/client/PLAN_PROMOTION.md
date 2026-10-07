# Plan promotion (upgrade-only)

Customers with an **active** subscription can upgrade to a higher plan tier. Downgrades and repurchasing the same plan are not allowed until the subscription expires.

## Tier rules

| Current plan | Allowed upgrades |
|--------------|------------------|
| `try_it` | `week`, `month`, `quarterly` |
| `week` | `month`, `quarterly` |
| `month` | `quarterly` |
| `quarterly` | none |

## Pricing

- **Credit** = `total_paid_sar` on the subscription’s current order (full amount already paid).
- **Due at checkout** = `new_plan.price_sar - credit - wallet_applied` (minimum 0).

Example: Try It (SAR 28 paid) → Week (SAR 125) ⇒ **SAR 97** due before wallet/promo.

## Deliveries

- **`start_date` is unchanged** (original plan start).
- Delivery schedule is rebuilt for the **new plan `meal_count`** working days (Sun–Thu) from that start date.
- Existing `delivered` / `skipped` / `paused` days are kept; missing days are added as `scheduled`.

## API

### `GET /api/v1/subscriptions/me/plan-change-options`

Returns `allowed_plan_ids`, `current_plan_id`, `promotion_available`, `blocked_reason`.

### `POST /api/v1/checkout/session`

Same body as new purchase (`plan_id`, `meal_type`). When the user has an **active** subscription:

- Response includes `promotion: true`, `prior_plan_credit_sar`, `current_plan_id`.
- Errors: `SAME_PLAN_NOT_ALLOWED`, `PLAN_PROMOTION_NOT_ALLOWED`, `ACTIVE_SUBSCRIPTION_CHECKOUT_BLOCKED` (paused/cancelled).

### `POST /api/v1/orders`

Unchanged; promotion is detected from the checkout session. `start_date` in the body is **ignored** for promotion sessions.

## Mobile UX

- Change Plan screen: call `plan-change-options`, show only `allowed_plan_ids`.
- Checkout: show credit line from `prior_plan_credit_sar`; hide start-date picker on promotion.
