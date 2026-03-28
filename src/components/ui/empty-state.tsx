"use client";

import { Icon } from "@/components/ui/icon";

interface EmptyStateProps {
  icon: string;
  title: string;
  description?: string;
}

export function EmptyState({ icon, title, description }: EmptyStateProps) {
  return (
    <div className="flex flex-col items-center justify-center gap-3 py-12 text-center">
      <Icon name={icon} size={36} className="text-foreground/20" />
      <p className="text-[15px] font-medium text-foreground/40">{title}</p>
      {description && (
        <p className="text-[13px] text-foreground/25 max-w-[240px]">{description}</p>
      )}
    </div>
  );
}
