import { SetupChecklist, type SetupStep } from "@/components/setup/setup-checklist";
import { SystemAlertCard } from "@/components/setup/system-alert-card";

const SETUP_STEPS: SetupStep[] = [
  {
    id: "wifi",
    title: "Join Wi-Fi",
    description:
      "Enter the local network credentials on-device. MatterHub should persist them before leaving setup mode.",
    status: "active",
  },
  {
    id: "ha",
    title: "Open Home Assistant",
    description:
      "Complete local onboarding at http://127.0.0.1:8123 and create a long-lived access token from the user profile.",
    status: "pending",
  },
  {
    id: "pair",
    title: "Pair MatterHub",
    description:
      "Submit the Home Assistant token so MatterHub can validate it and switch from demo fixtures to live state.",
    status: "pending",
  },
  {
    id: "handoff",
    title: "Enter kiosk mode",
    description:
      "After validation succeeds, reboot the browser surface into the normal ambient experience with live data and degraded-state handling.",
    status: "pending",
  },
];

export default function SetupPage() {
  return (
    <main className="min-h-screen bg-[radial-gradient(circle_at_top,rgba(251,191,36,0.14),transparent_42%),linear-gradient(180deg,#171717_0%,#09090b_100%)] px-5 py-8 text-foreground sm:px-8">
      <div className="mx-auto flex w-full max-w-3xl flex-col gap-5">
        <SystemAlertCard
          icon="wifi"
          eyebrow="Setup mode"
          title="Provision this MatterHub before kiosk mode starts"
          description="This route is the operator preview for the first-boot touchscreen flow. Use it to verify the sequence, copy, and degraded-state expectations before the appliance boot controller starts routing here automatically."
          tone="warning"
        />

        <SetupChecklist steps={SETUP_STEPS} />

        <section className="grid gap-4 md:grid-cols-2">
          <div className="rounded-[28px] border border-border/20 bg-surface/80 p-5">
            <p className="text-[11px] uppercase tracking-[0.28em] text-foreground/35">Current truth</p>
            <h2 className="mt-2 text-[18px] font-medium text-foreground">Home Assistant is not paired yet</h2>
            <p className="mt-2 text-[13px] leading-6 text-foreground/50">
              Until the backend lane lands live Home Assistant integration, the main UI still relies on demo fixtures. This setup preview makes that limitation explicit instead of implying the appliance is already connected.
            </p>
          </div>

          <div className="rounded-[28px] border border-border/20 bg-surface/80 p-5">
            <p className="text-[11px] uppercase tracking-[0.28em] text-foreground/35">Recovery</p>
            <h2 className="mt-2 text-[18px] font-medium text-foreground">Need a safe fallback?</h2>
            <p className="mt-2 text-[13px] leading-6 text-foreground/50">
              The maintenance preview at <span className="font-medium text-foreground">/maintenance</span> is the destination for display verification failures, recovery flags, and intentional service recovery paths.
            </p>
          </div>
        </section>
      </div>
    </main>
  );
}
