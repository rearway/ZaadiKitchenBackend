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
TWILIO_WHATSAPP_FROM=whatsapp:+14155238886
TWILIO_WHATSAPP_CONTENT_SID=
```

- `TWILIO_WHATSAPP_FROM`: sandbox number for testing, your approved WhatsApp sender in production.
- `TWILIO_WHATSAPP_CONTENT_SID`: leave empty in the sandbox (a plain text message is sent). In production, set the Content SID (`HX...`) of a Meta-approved **authentication** template whose first variable `{{1}}` is the code. WhatsApp only delivers templates to users outside the 24-hour session window.

With `SKIP_OTP=true` (local dev), codes are logged and returned in the API response; Twilio and SNS are not called.

For testing real delivery while still seeing the code, set `SKIP_OTP=false` and `OTP_RETURN_CODE_IN_RESPONSE=true`: the code is sent on WhatsApp/SMS **and** returned as `otpCode`. Never enable this in production.

## Sandbox testing

1. In the Twilio Console open **Messaging → Try it out → Send a WhatsApp message**.
2. From your test phone, send the shown `join <code>` message to the sandbox number. The join opens a 24-hour window for plain text messages; re-send it if the window expires.
3. Set the env vars above (content SID empty) and restart the API.
4. Call **Send OTP** with `channel: "whatsapp"` and your E.164 number (`+9665xxxxxxxx`, or `+91xxxxxxxxxx` when `OTP_ALLOW_INDIAN_PHONES=true`).
5. Call **Verify OTP** with the 4-digit code received on WhatsApp.

## Production

1. Register a WhatsApp sender in Twilio (linked to your Meta Business account).
2. Create an **authentication** template in Twilio Content Template Builder, submit it for WhatsApp approval, and copy its `HX...` SID into `TWILIO_WHATSAPP_CONTENT_SID`.
3. Set `TWILIO_WHATSAPP_FROM` to the approved sender.

## Play Store review

Review phones (`OTP_REVIEW_ACCOUNTS`) keep fixed codes. See `docs/PLAY_STORE_REVIEW_OTP.md`.
