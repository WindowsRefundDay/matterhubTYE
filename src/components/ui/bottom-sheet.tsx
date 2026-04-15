"use client";

import { cn } from "@/lib/utils";
import { Icon } from "@/components/ui/icon";
import { useTap } from "@/hooks/use-tap";

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
  const closeTap = useTap(onClose);
  return (
    <div data-theme="minimalist">
      <div
        className={cn(
          "absolute inset-0 z-40 bg-black/20 backdrop-blur-[2px] transition-opacity duration-200 perf-panel",
          open ? "opacity-100" : "pointer-events-none opacity-0"
        )}
        {...(open ? closeTap : {})}
      />

      <div
        className={cn(
          "absolute bottom-0 left-0 right-0 z-50 flex max-h-[90%] flex-col overflow-hidden rounded-t-[32px] border-t border-border bg-background shadow-2xl",
          "transition-[transform,opacity] duration-300 ease-[cubic-bezier(0.16,1,0.3,1)] perf-panel",
          open
            ? "translate-y-0 opacity-100"
            : "pointer-events-none translate-y-full opacity-0",
          className
        )}
      >
        <div className="flex flex-col">
          {/* Grab handle */}
          <div className="flex justify-center pt-3 pb-2">
            <div className="w-10 h-1 rounded-full bg-muted/20" />
          </div>

          {title && (
            <div className="flex items-center justify-between px-6 py-4">
              <h2 className="font-serif text-[24px] tracking-tight text-foreground">{title}</h2>
              <button
                {...closeTap}
                className="rounded-full p-2 text-muted transition-all hover:bg-muted/5 active:scale-90"
              >
                <Icon name="x" size={20} />
              </button>
            </div>
          )}
        </div>
        
        <div className="flex-1 overflow-y-auto scrollbar-hide px-6 pb-12 pt-2 perf-scroll-region">
          {children}
        </div>
      </div>
    </div>
  );
}
