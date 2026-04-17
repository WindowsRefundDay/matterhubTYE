# Arch ARM Appliance Verification Harness Notes

This worker lane owns regression coverage and proof commands while the image, backend,
and setup/display lanes continue implementation.

## Automated proof commands

Run from the repo root:

```bash
npm test
npm run lint
npx tsc --noEmit
npm run build
```

## What the current harness proves

- Existing device presentation and control routing still render correctly.
- The primary screen router still reaches Rooms, Devices, Scenes, and Settings surfaces.
- Room summary counts remain stable against the seeded device data.
- The ambient status line still reflects active devices, lighting, and lock state.
- The current appliance status card continues to render the placeholder connection summary until the HA lane replaces it.

## Expected follow-up once feature lanes land

- Replace placeholder Settings assertions with real HA connectivity/degraded-state assertions.
- Add fixture-backed tests for HA entity mapping and setup/provisioning state.
- Add proof commands for image/profile build outputs when the image lane commits them.

## Audio output validation notes

- Phase 1 audio ownership should be validated through the OS-level `/api/system/audio` status/test flow on Raspberry Pi hardware.
- On non-Pi development machines, audio diagnostics should explicitly return `supported: false` with `mode: "unsupported"`.
- Chromium kiosk startup should not depend on `--alsa-input-device` or `--alsa-output-device`.
- Pi deployment notes should document the required host tools (`aplay`, `arecord`) and ALSA device access for the service user.
- The browser audio test log at `.tmp/audio-test-events.jsonl` and `/api/system/audio-test-log` remains useful as a legacy/fallback diagnostic only.
