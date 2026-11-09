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

## Troubleshooting

| Symptom | Likely cause |
|---------|----------------|
| Twilio **Failed** in &lt;1s, plain body in log | No approved auth template — set `TWILIO_WHATSAPP_CONTENT_SID`. |
| **queued** then **failed**, error **63016** | Template required / wrong template type. |
| Wrong **From** | ECS still on sandbox number; use production sender E.164. |
| API 201 but no WhatsApp | Check Twilio message log **Error code**; `SendOtp` still returns success if Twilio fails after session create (see server logs). |

## Play Store review

Review phones (`OTP_REVIEW_ACCOUNTS`) keep fixed codes. See `docs/PLAY_STORE_REVIEW_OTP.md`.
