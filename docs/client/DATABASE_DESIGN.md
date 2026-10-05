# Zaadi Kitchen — Database Design

**Engine:** PostgreSQL 14+  
**Naming:** `snake_case` columns, UUID primary keys (except `menu_weeks.id`, `menu_slots.id`, `comms_automations.id`)  
**Timestamps:** `created_at`, `updated_at` on most tables (UTC)

---

## 1. Domain overview

The schema supports four main concerns:

1. **Identity & access** — users, OTP sessions, refresh tokens, devices  
2. **Delivery geography** — areas, buildings, customer delivery locations  
3. **Commerce** — plans, checkout, payments, orders, subscriptions, wallet, referrals  
4. **Fulfillment & menu** — meals, weekly menu slots, per-day delivery schedule, ratings, issues, daily ops  

---

## 2. High-level ER diagram

```mermaid
erDiagram
  users ||--o{ delivery_locations : has
  users ||--o{ subscriptions : has
  users ||--o{ orders : places
  users ||--o{ otp_sessions : authenticates
  users ||--o{ refresh_tokens : sessions
  users ||--o{ user_devices : push
  users ||--o{ wallet_transactions : ledger
  users ||--o{ meal_ratings : rates
  users ||--o{ delivery_issues : reports

  delivery_areas ||--o{ buildings : contains
  delivery_areas ||--o{ delivery_locations : in
  buildings ||--o{ delivery_locations : optional

  plans ||--o{ checkout_sessions : quoted
  plans ||--o{ orders : purchased
  plans ||--o{ subscriptions : entitles

  checkout_sessions ||--o{ payment_transactions : pays
  orders ||--|| subscriptions : creates
  subscriptions ||--o{ delivery_days : schedules

  meals ||--o{ menu_slots : assigned
  menu_weeks ||--o{ menu_slots : contains
  delivery_days }o..o{ menu_slots : resolved_by_date_type
  delivery_days ||--o{ meal_ratings : rated
  delivery_days ||--o{ rider_issues : rider

  promo_codes }o--o| users : owner
  user_referrals }o--|| users : referrer
  user_referrals }o--|| users : referred
```

---

## 3. Detailed ER — identity & auth

```mermaid
erDiagram
  users {
    uuid id PK
    string phone UK
    string email UK
    string password
    string full_name
    enum role
    enum language_preference
    string referral_code
    string push_notification_token
    boolean is_active
    timestamp deleted_at
    timestamp created_at
    timestamp updated_at
  }

  otp_sessions {
    uuid id PK
    string phone
    string otp_hash
    int attempts
    timestamp expires_at
    timestamp created_at
    timestamp updated_at
  }

  refresh_tokens {
    uuid id PK
    uuid user_id FK
    string token_hash
    timestamp expires_at
    timestamp created_at
    timestamp updated_at
  }

  user_devices {
    uuid id PK
    uuid user_id FK
    string platform
    string device_token
    string endpoint_arn
    string subscription_arn
    boolean is_active
    timestamp created_at
    timestamp updated_at
  }

  users ||--o{ refresh_tokens : ""
  users ||--o{ user_devices : ""
```

**`users.role`:** `CUSTOMER` | `DRIVER` | `ADMIN` | `OPS`  
**Soft delete:** `deleted_at` set when a customer deletes their account (PII anonymized; row retained for audit).

---

## 4. Detailed ER — delivery geography

```mermaid
erDiagram
  delivery_areas {
    uuid id PK
    string name
    string description
    enum status
    timestamp created_at
    timestamp updated_at
  }

  buildings {
    uuid id PK
    uuid area_id FK
    string name
    int floors_count
    timestamp created_at
    timestamp updated_at
  }

  delivery_locations {
    uuid id PK
    uuid user_id FK
    uuid area_id FK
    uuid building_id FK
    string building_name
    string floor
    string desk_area
    string gate
    enum delivery_preference
    string rider_notes
    boolean is_primary
    timestamp created_at
    timestamp updated_at
  }

  out_of_zone_interests {
    uuid id PK
    uuid user_id FK
    string area_name
    timestamp created_at
    timestamp updated_at
  }

  delivery_areas ||--o{ buildings : ""
  delivery_areas ||--o{ delivery_locations : ""
  buildings ||--o{ delivery_locations : ""
  users ||--o{ delivery_locations : ""
  users ||--o{ out_of_zone_interests : ""
```

**`delivery_areas.status`:** `active` | `coming_soon` | `paused`  
**`delivery_preference`:** `hand_to_me` | `reception`

---

## 5. Detailed ER — plans, checkout, subscription

```mermaid
erDiagram
  plans {
    uuid id PK
    string name
    string slug UK
    decimal price_sar
    int meal_count
    decimal price_per_meal_sar
    int skip_days_allowed
    int pause_days_allowed
    boolean is_most_popular
    boolean is_active
    timestamp created_at
    timestamp updated_at
  }

  promo_codes {
    uuid id PK
    string code UK
    enum type
    decimal discount_sar
    uuid owner_user_id FK
    string valid_for_plan_slug
    int max_uses
    int times_used
    boolean is_active
    timestamp created_at
    timestamp updated_at
  }

  checkout_sessions {
    uuid id PK
    uuid user_id FK
    uuid plan_id FK
    enum meal_type
    decimal base_price_sar
    decimal wallet_credit_sar
    decimal promo_discount_sar
    decimal total_due_sar
    string promo_code
    int promo_attempt_count
    boolean promo_locked
    enum status
    timestamp expires_at
    timestamp created_at
    timestamp updated_at
  }

  payment_methods {
    uuid id PK
    uuid user_id FK
    enum type
    string label
    string token
    boolean is_default
    boolean is_last_used
    timestamp created_at
    timestamp updated_at
  }

  payment_transactions {
    uuid id PK
    uuid user_id FK
    uuid checkout_session_id FK
    decimal amount_sar
    string status
    string gateway_payment_id
    timestamp created_at
    timestamp updated_at
  }

  orders {
    uuid id PK
    uuid user_id FK
    uuid plan_id FK
    uuid payment_method_id FK
    uuid subscription_id FK
    enum meal_type
    int meal_count
    date start_date
    decimal plan_price_sar
    decimal wallet_credit_sar
    decimal promo_discount_sar
    string promo_code
    string discount_label
    decimal total_paid_sar
    string payment_method_type
    string payment_method_label
    string gateway_payment_id
    enum status
    boolean is_new_user
    timestamp created_at
    timestamp updated_at
  }

  subscriptions {
    uuid id PK
    uuid user_id FK
    uuid order_id FK
    uuid plan_id FK
    enum meal_type
    enum status
    int total_meal_days
    int delivered_count
    int skipped_count
    date start_date
    date end_date
    int skip_days_allowed
    int skip_days_used
    int pause_days_allowed
    int pause_days_used
    date paused_from
    date paused_until
    date pause_ceiling_date
    timestamp created_at
    timestamp updated_at
  }

  delivery_days {
    uuid id PK
    uuid subscription_id FK
    uuid user_id FK
    date date
    enum meal_type
    string meal_name
    enum status
    timestamp delivered_at
    timestamp created_at
    timestamp updated_at
  }

  wallet_transactions {
    uuid id PK
    uuid user_id FK
    enum type
    decimal amount_sar
    string label
    string description
    string reference_id
    timestamp created_at
    timestamp updated_at
  }

  user_referrals {
    uuid id PK
    uuid referrer_user_id FK
    uuid referred_user_id FK
    string referral_code
    decimal reward_credited_sar
    boolean is_rewarded
    timestamp created_at
    timestamp updated_at
  }

  public_holidays {
    uuid id PK
    date date UK
    string name
    timestamp created_at
    timestamp updated_at
  }

  plans ||--o{ checkout_sessions : ""
  plans ||--o{ orders : ""
  plans ||--o{ subscriptions : ""
  users ||--o{ checkout_sessions : ""
  users ||--o{ payment_methods : ""
  users ||--o{ payment_transactions : ""
  users ||--o{ orders : ""
  users ||--o{ subscriptions : ""
  users ||--o{ delivery_days : ""
  users ||--o{ wallet_transactions : ""
  checkout_sessions ||--o{ payment_transactions : ""
  orders ||--o| subscriptions : ""
  subscriptions ||--o{ delivery_days : ""
```

**`subscriptions.status`:** `active` | `paused` | `cancelled` | `expired`  
**`delivery_days.status`:** `scheduled` | `skipped` | `delivered` | `past_cutoff` | `paused`  
**`checkout_sessions.status`:** `active` | `expired` | `confirmed`  
**`orders.status`:** `pending` | `confirmed` | `failed`

Meal assignment for a delivery day is derived from **`menu_slots`** (date + `meal_type`), not only `delivery_days.meal_name`.

---

## 6. Detailed ER — menu, ratings, operations

```mermaid
erDiagram
  meals {
    uuid id PK
    string name_en
    string name_ar
    enum meal_type
    int kcal
    decimal protein_g
    decimal carbs_g
    decimal fat_g
    text chef_note
    jsonb key_ingredients
    string emoji
    enum status
    string photo_url
    timestamp activated_at
    date last_served
    int times_served
    timestamp created_at
    timestamp updated_at
  }

  menu_weeks {
    string id PK
    int week_number
    int year
    date date_from
    date date_to
    enum status
    timestamp published_at
    uuid published_by FK
    timestamp created_at
    timestamp updated_at
  }

  menu_slots {
    string id PK
    string week_id FK
    date delivery_date
    enum meal_type
    uuid meal_id FK
    timestamp created_at
    timestamp updated_at
  }

  meal_ratings {
    uuid id PK
    uuid user_id FK
    uuid subscription_id FK
    uuid delivery_day_id FK
    uuid meal_id FK
    date delivery_date
    smallint stars
    jsonb tags
    timestamp created_at
    timestamp updated_at
  }

  delivery_issues {
    uuid id PK
    uuid user_id FK
    uuid subscription_id FK
    date delivery_date
    enum issue_type
    text description
    enum status
    decimal credited_amount_sar
    string rejection_reason
    text rejection_notes
    timestamp created_at
    timestamp updated_at
  }

  rider_issues {
    uuid id PK
    uuid delivery_day_id FK
    uuid rider_id FK
    enum issue_type
    string notes
    timestamp created_at
    timestamp updated_at
  }

  daily_ops_days {
    date date PK
    timestamp dispatched_at
    uuid dispatched_by FK
    timestamp delivered_at
    uuid delivered_by FK
    timestamp created_at
    timestamp updated_at
  }

  audit_logs {
    uuid id PK
    uuid user_id FK
    uuid subscription_id FK
    enum action
    jsonb metadata
    timestamp created_at
  }

  comms_automations {
    string id PK
    boolean is_enabled
    uuid updated_by_user_id FK
    timestamp created_at
    timestamp updated_at
  }

  comms_broadcasts {
    uuid id PK
    string segment_id
    string message
    int recipient_count
    uuid sent_by_user_id FK
    string status
    timestamp sent_at
    timestamp created_at
  }

  menu_weeks ||--o{ menu_slots : ""
  meals ||--o{ menu_slots : ""
  delivery_days ||--o{ meal_ratings : ""
  meals ||--o{ meal_ratings : ""
  delivery_days ||--o{ rider_issues : ""
```

**`meals.status`:** `draft` | `active`  
**`menu_weeks.status`:** `draft` | `published` | `past`  
**`menu_weeks.id` format:** e.g. `w2026-38` (ISO week–based string)  
**`menu_slots`:** unique on `(week_id, delivery_date, meal_type)`  
**`delivery_issues.status`:** `open` | `credited` | `rejected`  
**`audit_logs.action`:** includes `skip_delivery`, `pause_subscription`, `delete_account`, etc.

---

## 7. Table index (alphabetical)

| Table | Description |
|-------|-------------|
| `audit_logs` | Subscription lifecycle actions for support and compliance |
| `buildings` | Admin-curated building names per delivery area |
| `checkout_sessions` | Short-lived checkout quote before order placement |
| `comms_automations` | Toggle for automated push notification types |
| `comms_broadcasts` | Admin broadcast send history |
| `daily_ops_days` | Per-date dispatch/delivered pipeline timestamps |
| `delivery_areas` | Service zones (active / coming soon / paused) |
| `delivery_days` | One row per subscription calendar delivery day |
| `delivery_issues` | Customer-reported delivery problems |
| `delivery_locations` | Saved addresses for customers |
| `meal_ratings` | Star ratings and tags per delivered day |
| `meals` | Meal catalog (macros, photo, chef notes) |
| `menu_slots` | Meal assigned to a date + type within a week |
| `menu_weeks` | Weekly menu container (publish workflow) |
| `orders` | Payment record linked to plan purchase |
| `otp_sessions` | OTP verification state |
| `out_of_zone_interests` | Lead capture when area not in service |
| `payment_methods` | Tokenized payment methods per user |
| `payment_transactions` | Gateway payment attempts per checkout |
| `plans` | Subscription plan definitions |
| `promo_codes` | Promo and referral discount codes |
| `public_holidays` | Non-delivery dates |
| `refresh_tokens` | JWT refresh token storage |
| `rider_issues` | Driver-reported delivery blockers |
| `subscriptions` | Active entitlement and skip/pause counters |
| `user_devices` | SNS endpoints for mobile push |
| `user_referrals` | Referrer ↔ referred linkage and rewards |
| `users` | All personas (customer, driver, admin, ops) |
| `wallet_transactions` | Wallet credit/debit ledger |

---

## 8. Key business rules (data layer)

| Rule | Implementation |
|------|----------------|
| One active subscription per customer | Enforced in application layer when creating subscriptions |
| One rating per user per delivery day | Unique index on `meal_ratings (user_id, delivery_day_id)` |
| Skip/pause limits | Copied from `plans` onto `subscriptions`; usage on `skip_days_used` / `pause_days_used` |
| Menu visibility | Customer APIs read **published** `menu_weeks` only |
| Building list | `GET /delivery/areas/:id/buildings` returns buildings for any existing area status; saving a location still requires an **active** area |
| Account deletion | `users.deleted_at` + anonymization; related tokens/locations removed per policy |

---

## 9. Migrations source of truth

Schema changes are applied via Sequelize migrations:

`src/infrastructure/SequelizePersistence/migrations/`

Deploy order is by filename timestamp. New environments run `npx sequelize-cli db:migrate`.

---

## 10. Related assets

- **Meal photos:** S3 keys `meals/{meal_id}/photo.{jpeg|png|webp}`; public URL stored in `meals.photo_url` when uploaded  
- **No separate read replicas** documented in code; single PostgreSQL primary assumed
