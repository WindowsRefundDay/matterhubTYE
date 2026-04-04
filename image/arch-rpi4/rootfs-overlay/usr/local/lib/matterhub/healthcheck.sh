#!/usr/bin/env bash

set -euo pipefail

STATE_ROOT="${MATTERHUB_STATE_ROOT:-/var/lib/matterhub}"
BOOT_MODE_FILE="/run/matterhub/boot-mode.env"
BOOTSTRAP_STATUS_FILE="$STATE_ROOT/runtime/bootstrapd-status.env"
PROVISIONING_STATE_FILE="$STATE_ROOT/provisioning/state.env"
HA_TOKEN_FILE="$STATE_ROOT/secrets/ha.token"
SERVICES=(
  matterhub-bootstrapd.service
  matterhub-firstboot.service
  matterhub.service
  homeassistant.service
  matterhub-kiosk.service
)

emit_kv() {
  printf '%s=%s\n' "$1" "$2"
}

read_env_value() {
  local file="$1"
  local key="$2"
  if [[ -f "$file" ]]; then
    awk -F= -v key="$key" '$1 == key { print substr($0, index($0, "=") + 1) }' "$file" | tail -n 1
  fi
}

service_state() {
  local service="$1"
  if command -v systemctl >/dev/null 2>&1; then
    systemctl is-active "$service" 2>/dev/null || true
  else
    printf 'unknown'
  fi
}

emit_kv matterhub_boot_mode "$(read_env_value "$BOOT_MODE_FILE" MATTERHUB_BOOT_MODE)"
emit_kv matterhub_boot_reason "$(read_env_value "$BOOT_MODE_FILE" MATTERHUB_BOOT_REASON)"
emit_kv bootstrapd_ready "$(read_env_value "$BOOTSTRAP_STATUS_FILE" BOOTSTRAPD_READY)"
emit_kv provisioning_state "$(read_env_value "$PROVISIONING_STATE_FILE" PROVISIONING_STATE)"

if [[ -f "$HA_TOKEN_FILE" ]]; then
  emit_kv ha_token_present yes
else
  emit_kv ha_token_present no
fi

for service in "${SERVICES[@]}"; do
  emit_kv "service_${service//[^A-Za-z0-9]/_}" "$(service_state "$service")"
done
