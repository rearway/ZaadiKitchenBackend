# ZaadiKitchen Backend — Business Logic Issues

> **Generated:** 2026-06-07
> **Source:** Cross-referenced implemented code against `docs/master/` spec files
> **Scope:** Already-implemented modules only — pending items from `what_pending.md` are excluded

---

## Table of Contents

1. [🔴 HIGH — Incorrect Behavior](#-high--incorrect-behavior)
2. [🟠 MEDIUM — Wrong but Not Catastrophic](#-medium--wrong-but-not-catastrophic)
3. [🟡 LOW — Minor / Edge Cases](#-low--minor--edge-cases)

---

## 🔴 HIGH — Incorrect Behavior

---

### H1 — OTP expiry check runs after mismatch check (wrong order)

**File:** `src/core/usecases/commands/VerifyOtp.ts:57–69`

**Spec says:** An expired OTP must be rejected as expired before any other check.

**Code does:** The code first checks `session.code !== code` (line 57) and increments the attempt counter on mismatch, then checks `new Date() > session.expiresAt` (line 66). If an expired OTP is submitted with the wrong code, the attempt counter is incorrectly incremented before the expiry is detected.

**Fix:** Move the expiry check to run before the code comparison check.

```ts
// Correct order:
if (new Date() > session.expiresAt) throw new OtpExpiredError()
if (session.code !== code) { ... throw new OtpInvalidError() }
```

---

### H2 — Skip/Undo-Skip cutoff breaks on 1st of month

**Files:**
- `src/core/usecases/commands/SkipDelivery.ts:17–19`
- `src/core/usecases/commands/UndoSkipDelivery.ts:15–18`

**Spec says:** Cutoff is 6 PM Riyadh time (AST, UTC+3) on the day before delivery.

**Code does:** Both use `new Date(Date.UTC(y, m - 1, d - 1, 15, 0, 0))`. When `d = 1` (delivery on the 1st of a month), `d - 1 = 0`, and JavaScript's `Date.UTC` underflows to the last day of the prior month, producing a completely wrong cutoff date.

**Fix:** Construct the delivery date as a proper Date object and subtract one day using `setUTCDate`:

```ts
function isPastCutoff(deliveryDateStr: string): boolean {
  const delivery = new Date(deliveryDateStr + 'T00:00:00Z')
  const cutoff = new Date(delivery)
  cutoff.setUTCDate(cutoff.getUTCDate() - 1)
  cutoff.setUTCHours(15, 0, 0, 0) // 15:00 UTC = 18:00 KSA
  return new Date() > cutoff
}
```

---

### H3 — `pauseCeilingDate` set to pause end date, not 2× plan window

**File:** `src/core/usecases/commands/PauseSubscription.ts:87`

**Spec says:** The ceiling date is the 2× plan window from subscription start date:
- Week Plan → 3 weeks from start
- Month Plan → 3 months from start
- Quarterly Plan → 9 months from start

Dates beyond the ceiling are greyed out in the calendar picker.

**Code does:** Sets `pauseCeilingDate: endDate` — i.e. the same date as when the pause ends. This makes `pauseCeilingDate` useless as a constraint; it always equals the pause's own `pausedUntil`.

**Fix:** Compute the 2× window ceiling at subscription creation and store it. In `PauseSubscription`, validate `endDate <= ceilingDate` and store the actual ceiling, not the pause end date.

---

### H4 — Promo discount is a fixed SAR amount, not 20% of plan price

**Files:**
- `src/core/entities/PromoCode.ts`
- `src/core/usecases/commands/ApplyPromoCode.ts:107–116`

**Spec says:** All promo codes give 20% off the plan price. The actual discount varies by plan — 20% of SAR 28 (Try It) = SAR 5.60; 20% of SAR 500 (Month) = SAR 100.

**Code does:** `PromoCode` entity stores a fixed `discountSar: number`. `ApplyPromoCode` subtracts `promo.discountSar` directly. A promo seeded with SAR 100 gives SAR 100 off all plan types regardless of plan price — not 20%.

**Fix:** Add `discountPct: number` to the `PromoCode` entity and calculate the actual discount at apply-time:

```ts
const discountSar = Math.round(session.basePriceSar * promo.discountPct / 100 * 100) / 100
```

---

### H5 — Referral reward `Math.round()` loses half-SAR precision

**File:** `src/core/usecases/commands/CreateOrder.ts:303`

**Spec says:** Referrer earns exactly 10% of the new user's plan price. Examples given include non-integer values — Week Plan SAR 125 → referrer gets SAR 12.50.

**Code does:** Uses `Math.round(plan.priceSar * 0.1)` which rounds SAR 12.50 → SAR 13, crediting the wrong amount.

**Fix:** Round to 2 decimal places:

```ts
const reward = Math.round(plan.priceSar * 0.1 * 100) / 100
```

---

### H6 — Referral reward credited at payment time, not plan activation

**File:** `src/core/usecases/commands/CreateOrder.ts:299–319`

**Spec says:** "The referrer's 10% wallet credit is applied when the new user's plan activates" — not at the moment of payment, but when the plan goes live.

**Code does:** Credits the referrer's wallet inside `createOrder`, which fires at payment time. For subscriptions with a future `startDate`, the referrer is credited before deliveries even begin.

**Fix:** For subscriptions with a `startDate > today`, defer the referral wallet credit to when the subscription's first delivery day is activated (e.g. via the daily `ExpireSubscriptions`-style cron job or a subscription activation hook).

---

## 🟠 MEDIUM — Wrong but Not Catastrophic

---

### M1 — Phone format validation commented out

**Files:**
- `src/core/usecases/commands/SendOtp.ts:31–39`
- `src/gateways/http/dto/SendOtpDTO.ts:7–13`

**Spec says:** Market is Riyadh, Saudi Arabia. Only Saudi phone numbers (+966XXXXXXXXX, 13 chars) should be accepted.

**Code does:** Phone regex validation is commented out in both files. Any string passes as a valid phone number.

**Fix:** Uncomment the Saudi phone regex validation in both the DTO (`@Matches(/^\+9665\d{8}$/)`) and the use case.

---

### M2 — Pause does not validate `startDate` is in the future

**File:** `src/core/usecases/commands/PauseSubscription.ts:54–64`

**Spec says:** The calendar only allows future dates to be selected for a pause.

**Code does:** No check that `startDate >= today`. A client could submit a past date and retroactively mark historical delivery days as paused.

**Fix:** Add a guard before processing:

```ts
const today = new Date().toISOString().split('T')[0]
if (startDate < today) throw new ValidationError('Pause start date must be today or in the future')
```

---

### M3 — Issue type `'damaged'` should be `'late_delivery'`

**Files:**
- `src/core/entities/DeliveryIssue.ts`
- `src/core/usecases/commands/SubmitDeliveryIssue.ts:17`
- `src/gateways/http/dto/SubmitIssueDTO.ts`
- `src/infrastructure/SequelizePersistence/models/DeliveryIssueModel.ts`
- `src/infrastructure/SequelizePersistence/migrations/20260607000001-create-delivery-issues.js`

**Spec says (B17):** Issue types are: `wrong_order · quality_issue · not_delivered · late_delivery`

**Code does:** Defines `IssueType = 'wrong_order' | 'quality_issue' | 'not_delivered' | 'damaged'`. The `'late_delivery'` type from the spec is replaced with `'damaged'`.

**Note:** The rider-side issue report (D2) may also need `'damaged'` as an additional type. If so, keep `'damaged'` for riders and use `'late_delivery'` for customer-facing reports only.

**Fix:** Replace `'damaged'` with `'late_delivery'` in the `IssueType` union, migration ENUM, and all validation arrays.

---

### M4 — Meal type switch `effectiveFrom` doesn't skip weekends

**File:** `src/core/usecases/commands/SwitchMealType.ts:42–51`

**Spec says:** Switch is "effective from the following day's delivery." Since deliveries are Sunday–Thursday only, the next effective date must be the next working day.

**Code does:** Adds 1 or 2 calendar days to today. If today is Thursday before 6 PM, `effectiveFrom` becomes Friday — a non-delivery day. The meal type update targets a date that has no delivery day rows.

**Fix:** After computing the raw `effectiveFrom`, advance it forward to the next Sun–Thu working day:

```ts
function nextWorkingDay(date: Date): Date {
  const day = date.getUTCDay() // 0=Sun, 5=Fri, 6=Sat
  if (day === 5) date.setUTCDate(date.getUTCDate() + 2) // Fri → Sun
  if (day === 6) date.setUTCDate(date.getUTCDate() + 1) // Sat → Sun
  return date
}
```

---

### M5 — `GetPendingRatings` and `SubmitMealRating` require active subscription

**Files:**
- `src/core/usecases/queries/GetPendingRatings.ts:19–20`
- `src/core/usecases/commands/SubmitMealRating.ts:42–43`

**Spec says:** The "Rate Your Meals" badge and rating flow should be available to any user who has received deliveries, including those with expired plans.

**Code does:** Both use cases call `getActiveSubscriptionByUserId` and return empty / throw if no active subscription exists. A customer whose plan just expired cannot rate meals they already received.

**Fix:** Query delivery days by `userId` across all subscriptions (not just active), or look up the subscription via the delivery day's own `subscriptionId`. Validate ownership from the delivery day record rather than requiring an active subscription.

---

### M6 — Home screen quick actions don't match spec

**File:** `src/core/usecases/queries/GetHome.ts:129–166`

**Spec says:**
- **Active state:** 3 quick actions — "Switch Meal Type / My Plan / Billing & Wallet"
- **Paused state:** 3 quick actions — "Resume Now / Browse Menu / Billing & Wallet"

**Code does:**
- **Active state** returns 2 actions: "Skip a day" and "Pause anytime" (wrong set)
- **Paused state** returns 2 actions: "Resume Now" and "Browse Menu" (missing "Billing & Wallet")

**Fix:** Update both states to match the spec's 3-tile layout.

---

### M7 — Referral share text hardcodes "SAR 100 off"

**File:** `src/core/usecases/queries/GetReferral.ts:24`

**Spec says:** Referral gives 20% off. No "SAR 100" figure exists in the spec — the actual SAR amount varies by plan chosen.

**Code does:** WhatsApp share text says `"SAR 100 off your first plan"`.

**Fix:** Change to percentage-based language:

```ts
shareText: 'Use my code to get 20% off your first Zaadi Kitchen plan!'
```

---

## 🟡 LOW — Minor / Edge Cases

---

### L1 — `ToggleSaladForDay` endpoint is implemented — Salad Add-On is not in v1

**Files:**
- `src/gateways/http/subscriptions.controller.ts:100–115`
- `src/core/usecases/commands/ToggleSaladForDay.ts`

**Spec says:** "The Salad Add-On (+SAR 15 daily item) is not in v1 and does not appear anywhere in the application."

**Code does:** The endpoint `PATCH /api/v1/subscriptions/me/deliveries/:delivery_date/salad`, its use case, and its DTO all exist and are wired up.

**Fix:** Remove the controller route, or gate it behind a feature flag before any public release.

---

### L2 — `GetProfile.onboardingComplete` doesn't check for delivery location

**File:** `src/core/usecases/queries/GetProfile.ts:30`

**Spec says:** Onboarding is complete when the user has a name AND a delivery location saved.

**Code does:** Checks only `!!user.fullName && user.fullName !== 'New User'` — no delivery location check. `VerifyOtp.ts` (line 132–133) correctly checks for `primaryLocation !== null`; `GetProfile` should be consistent.

**Fix:** Inject `deliveryLocationLoader` into `GetProfile` and add the same primary location check as `VerifyOtp`.

---

### L3 — Renewal nudge (20% threshold) missing from active banner

**File:** `src/core/usecases/queries/GetHome.ts:71–86`

**Spec says:** A "Renew →" button appears in the subscription banner when 20% or fewer of the plan's days remain (e.g. fewer than 2 days on a Week Plan, fewer than 5 days on a Month Plan).

**Code does:** Active banner is built without any `show_renewal_nudge` flag or threshold calculation.

**Fix:** Compute the threshold and include a flag in the response:

```ts
const showRenewalNudge = subscription.daysRemaining / subscription.totalMealDays <= 0.2
// Include in banner response: show_renewal_nudge: showRenewalNudge
```

---

## Fix Priority

| # | Severity | ID | Module | Issue |
|---|---|---|---|---|
| 1 | 🔴 HIGH | H2 | Skip/Undo | First-of-month cutoff date arithmetic bug |
| 2 | 🔴 HIGH | H1 | Auth | OTP expiry check in wrong order |
| 3 | 🔴 HIGH | H4 | Promo | Discount is fixed SAR, not 20% of plan price |
| 4 | 🔴 HIGH | H3 | Pause | `pauseCeilingDate` set to wrong value |
| 5 | 🔴 HIGH | H5 | Referral | Reward rounded incorrectly (`Math.round`) |
| 6 | 🔴 HIGH | H6 | Referral | Reward credited at payment, not activation |
| 7 | 🟠 MED | M3 | Issues | Wrong issue type: `damaged` vs `late_delivery` |
| 8 | 🟠 MED | M4 | MealType | `effectiveFrom` doesn't skip weekends |
| 9 | 🟠 MED | M5 | Ratings | Rating blocked when subscription expired |
| 10 | 🟠 MED | M6 | Home | Quick actions don't match spec |
| 11 | 🟠 MED | M2 | Pause | No past-date guard on pause `startDate` |
| 12 | 🟠 MED | M1 | Auth | Phone validation commented out |
| 13 | 🟠 MED | M7 | Referral | Share text hardcodes "SAR 100 off" |
| 14 | 🟡 LOW | L1 | v1 scope | `ToggleSaladForDay` must be removed |
| 15 | 🟡 LOW | L2 | Auth | `GetProfile.onboardingComplete` incomplete |
| 16 | 🟡 LOW | L3 | Home | Renewal nudge threshold not computed |

---

*Last updated: 2026-06-07*
