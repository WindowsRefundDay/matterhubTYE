# MatterHub kiosk development workflow

This guide is for coding agents and contributors working on MatterHub. It explains where code belongs, how to keep Pi hardware isolated, and how to preview changes locally without interfering with device IO.

## Purpose

MatterHub has two very different concerns:

1. the kiosk UI you can preview on this machine
2. the Raspberry Pi hardware boundary for brightness, Wi-Fi, and other device IO

Keep those concerns separate. UI work should stay previewable on this machine. Pi work should stay behind the server hardware layer and be validated on the Pi last.

## Repo map

| Area | Purpose | Typical files |
| --- | --- | --- |
| `src/app/` | Pages, routes, setup, maintenance screens | `page.tsx`, `layout.tsx`, `setup/`, `maintenance/` |
| `src/components/` | Presentational UI and screen composition | ambient, devices, rooms, scenes, settings, setup, ui |
| `src/hooks/` | Shared client state, polling, and interaction behavior | `use-smart-home.tsx`, `use-tap.ts`, `use-clock.ts`, `use-idle-timer.ts` |
| `src/types/` | Shared app and system contracts | `index.ts`, `system.ts` |
| `src/lib/server/ha/` | Home Assistant integration and mapping | config, REST, websocket, actions, mock, types |
| `src/lib/server/system/` | Raspberry Pi hardware layer | config, display, wifi, errors |
| `src/lib/client/` | Browser-facing API wrappers to create when needed | typed fetch helpers and request adapters |
| `deploy/` | Runtime and kiosk deployment assets | Raspberry Pi service and kiosk setup docs |
| `image/` | Appliance/image build assets | OS image and platform packaging work |
| `docs/` | Workflow, review, and architecture docs | this guide and the appliance notes |

## Where code belongs

### UI and interaction

Use `src/components/` for:
- new screens
- panels and drawers
- modal or sheet UI
- visual states and empty/loading/error renderers
- setup and maintenance presentation

Use `src/hooks/` for:
- shared polling
- local UI state
- touch handling
- timers and derived state
- cross-component behavior that should not live inside a single screen

### Data and contracts

Use `src/types/` for:
- shared device, room, scene, and system shapes
- request and response contracts
- system actions that need to be understood by both UI and server code

### Server boundaries

Use `src/lib/server/ha/` for:
- Home Assistant config loading
- HA REST or websocket clients
- entity mapping
- action translation
- HA-specific errors and mock data

Use `src/lib/server/system/` for:
- display brightness
- Wi-Fi
- Pi hardware detection
- sysfs or command execution logic
- hardware-specific errors and mocks

### Client-facing API wrappers

When the UI needs typed fetch helpers, create them under `src/lib/client/`.

Keep raw fetch logic out of individual components when a shared wrapper or hook can own it.

## Mock-vs-hardware workflow

### Local preview on this machine

Use mock mode for normal development:

```bash
cp .env.example .env.local
npm run dev:mock
```

What this gives you:
- full UI preview
- setup and maintenance route previews
- safe development without Pi IO
- the same screens and navigation you will ship, minus the hardware side effects

### Hardware validation on the Pi

Use hardware mode when you want to test actual brightness or Wi-Fi behavior:

```bash
npm run dev:hardware
```

Only use that path on the Pi or another environment that really has the hardware dependencies available.

### Production shape

For standalone production checks:

```bash
npm run build
npm run start:standalone
```

## Safe feature-addition recipe

When adding a feature, use this order:

1. **Decide the layer first**
   - UI only → `src/components/` or `src/hooks/`
   - app data shape → `src/types/`
   - Home Assistant → `src/lib/server/ha/`
   - Pi IO → `src/lib/server/system/`

2. **Update shared types**
   - add or adjust the contract in `src/types/`
   - keep the shape stable before wiring new behavior

3. **Add or update server behavior**
   - place real logic in the server layer
   - keep API routes thin
   - keep mocks safe and deterministic

4. **Add or update client helpers**
   - create a shared wrapper in `src/lib/client/` when the UI needs a common request path
   - prefer a hook when the behavior includes polling, refresh, or local state

5. **Wire the UI**
   - keep components focused on rendering and interaction
   - do not embed Pi logic in components

6. **Verify locally**
   - preview in mock mode on this machine
   - check the exact screen you changed
   - only move to Pi hardware validation once the UI path is stable

7. **Document the boundary**
   - update `AGENTS.md` or this guide if you added a new pattern or folder

## Do not do these things

- Do not read sysfs from React components.
- Do not shell out to `nmcli` from the browser layer.
- Do not scatter direct system fetch calls across multiple components if a shared helper can own them.
- Do not hide hardware failures behind silent mock behavior in production paths.
- Do not revert another agent’s work unless the task explicitly requires it.

## Fast reference

- Ambient UI: `src/components/ambient/`
- Device UI: `src/components/devices/`
- Room UI: `src/components/rooms/`
- Scene UI: `src/components/scenes/`
- Settings UI: `src/components/settings/`
- Setup UI: `src/components/setup/`
- Main shell: `src/components/app-shell.tsx`
- Smart-home state: `src/hooks/use-smart-home.tsx`
- Touch helper: `src/hooks/use-tap.ts`
- System display: `src/lib/server/system/display/`
- System Wi-Fi: `src/lib/server/system/wifi/`
- Home Assistant: `src/lib/server/ha/`

## If you are unsure

Ask:

1. Does this change affect the screen only?
2. Does it need browser state or server state?
3. Does it touch Home Assistant or Pi hardware?

The answer should tell you where the code belongs.
