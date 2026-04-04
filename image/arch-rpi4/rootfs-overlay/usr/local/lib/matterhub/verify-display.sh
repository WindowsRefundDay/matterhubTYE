#!/usr/bin/env bash

set -euo pipefail

DRM_ROOT="${DRM_ROOT:-/sys/class/drm}"
INPUT_ROOT="${INPUT_ROOT:-/dev/input/by-path}"

connected_connector_count() {
  local connector
  local count=0
  shopt -s nullglob
  for connector in "$DRM_ROOT"/*/status; do
    if [[ "$(tr -d '\n' < "$connector" 2>/dev/null)" == "connected" ]]; then
      count=$((count + 1))
    fi
  done
  printf '%s' "$count"
}

touch_device_count() {
  local input
  local count=0
  shopt -s nullglob
  for input in "$INPUT_ROOT"/*event*; do
    count=$((count + 1))
  done
  printf '%s' "$count"
}

connectors="$(connected_connector_count)"
touch_inputs="$(touch_device_count)"

if [[ "$connectors" -lt 1 ]]; then
  printf 'display validation failed: no connected DRM connector under %s\n' "$DRM_ROOT" >&2
  exit 1
fi

if [[ "$touch_inputs" -lt 1 ]]; then
  printf 'display validation failed: no touch input under %s\n' "$INPUT_ROOT" >&2
  exit 1
fi

printf 'display validation passed: connectors=%s touch_inputs=%s\n' "$connectors" "$touch_inputs"
