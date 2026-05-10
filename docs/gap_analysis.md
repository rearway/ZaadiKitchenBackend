# Zaadi Kitchen — Sign-Off vs Implementation Plan: Gap Analysis

> Compared: [Sign-off workbook (6 sheets)](file:///home/alameen/dev/ZaadiKitchen/backend/docs/csv) vs [implementation_plan.md](file:///home/alameen/dev/ZaadiKitchen/backend/docs/implementation_plan.md) vs [Architecture PDF](file:///home/alameen/dev/ZaadiKitchen/backend/docs/Zaadi_Kitchen_Architecture.pdf)
>
> Focus: **Backend + Server only** (Mobile App / Landing Page deferred to later)

---

## 🔴 Conflicts (Sign-off contradicts Architecture PDF)

| # | Topic | Architecture PDF says | Sign-Off says | Impact |
|---|-------|----------------------|---------------|--------|
| 1 | **OTP Channel** | WhatsApp primary, SMS fallback | ~~**FCM push notification**~~ | **RESOLVED:** Confirmed WhatsApp primary, SMS fallback. |
| 2 | **OTP Rate Limit** | 5 attempts per phone per 10 min | **3 attempts** before lockout | **RESOLVED:** Sign-off (3 attempts) takes precedence. |
| 3 | **Delivery Status Enum** | SCHEDULED → ... | ~~Uses **PENDING**~~ | **RESOLVED:** Confirmed use of **SCHEDULED**. |
| 4 | **Logout Scope** | Invalidate refresh token | ~~**Logout all devices**~~ | **RESOLVED:** Confirmed **current session only**. |

> [!NOTE]
> **Conflict #1 (OTP via FCM)** was confirmed as a typo in the sign-off document. Both documents now align on **WhatsApp/SMS** as the primary auth channel.

---

## 🟡 Features in Sign-Off NOT in Our Implementation Plan

| # | Sign-Off Feature | Sheet | What's Missing |
|---|-----------------|-------|---------------|
| 1 | **Driver GPS coordinates recorded on delivery** | Backend #19 | Our plan has `UpdateDeliveryStatus` but doesn't mention capturing GPS lat/long |
| 2 | **Prorated cost calculation on renewal/upgrade** | Backend #9 | Our plan mentions `RenewSubscription` but doesn't detail proration logic |
| 3 | **Wallet credit offset on checkout** | Backend #9 | Wallet credit applied before charging gateway — needs use case logic |
| 4 | **Audit log for every skip** | Backend #14 | Our plan has skip use case but no explicit audit trail table/entity |
| 5 | **Plan configuration admin endpoint** | Admin #6 | Edit plan prices, skip allowances, pause limits, salad pricing — **not in our plan** |
| 6 | **Plan entity** | — | Our entities list doesn't have a `Plan` table (prices, skip allowances, etc.) — it's implied but not explicit |
| 7 | **Wallet ledger atomicity** | Backend #28 | "No race conditions on concurrent credit" — needs transaction-level locking |
| 8 | **Referral credit timing** | Backend #24 | "Referrer credited after referee completes first payment" — deferred credit logic |
| 9 | **Issue categories enum** | Backend #20 | Explicit categories: Damaged, Missing, Wrong — not in our enums |
| 10 | **Salad toggle blocked after 6 PM** | Backend #16 | Our plan has `ToggleSalad` but doesn't mention 6 PM lock enforcement |
| 11 | **Undo-skip time window** | Backend #15 | "Undo only permitted within defined window" — needs configurable window |
| 12 | **Driver CSV export endpoint** | Admin #3 | Per-building CSV download — not explicitly in our admin endpoints |
| 13 | **Referral stats CSV export** | Admin #12 | "Data exportable to CSV" — not in our plan |

---

## 🟢 Features Aligned (No Conflicts)

These features are fully covered in both the sign-off and our implementation plan:

- ✅ Auth: send-otp, verify-otp, refresh-token, logout, role guards
- ✅ Address: search-buildings, CRUD, set-default
- ✅ Subscription: get-plan-status, create, pause, resume, state machine
- ✅ Meal Engine: get-menu, switch-meal-type, skip-day, undo-skip, salad toggle, meal-history
- ✅ Delivery: update-delivery-status, report-issue, generate-labels
- ✅ Payments: init-payment, webhook-handler, billing-history, wallet
- ✅ Referral: get-referral-stats, apply-referral
- ✅ Rating: submit-rating
- ✅ Admin: daily-production, label-generator, customer-list, customer-detail, issue-queue, manual credit, MRR/revenue, menu CRUD
- ✅ Infrastructure: AWS setup, CI/CD, 6 PM lock cron, FCM+WhatsApp infra, QA, UAT

---

## 🔵 Out of Scope — Confirmed (v2 candidates)

These are explicitly excluded and **should NOT be built**:

| Item | Notes |
|------|-------|
| Map-based delivery tracking | No real-time GPS routing for drivers |
| ERP / POS integrations | No kitchen ERP or POS |
| Multi-kitchen / multi-city | Single city, single kitchen in v1 |
| Email marketing / CRM | No MailChimp, Klaviyo, etc. |
| Advanced analytics / BI | Basic MRR only — no Mixpanel/Amplitude |
| Loyalty / points programme | Referral credits only |
| Native iOS/Android dev | Flutter only |
| Additional UAT rounds | One round included |

---

## 📋 Recommended Actions Before Starting Implementation

### Must Fix in Implementation Plan

1. **Add `Plan` entity** — needs its own table for plan prices, skip allowances, pause limits, salad pricing (admin-configurable via Admin Dashboard #6)
2. **Add `AuditLog` entity** — skip/pause/status-change audit trail
3. **Add `IssueCategory` enum** — `DAMAGED | MISSING | WRONG`
4. **Add GPS capture to `UpdateDeliveryStatus`** — latitude/longitude fields on Delivery entity
5. **Add proration logic detail** to `RenewSubscription` use case
6. **Add wallet credit offset** to subscription checkout flow
7. **Extend 6 PM lock** to cover salad toggle (not just skip/switch)
8. **Add `Plan` CRUD admin endpoints** — configuration management
9. **Add driver CSV export** admin endpoint
10. **Add configurable undo-skip window** to subscription/plan configuration

### Needs Client Clarification

1. **OTP delivery channel** — **RESOLVED:** WhatsApp primary, SMS fallback.
2. **Logout scope** — **RESOLVED:** Current session only.
3. **Delivery status initial value** — **RESOLVED:** Use `SCHEDULED`.
4. **Referral earnings logic** — TBD in development.

---

*Generated: April 20, 2025*
