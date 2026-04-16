# MatterHub — Agent Reference

Read this first, then the companion workflow doc at `docs/development/kiosk-dev-workflow.md`.

MatterHub is a kiosk UI for a Raspberry Pi 5-inch touchscreen. It uses Next.js 16, TypeScript, Tailwind CSS, Home Assistant integration, and a Pi hardware layer for display brightness and Wi-Fi.

## How to think about the repo

Keep the repo single-rooted, but treat the layers as separate:

- **UI / presentation**: `src/app/`, `src/components/`
- **API routes**: `src/app/api/`
- **Shared client behavior**: `src/hooks/`
- **App data types**: `src/types/`
- **Home Assistant backend**: `src/lib/server/ha/`
- **Pi hardware backend**: `src/lib/server/system/`
- **Deployment / appliance assets**: `deploy/`, `image/`, `docs/`

## Where code belongs

| Change type | Put it here | Notes |
| --- | --- | --- |
| New screen, panel, or visual state | `src/components/` | Keep it presentation-first. |
| Shared UI state or polling | `src/hooks/` | Centralize behavior once, reuse everywhere. |
| App-level types and contracts | `src/types/` | Update shared types before wiring UI/backend changes. |
| Thin route handlers | `src/app/api/` | Keep route code minimal and delegate to server modules. |
| Home Assistant logic, mapping, or actions | `src/lib/server/ha/` | Server-only. Keep browser code out of this layer. |
| Display brightness, Wi-Fi, or other Pi IO | `src/lib/server/system/` | This is the hardware boundary. |
| Browser-facing API wrappers for new features | `src/lib/client/` | Create this folder when adding typed fetch helpers. |
| Setup, maintenance, or boot-flow routing | `src/app/` and `src/components/setup/` | Keep routes thin and UI explicit. |
| Appliance packaging, boot, or image work | `deploy/`, `image/` | Do not mix this into UI components. |

## Agent rules

- Do not put sysfs, `nmcli`, or other Pi-only calls in React components.
- Do not let components call system routes directly if a shared client helper or hook can own the behavior.
- Keep server routes thin; put real logic in `src/lib/server/*`.
- Prefer mock-backed local preview over hardware-dependent development.
- Do not revert or overwrite other agents' edits unless the task explicitly requires it.

## Workflow rules

1. Start by finding the right layer.
2. Update shared types before wiring UI and server changes together.
3. Put browser fetch logic in a client helper or hook, not scattered across components.
4. Put hardware logic behind `src/lib/server/system/`.
5. Use mock mode first on this machine, then validate hardware behavior on the Pi.
6. Update docs whenever you add a new layer, workflow, or boundary rule.

## Quick pointers

- Frontend state/orchestration: `src/hooks/use-smart-home.tsx`
- Touch handling: `src/hooks/use-tap.ts`
- Setup UI: `src/components/setup/`
- Settings UI: `src/components/settings/`
- Ambient UI: `src/components/ambient/`
- Assistant UI: `src/components/assistant/`
- Device UI: `src/components/devices/`
- Room UI: `src/components/rooms/`
- Scene UI: `src/components/scenes/`

## Local preview

Use mock mode for normal development on this machine. When you need the Pi hardware path, switch to hardware mode on the Pi and validate brightness/Wi-Fi there.

For the exact preview commands and feature-addition recipe, use `docs/development/kiosk-dev-workflow.md`.

---

## Voice Assistant

Tap the drawer handle → drawer rises full-screen → aqua glow animation → Gemini processes voice → Piper TTS speaks response.

### Architecture

```
Browser mic (MediaRecorder)
  → base64 audio
    → POST /api/voice/chat
      → runVoiceConversationTurn()   [src/lib/server/voice/executor.ts]
        → Gemini 2.5 Flash (audio input, function calling)
          → tool registry            [src/lib/server/voice/tools/]
          → web_search → grounded Gemini sub-call (Google Search)
          → HA tools   → HomeAssistantRestClient
          → system tools → handleDisplayAction
          → client directives → returned to browser
      → POST /api/voice/tts
        → Piper binary (local neural TTS)
          → WAV → HTML5 Audio
```

### Key files

| File | Role |
| --- | --- |
| `src/lib/server/voice/executor.ts` | Orchestrates one full conversation turn: audio → Gemini → tools → response |
| `src/lib/server/voice/gemini.ts` | Gemini client factory, function declaration builder |
| `src/lib/server/voice/log.ts` | `vlog` helper — structured console output per phase, visible in Next.js server terminal |
| `src/lib/server/voice/tools/registry.ts` | `buildToolRegistry()` — assembles all tools. **Only file to touch when adding a tool.** |
| `src/lib/server/voice/tools/ha-tools.ts` | 5 HA action tools (toggle, set value, temperature, lock, scene) |
| `src/lib/server/voice/tools/system-tools.ts` | Display brightness, display power, get system status |
| `src/lib/server/voice/tools/future-tools.ts` | `web_search` (intercepted for grounding), `show_image`, `navigate_to_screen` |
| `src/lib/server/voice/tools/types.ts` | `VoiceTool`, `ToolContext`, `ToolResult`, `ClientDirective`, `ExecutedAction` |
| `src/app/api/voice/chat/route.ts` | Thin route → executor |
| `src/app/api/voice/tts/route.ts` | Spawns Piper binary, returns WAV; falls back to `{ status: "no-tts" }` if binary missing |
| `src/hooks/use-voice-assistant.ts` | State machine, MediaRecorder, silence detection, API calls, directive handler |
| `src/components/voice/voice-overlay.tsx` | Aqua glow + transcript display; opacity tied to drawer `y` MotionValue |

### State machine

```
idle → listening   activate() — getUserMedia + MediaRecorder.start()
listening → thinking  silence detected (RMS < 0.01 for 1.5s) — stop recording, POST /api/voice/chat
thinking → speaking   response received — POST /api/voice/tts, play WAV
speaking → idle    audio.onended
any → idle         dismiss() or error
```

### Adding a new tool

1. Create `src/lib/server/voice/tools/my-tool.ts` — export a `VoiceTool[]`
2. Import and spread it in `src/lib/server/voice/tools/registry.ts`
3. Done. Gemini will use it automatically on the next request.

If the tool needs client-side UI action (e.g. navigate, show image), return a `ClientDirective` in `ToolResult`. The hook in `use-voice-assistant.ts` handles all `ClientDirective` kinds.

### web_search — two-call pattern

Gemini cannot combine function calling and Google Search grounding in one request.
When Gemini calls `web_search(query)`, the executor intercepts it:

1. Skips the tool's `execute()` function entirely
2. Makes a **separate** `gemini-2.5-flash` call with `tools: [{ googleSearch: {} }]`
3. Returns the grounded text as the function result
4. Main chat continues with that answer

To add other search providers (Tavily, Brave, etc.), replace the `runGroundedSearch()` call in `executor.ts`.

### ClientDirective

Tools can return a `ClientDirective` alongside their result to trigger UI actions:

```ts
| { kind: "show_image"; url: string; caption?: string }
| { kind: "navigate_to_screen"; screen: "home"|"rooms"|"devices"|"scenes"|"settings" }
```

Hook reads them after each API response. Add new directive kinds to `types.ts`, handle them in `use-voice-assistant.ts`.

### Environment variables

| Variable | Required | Notes |
| --- | --- | --- |
| `GEMINI_API_KEY` or `MATTERHUB_GEMINI_API_KEY` | Yes | Gemini API key — server-only |
| `PIPER_BINARY_PATH` | Pi only | Default `/home/pi/.venv/bin/piper` |
| `PIPER_MODEL_PATH` | Pi only | Default `/home/pi/piper-models/en_US-amy-medium.onnx` |
| `NEXT_PUBLIC_VOICE_MOCK` | Dev | Set `"1"` to skip mic + TTS |

### Pi one-time setup

```bash
# Piper TTS
python3 -m venv ~/.venv && source ~/.venv/bin/activate && pip install piper-tts
mkdir ~/piper-models
wget https://huggingface.co/rhasspy/piper-voices/resolve/main/en/en_US/amy/medium/en_US-amy-medium.onnx \
  -O ~/piper-models/en_US-amy-medium.onnx
wget https://huggingface.co/rhasspy/piper-voices/resolve/main/en/en_US/amy/medium/en_US-amy-medium.onnx.json \
  -O ~/piper-models/en_US-amy-medium.onnx.json

# Mic permission for Chromium kiosk
echo '{ "AudioCaptureAllowed": true, "AudioCaptureAllowedUrls": ["http://localhost:3000"] }' \
  | sudo tee /etc/chromium/policies/managed/policy.json
```

### Debug log

All voice activity logs to the Next.js server terminal via `vlog` in `src/lib/server/voice/log.ts`.

```
[voice:session  ] Turn started
[voice:audio    ] Audio received {"estimatedBytes": 12480, "deviceCount": 4}
[voice:gemini   ] Sending audio to gemini-2.5-flash (11 tools registered)
[voice:gemini   ] First response received (2340ms) {"toolCallsRequested": 1}
[voice:tool     ] → toggle_device {"args": {"entityId": "light.living_room", "turnOn": false}}
[voice:tool     ] ← toggle_device: ok — Done.
[voice:session  ] Turn complete (3812ms total) {"text": "Living room light turned off."}
```

Log phases: `session` · `audio` · `gemini` · `tool` · `tts` · `directive` · `error`
