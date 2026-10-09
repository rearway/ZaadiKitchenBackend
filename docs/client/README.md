# Zaadi Kitchen Backend — Client Documentation Pack

**Product:** Zaadi Kitchen (meal subscription, office delivery, KSA)  
**API version:** `v1`  
**Last updated:** October 2026  
**Audience:** Client stakeholders, mobile/web integrators, QA, and solution architects

---

## What is in this pack

| Document | Purpose |
|----------|---------|
| [DATABASE_DESIGN.md](./DATABASE_DESIGN.md) | PostgreSQL schema, entity relationships, ER diagrams, table dictionary |
| [API_REFERENCE.md](./API_REFERENCE.md) | REST API catalog, authentication, roles, environments, error format |
| [ERP_INTEGRATION.md](./ERP_INTEGRATION.md) | ERP / Platio integration (API key, 4 read endpoints) |
| [MEAL_OPTIONS_PROPOSAL.md](./MEAL_OPTIONS_PROPOSAL.md) | **Proposal:** up to 3 Executive + 3 Salad per day, admin default, customer meal selection (UI/API plan + impact + effort) |
| [PLAN_PROMOTION.md](./PLAN_PROMOTION.md) | Plan upgrade tiers, checkout credit, delivery anchor rules |
| [SKIP_PAUSE_FLEX.md](./SKIP_PAUSE_FLEX.md) | Shared skip/pause allowance, day flags, pause schedule/cancel/resume |

---

## Environments

| Environment | Base URL (API) | Notes |
|-------------|----------------|-------|
| Development | `https://devapi.zaadikitchen.com/api/v1` | Primary integration target |
| Production | `https://api.zaadikitchen.com/api/v1` | Confirm with ops before go-live |

**Health check (no prefix):** `GET /health` on the API host root (e.g. `https://devapi.zaadikitchen.com/health`).

**Interactive API explorer (when deployed):** `GET /api` — Swagger UI generated from the NestJS application.

---

## Postman collections (repo root)

Use these for hands-on testing; they track the live route map:

- `Zaadi_Kitchen_Mobile_App.postman_collection.json` — customer app
- `Zaadi_Kitchen_Admin_Portal.postman_collection.json` — admin & ops
- `Zaadi_Kitchen_API.postman_collection.json` — combined
- `Zaadi_Kitchen_ERP_Integration.postman_collection.json` — ERP / Platio (API key only)

Set collection variables `base_url` to `https://devapi.zaadikitchen.com/api/v1` (no trailing slash).

---

## Deeper internal docs (engineering)

These complement the client pack but are more implementation-oriented:

- `docs/UI_API_FLOW_GUIDE.md` — screen-by-screen flows
- `docs/api_docs_auth.md` — detailed onboarding/auth payloads
- `docs/zaadi-kitchen-admin-api-docs.md` — admin portal deep dive
- `docs/PAYMENT_INTEGRATION_HANDOVER.md` — payment gateway
- `docs/COMMS_API.md` — push automations & broadcast
- `docs/ACCOUNT_DELETION.md` — account deletion (App Store compliance)

---

## Technology summary

| Layer | Choice |
|-------|--------|
| Runtime | Node.js, NestJS |
| Database | PostgreSQL (Sequelize ORM, migrations in `src/infrastructure/SequelizePersistence/migrations/`) |
| Auth | JWT access + refresh tokens; OTP for customers; email/password for admin |
| Storage | AWS S3 (meal photos) |
| Push | AWS SNS (device registration via `user_devices`) |

---

## Contact & change control

API and schema changes are versioned in this repository. Client teams should rely on this `docs/client/` pack and Postman collections for integration contracts; breaking changes should be announced with migration notes in release notes.
