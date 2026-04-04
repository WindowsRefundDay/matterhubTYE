#!/usr/bin/env bash

set -euo pipefail

PROFILE="hosyond-5-dsi"
REPO_ROOT=""
STAGED_ROOT=""

usage() {
  cat <<'EOF'
Usage: verify-layout.sh [options]

Options:
  --repo-root <path>    Verify required repo-side image files
  --staged-root <path>  Verify required staged rootfs paths
  --profile <name>      Display profile name (default: hosyond-5-dsi)
  -h, --help            Show this help
EOF
}

fail() {
  printf 'FAIL: %s\n' "$*" >&2
  exit 1
}

pass() {
  printf 'PASS: %s\n' "$*"
}

require_file() {
  local path="$1"
  [[ -f "$path" ]] || fail "missing file: $path"
  pass "found file $path"
}

require_dir() {
  local path="$1"
  [[ -d "$path" ]] || fail "missing directory: $path"
  pass "found directory $path"
}

require_package() {
  local manifest="$1"
  local package_name="$2"
  grep -Fxq "$package_name" "$manifest" || fail "package manifest missing entry: $package_name"
  pass "package manifest includes $package_name"
}

while [[ $# -gt 0 ]]; do
  case "$1" in
    --repo-root)
      REPO_ROOT="$2"
      shift 2
      ;;
    --staged-root)
      STAGED_ROOT="$2"
      shift 2
      ;;
    --profile)
      PROFILE="$2"
      shift 2
      ;;
    -h|--help)
      usage
      exit 0
      ;;
    *)
      fail "unknown argument: $1"
      ;;
  esac
done

[[ -n "$REPO_ROOT" || -n "$STAGED_ROOT" ]] || fail "specify --repo-root and/or --staged-root"

if [[ -n "$REPO_ROOT" ]]; then
  manifest="$REPO_ROOT/image/arch-rpi4/packages/pacman-packages.txt"
  require_file "$REPO_ROOT/image/arch-rpi4/build-image.sh"
  require_file "$REPO_ROOT/image/arch-rpi4/README.md"
  require_file "$REPO_ROOT/image/arch-rpi4/profiles/$PROFILE/boot/config.txt.fragment"
  require_file "$REPO_ROOT/image/arch-rpi4/profiles/$PROFILE/README.md"
  require_file "$manifest"
  require_file "$REPO_ROOT/image/arch-rpi4/rootfs-overlay/usr/local/lib/matterhub/bootstrapd.sh"
  require_file "$REPO_ROOT/image/arch-rpi4/rootfs-overlay/usr/local/lib/matterhub/firstboot-mode.sh"
  require_file "$REPO_ROOT/image/arch-rpi4/rootfs-overlay/usr/local/lib/matterhub/verify-display.sh"
  require_file "$REPO_ROOT/image/arch-rpi4/rootfs-overlay/usr/local/lib/matterhub/healthcheck.sh"
  require_file "$REPO_ROOT/image/arch-rpi4/rootfs-overlay/usr/lib/systemd/system/matterhub.service"
  require_file "$REPO_ROOT/image/arch-rpi4/rootfs-overlay/usr/lib/systemd/system/matterhub-kiosk.service"
  require_file "$REPO_ROOT/image/arch-rpi4/rootfs-overlay/usr/lib/systemd/system/matterhub-firstboot.service"
  require_file "$REPO_ROOT/image/arch-rpi4/rootfs-overlay/usr/lib/systemd/system/matterhub-bootstrapd.service"
  require_file "$REPO_ROOT/image/arch-rpi4/rootfs-overlay/usr/lib/systemd/system/homeassistant.service"
  require_file "$REPO_ROOT/image/arch-rpi4/rootfs-overlay/opt/matterhub/compose/homeassistant-compose.yml"
  require_package "$manifest" "docker"
  require_package "$manifest" "nodejs"
  require_package "$manifest" "iwd"
  require_package "$manifest" "chromium"
fi

if [[ -n "$STAGED_ROOT" ]]; then
  require_dir "$STAGED_ROOT/opt/matterhub"
  require_file "$STAGED_ROOT/opt/matterhub/server.js"
  require_dir "$STAGED_ROOT/opt/matterhub/.next/static"
  require_dir "$STAGED_ROOT/opt/matterhub/public"
  require_file "$STAGED_ROOT/usr/share/matterhub/packages/pacman-packages.txt"
  require_file "$STAGED_ROOT/usr/share/matterhub/profiles/$PROFILE/config.txt.fragment"
  require_file "$STAGED_ROOT/usr/local/lib/matterhub/bootstrapd.sh"
  require_file "$STAGED_ROOT/usr/local/lib/matterhub/firstboot-mode.sh"
  require_file "$STAGED_ROOT/usr/local/lib/matterhub/verify-display.sh"
  require_file "$STAGED_ROOT/usr/local/lib/matterhub/healthcheck.sh"
fi
