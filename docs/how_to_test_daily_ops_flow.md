# How to Test the Daily Operations Flow

End-to-end guide for testing the Daily Operations APIs (production pipeline + issues queue) in Postman.

## Endpoints

- `GET /api/v1/admin/daily-ops?date=` — pipeline state, meal breakdown, open issues queue (admin only)
- `GET /api/v1/ops/daily-ops?date=` — same data, `issues_queue: null`, ops only
- `POST /api/v1/admin/daily-ops/pipeline/advance` — admin or ops
- `POST /api/v1/ops/daily-ops/pipeline/advance` — ops only
- `GET /api/v1/admin/daily-ops/issues?date=&status=` — admin only (`status`: `open` default, or `all`)
- `POST /api/v1/admin/daily-ops/issues/:issue_id/credit` — admin only
- `POST /api/v1/admin/daily-ops/issues/:issue_id/reject` — admin only
- `GET /api/v1/admin/daily-ops/labels?date=&meal_type=&area_id=` — admin or ops, JSON list of labels grouped by area
- `GET /api/v1/admin/daily-ops/labels/download?date=&meal_type=&area_id=&label_id=` — admin or ops, PDF binary
- `GET /api/v1/admin/daily-ops/export?date=` — admin or ops, XLSX binary

## How the pipeline stage works

The stage (`pending` → `locked` → `dispatch` → `delivered`) is mostly **computed**, not stored:
- `pending` → `locked` happens automatically once the skip cutoff passes (18:00 AST the day before the delivery date) — no action needed.
- `locked` → `dispatch` and `dispatch` → `delivered` are the two manual transitions, triggered via `pipeline/advance` and persisted in the `daily_ops_days` table.

So a date with no admin/ops action yet will show `pending` before its cutoff and `locked` after — this is normal, not a bug.

## Making a user an OPS staff member

Same pattern as promoting a rider — there's no admin API for this yet, and OPS logs in via the existing email/password admin login (`POST /auth/admin/login`), not OTP. Give the user a `role`, `email`, and a bcrypt password hash directly in the DB:

```bash
export NVM_DIR="$HOME/.nvm"; source "$NVM_DIR/nvm.sh"; nvm use v20.19.4
node -e "const bcrypt=require('bcrypt'); bcrypt.hash('Ops@123', 10).then(h => console.log(h))"
```

```sql
UPDATE users
SET role = 'OPS', email = 'ops@zaadikitchen.com', password = '<hash from above>'
WHERE phone = '+966500000003';
```

(Or `INSERT` a new row the same way if the user doesn't exist yet — see `docs/how_to_test_rider_flow.md` for the INSERT form.)

**Note:** the generic OTP login (`/auth/otp/send|verify`) explicitly rejects ADMIN/OPS accounts ("Admin and Ops accounts must use email and password to log in" — see `VerifyOtp.ts`). The role-based staff OTP login described in the admin docs (`/auth/admin/otp/send|verify` with a `role` field) doesn't exist yet — that's a separate, not-yet-built feature.

## 0. One-time setup

- Import `Zaadi_Kitchen_Admin_Portal.postman_collection.json` — it now has a "Daily Operations" folder plus an "Ops Login" request in the "Auth" folder.
- Run migrations: `npx sequelize-cli db:migrate`.
- You need at least one `delivery_days` row and one `delivery_issues` row for today to see non-empty data — the quickest way is to follow `docs/how_to_test_rider_flow.md` (customer signup + order flow) first, then seed one issue directly:
  ```sql
  INSERT INTO delivery_issues (id, user_id, subscription_id, delivery_date, issue_type, description, status, created_at, updated_at)
  VALUES (gen_random_uuid(), '<customer-user-id>', '<subscription-id>', CURRENT_DATE, 'quality_issue', 'Meal was cold on arrival.', 'open', now(), now());
  ```
- Start the server: `SKIP_OTP=true npm run start:dev`.

## 1. Admin view and pipeline

1. **Auth → Admin Login** — auto-saves `admin_access_token`.
2. **Daily Operations → Get Daily Ops (Admin)** — set `daily_ops_date` to today's date (or leave blank for today). You should see `stage: "locked"` if it's currently past the cutoff, the meal breakdown, and the open issue(s) queue.
3. **Daily Operations → Advance Pipeline Stage (Admin)** — body defaults to `from_stage: "locked", to_stage: "dispatch"`. Run it, then re-run "Get Daily Ops" to confirm the stage moved.
4. Edit the body to `from_stage: "dispatch", to_stage: "delivered"` and run again to complete the pipeline.
5. Try advancing again with a stale `from_stage` — you should get `409 STAGE_MISMATCH`.

## 2. Issues queue

1. **Daily Operations → Get Issues Queue** — copy an `issue_id` from the response into the `issue_id` collection variable.
2. **Daily Operations → Credit Issue** — run it, then check `GET /users/wallet/transactions` as that customer to confirm the credit landed (label: "Issue credit").
3. Run **Credit Issue** again on the same `issue_id` — expect `409 ISSUE_ALREADY_RESOLVED`.
4. **Get Issues Queue** with `status=all` — the resolved issue now shows up with `resolution: "credit"` and a `resolved_at` timestamp; the default `status=open` view no longer includes it.
5. **Daily Operations → Reject Issue** — same idea, on a different open issue, using `reason`/`note`.

## 3. Ops view and role isolation

1. **Auth → Ops Login** — auto-saves `ops_access_token`. (Body is `ops@zaadikitchen.com` / `Ops@123` — update to match whatever you seeded.)
2. **Daily Operations → Get Daily Ops (Ops)** — same pipeline/meal-breakdown data, but `issues_queue: null` and no `locked_at` field.
3. **Daily Operations → Advance Pipeline Stage (Ops)** — works the same as the admin version.
4. Confirm role isolation: an ops token against `GET /admin/daily-ops` → `403`; an admin token against `GET /ops/daily-ops` → `403`. Both are 403 (not 404) because the routes exist but `@Roles` rejects the wrong role.

## 4. Print Labels and Export Sheet

1. **Daily Operations → Get Delivery Labels** — set `daily_ops_date`, try `meal_type=all|executive|salad`. Response is grouped by area with `order_ref` values like `#ZK-2026-08-02-0001`, computed on the fly (not stored) from a stable area → building → customer sort — the same order the PDF prints in.
2. **Daily Operations → Download Delivery Labels (PDF)** — same query params, returns a real PDF (Postman will offer to save/preview it). One 100×60mm page per delivery, colour-coded band (orange = Executive, green = Salad). To download a single label, enable the disabled `label_id` param and set it to a real `delivery_days.id` — **it must be an actual RFC4122 UUID**; hand-typed test ids like `99999999-9999-9999-9999-999999999991` will be rejected with `400 label_id must be a UUID` because the validator checks the UUID version nibble. Use `SELECT gen_random_uuid()` or an id that already exists in `delivery_days`.
3. **Daily Operations → Export Delivery Sheet (XLSX)** — set `daily_ops_date`, returns a real `.xlsx` file: one row per delivery for the whole day (no meal-type/area filter), columns Customer Name / Building / Floor / Desk-Area / Gate / Meal Type / Rider Notes.
4. The `gate` field is new — it comes from `delivery_locations.gate`, settable via `POST/PATCH /users/delivery-location` like `floor`/`deskArea` already were. It'll be blank on any location saved before this change; set it directly in the DB for testing:
   ```sql
   UPDATE delivery_locations SET gate = 'Main entrance' WHERE user_id = '<customer-user-id>';
   ```

## Known data-model caveat

`delivery_issues` doesn't record which specific meal (`meal_type`) an issue is about — only the `delivery_date`. When a subscription has two meals on the same day (executive + salad), the issues queue arbitrarily picks one delivery's meal name/type to display (deterministically, via `DISTINCT ON`, not randomly) since there's no way to know which one the customer meant. This is a pre-existing gap in the customer-facing "Submit Delivery Issue" feature, not something this build introduced or fixed.

## Local dev quick reference

```bash
# Start / stop local Postgres (container: zaadi_postgres, port 5433)
docker start zaadi_postgres
docker stop zaadi_postgres

# Migrations
npx sequelize-cli db:migrate

# Run the API
SKIP_OTP=true npm run start:dev
```
