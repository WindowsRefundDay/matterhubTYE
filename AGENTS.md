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
