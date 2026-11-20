# WhatsApp OTP (Twilio Messaging)

## Overview

- Both channels use the same flow: the API generates a **4-digit code**, stores it in `otp_sessions`, and `POST /auth/otp/verify` checks it against the database.
- `channel: "whatsapp"` delivers the code with **Twilio WhatsApp Messaging** (`messages.create`). Twilio Verify is not used.
- `channel: "sms"` delivers the code with **AWS SNS**.

## Environment

```env
SKIP_OTP=false
TWILIO_ACCOUNT_SID=ACxxxxxxxx
TWILIO_AUTH_TOKEN=xxxxxxxx
TWILIO_WHATSAPP_FROM=whatsapp:+966539759323
TWILIO_WHATSAPP_CONTENT_SID=HXxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx
```

| Variable | Purpose |
|----------|---------|
| `TWILIO_WHATSAPP_FROM` | Sandbox: `whatsapp:+14155238886`. Production: your approved sender, e.g. `whatsapp:+966539759323`. |
| `TWILIO_WHATSAPP_CONTENT_SID` | **Required for production.** Content SID (`HX...`) of a **WhatsApp-approved Authentication** template. |
| Empty `CONTENT_SID` | Sandbox only (plain text, after `join` sandbox). Production sends **fail** without a template. |

The backend sends templates with **`ContentVariables={"1":"<code>"}`** only (Meta auth templates allow this single OTP variable). OTP expiry in the app is **2 minutes** (`OTP_EXPIRY_SECONDS=120`); set template **code expiration** to **2 minutes** when creating it.

With `SKIP_OTP=true` (local dev), codes are logged and returned in the API response; Twilio and SNS are not called.

For testing real delivery while still seeing the code, set `SKIP_OTP=false` and `OTP_RETURN_CODE_IN_RESPONSE=true`: the code is sent on WhatsApp/SMS **and** returned as `otpCode`. Never enable this in production.

---

## Create the Authentication template (production)

### Option A — Twilio Console (recommended first time)

1. Open **Twilio Console → Messaging → Content Template Builder → Create new**.
2. **Template name:** `platio_kitchen_login_otp` (lowercase, underscores).
3. **Content type / category:** **Authentication** (`whatsapp/authentication`).
4. **Language:** English (`en`). Add Arabic later as a second template if needed.
5. Settings (as offered by the builder):
   - **Security recommendation:** On (“Do not share this code”).
   - **Code expiry:** **2** minutes (matches API OTP lifetime).
   - **Button:** **Copy code** (required for auth templates).
6. **Save**, then **Submit for WhatsApp approval**.
7. Wait until status is **Approved** (minutes to 48 hours).
8. Copy the **Content SID** (`HX...`) into `TWILIO_WHATSAPP_CONTENT_SID`.
9. Ensure **WhatsApp Senders** shows your number (e.g. `+966539759323` Platio Kitchen) as **Online** and linked to the same WhatsApp Business Account.

### Option B — API script (repo)

From repo root (needs `curl` only):

```bash
export TWILIO_ACCOUNT_SID=AC...
export TWILIO_AUTH_TOKEN=...
chmod +x scripts/create-twilio-whatsapp-auth-template.sh
./scripts/create-twilio-whatsapp-auth-template.sh
```

The script prints the new `HX...` SID and ECS env lines. If approval POST fails, retry:

```bash
export CONTENT_SID=HX...
export TEMPLATE_NAME=platio_kitchen_login_otp
./scripts/create-twilio-whatsapp-auth-template.sh --approval-only
```

If status is still empty, use Console → open template → **Submit for WhatsApp approval** (category **Authentication**).

### ECS / deploy after approval

```env
TWILIO_WHATSAPP_FROM=whatsapp:+966539759323
TWILIO_WHATSAPP_CONTENT_SID=HX...   # from step 8
SKIP_OTP=false
```

Redeploy tasks so the service picks up env. Test with `channel: "whatsapp"` and a **Saudi** number (`+966...`) first.

---

## Sandbox testing (no template)

1. **Messaging → Try it out → Send a WhatsApp message** — note sandbox number and `join` code.
2. From your phone, send `join <code>` to the sandbox; re-join if the 24h window expires.
3. `TWILIO_WHATSAPP_FROM=whatsapp:+14155238886`, leave `TWILIO_WHATSAPP_CONTENT_SID` empty.
4. `POST /auth/otp/send` with `channel: "whatsapp"` and your E.164 number.

---

## Status callbacks (optional)

When `TWILIO_STATUS_CALLBACK_URL` is set to the **exact public URL** Twilio will call (for example `https://api.platio.example/api/v1/auth/webhooks/twilio/otp-status`), OTP WhatsApp sends include `StatusCallback`. The backend endpoint validates `X-Twilio-Signature` with `TWILIO_AUTH_TOKEN` and logs masked `MessageSid`, `MessageStatus`, `ErrorCode`, `ChannelStatusMessage`, etc.

In Twilio Console → Messaging → your WhatsApp sender, you do **not** need a separate global webhook for this; the per-message `StatusCallback` URL is enough.

## SMS fallback (optional, default off)

| Env | Default | Purpose |
|-----|---------|---------|
| `OTP_SMS_FALLBACK_ENABLED` | `false` | On WhatsApp throw or callback `failed` / `undelivered` / errors `63005`, `63016`, `63024`, … send the **same** OTP via SMS. |
| `TWILIO_SMS_FROM` | — | E.164 sender for Twilio SMS fallback. |
| `TWILIO_SMS_MESSAGING_SERVICE_SID` | — | Alternative to `TWILIO_SMS_FROM`. |
| `TWILIO_STATUS_CALLBACK_URL` | — | Enables status callbacks and webhook-driven fallback. |

If Twilio SMS is not configured, fallback reuses **AWS SNS** (same as `channel: "sms"`).

## Payload audit (current backend)

Production template sends use **only** `From`, `To`, `ContentSid`, `ContentVariables` (JSON string `{"1":"<4-digit code>"}`), and optional `StatusCallback`. No `Body`, `MediaUrl`, `MessagingServiceSid`, or `persistentAction` on template sends.

`To` / `From` are always `whatsapp:+E164` (single `whatsapp:` prefix, E.164 with leading `+`).

## Meta / WhatsApp restrictions (external knowledge — not verified in code)

- Authentication templates to **+91 India** may be blocked unless the WhatsApp Business is registered for India (may explain India failures while KSA still fails for other reasons).
- Auth templates must use category **authentication**, approved **Copy code** button, and variable `{{1}}` for the OTP.
- Business / WABA verification and **display name** approval affect deliverability.
- KSA and other markets may have additional carrier or Meta policy limits.

## Troubleshooting

| Symptom | Likely cause |
|---------|----------------|
| Twilio **Failed** in &lt;1s, plain body in log | No approved auth template — set `TWILIO_WHATSAPP_CONTENT_SID`. |
| **queued** then **failed**, error **63005** | Channel rejected content — template/category/variable mismatch or Meta policy (see restrictions above). |
| **queued** then **failed**, error **63016** | Template required / wrong template type. |
| Wrong **From** | ECS still on sandbox number; use production sender E.164. |
| API 201 but no WhatsApp | Check Twilio message log **Error code**; enable `TWILIO_STATUS_CALLBACK_URL` for server logs; `SendOtp` still returns success if Twilio fails after session create (see server logs). |

### Inspect template in Twilio (AL H — run locally)

Credentials are not available in the agent environment. With `TWILIO_ACCOUNT_SID` and `TWILIO_AUTH_TOKEN`:

```bash
curl -s -u "$TWILIO_ACCOUNT_SID:$TWILIO_AUTH_TOKEN" \
  "https://content.twilio.com/v1/Content/HX99aaa5e069f06160563aecfb9ae592a8"

curl -s -u "$TWILIO_ACCOUNT_SID:$TWILIO_AUTH_TOKEN" \
  "https://content.twilio.com/v1/Content/HX99aaa5e069f06160563aecfb9ae592a8/ApprovalRequests"
```

## Play Store review

Review phones (`OTP_REVIEW_ACCOUNTS`) keep fixed codes. See `docs/PLAY_STORE_REVIEW_OTP.md`.
