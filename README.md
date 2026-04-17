# MatterHub

Ambient smart home hub UI for a 5-inch (800x480) display. Built with Next.js, TypeScript, Tailwind CSS, and Framer Motion.

## Getting Started

```bash
npm install
cp .env.example .env.local
npm run dev:mock
```

Open [http://localhost:3000](http://localhost:3000) to see the hub interface.

Use mock mode on this machine for normal UI development. When you are validating the real Pi hardware path, run the app in hardware mode on the Pi:

```bash
npm run dev:hardware
```

For production Raspberry Pi deployment, build the standalone bundle with `npm run build` and launch it with `npm run start:standalone`. Deployment assets for `systemd` and `labwc` kiosk startup live in `deploy/raspberry-pi/README.md`.

The primary production target is Raspberry Pi OS 64-bit Bookworm with the `labwc` kiosk flow documented in `deploy/raspberry-pi/README.md`. The Arch Linux ARM image work under `image/arch-rpi4/` is legacy/reference material, not the main deployment path.

For the agent-friendly repo boundary and feature workflow, see `docs/development/kiosk-dev-workflow.md`.

## Local preview workflow

- **Mock preview on this machine**: `npm run dev:mock`
- **Hardware preview on the Pi**: `npm run dev:hardware`
- **Production standalone check**: `npm run build` then `npm run start:standalone`

Mock mode should be the default for UI and feature work here. It lets you preview changes on this machine without touching Pi IO like display brightness or Wi-Fi.
Phase 1 OS-level audio diagnostics are different: on non-Pi development machines, the audio status/test path should report `supported: false` with `mode: "unsupported"` instead of pretending a healthy local audio appliance exists.

## Architecture

- **Ambient mode**: Large clock + weather + status — the idle state
- **Navigation**: Tap to reveal nav bar (Home, Rooms, Devices, Scenes, Settings)
- **Screens**: Full functional UI for each section
- **Detail**: Bottom sheets for room/device controls

Auto-returns to ambient clock after 30 seconds of inactivity.

## Tech Stack

- Next.js 16 (App Router)
- TypeScript
- Tailwind CSS v4
- Framer Motion
- Geist font

## Raspberry Pi Notes

- The app is tuned globally for low-power kiosk hardware, with Framer Motion retained only for the curved navigation drawer.
- Production builds use Next.js standalone output.
- Recommended target is Raspberry Pi OS 64-bit Bookworm with the default `labwc` Wayland session and Chromium kiosk mode.
- Primary speaker/mic ownership is moving to OS-level helpers on the Pi. Keep Chromium focused on kiosk rendering; do not rely on Chromium `--alsa-input-device` / `--alsa-output-device` flags for the primary audio path.
