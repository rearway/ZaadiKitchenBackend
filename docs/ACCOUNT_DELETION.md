# Account deletion (Play Store / privacy)

Public landing page should link here and mirror this policy. In-app: **Profile** tab → **Account** section (above Sign out) → **Delete account**.

## API

**`POST /api/v1/users/me/delete-account`**

Auth: `Authorization: Bearer <access_token>`  
Roles: **CUSTOMER** or **DRIVER** only (not Admin/Ops).

Body:

```json
{ "confirm": true }
```

Success `200`:

```json
{
  "message": "Account deleted successfully",
  "data": {
    "deleted_at": "2026-09-22T10:00:00.000Z",
    "subscription_cancelled": true
  }
}
```

Errors:

- `400` — `confirm` not `true`
- `403` — Admin/Ops attempted deletion
- `404` — user not found

After success, all refresh tokens are revoked; the client should clear local tokens and return to login.

## What happens

1. **Active or paused subscription** → cancelled (deliveries may continue until plan end date, same as manual cancel).
2. **Saved delivery addresses** → removed.
3. **Push device registrations** → deactivated.
4. **Refresh tokens** → revoked.
5. **Profile PII** → anonymized on the user row:
   - Phone → `deleted:<user_id>` (frees the original number for a new signup)
   - Email → `deleted+<user_id>@deleted.local`
   - Name → `Deleted User`
   - Push token and referral code cleared
   - `is_active` → `false`, `deleted_at` set

## What we retain (anonymized / legal)

- Orders, payments, delivery history, wallet ledger entries tied to the internal user id for accounting and support disputes.
- Audit log entries (including `delete_account`).

## Landing page copy (suggested URL: `/account-deletion`)

Full brief for marketing site (footer link + page copy, Play-aligned): **`docs/LANDING_PAGE_ACCOUNT_DELETION_HANDOFF.md`**

1. Explain steps above (delete in app or contact support if unable to log in).
2. Link to privacy policy.
3. State that deletion is **immediate** once confirmed in the app.
4. Support email for edge cases (active dispute, etc.).

## Play Console

- **Account deletion URL:** `https://<your-marketing-domain>/account-deletion`
- Data safety: align “account deletion” with anonymize + deactivate described above.
