# MatterHub Arch ARM appliance review notes

Status: worker review artifact for the approved appliance implementation
Review date: 2026-04-03
Scope: repository baseline review only; no product-code behavior changed in this lane

## Summary verdict

The existing MatterHub UI shell is a solid kiosk prototype, but it is not yet safe to treat as an appliance runtime. The biggest blockers are truthful state sourcing, truthful settings/health reporting, and the lack of appliance-oriented deployment and verification docs.

## High-priority findings

### 1) Production data path is still fully mock-backed

**Where**
- `src/hooks/use-smart-home.tsx:21-24`
- `src/hooks/use-smart-home.tsx:63-189`
- `src/hooks/use-smart-home.tsx:237-255`

**What this means**
- Room, device, scene, and weather state are created entirely from repo-local mock fixtures.
- Device actions mutate React state directly instead of calling a backend.
- Production kiosk mode would currently look functional even if Home Assistant were unreachable.

**Why it matters**
The approved architecture explicitly forbids silent mock fallback in production. This file is the main cut-over point for replacing local state mutation with backend-fed state plus a development-only mock gate.

**Recommended follow-up**
- Move Home Assistant fetch/subscription logic to server-side modules.
- Convert the provider into a consumer of API-backed state.
- Gate all mock imports behind an explicit development/test configuration path.

### 2) Settings connection state is placeholder-only

**Where**
- `src/components/settings/settings-panel.tsx:16-23`
- `src/components/settings/settings-panel.tsx:44-49`

**What this means**
- The UI always reports a green "Connected" card.
- The displayed Home Assistant IP address and system values are hard-coded.

**Why it matters**
The settings screen is the most obvious place users will verify whether provisioning succeeded, whether Home Assistant is reachable, and whether the kiosk is healthy. Placeholder status would undermine troubleshooting and violates the degraded-state requirements.

**Recommended follow-up**
- Replace the static card with backend-derived health objects.
- Add explicit states for unprovisioned, reconnecting, degraded, and maintenance contexts.
- Keep display/device metadata sourced from runtime configuration or verification output instead of literals.

### 3) Existing docs still describe the legacy Raspberry Pi OS path

**Where**
- `README.md:14`
- `README.md:33-37`
- `deploy/raspberry-pi/README.md:1-49`

**What this means**
- The documented deployment path still assumes Raspberry Pi OS Bookworm, `labwc`, and a manual copy/install flow.
- There is no repo-local operator doc for the approved Arch ARM image pipeline, boot modes, or first-boot provisioning.

**Why it matters**
Without a separate appliance doc set, contributors will keep using the legacy deployment model as if it were still the target architecture.

**Recommended follow-up**
- Keep the legacy deployment docs intact until replacement assets land.
- Add appliance-specific docs under `docs/` during the migration window.
- Switch the top-level README only after image/ops assets are authoritative.

### 4) Test coverage is too narrow for the new appliance behavior

**Where**
- `tests/device-presentation.test.mjs`
- `tests/run-tests.mjs`

**What this means**
- Current automated tests only cover presentation/control rendering of mock devices.
- There is no coverage for Home Assistant mapping, provisioning checkpoints, degraded-state rendering, or setup/maintenance routing.

**Why it matters**
The approved plan depends on deterministic boot-mode selection and truthful HA-backed behavior. None of those guarantees are protected yet.

**Recommended follow-up**
- Add unit coverage for HA entity mapping and provisioning state reducers.
- Add integration tests for setup endpoints and HA client adapters.
- Keep end-to-end hardware validation evidence separate from the unit/integration test suite.

## Documentation added in this lane

This review lane adds the following isolated documentation so other workers can keep shipping code without editing shared docs immediately:

- `docs/arch-rpi4-appliance.md` — appliance target, lane ownership, boot contract, and verification checklist
- `docs/arch-rpi4-code-review.md` — current code-quality findings and recommended follow-ups

## Suggested merge order

1. land HA backend + API primitives
2. land setup / degraded-state UI against those primitives
3. land image / ops and display-profile assets
4. switch shared top-level docs away from the legacy Raspberry Pi OS path
5. require full verification evidence before calling the appliance path ready

## Reviewer notes

- No shared runtime files were edited in this lane.
- The documentation is intentionally additive so parallel implementation lanes can proceed without merge-heavy conflicts.
