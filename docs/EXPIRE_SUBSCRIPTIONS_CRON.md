# Expire subscriptions cron (EventBridge)

## What it does

`POST /internal/jobs/expire-subscriptions` (no `/api/v1` prefix) sets

`status = expired`

on every subscription that is still `active`, `paused`, or `cancelled` with

`end_date < today (Asia/Riyadh)`.

Auth header:

```http
x-internal-secret: <INTERNAL_JOB_SECRET>
```

Optional body: `{ "as_of_date": "YYYY-MM-DD" }` (defaults to today KSA).

If this job never runs, plans past `end_date` keep showing as `active` (the bug you hit).

---

## 1. Put the secret on ECS (required)

The API rejects the job with **401** unless `INTERNAL_JOB_SECRET` is set on the running task.

1. Generate a strong value (once per env):

```bash
openssl rand -hex 32
```

2. Add / update env on the ECS task definition (dev and prod):

```env
INTERNAL_JOB_SECRET=<that value>
```

3. Redeploy the service so new tasks pick it up.

Local `.env` should match if you want to hit a local server:

```env
INTERNAL_JOB_SECRET=<same value>
```

---

## 2. Run it once now (fix the backlog)

```bash
export API_BASE_URL=https://devapi.zaadikitchen.com   # or https://api.zaadikitchen.com
export INTERNAL_JOB_SECRET='...'                      # must match ECS

curl -sS -X POST "${API_BASE_URL}/internal/jobs/expire-subscriptions" \
  -H "Content-Type: application/json" \
  -H "x-internal-secret: ${INTERNAL_JOB_SECRET}" \
  -d '{}'
```

Success looks like:

```json
{ "expired_count": 12, "as_of_date": "2026-11-09" }
```

Then open the app again for the stale user: `GET /subscriptions/me` should no longer return that past-dated `active` plan.

---

## 3. Schedule daily via EventBridge (script)

From repo root (AWS CLI logged into the ZaadiKitchen account, region `ap-south-1`):

```bash
export API_BASE_URL=https://devapi.zaadikitchen.com
export INTERNAL_JOB_SECRET='...'   # same as ECS
export AWS_CLI_FOLLOW_URLPARAM=false   # required: otherwise CLI GETs the job URL and gets 404
chmod +x scripts/setup-expire-subscriptions-eventbridge.sh
./scripts/setup-expire-subscriptions-eventbridge.sh
```

The setup scripts set `AWS_CLI_FOLLOW_URLPARAM=false` themselves. Re-run after a failed create — the connection may already exist.

Repeat for production with `API_BASE_URL=https://api.zaadikitchen.com`.

The script creates:

| Resource | Purpose |
|----------|---------|
| EventBridge **connection** | Sends header `x-internal-secret` |
| **API destination** | `POST …/internal/jobs/expire-subscriptions` |
| IAM role | Allows EventBridge to invoke the destination |
| Rule | `cron(5 21 * * ? *)` = **00:05 Asia/Riyadh** daily |

Console path if you prefer UI: **Amazon EventBridge → API destinations → Connections / Destinations → Rules**.

---

## 4. Pause status sync (same secret)

`POST /internal/jobs/sync-pause-statuses`

- `active` → `paused` when `paused_from`/`paused_until` exist and the pause-start cutoff has passed (18:00 KSA day before `paused_from`).
- After `paused_until`, clears pause fields and sets `paused` → `active` (natural end; no flex refund).

Run **at least daily after 18:00 KSA** (e.g. `cron(5 15 * * ? *)` = 18:05 KSA), or hourly.

```bash
curl -sS -X POST "${API_BASE_URL}/internal/jobs/sync-pause-statuses" \
  -H "Content-Type: application/json" \
  -H "x-internal-secret: ${INTERNAL_JOB_SECRET}" \
  -d '{}'
```

Response: `{ paused_count, completed_count, scanned_count, as_of_date }`.

Setup twin EventBridge rule:

```bash
export JOB_PATH=/internal/jobs/sync-pause-statuses
export RULE_SUFFIX=sync-pause-statuses
export SCHEDULE_CRON='cron(5 15 * * ? *)'   # 18:05 KSA
# reuse connection from expire setup, or run a second destination against the same secret
```

Console: duplicate the expire API destination with the path above and schedule at 18:05 KSA.

## 5. Also schedule (recommended)

Same secret/header pattern:

```text
POST /internal/jobs/sync-pending-payments
```

Use a separate rule (e.g. every 15 minutes) so paid Moyasar rows that missed the webhook still create subscriptions.

---

## 6. Verify the schedule

```bash
aws events list-rules --region ap-south-1 --name-prefix zaadikitchen-
aws events list-targets-by-rule --region ap-south-1 \
  --rule zaadikitchen-dev-expire-subscriptions-daily
```

After the first night, CloudWatch → EventBridge metrics / API destination invocations should show successes. A 401 means ECS secret ≠ connection secret.
