#!/usr/bin/env bash

set -euo pipefail

STATE_ROOT="${MATTERHUB_STATE_ROOT:-/var/lib/matterhub}"
SECRETS_DIR="$STATE_ROOT/secrets"
PROVISIONING_DIR="$STATE_ROOT/provisioning"
BOOTSTRAP_STATUS_FILE="$STATE_ROOT/runtime/bootstrapd-status.env"
IWD_STATE_DIR="${IWD_STATE_DIR:-/var/lib/iwd}"

usage() {
  cat <<'EOF'
Usage: bootstrapd.sh <command> [args]

Commands:
  ensure-runtime
  set-wifi <ssid> <passphrase>
  set-token <token>
  set-state <state>
  status
EOF
}

sanitize_ssid() {
  printf '%s' "$1" | tr -cs 'A-Za-z0-9._-' '_'
}

ensure_runtime() {
  install -d -m 0750 "$STATE_ROOT" "$STATE_ROOT/runtime" "$PROVISIONING_DIR"
  install -d -m 0700 "$SECRETS_DIR" "$IWD_STATE_DIR"
  cat > "$BOOTSTRAP_STATUS_FILE" <<EOF
BOOTSTRAPD_READY=1
BOOTSTRAPD_UPDATED_AT=$(date -u +%Y-%m-%dT%H:%M:%SZ)
EOF
}

set_wifi() {
  local ssid="$1"
  local passphrase="$2"
  local safe_ssid
  safe_ssid="$(sanitize_ssid "$ssid")"
  install -d -m 0700 "$IWD_STATE_DIR"
  cat > "$IWD_STATE_DIR/$safe_ssid.psk" <<EOF
[Security]
PreSharedKey=$passphrase

[Settings]
AutoConnect=true

[Network]
Name=$ssid
EOF
  chmod 0600 "$IWD_STATE_DIR/$safe_ssid.psk"
}

set_token() {
  local token="$1"
  install -d -m 0700 "$SECRETS_DIR"
  printf '%s\n' "$token" > "$SECRETS_DIR/ha.token"
  chmod 0600 "$SECRETS_DIR/ha.token"
}

set_state() {
  local state="$1"
  install -d -m 0750 "$PROVISIONING_DIR"
  cat > "$PROVISIONING_DIR/state.env" <<EOF
PROVISIONING_STATE=$state
PROVISIONING_UPDATED_AT=$(date -u +%Y-%m-%dT%H:%M:%SZ)
EOF
}

status() {
  if [[ -f "$BOOTSTRAP_STATUS_FILE" ]]; then
    cat "$BOOTSTRAP_STATUS_FILE"
  else
    printf 'BOOTSTRAPD_READY=0\n'
  fi
}

main() {
  local cmd="${1:-}"
  case "$cmd" in
    ensure-runtime)
      ensure_runtime
      ;;
    set-wifi)
      [[ $# -eq 3 ]] || { usage; exit 1; }
      set_wifi "$2" "$3"
      ;;
    set-token)
      [[ $# -eq 2 ]] || { usage; exit 1; }
      set_token "$2"
      ;;
    set-state)
      [[ $# -eq 2 ]] || { usage; exit 1; }
      set_state "$2"
      ;;
    status)
      status
      ;;
    *)
      usage
      exit 1
      ;;
  esac
}

main "$@"
