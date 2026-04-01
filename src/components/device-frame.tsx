import { cn } from "@/lib/utils";

export function DeviceFrame({ children, className }: { children: React.ReactNode; className?: string }) {
  return (
    <div className="flex items-center justify-center min-h-dvh bg-black">
      <div
        className={cn(
          "relative w-full max-w-[800px] aspect-[5/3] bg-background overflow-hidden",
          className
        )}
      >
        {children}
      </div>
    </div>
  );
}
