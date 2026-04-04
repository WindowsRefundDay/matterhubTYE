# MatterHub Arch Linux ARM appliance image

This directory contains the worker-1 image/ops lane for the Raspberry Pi 4 Arch Linux ARM appliance build.

## Goals

- Produce a reusable raw SD-card image for Raspberry Pi 4B (`aarch64`)
- Stage the MatterHub standalone app into `/opt/matterhub`
- Install systemd units, users, tmpfiles, network defaults, and bounded logging
- Append the selected display-profile boot fragment during image assembly
- Fail safely into maintenance mode when display validation fails or a recovery flag is present

## Prerequisites

The builder is intended for a Linux host or CI runner with:

- `bash`
- `curl`
- `xz`
- `tar`
- `rsync`
- `parted`
- `losetup`
- `mkfs.vfat`
- `mkfs.ext4`
- `mount` / `umount`
- root privileges (direct or via `sudo`)

The MatterHub app bundle must already exist:

```bash
npm run build
```

Expected paths:

- `.next/standalone/server.js`
- `.next/static/`
- `public/`

## Build usage

Dry-run the pipeline:

```bash
image/arch-rpi4/build-image.sh --dry-run
```

Build an image with the default HOSYOND profile:

```bash
sudo image/arch-rpi4/build-image.sh \
  --app-dir "$PWD" \
  --output-dir "$PWD/dist/image"
```

## Outputs

- Raw image: `dist/image/matterhub-arch-rpi4.img`
- Compressed image: `dist/image/matterhub-arch-rpi4.img.xz`
- Build metadata: `dist/image/matterhub-arch-rpi4.build.env`

## Runtime layout

Installed services:

- `matterhub-firstboot.service`
- `matterhub-bootstrapd.service`
- `matterhub.service`
- `matterhub-kiosk.service`
- `homeassistant.service`
- `matterhub-maintenance.target`

State directories:

- `/var/lib/matterhub`
- `/var/lib/matterhub/provisioning`
- `/var/lib/matterhub/secrets`
- `/var/lib/homeassistant`
- `/var/lib/iwd`

## Display profiles

Profiles live under `profiles/<name>/`.

Current default:

- `hosyond-5-dsi`

The builder appends the profile's `boot/config.txt.fragment` into the boot partition with explicit `MatterHub` markers and copies profile assets into `/usr/share/matterhub/profiles/<name>/`.
