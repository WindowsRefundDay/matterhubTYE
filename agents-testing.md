# MatterHub agent testing notes

## Audio transition note

The browser-owned player/sink-selection flow in this repo is now a legacy diagnostic path, not the Phase 1 production audio owner.

- On Raspberry Pi hardware, the preferred audio proof path is the OS-level `/api/system/audio` status/test workflow.
- On non-Pi development machines, audio diagnostics should return `supported: false` with `mode: "unsupported"` instead of claiming a healthy local appliance path.
- Chromium kiosk startup should stay free of `--alsa-input-device` / `--alsa-output-device` flags for the primary audio route.

## Legacy browser audio test flow

The **Settings → Audio → Test audio** flow currently does two things:

1. opens the full-screen Apple Music-like player and starts the local Don Toliver reference track
2. writes structured log entries so we can inspect Raspberry Pi browser audio behavior later

## Log file

By default, audio-test events are appended to:

```text
.tmp/audio-test-events.jsonl
```

Override it with:

```bash
MATTERHUB_AUDIO_TEST_LOG_FILE=/path/to/audio-test-events.jsonl
```

Each line is JSON and includes:
- timestamp
- event name
- selected output ID / label
- browser capability flags
- user agent
- playback or sink errors when present

## Useful events

- `audio_output_selected`
- `audio_output_picker_succeeded`
- `audio_output_picker_failed`
- `audio_test_opened`
- `audio_test_sink_applied`
- `audio_test_sink_failed`
- `audio_test_play`
- `audio_test_pause`
- `audio_test_ended`
- `audio_test_error`

## How to inspect logs on a Pi later

From the repo/app directory:

```bash
tail -f .tmp/audio-test-events.jsonl
```

Or through the app route:

```bash
curl http://127.0.0.1:3000/api/system/audio-test-log
```

## Raspberry Pi browser support notes

This feature is implemented as a **best-effort** browser output selector:

- If Chromium exposes `HTMLMediaElement.setSinkId()`, the player will try to bind the audio element to the selected output.
- If Chromium exposes `MediaDevices.selectAudioOutput()`, the Settings screen can ask the browser to pick an output device explicitly.
- If those APIs are unavailable, playback falls back to the browser default output and the limitation is logged.

For successful non-default routing, browser support must allow:
- secure context
- output-device permission
- `setSinkId()` support

This browser path is now best treated as a fallback/legacy diagnostic. The Phase 1 deploy path should prove OS-owned audio first and keep Chromium out of primary ALSA routing.

## Verification commands

Run from the repo root:

```bash
npm run lint
npm run test
npm run build
./node_modules/.bin/tsc --noEmit
```

## Manual Pi validation checklist

When a Raspberry Pi 4B is available:

1. Start the app in hardware mode.
2. Open **Settings → Audio**.
3. Select a candidate output.
4. Press **Test audio**.
5. Confirm whether audio is audible from the expected sink.
6. Inspect `.tmp/audio-test-events.jsonl`.
7. Record:
   - browser support flags
   - sink-apply success/failure
   - autoplay/playback failures
   - actual heard output path
