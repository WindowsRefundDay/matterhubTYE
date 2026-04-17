# Raspberry Pi 5 Deployment

This app now builds with Next.js standalone output for Raspberry Pi deployment.

## Runtime Baseline

- Raspberry Pi OS 64-bit Bookworm
- Default `labwc` Wayland session
- Chromium kiosk pointed at `http://127.0.0.1:3000`

## Build Artifact Layout

After `npm run build`, copy these paths to the Pi:

- `.next/standalone/*` to `/opt/matterhub/`
- `.next/static/*` to `/opt/matterhub/.next/static/`
- `public/*` to `/opt/matterhub/public/`

## Standalone Server

The bundled server entrypoint is `/opt/matterhub/server.js`.

Install the provided service:

```bash
sudo cp deploy/raspberry-pi/matterhub.service /etc/systemd/system/matterhub.service
sudo systemctl daemon-reload
sudo systemctl enable matterhub.service
sudo systemctl start matterhub.service
```

The service binds the app to `127.0.0.1:3000` and restarts automatically.

## Kiosk Autostart

Install the provided autostart file:

```bash
mkdir -p ~/.config/labwc
cp deploy/raspberry-pi/labwc-autostart ~/.config/labwc/autostart
chmod +x ~/.config/labwc/autostart
```

Reboot or restart the graphical session after enabling the Node service.

## Hardware Acceleration Check

Before tuning browser flags any further, verify the real kiosk session in `chrome://gpu`.
If Chromium is already hardware accelerated, keep the default flag set above and avoid experimental Vulkan or ANGLE overrides.

## Audio ownership and host requirements

Phase 1 audio diagnostics treat the Raspberry Pi as the real audio owner:

- keep Chromium as a kiosk renderer only
- do **not** add `--alsa-input-device` or `--alsa-output-device` flags to the Chromium launcher for the primary audio path
- keep appliance audio defaults in the server-side system config instead of browser startup flags

Required host tools and access on the Pi:

- `aplay` for speaker-test playback
- `arecord` for the short mic test
- permission for the kiosk/service user to access ALSA devices (typically via the `audio` group or an equivalent appliance-specific access rule)

Expected non-Pi behavior during development:

- local non-Pi hosts should surface audio diagnostics as unsupported
- `/api/system/audio` should report `supported: false` with `mode: "unsupported"` instead of a fake-healthy mock appliance
