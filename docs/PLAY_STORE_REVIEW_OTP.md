# Play Store review — OTP test accounts

Use these credentials in **Google Play Console → App access** and on your **review/staging API** (not public production unless review is active).

## Environment (review API)

```env
OTP_REVIEW_ENABLED=true
OTP_REVIEW_ACCOUNTS=+966500000101:1234,+966500000102:1234
SKIP_OTP=false
```

- **`OTP_REVIEW_ENABLED`** — turns on fixed OTP for listed phones.
- **`OTP_REVIEW_ACCOUNTS`** — `phone:4-digit-code` pairs, comma-separated.
- **`SKIP_OTP`** — can stay `false` in review; reviewers use the fixed code below (SMS optional).

Review accounts skip OTP rate-limit lockouts. Verify accepts the fixed code even without a recent `send` (helpful if the reviewer skips resend).

## Test accounts

| App | Phone | OTP | Role in DB |
|-----|-------|-----|------------|
| Customer app | `+966500000101` | `1234` | `CUSTOMER` |
| Driver / rider app | `+966500000102` | `1234` | `DRIVER` |

## One-time DB setup

```bash
npx sequelize-cli db:seed --seed 20260922000001-seed-play-review-users.js
```

Or manually ensure the driver row exists:

```sql
UPDATE users SET role = 'DRIVER', is_active = true WHERE phone = '+966500000102';
```

## API flow

1. `POST /api/v1/auth/otp/send` — `{ "phone": "+966500000101", "channel": "sms" }`
2. `POST /api/v1/auth/otp/verify` — `{ "phone": "+966500000101", "code": "1234" }`

Same for `+966500000102` on the rider app.

## Security

- Keep **`OTP_REVIEW_ENABLED=false`** on production after review.
- Rotate phones/codes if leaked; update `OTP_REVIEW_ACCOUNTS` accordingly.
