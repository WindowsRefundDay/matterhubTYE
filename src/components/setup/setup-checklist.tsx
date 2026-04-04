import { Icon } from "@/components/ui/icon";

export interface SetupStep {
  id: string;
  title: string;
  description: string;
  status: "complete" | "active" | "pending";
}

interface SetupChecklistProps {
  title?: string;
  description?: string;
  steps: SetupStep[];
}

const STATUS_STYLES: Record<SetupStep["status"], { icon: string; tone: string; badge: string }> = {
  complete: {
    icon: "check",
    tone: "border-emerald-500/25 bg-emerald-500/10 text-emerald-300",
    badge: "Done",
  },
  active: {
    icon: "wifi",
    tone: "border-amber-500/25 bg-amber-500/10 text-amber-200",
    badge: "In progress",
  },
  pending: {
    icon: "info",
    tone: "border-border/30 bg-surface/60 text-foreground/55",
    badge: "Waiting",
  },
};

export function SetupChecklist({
  title = "Setup checklist",
  description = "MatterHub should guide the user through Wi-Fi, Home Assistant pairing, and kiosk handoff on-device.",
  steps,
}: SetupChecklistProps) {
  return (
    <section className="rounded-[28px] border border-border/20 bg-surface/80 p-5 shadow-[0_24px_80px_rgba(0,0,0,0.28)] backdrop-blur">
      <div className="mb-4">
        <h2 className="text-[18px] font-medium text-foreground">{title}</h2>
        <p className="mt-1 text-[13px] leading-5 text-foreground/55">{description}</p>
      </div>

      <ol className="space-y-3">
        {steps.map((step, index) => {
          const style = STATUS_STYLES[step.status];
          return (
            <li
              key={step.id}
              className="flex gap-3 rounded-2xl border border-border/20 bg-background/40 px-4 py-3"
            >
              <div
                className={`mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-full border ${style.tone}`}
              >
                <Icon name={style.icon} size={16} />
              </div>
              <div className="min-w-0 flex-1">
                <div className="flex items-center justify-between gap-3">
                  <p className="text-[14px] font-medium text-foreground">
                    {index + 1}. {step.title}
                  </p>
                  <span className="shrink-0 rounded-full border border-white/10 bg-white/5 px-2 py-0.5 text-[11px] uppercase tracking-[0.2em] text-foreground/40">
                    {style.badge}
                  </span>
                </div>
                <p className="mt-1 text-[12px] leading-5 text-foreground/45">{step.description}</p>
              </div>
            </li>
          );
        })}
      </ol>
    </section>
  );
}
