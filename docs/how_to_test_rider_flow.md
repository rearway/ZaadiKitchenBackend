# How to Test the Rider Flow

End-to-end guide for testing the Rider App APIs in Postman, starting from an empty database.

## Rider App endpoints

- `GET /api/v1/rider/deliveries?date=&area_id=` — today's delivery list, sorted by area/building, with counts
- `POST /api/v1/rider/deliveries/:delivery_id/delivered` — marks delivered, sets timestamp, blocks double-marking (`409 ALREADY_DELIVERED`)
- `POST /api/v1/rider/deliveries/:delivery_id/issue` — logs a rider-side issue (`customer_not_found` / `wrong_address` / `access_denied` / `other`) into `rider_issues`, separate from the customer issues queue

All three require the `DRIVER` role (`@Roles(UserRole.DRIVER)`), enforced by the existing JWT/roles guard.

## Making a user a rider

There is no admin API for this yet — DRIVER accounts are pre-created manually in the DB (see the comment in `src/core/usecases/commands/VerifyOtp.ts`).

Promote an existing user:
```sql
UPDATE users SET role = 'DRIVER' WHERE phone = '+966500000001';
```

Or create a new one:
```sql
INSERT INTO users (id, phone, full_name, role, language_preference, is_active, created_at, updated_at)
VALUES (gen_random_uuid(), '+966500000001', 'Khalid Rider', 'DRIVER', 'EN', true, now(), now());
```

Against the local dev container:
```bash
docker exec zaadi_postgres psql -U zaadi -d zaadi_kitchen_new -c "UPDATE users SET role = 'DRIVER' WHERE phone = '+966500000001';"
```

Once the row exists, that phone logs in through the normal OTP flow (`POST /auth/otp/send` → `POST /auth/otp/verify`) — the JWT it gets back carries `"role": "DRIVER"`.

## 0. One-time setup

- Import `Zaadi_Kitchen_Mobile_App.postman_collection.json` (customer signup/order flow) and `Zaadi_Kitchen_Admin_Portal.postman_collection.json` (area setup + the "Rider App" folder) into Postman.
- Both default `base_url` to `http://localhost:3000/api/v1` — no change needed.
- Run migrations and seeders so plans and the default admin user exist:
  ```bash
  npx sequelize-cli db:migrate
  npx sequelize-cli db:seed:all
  ```
  This seeds `admin@zaadikitchen.com` / `Admin@123` and plans `try_it`, `week`, `month`, `quarterly`.
- Start the server locally with OTP mocked so verification codes are returned in the response instead of sent via SMS:
  ```bash
  SKIP_OTP=true npm run start:dev
  ```

## 1. Create a delivery area + building (Admin Portal collection)

1. **Auth → Admin Login** — body already has `admin@zaadikitchen.com` / `Admin@123` → auto-saves `admin_access_token`.
2. **Area Management → Create Area** — run it, copy the returned `id` into the collection variable `area_id`.
3. **Area Management → Add Building to Area** — run it, copy the returned `id` into `building_id`.

## 2. Customer signs up and places an order (Mobile App collection)

1. **Auth → Send OTP** — set phone to something new, e.g. `+966500000099`, channel `sms`. Response returns `otpCode` directly (since `SKIP_OTP=true`).
2. **Auth → Verify OTP** — paste that code → auto-saves `access_token`.
3. **Delivery Areas → Save Delivery Location (Building from List)** — uses `{{area_id}}` / `{{building_id}}` already, just run it.
4. **Checkout → Create Checkout Session** — body `{"plan_id":"week","meal_type":"executive"}` → auto-saves `session_id`.
5. Set collection variable `payment_method_id` to `00000000-0000-0000-0000-000000000001` (a hardcoded Mada test method — no need to "Add Payment Method").
6. **Orders → Place Order** — the saved body in this collection is stale (camelCase, missing `start_date`). Replace it with:
   ```json
   {
       "session_id": "{{session_id}}",
       "payment_method_id": "{{payment_method_id}}",
       "start_date": "2026-08-02"
   }
   ```
   Run it → auto-saves `order_id`, and this creates the subscription + `delivery_days` rows behind the scenes (one per weekday; the `week` plan = 5 meals).

## 3. Rider picks it up (Admin Portal collection → Rider App folder)

1. Set `rider_phone` to whatever phone you promoted to `DRIVER`.
2. **Rider Send OTP** → get the code from the response.
3. **Rider Verify OTP** → paste the code → auto-saves `rider_access_token`.
4. **Get My Deliveries** — set the `date` query param (or `delivery_date` variable) to the order's `start_date`. You should see the customer's delivery in the list with `status: "pending"`. Copy its `delivery_id` into the `delivery_id` variable.
5. **Mark Delivery Delivered** — run it → `200`, `status: "delivered"`.
6. **Get My Deliveries** again — confirm `delivered_count` incremented and the item now shows `status: "delivered"`.
7. **Report Rider Issue** (optional, on the same or another delivery) — `201` expected.

## Known caveat

`meal_name` on auto-generated delivery days is `null` — order creation doesn't currently link to the published weekly menu, so it shows as `null` in the rider's delivery list unless set manually. This is a pre-existing gap in the product (menu weeks and customer subscriptions aren't wired together yet), not specific to the rider feature.

## Local dev quick reference

```bash
# Start / stop local Postgres (container: zaadi_postgres, port 5433)
docker start zaadi_postgres
docker stop zaadi_postgres

# Migrations
npx sequelize-cli db:migrate
npx sequelize-cli db:migrate:status
npx sequelize-cli db:migrate:undo

# Seeders (admin user + plans)
npx sequelize-cli db:seed:all

# Run the API
SKIP_OTP=true npm run start:dev
```
