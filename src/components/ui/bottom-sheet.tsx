"use client";

import { cn } from "@/lib/utils";
import { Icon } from "@/components/ui/icon";

interface BottomSheetProps {
  open: boolean;
  onClose: () => void;
  title?: string;
  children: React.ReactNode;
  className?: string;
}

export function BottomSheet({
  open,
  onClose,
  title,
  children,
  className,
}: BottomSheetProps) {
  return (
    <>
      <div
        className={cn(
          "absolute inset-0 z-40 bg-black/50 transition-opacity duration-150 perf-panel",
          open ? "opacity-100" : "pointer-events-none opacity-0"
        )}
        onPointerDown={open ? onClose : undefined}
      />

      <div
        className={cn(
          "absolute bottom-0 left-0 right-0 z-50 flex max-h-[85%] flex-col overflow-hidden rounded-t-2xl border-t border-border/50 bg-surface",
          "transition-[transform,opacity] duration-200 ease-out perf-panel",
          open
            ? "translate-y-0 opacity-100"
            : "pointer-events-none translate-y-full opacity-0",
          className
        )}
      >
        {title && (
          <div className="flex items-center justify-between border-b border-border/30 px-5 py-4">
            <h2 className="text-[16px] font-medium text-foreground">{title}</h2>
            <button
              onPointerDown={onClose}
              className="rounded-full p-1 text-foreground/40 transition-[transform,color] hover:text-foreground/60 active:scale-90"
            >
              <Icon name="x" size={20} />
            </button>
          </div>
        )}
        <div className="flex-1 overflow-y-auto scrollbar-hide p-5 perf-scroll-region">
          {children}
        </div>
      </div>
    </>
  );
}
