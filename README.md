# MatterHub

Ambient smart home hub UI for a 5-inch (800x480) display. Built with Next.js, TypeScript, Tailwind CSS, and Framer Motion.

## Getting Started

```bash
npm install
npm run dev
```

Open [http://localhost:3000](http://localhost:3000) to see the hub interface.

For production Raspberry Pi deployment, build the standalone bundle with `npm run build` and launch it with `npm run start:standalone`. Deployment assets for `systemd` and `labwc` kiosk startup live in `deploy/raspberry-pi/README.md`.

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
