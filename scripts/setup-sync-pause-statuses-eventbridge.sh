#!/usr/bin/env bash
# EventBridge daily rule → POST /internal/jobs/sync-pause-statuses
# Default schedule: 18:05 Asia/Riyadh (15:05 UTC) — just after pause-start cutoff.
#
#   export API_BASE_URL=https://devapi.zaadikitchen.com
#   export INTERNAL_JOB_SECRET='...'
#   ./scripts/setup-sync-pause-statuses-eventbridge.sh

set -euo pipefail

AWS_REGION="${AWS_REGION:-ap-south-1}"
API_BASE_URL="${API_BASE_URL:-}"
INTERNAL_JOB_SECRET="${INTERNAL_JOB_SECRET:-}"
SCHEDULE_CRON="${SCHEDULE_CRON:-cron(5 15 * * ? *)}"

if [[ -z "$API_BASE_URL" || -z "$INTERNAL_JOB_SECRET" ]]; then
  echo "Set API_BASE_URL and INTERNAL_JOB_SECRET." >&2
  exit 1
fi

API_BASE_URL="${API_BASE_URL%/}"
INVOKE_URL="${API_BASE_URL}/internal/jobs/sync-pause-statuses"

# AWS CLI v1 treats bare https:// args as remote files to GET. Pass via file:// instead.
ENDPOINT_FILE=$(mktemp)
printf '%s' "$INVOKE_URL" >"$ENDPOINT_FILE"
ENDPOINT_ARG="file://${ENDPOINT_FILE}"
trap 'rm -f "$ENDPOINT_FILE"' EXIT

if [[ -z "${ENV_NAME:-}" ]]; then
  if [[ "$API_BASE_URL" == *"devapi"* ]]; then
    ENV_NAME=dev
  else
    ENV_NAME=prod
  fi
fi

PREFIX="zaadikitchen-${ENV_NAME}-sync-pause-statuses"
CONNECTION_NAME="${PREFIX}-connection"
DESTINATION_NAME="${PREFIX}-destination"
RULE_NAME="${PREFIX}-daily"
ROLE_NAME="${PREFIX}-invoke-role"
POLICY_NAME="${PREFIX}-invoke-policy"

ACCOUNT_ID=$(aws sts get-caller-identity --query Account --output text --region "$AWS_REGION")
echo "Account ${ACCOUNT_ID} → ${INVOKE_URL} @ ${SCHEDULE_CRON}"

CONN_ARN=$(aws events describe-connection --name "$CONNECTION_NAME" --region "$AWS_REGION" \
  --query 'ConnectionArn' --output text 2>/dev/null || true)
if [[ -z "$CONN_ARN" || "$CONN_ARN" == "None" ]]; then
  CONN_ARN=$(aws events create-connection \
    --name "$CONNECTION_NAME" \
    --authorization-type API_KEY \
    --auth-parameters "ApiKeyAuthParameters={ApiKeyName=x-internal-secret,ApiKeyValue=${INTERNAL_JOB_SECRET}}" \
    --region "$AWS_REGION" \
    --query 'ConnectionArn' --output text)
else
  aws events update-connection \
    --name "$CONNECTION_NAME" \
    --authorization-type API_KEY \
    --auth-parameters "ApiKeyAuthParameters={ApiKeyName=x-internal-secret,ApiKeyValue=${INTERNAL_JOB_SECRET}}" \
    --region "$AWS_REGION" >/dev/null
fi

DEST_ARN=$(aws events describe-api-destination --name "$DESTINATION_NAME" --region "$AWS_REGION" \
  --query 'ApiDestinationArn' --output text 2>/dev/null || true)
if [[ -z "$DEST_ARN" || "$DEST_ARN" == "None" ]]; then
  DEST_ARN=$(aws events create-api-destination \
    --name "$DESTINATION_NAME" \
    --connection-arn "$CONN_ARN" \
    --invocation-endpoint "$ENDPOINT_ARG" \
    --http-method POST \
    --invocation-rate-limit-per-second 1 \
    --region "$AWS_REGION" \
    --query 'ApiDestinationArn' --output text)
else
  aws events update-api-destination \
    --name "$DESTINATION_NAME" \
    --connection-arn "$CONN_ARN" \
    --invocation-endpoint "$ENDPOINT_ARG" \
    --http-method POST \
    --invocation-rate-limit-per-second 1 \
    --region "$AWS_REGION" >/dev/null
fi

TRUST='{"Version":"2012-10-17","Statement":[{"Effect":"Allow","Principal":{"Service":"events.amazonaws.com"},"Action":"sts:AssumeRole"}]}'
ROLE_ARN=$(aws iam get-role --role-name "$ROLE_NAME" --query 'Role.Arn' --output text 2>/dev/null || true)
if [[ -z "$ROLE_ARN" || "$ROLE_ARN" == "None" ]]; then
  ROLE_ARN=$(aws iam create-role --role-name "$ROLE_NAME" --assume-role-policy-document "$TRUST" --query 'Role.Arn' --output text)
  sleep 8
fi

POLICY=$(cat <<EOF
{"Version":"2012-10-17","Statement":[{"Effect":"Allow","Action":["events:InvokeApiDestination"],"Resource":"${DEST_ARN}"}]}
EOF
)
aws iam put-role-policy --role-name "$ROLE_NAME" --policy-name "$POLICY_NAME" --policy-document "$POLICY" >/dev/null

aws events put-rule \
  --name "$RULE_NAME" \
  --schedule-expression "$SCHEDULE_CRON" \
  --state ENABLED \
  --description "Sync ZaadiKitchen (${ENV_NAME}) pause statuses after 18:00 KSA cutoff" \
  --region "$AWS_REGION" >/dev/null

TARGETS_FILE=$(mktemp)
cat >"$TARGETS_FILE" <<EOF
[
  {
    "Id": "1",
    "Arn": "${DEST_ARN}",
    "RoleArn": "${ROLE_ARN}",
    "HttpParameters": {
      "HeaderParameters": {
        "Content-Type": "application/json"
      }
    },
    "Input": "{}"
  }
]
EOF
aws events put-targets \
  --rule "$RULE_NAME" \
  --region "$AWS_REGION" \
  --targets "file://${TARGETS_FILE}" >/dev/null
rm -f "$TARGETS_FILE"

echo "Rule ${RULE_NAME} ready."
echo "Smoke test:"
echo "  curl -sS -X POST '${INVOKE_URL}' -H 'Content-Type: application/json' -H 'x-internal-secret: \$INTERNAL_JOB_SECRET' -d '{}'"
