#!/usr/bin/env bash

set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
REPO_ROOT="$(cd "$SCRIPT_DIR/../.." && pwd)"
OVERLAY_DIR="$SCRIPT_DIR/rootfs-overlay"
PACKAGES_FILE="$SCRIPT_DIR/packages/pacman-packages.txt"
VERIFY_SCRIPT="$SCRIPT_DIR/verify-layout.sh"
DEFAULT_PROFILE="hosyond-5-dsi"
DEFAULT_IMAGE_SIZE_GB=6
DEFAULT_TARBALL_URL="https://os.archlinuxarm.org/os/ArchLinuxARM-rpi-aarch64-latest.tar.gz"

ARCHIVE_URL="$DEFAULT_TARBALL_URL"
APP_DIR="$REPO_ROOT"
OUTPUT_DIR="$REPO_ROOT/dist/image"
WORK_DIR="$REPO_ROOT/.tmp/image/arch-rpi4"
IMAGE_NAME="matterhub-arch-rpi4"
IMAGE_SIZE_GB="$DEFAULT_IMAGE_SIZE_GB"
PROFILE="$DEFAULT_PROFILE"
SKIP_COMPRESS=0
DRY_RUN=0

usage() {
  cat <<'EOF'
Usage: build-image.sh [options]

Options:
  --app-dir <path>          Repo/app directory containing the Next standalone output
  --output-dir <path>       Output directory for the generated image artifacts
  --work-dir <path>         Temporary working directory
  --image-name <name>       Base name for the generated image (default: matterhub-arch-rpi4)
  --image-size-gb <size>    Sparse image size in GiB (default: 6)
  --profile <name>          Display profile under profiles/ (default: hosyond-5-dsi)
  --arch-arm-tarball <path> Local Arch Linux ARM rootfs archive to use
  --arch-arm-url <url>      Override the Arch Linux ARM rootfs download URL
  --skip-compress           Skip xz compression for the final raw image
  --dry-run                 Print actions without mutating disk images
  -h, --help                Show this help
EOF
}

log() {
  printf '[build-image] %s\n' "$*"
}

fail() {
  printf 'error: %s\n' "$*" >&2
  exit 1
}

run() {
  if (( DRY_RUN )); then
    printf '[dry-run] %s\n' "$*"
  else
    "$@"
  fi
}

require_cmd() {
  command -v "$1" >/dev/null 2>&1 || fail "missing required command: $1"
}

ensure_linux() {
  [[ "$(uname -s)" == "Linux" ]] || fail "image builder must run on Linux"
}

ensure_root() {
  if (( DRY_RUN )); then
    return 0
  fi

  [[ "$(id -u)" -eq 0 ]] || fail "image build must run as root (or under sudo)"
}

TARBALL_PATH=""

while [[ $# -gt 0 ]]; do
  case "$1" in
    --app-dir)
      APP_DIR="$2"
      shift 2
      ;;
    --output-dir)
      OUTPUT_DIR="$2"
      shift 2
      ;;
    --work-dir)
      WORK_DIR="$2"
      shift 2
      ;;
    --image-name)
      IMAGE_NAME="$2"
      shift 2
      ;;
    --image-size-gb)
      IMAGE_SIZE_GB="$2"
      shift 2
      ;;
    --profile)
      PROFILE="$2"
      shift 2
      ;;
    --arch-arm-tarball)
      TARBALL_PATH="$2"
      shift 2
      ;;
    --arch-arm-url)
      ARCHIVE_URL="$2"
      shift 2
      ;;
    --skip-compress)
      SKIP_COMPRESS=1
      shift
      ;;
    --dry-run)
      DRY_RUN=1
      shift
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

PROFILE_DIR="$SCRIPT_DIR/profiles/$PROFILE"
RAW_IMAGE="$OUTPUT_DIR/$IMAGE_NAME.img"
COMPRESSED_IMAGE="$RAW_IMAGE.xz"
BUILD_METADATA="$OUTPUT_DIR/$IMAGE_NAME.build.env"

[[ -d "$PROFILE_DIR" ]] || fail "profile not found: $PROFILE"
[[ -d "$OVERLAY_DIR" ]] || fail "rootfs overlay missing: $OVERLAY_DIR"
[[ -f "$PACKAGES_FILE" ]] || fail "package manifest missing: $PACKAGES_FILE"
[[ -f "$VERIFY_SCRIPT" ]] || fail "layout verifier missing: $VERIFY_SCRIPT"
[[ -f "$APP_DIR/.next/standalone/server.js" ]] || fail "standalone build missing at $APP_DIR/.next/standalone/server.js"
[[ -d "$APP_DIR/.next/static" ]] || fail "static assets missing at $APP_DIR/.next/static"

require_cmd bash
require_cmd tar
require_cmd rsync

if (( ! DRY_RUN )); then
  ensure_linux
  ensure_root
  require_cmd curl
  require_cmd xz
  require_cmd parted
  require_cmd losetup
  require_cmd mkfs.vfat
  require_cmd mkfs.ext4
  require_cmd mount
  require_cmd umount
fi

BOOT_MOUNT="$WORK_DIR/mnt/boot"
ROOT_MOUNT="$WORK_DIR/mnt/root"
STAGING_BOOT="$WORK_DIR/staging/boot"
PROFILE_FRAGMENT="$PROFILE_DIR/boot/config.txt.fragment"

cleanup() {
  if (( DRY_RUN )); then
    return 0
  fi

  set +e
  if mountpoint -q "$BOOT_MOUNT"; then
    umount "$BOOT_MOUNT"
  fi
  if mountpoint -q "$ROOT_MOUNT/boot"; then
    umount "$ROOT_MOUNT/boot"
  fi
  if mountpoint -q "$ROOT_MOUNT"; then
    umount "$ROOT_MOUNT"
  fi
  if [[ -n "${LOOP_DEVICE:-}" ]]; then
    losetup -d "$LOOP_DEVICE"
  fi
}

trap cleanup EXIT

prepare_dirs() {
  run mkdir -p "$OUTPUT_DIR" "$WORK_DIR" "$BOOT_MOUNT" "$ROOT_MOUNT" "$STAGING_BOOT"
}

verify_repo_layout() {
  "$VERIFY_SCRIPT" --repo-root "$REPO_ROOT" --profile "$PROFILE"
}

resolve_tarball() {
  if [[ -n "$TARBALL_PATH" ]]; then
    [[ -f "$TARBALL_PATH" ]] || fail "specified tarball not found: $TARBALL_PATH"
    return 0
  fi

  TARBALL_PATH="$WORK_DIR/ArchLinuxARM-rpi-aarch64.tar.gz"
  if (( DRY_RUN )); then
    log "would download rootfs archive from $ARCHIVE_URL"
  elif [[ ! -f "$TARBALL_PATH" ]]; then
    curl -L "$ARCHIVE_URL" -o "$TARBALL_PATH"
  fi
}

create_partitions() {
  run rm -f "$RAW_IMAGE" "$COMPRESSED_IMAGE"
  run truncate -s "${IMAGE_SIZE_GB}G" "$RAW_IMAGE"
  run parted -s "$RAW_IMAGE" mklabel msdos
  run parted -s "$RAW_IMAGE" mkpart primary fat32 1MiB 513MiB
  run parted -s "$RAW_IMAGE" mkpart primary ext4 513MiB 100%
  run parted -s "$RAW_IMAGE" set 1 boot on
}

attach_loop() {
  if (( DRY_RUN )); then
    LOOP_DEVICE=/dev/loopX
    return 0
  fi

  LOOP_DEVICE="$(losetup --show -Pf "$RAW_IMAGE")"
  mkfs.vfat -F 32 "${LOOP_DEVICE}p1"
  mkfs.ext4 -F "${LOOP_DEVICE}p2"
  mount "${LOOP_DEVICE}p2" "$ROOT_MOUNT"
  mkdir -p "$ROOT_MOUNT/boot"
  mount "${LOOP_DEVICE}p1" "$BOOT_MOUNT"
}

extract_rootfs() {
  if (( DRY_RUN )); then
    log "would extract $TARBALL_PATH into $ROOT_MOUNT"
    return 0
  fi

  tar -xpf "$TARBALL_PATH" -C "$ROOT_MOUNT"
  rsync -a "$ROOT_MOUNT/boot/" "$BOOT_MOUNT/"
  rm -rf "$ROOT_MOUNT/boot/"*
}

install_overlay() {
  run rsync -a "$OVERLAY_DIR/" "$ROOT_MOUNT/"

  if (( DRY_RUN )); then
    log "would copy standalone bundle into /opt/matterhub"
    if [[ -d "$APP_DIR/public" ]]; then
      log "would copy public assets into /opt/matterhub/public"
    else
      log "no public directory found; continuing with an empty /opt/matterhub/public"
    fi
  else
    mkdir -p \
      "$ROOT_MOUNT/opt/matterhub/.next" \
      "$ROOT_MOUNT/opt/matterhub/public" \
      "$ROOT_MOUNT/usr/share/matterhub/packages"
    rsync -a "$APP_DIR/.next/standalone/" "$ROOT_MOUNT/opt/matterhub/"
    rsync -a "$APP_DIR/.next/static/" "$ROOT_MOUNT/opt/matterhub/.next/static/"
    if [[ -d "$APP_DIR/public" ]]; then
      rsync -a "$APP_DIR/public/" "$ROOT_MOUNT/opt/matterhub/public/"
    fi
    cp "$PACKAGES_FILE" "$ROOT_MOUNT/usr/share/matterhub/packages/pacman-packages.txt"
  fi
}

install_profile() {
  [[ -f "$PROFILE_FRAGMENT" ]] || fail "profile boot fragment missing: $PROFILE_FRAGMENT"

  run mkdir -p "$ROOT_MOUNT/usr/share/matterhub/profiles/$PROFILE" "$BOOT_MOUNT/matterhub/profiles/$PROFILE"
  run rsync -a "$PROFILE_DIR/" "$ROOT_MOUNT/usr/share/matterhub/profiles/$PROFILE/"
  run cp "$PROFILE_FRAGMENT" "$ROOT_MOUNT/usr/share/matterhub/profiles/$PROFILE/config.txt.fragment"
  run cp "$PROFILE_FRAGMENT" "$BOOT_MOUNT/matterhub/profiles/$PROFILE/config.txt.fragment"

  if (( DRY_RUN )); then
    log "would append profile fragment to $BOOT_MOUNT/config.txt"
    return 0
  fi

  local marker_begin="# MatterHub profile: $PROFILE (begin)"
  local marker_end="# MatterHub profile: $PROFILE (end)"
  if ! grep -Fq "$marker_begin" "$BOOT_MOUNT/config.txt"; then
    {
      printf '\n%s\n' "$marker_begin"
      cat "$PROFILE_FRAGMENT"
      printf '%s\n' "$marker_end"
    } >> "$BOOT_MOUNT/config.txt"
  fi
}

write_metadata() {
  if (( DRY_RUN )); then
    log "would write build metadata to $BUILD_METADATA"
    return 0
  fi

  cat > "$BUILD_METADATA" <<EOF
IMAGE_NAME=$IMAGE_NAME
IMAGE_PATH=$RAW_IMAGE
COMPRESSED_IMAGE_PATH=$COMPRESSED_IMAGE
PROFILE=$PROFILE
ARCHIVE_URL=$ARCHIVE_URL
ARCHIVE_PATH=$TARBALL_PATH
APP_DIR=$APP_DIR
PACKAGES_FILE=$PACKAGES_FILE
EOF
}

compress_image() {
  if (( SKIP_COMPRESS )); then
    log "skipping compression"
    return 0
  fi

  if (( DRY_RUN )); then
    log "would compress $RAW_IMAGE into $COMPRESSED_IMAGE"
  else
    xz -T0 -f "$RAW_IMAGE"
  fi
}

log "profile=$PROFILE image=$RAW_IMAGE dry_run=$DRY_RUN"
verify_repo_layout
prepare_dirs
resolve_tarball
create_partitions
attach_loop
extract_rootfs
install_overlay
install_profile
if (( ! DRY_RUN )); then
  "$VERIFY_SCRIPT" --staged-root "$ROOT_MOUNT" --profile "$PROFILE"
fi
write_metadata
compress_image
log "image pipeline complete"
