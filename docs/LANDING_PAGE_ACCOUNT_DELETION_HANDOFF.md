# Landing page handoff — Account deletion (Play Store)

Share this with whoever builds **zaadikitchen.com** (or the marketing site). Google Play requires a **public URL** that explains how users delete their account and what happens to their data.

---

## Play Console requirement (must match the live page)

In **Google Play Console → App content → Data safety → Account deletion**, enter:

```
https://<YOUR-MARKETING-DOMAIN>/account-deletion
```

The page must be **public** (no login). It must describe:

- How to request/delete the account  
- What data is deleted vs retained  
- Rough timing (we delete **immediately** in-app after confirmation)

---

## Product reality (mobile apps)

| App | Where delete lives |
|-----|-------------------|
| **Customer app** | **Profile** tab → scroll to **Account** section (above **Sign out**) → **Delete account** |
| **Driver / rider app** | Same: **Profile** → **Account** → **Delete account**, then **Sign out** stays separate below |

### Profile screen layout (customer app)

Bottom navigation: user is on **Profile**.

1. **Header** — name, phone, language (EN / AR).  
2. **Settings list** — Rate Your Meals, Meal History, Billing & Wallet, Refer Friends, Delivery Location (unchanged).  
3. **Account** — **new section** directly **above Sign out** (separate card or grouped block).  
   - Contains **Delete account** (destructive action; opens confirmation).  
4. **Sign out** — own row/card **below Account** (unchanged).

Deletion is **not** mixed into Sign out; Play expects a clear delete path — **Account → Delete account**, then confirm.

Flow in app:

1. Open **Profile** (bottom tab).  
2. Scroll past meal/billing/location items to the **Account** section.  
3. Tap **Delete account**.  
4. Confirm in the dialog → app calls `POST /api/v1/users/me/delete-account` with `{ "confirm": true }`.  
5. On success → clear tokens, return to login/welcome.

**The landing page does not perform deletion.** It **explains** this navigation and satisfies Play’s link requirement. Deletion happens **only in the logged-in app** (or via support if they cannot log in).

---

## UX on marketing site (small link + full page)

### 1) Small link (footer / legal row)

Add a text link wherever you show Privacy Policy / Terms:

**Link label (pick one):**

- `Delete account` (recommended — Play-friendly)  
- `Account deletion`  
- Arabic: `حذف الحساب`

**Href:** `/account-deletion` (same path EN + AR if you use locale prefixes, e.g. `/en/account-deletion` and `/ar/account-deletion` — use **one canonical URL** in Play Console).

Optional helper line under footer links (small, muted):

> Delete your account in the app: **Profile → Account → Delete account** (above Sign out).

### 2) Dedicated page `/account-deletion`

Single scrollable page, mobile-friendly, matches brand. No login required.

Suggested structure:

---

#### Page title

**Delete your Zaadi Kitchen account**  
(AR: **حذف حسابك في Zaadi Kitchen** — use your standard Arabic brand name)

#### Short intro

Zaadi Kitchen lets you delete your account at any time. Deletion is **immediate** after you confirm in the app. Some records may be kept in anonymized form where the law or our payment operations require it (see below).

---

#### How to delete your account (primary path)

1. Open the **Zaadi Kitchen** app and sign in.  
2. Tap **Profile** in the bottom navigation bar.  
3. Scroll down past your meal, billing, and delivery settings.  
4. Under the **Account** section (directly **above Sign out**), tap **Delete account**.  
5. Read the warning and confirm deletion.  
6. You will be signed out automatically; your profile information will be anonymized on our servers.

**Visual order on Profile:**  
`Rate Your Meals · Meal History · Billing & Wallet · Refer Friends · Delivery Location` → **`Account` → Delete account** → **`Sign out`**

**Note for Play reviewers:** Test accounts and steps are documented separately for the review team; this page is for all users.

---

#### If you cannot access the app

Email **support@zaadikitchen.com** (replace with real support inbox) from the email or phone registered on your account. Include:

- Registered **phone number**  
- Request: **“Delete my account”**

We will verify ownership and complete deletion using the same process as in-app deletion, within **30 days** (state a SLA you can honor; 30 days is Play-acceptable for manual requests).

---

#### What we delete or anonymize

When deletion completes, we:

- Cancel an **active or paused meal subscription** (if any). Scheduled deliveries may continue until the end of the current plan period, same as a normal cancellation.  
- Remove **saved delivery addresses**.  
- Stop **push notifications** and remove device registration for your account.  
- **Anonymize** your profile: name, phone, email, and referral code on our systems (you will not be able to sign in with the old account).  
- **Sign you out** on all devices (sessions revoked).

Your **original phone number** can be used to register a **new** account later; the old account data is not restored.

---

#### What we may keep (legal / operational)

We may retain certain records **without personal identifiers** or linked only to an internal ID, for example:

- Order and payment history (accounting, tax, chargebacks)  
- Delivery and wallet transaction records  
- Support or dispute records tied to past deliveries  

We do **not** use retained data for marketing after deletion.

---

#### Timing

- **In-app deletion:** effective **immediately** after you confirm.  
- **Email request:** within **[30] days** of verified request (adjust if needed).

---

#### Related policies

Link to your existing pages:

- [Privacy Policy](/privacy)  
- [Terms of Service](/terms)  
- Contact / Support

---

#### Apps covered

This process applies to:

- **Zaadi Kitchen** (customer app) — Profile → **Account** → Delete account  
- **Zaadi Kitchen Driver** (rider app) — same **Account** section above Sign out where implemented

---

## Play Store–compatible wording checklist

Use clear, plain language. Avoid “we might delete” — say **what happens**.

| Play expects | Our answer on the page |
|--------------|-------------------------|
| How to delete | Profile tab → **Account** section → Delete account (above Sign out); email if locked out |
| Data deleted | Profile PII, addresses, push tokens, login access |
| Data kept | Orders/payments/history anonymized or retained for legal reasons |
| Timeframe | Immediate in-app; email within 30 days |
| No account-only gate | Page is public; deletion action is in app |

Do **not** imply deletion happens only by email unless you truly disable in-app delete.

---

## Optional: deep link (future)

If the marketing site wants a button “Open app to delete”:

- Custom scheme or universal link to **Profile** (mobile team to define).  
- Until then, text instructions are enough for Play approval.

---

## Backend reference (for mobile team; not required on landing page)

- Endpoint: `POST /api/v1/users/me/delete-account`  
- Body: `{ "confirm": true }`  
- Auth: Bearer JWT (customer or driver)  
- Details: `docs/ACCOUNT_DELETION.md`

---

## Suggested footer snippet (copy-paste)

**English**

```
Privacy Policy · Terms · Delete account · Contact
```

**Arabic (example)**

```
سياسة الخصوصية · الشروط · حذف الحساب · تواصل معنا
```

---

## QA before Play submission

- [ ] `/account-deletion` loads without login on production domain  
- [ ] URL in Play Console **exactly** matches live page  
- [ ] Footer link visible on homepage (and ideally all pages)  
- [ ] Customer app: Profile has **Account** section with **Delete account** **above** Sign out; confirm calls API  
- [ ] Privacy policy mentions account deletion or links to this page  

---

## Contact for content questions

Backend / API: see `docs/ACCOUNT_DELETION.md` in the Zaadi Kitchen backend repo.
