# HOSYOND 5-inch DSI profile

This profile isolates the highest-risk Raspberry Pi 4 appliance dependency: the exact
HOSYOND 5-inch DSI panel and touch stack.

## Included artifacts

- `config.txt.fragment` — conservative Pi firmware settings for a mainline vc4/KMS-first boot.
- `display-profile.env` — expected connector, mode, and touch-name matchers.
- `matterhub-verify-display.sh` — boot-time verification script for DRM connector and touch detection.
- `systemd/matterhub-display-verify.service` — oneshot guard that blocks kiosk startup on failed validation.
- `systemd/matterhub-maintenance.target` — recovery target entered when validation fails.
- `systemd/matterhub-kiosk.service.d/10-display-profile.conf` — requires verification before kiosk startup.
- `systemd/matterhub-firstboot.service.d/10-display-profile.conf` — keeps setup-mode orchestration behind the same verification gate.

## Integration intent

Install these files into the image builder output as follows:

- `config.txt.fragment` appended to `/boot/config.txt`
- `display-profile.env` installed at `/etc/matterhub/display-profile.env`
- `matterhub-verify-display.sh` installed at `/usr/lib/matterhub/matterhub-verify-display.sh`
- systemd units installed under `/usr/lib/systemd/system/` and `/usr/lib/systemd/system/*.d/`

## Vendor-overlay escape hatch

The exact HOSYOND SKU remains unverified. Keep the mainline KMS path as the default.
If the shipped panel requires vendor assets, add them as a separate drop-in and uncomment
only the exact overlay line required by the validated SKU. Do not replace the verification
guard; maintenance mode must still win when display or touch discovery fails.

## Expected boot behavior

1. `matterhub-display-verify.service` runs before kiosk startup.
2. The verification script confirms:
   - at least one connected DRM connector matching the configured regex
   - an advertised mode matching `800x480`
   - at least one touch-capable input device matching the configured regex
3. On success, kiosk/setup services may continue.
4. On failure, systemd routes to `matterhub-maintenance.target` and the reason is written to `/run/matterhub/display-verification/summary.env`.
