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

- The audio test flow now logs to `.tmp/audio-test-events.jsonl` by default.
- The browser can also expose recent events at `/api/system/audio-test-log`.
- On a Pi, validate both:
  - whether audio is actually heard from the expected sink
  - whether the logs report `audio_test_sink_applied` or `audio_test_sink_failed`
