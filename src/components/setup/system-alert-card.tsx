import { Icon } from "@/components/ui/icon";

interface SystemAlertCardProps {
  icon: string;
  eyebrow: string;
  title: string;
  description: string;
  tone?: "warning" | "danger" | "info";
}

const TONE_STYLES: Record<NonNullable<SystemAlertCardProps["tone"]>, string> = {
  warning: "border-amber-500/25 bg-amber-500/10 text-amber-100",
  danger: "border-red-500/30 bg-red-500/10 text-red-100",
  info: "border-sky-500/25 bg-sky-500/10 text-sky-100",
};

export function SystemAlertCard({
  icon,
  eyebrow,
  title,
  description,
  tone = "info",
}: SystemAlertCardProps) {
  return (
    <section className={`rounded-[28px] border p-5 shadow-[0_24px_80px_rgba(0,0,0,0.28)] ${TONE_STYLES[tone]}`}>
      <div className="flex items-start gap-3">
        <div className="mt-0.5 flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl border border-white/10 bg-black/10">
          <Icon name={icon} size={22} />
        </div>
        <div>
          <p className="text-[11px] uppercase tracking-[0.28em] text-current/65">{eyebrow}</p>
          <h1 className="mt-1 text-[22px] font-medium text-current">{title}</h1>
          <p className="mt-2 text-[13px] leading-6 text-current/80">{description}</p>
        </div>
      </div>
    </section>
  );
}
