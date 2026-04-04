# MatterHub Arch ARM appliance target

Status: approved execution target for the Raspberry Pi 4B 4 GB appliance effort
Last updated: 2026-04-03

## Goal

Ship a single reusable Arch Linux ARM (`aarch64`) SD-card image for Raspberry Pi 4B 4 GB that:

- boots straight into an appliance experience instead of a desktop session
- runs Home Assistant Container locally
- runs MatterHub locally from the Next.js standalone bundle
- supports first-boot Wi-Fi and Home Assistant pairing on-device
- surfaces degraded or maintenance states truthfully instead of falling back to mock data
- targets the HOSYOND 5-inch 800x480 DSI touchscreen with a dedicated display-risk lane

## Current repo baseline

The repo currently ships a kiosk UI shell and a Raspberry Pi OS deployment path, but not the approved appliance architecture.

| Area | Current baseline | Required appliance outcome |
| --- | --- | --- |
| Smart-home data | Client-only mock state in `src/hooks/use-smart-home.tsx` and `src/data/*` | Server-backed Home Assistant integration with explicit dev-only mock mode |
| Settings truthfulness | Placeholder connection card in `src/components/settings/settings-panel.tsx` | Live Home Assistant / kiosk / provisioning health reporting |
| Deployment docs | Raspberry Pi OS + `labwc` flow in `deploy/raspberry-pi/*` | Arch ARM image builder, services, and maintenance flow |
| Verification | Presentation-focused tests in `tests/` | Unit + integration + device validation for HA, setup, degraded mode, and image build |

## Target runtime shape

### Host OS and image

- Base image: Arch Linux ARM for Raspberry Pi 4 (`aarch64`)
- Image output: `matterhub-arch-rpi4.img.xz`
- Image assembly: host-side Linux build pipeline under `image/arch-rpi4/`
- Writable state:
  - `/var/lib/matterhub`
  - `/var/lib/homeassistant`
- First boot must expand the root filesystem automatically

### Services

| Service | Responsibility |
| --- | --- |
| `homeassistant.service` | Run Home Assistant Container on host networking |
| `matterhub.service` | Serve the Next.js standalone app on `127.0.0.1:3000` |
| `matterhub-kiosk.service` | Launch `cage` + Chromium in fullscreen kiosk mode |
| `matterhub-firstboot.service` | Decide setup vs kiosk vs maintenance mode |
| `matterhub-bootstrapd.service` | Handle privileged setup operations such as Wi-Fi writes |

## Boot-mode contract

Boot mode must be selected in one place and stay deterministic on every boot.

1. display verification failure -> maintenance mode
2. recovery flag present -> maintenance mode
3. device not provisioned -> setup mode
4. provisioned and healthy -> kiosk mode

The browser should always open the local MatterHub origin. The app decides whether the screen shows setup, normal kiosk UI, or maintenance messaging.

## Lane ownership map

The approved implementation is split into five lanes. This document is meant to keep the boundaries clear while those lanes land incrementally.

| Lane | Primary focus | Expected repo touchpoints |
| --- | --- | --- |
| 1. image / ops | image builder, units, boot config, writable state | `image/arch-rpi4/**`, service packaging, boot assets |
| 2. HA backend + API | runtime config, HA REST/WebSocket clients, action API | `src/server/ha/**`, `src/app/api/**`, config loaders |
| 3. setup / degraded UI | setup flow, health surfaces, provisioning gate | `src/app/**`, `src/components/**`, `src/hooks/**` |
| 4. display / profile risk | HOSYOND DSI profile, verification hooks, maintenance fallback | `image/arch-rpi4/profiles/**`, boot-time display verification |
| 5. tests / verification | automated coverage and validation scripts | `tests/**`, validation scripts, build checks |

## UI and product requirements

### Setup mode

- visible immediately on first boot
- touchscreen-first Wi-Fi entry
- guides the user to local Home Assistant onboarding at `127.0.0.1:8123`
- accepts and validates a long-lived Home Assistant token
- persists provisioning progress across restarts

### Normal kiosk mode

- no silent mock fallback in production
- ambient, rooms, devices, scenes, and settings surfaces reflect Home Assistant-backed state
- browser and services auto-recover after crashes or restarts

### Degraded / maintenance mode

- explicit UI when HA is offline, restarting, or unauthenticated
- explicit maintenance screen when display verification fails or recovery is requested
- recovery path must be intentional rather than accidental

## Documentation checkpoints for implementation

Before calling the appliance work complete, docs should cover:

- how to build the Arch ARM image from a clean Linux host
- the runtime directory and secret layout
- service responsibilities and restart expectations
- first-boot provisioning sequence
- boot-mode precedence and maintenance recovery
- display verification evidence for the HOSYOND profile
- verification commands and expected outputs for tests, lint, and typecheck

## Verification checklist

Use this checklist to keep implementation aligned with the approved test spec.

- [ ] `npm run lint`
- [ ] `npm test`
- [ ] `npx tsc --noEmit`
- [ ] image build emits raw + compressed artifacts
- [ ] setup flow blocks normal kiosk routes until provisioning completes
- [ ] production path does not import mock data without an explicit development gate
- [ ] degraded state is visible when HA is unavailable
- [ ] maintenance mode wins when display verification fails
- [ ] kiosk, MatterHub, and HA restart cleanly after simulated failures

## Notes for follow-on contributors

- Treat `deploy/raspberry-pi/*` as the legacy Raspberry Pi OS path until the Arch ARM appliance assets replace it.
- Keep new appliance documentation separate from the old deployment flow until the migration is complete.
- Prefer additive docs in `docs/` while image and runtime assets are still landing across multiple lanes.
