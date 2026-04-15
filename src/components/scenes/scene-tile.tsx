"use client";

import { memo } from "react";
import { Icon } from "@/components/ui/icon";
import type { Scene } from "@/types";
import { useTap } from "@/hooks/use-tap";

interface SceneTileProps {
  scene: Scene;
  onActivate: (sceneId: string) => void;
}

export const SceneTile = memo(function SceneTile({
  scene,
  onActivate,
}: SceneTileProps) {
  const tap = useTap(() => onActivate(scene.id));

  return (
    <button
      {...tap}
      className="flex w-full items-center gap-5 py-5 text-left border-b border-border last:border-0 active:scale-[0.98] transition-transform"
    >
      <div className="flex h-12 w-12 items-center justify-center rounded-lg border bg-muted/5 text-muted border-border">
        <Icon name={scene.icon} size={20} />
      </div>
      <div className="flex-1 min-w-0">
        <p className="text-[15px] font-medium text-foreground">{scene.name}</p>
        <p className="text-[12px] text-muted truncate">{scene.description}</p>
      </div>
      <Icon name="chevron-right" size={16} className="text-muted" />
    </button>
  );
});
