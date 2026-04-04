#!/usr/bin/env bash
set -euo pipefail

PROFILE_NAME="${PROFILE_NAME:-hosyond-5-dsi}"
EXPECTED_MODE="${EXPECTED_MODE:-800x480}"
CONNECTOR_NAME_REGEX="${CONNECTOR_NAME_REGEX:-DSI|panel}"
TOUCH_NAME_REGEX="${TOUCH_NAME_REGEX:-touch|fts|edt-ft5x06|goodix|ili210x|raspberrypi-ts}"
DRM_ROOT="${DRM_ROOT:-/sys/class/drm}"
INPUT_ROOT="${INPUT_ROOT:-/sys/class/input}"
STATE_DIR="${STATE_DIR:-/run/matterhub/display-verification}"
SUMMARY_FILE="${SUMMARY_FILE:-${STATE_DIR}/summary.env}"

mkdir -p "${STATE_DIR}"

write_summary() {
  cat > "${SUMMARY_FILE}" <<SUMMARY
PROFILE_NAME=${PROFILE_NAME}
RESULT=$1
REASON=$2
CONNECTOR=${3:-}
MODE=${4:-}
TOUCH_DEVICE=${5:-}
SUMMARY
}

fail() {
  local reason="$1"
  write_summary "fail" "${reason}" "${2:-}" "${3:-}" "${4:-}"
  echo "matterhub-display-profile: ${reason}" >&2
  exit 1
}

find_matching_connector() {
  local connector status_file connector_name

  for connector in "${DRM_ROOT}"/card*-*; do
    [ -d "${connector}" ] || continue
    connector_name="${connector##*/}"

    if ! printf '%s' "${connector_name}" | grep -Eq "${CONNECTOR_NAME_REGEX}"; then
      continue
    fi

    status_file="${connector}/status"
    [ -f "${status_file}" ] || continue

    if [ "$(tr -d '[:space:]' < "${status_file}")" = "connected" ]; then
      printf '%s\n' "${connector}"
      return 0
    fi
  done

  return 1
}

connector="$(find_matching_connector || true)"
[ -n "${connector}" ] || fail "no_connected_connector"
connector_name="${connector##*/}"

if [ ! -f "${connector}/modes" ]; then
  fail "connector_missing_modes" "${connector_name}"
fi

connector_mode="$(grep -E "^${EXPECTED_MODE}$" "${connector}/modes" | head -n 1 || true)"
[ -n "${connector_mode}" ] || fail "mode_not_advertised" "${connector_name}"

touch_device=""
for input_name_file in "${INPUT_ROOT}"/event*/device/name; do
  [ -f "${input_name_file}" ] || continue
  if grep -Eiq "${TOUCH_NAME_REGEX}" "${input_name_file}"; then
    touch_device="$(cat "${input_name_file}")"
    break
  fi
done

[ -n "${touch_device}" ] || fail "touch_not_detected" "${connector_name}" "${connector_mode}"

write_summary "pass" "ok" "${connector_name}" "${connector_mode}" "${touch_device}"
echo "matterhub-display-profile: ${connector_name} ${connector_mode} ${touch_device}"
