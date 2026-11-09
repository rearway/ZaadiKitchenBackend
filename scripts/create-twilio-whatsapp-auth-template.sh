#!/usr/bin/env bash
# Creates a WhatsApp Authentication content template in Twilio and submits it for Meta approval.
# No jq required — only curl and bash.
#
# Usage (from repo root):
#   export TWILIO_ACCOUNT_SID=AC...
#   export TWILIO_AUTH_TOKEN=...
#   ./scripts/create-twilio-whatsapp-auth-template.sh
#
# Submit approval only (template already exists in Content API):
#   export CONTENT_SID=HX...
#   ./scripts/create-twilio-whatsapp-auth-template.sh --approval-only
#
# Optional: TEMPLATE_NAME=platio_kitchen_login_otp TEMPLATE_LANG=en EXPIRY_MINUTES=2

set -euo pipefail

TEMPLATE_NAME="${TEMPLATE_NAME:-platio_kitchen_login_otp}"
TEMPLATE_LANG="${TEMPLATE_LANG:-en}"
EXPIRY_MINUTES="${EXPIRY_MINUTES:-2}"
COPY_LABEL="${COPY_LABEL:-Copy code}"
CONTENT_SID="${CONTENT_SID:-}"
APPROVAL_ONLY=false

for arg in "$@"; do
  case "$arg" in
    --approval-only) APPROVAL_ONLY=true ;;
    -h | --help)
      sed -n '2,14p' "$0"
      exit 0
      ;;
    *)
      echo "Unknown option: $arg (use --approval-only)" >&2
      exit 1
      ;;
  esac
done

json_escape() {
  local s=$1
  s=${s//\\/\\\\}
  s=${s//\"/\\\"}
  printf '%s' "$s"
}

extract_json_string() {
  local key=$1
  local json=$2
  printf '%s' "$json" | grep -oE "\"${key}\"[[:space:]]*:[[:space:]]*\"[^\"]*\"" | head -1 | sed 's/.*:"\([^"]*\)"$/\1/'
}

twilio_curl() {
  local method=$1
  local url=$2
  local data=${3:-}
  local tmp_body http_code body
  tmp_body=$(mktemp)
  if [[ -n "$data" ]]; then
    http_code=$(curl -sS -o "$tmp_body" -w "%{http_code}" -u "${TWILIO_ACCOUNT_SID}:${TWILIO_AUTH_TOKEN}" \
      -H "Content-Type: application/json" \
      -X "$method" "$url" \
      -d "$data")
  else
    http_code=$(curl -sS -o "$tmp_body" -w "%{http_code}" -u "${TWILIO_ACCOUNT_SID}:${TWILIO_AUTH_TOKEN}" \
      -X "$method" "$url")
  fi
  body=$(cat "$tmp_body")
  rm -f "$tmp_body"
  printf '%s\n' "$http_code"
  printf '%s' "$body"
}

if [[ -z "${TWILIO_ACCOUNT_SID:-}" || -z "${TWILIO_AUTH_TOKEN:-}" ]]; then
  echo "Set TWILIO_ACCOUNT_SID and TWILIO_AUTH_TOKEN (or source .env)." >&2
  exit 1
fi

if ! [[ "$TEMPLATE_NAME" =~ ^[a-z0-9_]+$ ]]; then
  echo "TEMPLATE_NAME must be lowercase letters, digits, and underscores only (WhatsApp approval name rules)." >&2
  exit 1
fi

if ! [[ "$EXPIRY_MINUTES" =~ ^[0-9]+$ ]] || ((EXPIRY_MINUTES < 1 || EXPIRY_MINUTES > 90)); then
  echo "EXPIRY_MINUTES must be an integer from 1 to 90." >&2
  exit 1
fi

submit_whatsapp_approval() {
  local sid=$1
  local name=$2
  local url="https://content.twilio.com/v1/Content/${sid}/ApprovalRequests/whatsapp"
  local payload
  payload=$(printf '{"name":"%s","category":"AUTHENTICATION"}' "$(json_escape "$name")")

  echo "Submitting for WhatsApp approval (POST)..."
  local combined http_code resp
  combined=$(twilio_curl POST "$url" "$payload")
  http_code=$(printf '%s' "$combined" | head -1)
  resp=$(printf '%s' "$combined" | tail -n +2)

  if [[ "$http_code" =~ ^2 ]]; then
    echo "Approval submit HTTP $http_code:"
    echo "$resp"
    return 0
  fi

  echo "Approval POST failed (HTTP $http_code). Response:" >&2
  echo "$resp" >&2

  if [[ "$http_code" == "409" ]] || echo "$resp" | grep -qi 'already'; then
    echo "Trying PUT to update/resubmit approval request..." >&2
    combined=$(twilio_curl PUT "$url" "$payload")
    http_code=$(printf '%s' "$combined" | head -1)
    resp=$(printf '%s' "$combined" | tail -n +2)
    if [[ "$http_code" =~ ^2 ]]; then
      echo "Approval PUT HTTP $http_code:"
      echo "$resp"
      return 0
    fi
    echo "Approval PUT failed (HTTP $http_code):" >&2
    echo "$resp" >&2
  fi

  return 1
}

fetch_approval_status() {
  local sid=$1
  local url="https://content.twilio.com/v1/Content/${sid}/ApprovalRequests"
  local combined http_code resp
  combined=$(twilio_curl GET "$url")
  http_code=$(printf '%s' "$combined" | head -1)
  resp=$(printf '%s' "$combined" | tail -n +2)
  if [[ ! "$http_code" =~ ^2 ]]; then
    echo "Could not fetch approval status (HTTP $http_code):" >&2
    echo "$resp" >&2
    return 1
  fi
  echo "Current WhatsApp approval (GET):"
  echo "$resp"
  local wa_status
  wa_status=$(extract_json_string status "$resp")
  if [[ -z "$wa_status" ]]; then
    echo ""
    echo "No whatsapp.status in response — approval was never submitted." >&2
    echo "In Console: open the template → Submit for WhatsApp approval (category Authentication)." >&2
    return 1
  fi
  echo ""
  echo "WhatsApp status: $wa_status"
}

if [[ "$APPROVAL_ONLY" == true ]]; then
  if [[ -z "$CONTENT_SID" ]]; then
    echo "Set CONTENT_SID=HX... for --approval-only." >&2
    exit 1
  fi
  submit_whatsapp_approval "$CONTENT_SID" "$TEMPLATE_NAME"
  fetch_approval_status "$CONTENT_SID"
  exit 0
fi

NAME_ESC=$(json_escape "$TEMPLATE_NAME")
COPY_ESC=$(json_escape "$COPY_LABEL")

PAYLOAD=$(cat <<EOF
{
  "friendly_name": "${NAME_ESC}",
  "language": "${TEMPLATE_LANG}",
  "variables": {
    "1": "1234"
  },
  "types": {
    "whatsapp/authentication": {
      "add_security_recommendation": true,
      "code_expiration_minutes": ${EXPIRY_MINUTES},
      "actions": [{ "type": "COPY_CODE", "copy_code_text": "${COPY_ESC}" }]
    }
  }
}
EOF
)

echo "Creating whatsapp/authentication content template..."
combined=$(twilio_curl POST "https://content.twilio.com/v1/Content" "$PAYLOAD")
http_code=$(printf '%s' "$combined" | head -1)
CREATE_RESP=$(printf '%s' "$combined" | tail -n +2)

if [[ ! "$http_code" =~ ^2 ]]; then
  echo "Create template failed (HTTP $http_code):" >&2
  echo "$CREATE_RESP" >&2
  exit 1
fi

CONTENT_SID=$(extract_json_string sid "$CREATE_RESP")
if [[ -z "$CONTENT_SID" ]]; then
  echo "Create succeeded but could not parse sid:" >&2
  echo "$CREATE_RESP" >&2
  exit 1
fi

echo "Created Content SID: $CONTENT_SID"

if ! submit_whatsapp_approval "$CONTENT_SID" "$TEMPLATE_NAME"; then
  echo "" >&2
  echo "Template was created ($CONTENT_SID) but WhatsApp approval was not submitted." >&2
  echo "Retry:" >&2
  echo "  export CONTENT_SID=${CONTENT_SID}" >&2
  echo "  export TEMPLATE_NAME=${TEMPLATE_NAME}" >&2
  echo "  ./scripts/create-twilio-whatsapp-auth-template.sh --approval-only" >&2
  exit 1
fi

fetch_approval_status "$CONTENT_SID"

cat <<EOF

Next steps:
1. Twilio Console → Messaging → Content Template Builder → open "${TEMPLATE_NAME}".
   WhatsApp should show Received/Pending → Approved (minutes to 48h).
2. ECS / .env:
   TWILIO_WHATSAPP_FROM=whatsapp:+966539759323
   TWILIO_WHATSAPP_CONTENT_SID=${CONTENT_SID}
   SKIP_OTP=false
3. Redeploy and test OTP with channel "whatsapp".

Backend sends ContentVariables={"1":"<4-digit-code>"}.

EOF
