# Zaadi Kitchen — Backend Implementation Plan

> **Status:** ⏳ Awaiting project approval (hold until ~April 26, 2025)
> **Stack:** NestJS · TypeScript · PostgreSQL · **Sequelize ORM** · JWT Auth · Swagger · class-validator
> **Architecture:** Clean Architecture ([coding_standards.md](./coding_standards.md))
> **Source of truth:** [Zaadi_Kitchen_Architecture.pdf](./Zaadi_Kitchen_Architecture.pdf) + [Sign-Off Specs](./csv/)

---

## Decisions — Confirmed

| Decision | Choice | Notes |
|----------|--------|-------|
| ORM | **Sequelize** | Per coding standards; all patterns (models, migrations, persistence services, `toEntity()` mapping) |
| Architecture | **Clean Architecture (3-layer)** | Core → Infrastructure → Presentation |
| Auth | **OTP-based (WhatsApp/SMS)** | Confirmed WhatsApp primary, SMS fallback |
| Logout scope | **Current session only** | Sign-off correction — does not invalidate all devices |
| Initial Status | **SCHEDULED** | Consistent with technical architecture doc |

---

## Phase Overview

| Phase | Focus | Depends On | Effort |
|-------|-------|------------|--------|
| **1** | Project scaffold + DevOps | — | 1–2 days |
| **2** | Core entities & shared infra | Phase 1 | 2–3 days |
| **3** | Auth module (OTP, JWT, guards) | Phase 2 | 2–3 days |
| **4** | User + Address + Plans | Phase 3 | 2–3 days |
| **5** | Subscription + Meal + Delivery | Phase 4 | 4–5 days |
| **6** | Payment + Referral + Notifications | Phase 5 | 3–4 days |
| **7** | Admin module + Ops + Labels | Phase 6 | 3–4 days |

---

## Phase 1 — Scaffold

- Standard NestJS scaffold at `backend/`
- Tooling: Prettier, ESLint, TypeScript configured per standards.
- **`docker-compose.yml`**: PostgreSQL 15 + Redis 7 for local dev.
- **Infra Planning:** Scale for **5,000 active users** using AWS Fargate (auto-scaling) and RDS (multi-AZ).

---

## Phase 2 — Core Layer

### Enums
- **UserRole:** `CUSTOMER | DRIVER | ADMIN`
- **SubscriptionState:** `NEW | ACTIVE | PAUSED | EXPIRED`
- **PlanType:** `TRY_IT | WEEKLY | MONTHLY | QUARTERLY`
- **DeliveryStatus:** `SCHEDULED | SKIPPED | OUT_FOR_DELIVERY | DELIVERED | ISSUE`
- **IssueCategory:** `DAMAGED | MISSING | WRONG`

### Entity Interfaces
- **Plan:** Core configuration for prices/skips.
- **User:** profile, phone, role, wallet.
- **Address:** building, floor, desk info.
- **Subscription:** plan link, state, dates.
- **Meal:** macros, salad flag, photo.
- **Delivery:** status, driver link, lat/long capture.
- **AuditLog:** logs for skips/pauses/status changes.

---

## Phase 3 — Auth

- **OTP:** WhatsApp primary, SMS fallback.
- **Rate Limit:** 3 attempts per 10 mins (strict).
- **JWT:** 15m access + 30d refresh tokens.
- **Logout:** Invalidates **current session only**.

---

## Phase 4 — User, Address & Plans

### Use Cases
- **Queries:** `GetCurrentUser`, `GetUserAddresses`, `SearchBuildings`, `GetPlans`
- **Commands:** `UpdateProfile`, `CreateAddress`, `UpdateAddress`, `DeleteAccount` (mandatory for Store compliance).

### Building Search
- **`GooglePlacesService`** with DB cache.

---

## Phase 5 — Domain Core (Crucial)

### Subscription Machine
- Handles `ACTIVE ↔ PAUSED` and `ACTIVE → EXPIRED`.
- **Renewals:** Prorated cost math + wallet credit offsets.

### 6 PM Lock
- Redis-based freezing of **Skip**, **Switch Meal**, and **Toggle Salad**.
- **Undo Window:** Only allowed within a configurable timeframe.

### Delivery
- **GPS Capture:** Capture Driver lat/long on delivery update.
- **Audit Trail:** Log all mutations to deliveries/subscriptions.

---

## Phase 6 — Payments & Alerts

- **Payments:** Webhook-based (Telr/Tap).
- **Wallet:** Atomic ledger to prevent race conditions.
- **Referral:** Credit referrer only after referee's **first payment**.

---

## Phase 7 — Admin & Ops

- **Admin Control:** Live meal counters, plan pricing CRUD, User management.
- **Ops Tools:** PDF Label batching (100x60mm) and Driver CSV exports.

---

## Verification

### Automated
- Unit tests for proration math and state transitions.
- Integration tests for Redis lock and wallet concurrency.

### Manual
- Physical thermal printer test for labels.
- Verify GPS capture on mobile/API interaction.

---

*Last updated: April 20, 2025*
*Implementation start: pending project approval (~April 26, 2025)*
