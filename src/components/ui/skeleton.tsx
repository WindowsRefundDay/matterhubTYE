"use client";

import { cn } from "@/lib/utils";

export function Skeleton({ className }: { className?: string }) {
  return (
    <div
      className={cn(
        "animate-pulse rounded-xl bg-surface-raised/50",
        className
      )}
    />
  );
}

export function TileSkeleton() {
  return (
    <div className="rounded-2xl bg-surface p-4 space-y-3">
      <Skeleton className="h-5 w-20" />
      <Skeleton className="h-3 w-32" />
    </div>
  );
}
