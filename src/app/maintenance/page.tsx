import { SetupChecklist, type SetupStep } from "@/components/setup/setup-checklist";
import { SystemAlertCard } from "@/components/setup/system-alert-card";

const RECOVERY_STEPS: SetupStep[] = [
  {
    id: "reason",
    title: "Record the maintenance reason",
    description:
      "Capture whether the system entered maintenance because of display verification failure, a recovery flag, or lost Home Assistant credentials.",
    status: "active",
  },
  {
    id: "network",
    title: "Restore network or pairing state",
    description:
      "Use the bootstrap helper to re-enter Wi-Fi credentials or rotate the Home Assistant token without exposing a general desktop session.",
    status: "pending",
  },
  {
    id: "verify",
    title: "Re-run display and service checks",
    description:
      "Confirm the touchscreen, MatterHub service, and Home Assistant container are healthy before returning to kiosk mode.",
    status: "pending",
  },
];

export default function MaintenancePage() {
  return (
    <main className="min-h-screen bg-[radial-gradient(circle_at_top,rgba(239,68,68,0.18),transparent_42%),linear-gradient(180deg,#171717_0%,#09090b_100%)] px-5 py-8 text-foreground sm:px-8">
      <div className="mx-auto flex w-full max-w-3xl flex-col gap-5">
        <SystemAlertCard
          icon="shield"
          eyebrow="Maintenance mode"
          title="Recover the appliance without dropping into a desktop shell"
          description="This route previews the maintenance experience for display-profile failures, deliberate recovery requests, and other conditions where MatterHub must stop pretending the kiosk is healthy."
          tone="danger"
        />

        <SetupChecklist
          title="Maintenance checklist"
          description="The appliance should only enter maintenance on purpose or when boot-time validation proves kiosk mode would be misleading or broken."
          steps={RECOVERY_STEPS}
        />

        <section className="rounded-[28px] border border-border/20 bg-surface/80 p-5">
          <p className="text-[11px] uppercase tracking-[0.28em] text-foreground/35">Boot-mode precedence</p>
          <ul className="mt-3 space-y-2 text-[13px] leading-6 text-foreground/55">
            <li>1. Display verification failure overrides every other mode and routes here.</li>
            <li>2. Recovery flags route here before any setup or kiosk handoff.</li>
            <li>3. Unprovisioned systems should go to <span className="font-medium text-foreground">/setup</span> instead of pretending they are paired.</li>
            <li>4. Only provisioned and healthy systems should return to the normal kiosk experience.</li>
          </ul>
        </section>
      </div>
    </main>
  );
}
