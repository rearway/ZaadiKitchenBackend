#!/usr/bin/env bash
# Creates (or updates) an EventBridge schedule that POSTs
#   /internal/jobs/expire-subscriptions
# every day at 00:05 Asia/Riyadh (21:05 UTC).
#
# Prerequisites:
#   - aws CLI configured for the ZaadiKitchen account (ap-south-1)
#   - INTERNAL_JOB_SECRET already set on the ECS task (same value you pass here)
#
# Usage:
#   export API_BASE_URL=https://devapi.zaadikitchen.com   # or https://api.zaadikitchen.com
#   export INTERNAL_JOB_SECRET='your-strong-secret'
#   ./scripts/setup-expire-subscriptions-eventbridge.sh
#
# Optional:
#   ENV_NAME=dev|prod   (default: derived from API_BASE_URL)
#   AWS_REGION=ap-south-1
#   SCHEDULE_CRON='cron(5 21 * * ? *)'   # 00:05 KSA

set -euo pipefail

AWS_REGION="${AWS_REGION:-ap-south-1}"
API_BASE_URL="${API_BASE_URL:-}"
INTERNAL_JOB_SECRET="${INTERNAL_JOB_SECRET:-}"
SCHEDULE_CRON="${SCHEDULE_CRON:-cron(5 21 * * ? *)}"

if [[ -z "$API_BASE_URL" || -z "$INTERNAL_JOB_SECRET" ]]; then
  echo "Set API_BASE_URL and INTERNAL_JOB_SECRET." >&2
  echo "Example:" >&2
  echo "  export API_BASE_URL=https://devapi.zaadikitchen.com" >&2
  echo "  export INTERNAL_JOB_SECRET='...same as ECS INTERNAL_JOB_SECRET...'" >&2
  exit 1
fi

API_BASE_URL="${API_BASE_URL%/}"
INVOKE_URL="${API_BASE_URL}/internal/jobs/expire-subscriptions"

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

PREFIX="zaadikitchen-${ENV_NAME}-expire-subscriptions"
CONNECTION_NAME="${PREFIX}-connection"
DESTINATION_NAME="${PREFIX}-destination"
RULE_NAME="${PREFIX}-daily"
ROLE_NAME="${PREFIX}-invoke-role"
POLICY_NAME="${PREFIX}-invoke-policy"

echo "Region:      ${AWS_REGION}"
echo "Env:         ${ENV_NAME}"
echo "Invoke URL:  ${INVOKE_URL}"
echo "Schedule:    ${SCHEDULE_CRON} (00:05 Asia/Riyadh)"
echo ""

ACCOUNT_ID=$(aws sts get-caller-identity --query Account --output text --region "$AWS_REGION")
echo "AWS account: ${ACCOUNT_ID}"

echo "Creating / updating EventBridge connection (API key header)..."
CONN_ARN=$(aws events describe-connection --name "$CONNECTION_NAME" --region "$AWS_REGION" \
  --query 'ConnectionArn' --output text 2>/dev/null || true)

if [[ -z "$CONN_ARN" || "$CONN_ARN" == "None" ]]; then
  CONN_ARN=$(aws events create-connection \
    --name "$CONNECTION_NAME" \
    --authorization-type API_KEY \
    --auth-parameters "ApiKeyAuthParameters={ApiKeyName=x-internal-secret,ApiKeyValue=${INTERNAL_JOB_SECRET}}" \
    --region "$AWS_REGION" \
    --query 'ConnectionArn' --output text)
  echo "Created connection: $CONN_ARN"
else
  aws events update-connection \
    --name "$CONNECTION_NAME" \
    --authorization-type API_KEY \
    --auth-parameters "ApiKeyAuthParameters={ApiKeyName=x-internal-secret,ApiKeyValue=${INTERNAL_JOB_SECRET}}" \
    --region "$AWS_REGION" >/dev/null
  echo "Updated connection: $CONN_ARN"
fi

echo "Creating / updating API destination..."
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
  echo "Created destination: $DEST_ARN"
else
  aws events update-api-destination \
    --name "$DESTINATION_NAME" \
    --connection-arn "$CONN_ARN" \
    --invocation-endpoint "$ENDPOINT_ARG" \
    --http-method POST \
    --invocation-rate-limit-per-second 1 \
    --region "$AWS_REGION" >/dev/null
  echo "Updated destination: $DEST_ARN"
fi

echo "Ensuring IAM role can invoke the API destination..."
ROLE_ARN=$(aws iam get-role --role-name "$ROLE_NAME" --query 'Role.Arn' --output text 2>/dev/null || true)
TRUST=$(cat <<EOF
{
  "Version": "2012-10-17",
  "Statement": [{
    "Effect": "Allow",
    "Principal": { "Service": "events.amazonaws.com" },
    "Action": "sts:AssumeRole"
  }]
}
EOF
)

if [[ -z "$ROLE_ARN" || "$ROLE_ARN" == "None" ]]; then
  ROLE_ARN=$(aws iam create-role \
    --role-name "$ROLE_NAME" \
    --assume-role-policy-document "$TRUST" \
    --query 'Role.Arn' --output text)
  echo "Created role: $ROLE_ARN"
  # IAM eventual consistency
  sleep 8
else
  echo "Using existing role: $ROLE_ARN"
fi

POLICY=$(cat <<EOF
{
  "Version": "2012-10-17",
  "Statement": [{
    "Effect": "Allow",
    "Action": ["events:InvokeApiDestination"],
    "Resource": "${DEST_ARN}"
  }]
}
EOF
)
aws iam put-role-policy \
  --role-name "$ROLE_NAME" \
  --policy-name "$POLICY_NAME" \
  --policy-document "$POLICY" >/dev/null

echo "Creating / updating schedule rule..."
aws events put-rule \
  --name "$RULE_NAME" \
  --schedule-expression "$SCHEDULE_CRON" \
  --state ENABLED \
  --description "Expire ZaadiKitchen (${ENV_NAME}) subscriptions past end_date (00:05 KSA)" \
  --region "$AWS_REGION" >/dev/null

# Replace targets for this rule
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

echo ""
echo "Done."
echo "Rule:        ${RULE_NAME}"
echo "Destination: ${DEST_ARN}"
echo ""
echo "Manual smoke test (run now, do not wait for cron):"
echo "  curl -sS -X POST '${INVOKE_URL}' \\"
echo "    -H 'Content-Type: application/json' \\"
echo "    -H 'x-internal-secret: \$INTERNAL_JOB_SECRET' \\"
echo "    -d '{}'"
echo ""
echo "Expected: {\"expired_count\":N,\"as_of_date\":\"YYYY-MM-DD\"}"
echo "Then re-check GET /api/v1/subscriptions/me for the stale user (should 404 or show expired via home)."
