#!/usr/bin/env bash

set -euo pipefail

STATE_ROOT="${MATTERHUB_STATE_ROOT:-/var/lib/matterhub}"
BOOT_FLAG_DIR="${MATTERHUB_BOOT_FLAG_DIR:-/boot/matterhub}"
MODE_ENV_FILE="/run/matterhub/boot-mode.env"
MODE_MARKER_DIR="$STATE_ROOT/runtime"
PROVISIONING_STATE_FILE="$STATE_ROOT/provisioning/state.env"
PROVISIONED_MARKER="$STATE_ROOT/provisioning/provisioned"
DISPLAY_CHECK="${MATTERHUB_DISPLAY_CHECK:-/usr/local/lib/matterhub/verify-display.sh}"

mkdir -p "$(dirname "$MODE_ENV_FILE")" "$MODE_MARKER_DIR"
rm -f /run/matterhub/maintenance-mode

mode="kiosk"
reason="provisioned"

if [[ -f "$BOOT_FLAG_DIR/force-maintenance" ]]; then
  mode="maintenance"
  reason="boot-flag"
elif ! "$DISPLAY_CHECK"; then
  mode="maintenance"
  reason="display-verification-failed"
elif [[ ! -f "$PROVISIONED_MARKER" ]]; then
  mode="setup"
  reason="unprovisioned"
elif [[ -f "$PROVISIONING_STATE_FILE" ]] && grep -Fq 'PROVISIONING_STATE=paired' "$PROVISIONING_STATE_FILE"; then
  mode="kiosk"
  reason="paired"
fi

cat > "$MODE_ENV_FILE" <<EOF
MATTERHUB_BOOT_MODE=$mode
MATTERHUB_BOOT_REASON=$reason
MATTERHUB_BOOT_UPDATED_AT=$(date -u +%Y-%m-%dT%H:%M:%SZ)
EOF

cp "$MODE_ENV_FILE" "$MODE_MARKER_DIR/boot-mode.env"

if [[ "$mode" == "maintenance" ]]; then
  touch /run/matterhub/maintenance-mode
  systemctl --no-block isolate matterhub-maintenance.target
fi
