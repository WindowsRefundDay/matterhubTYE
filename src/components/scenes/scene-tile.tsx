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
      className="flex flex-col gap-3 rounded-2xl border border-border/20 bg-surface p-4 text-left transition-[transform,background-color,border-color] active:scale-[0.98] active:bg-accent/10 active:border-accent/20"
    >
      <div className="w-10 h-10 rounded-xl bg-surface-raised flex items-center justify-center">
        <Icon name={scene.icon} size={20} className="text-foreground/60" />
      </div>
      <div>
        <p className="text-[14px] font-medium text-foreground">{scene.name}</p>
        <p className="text-[11px] text-foreground/35 mt-0.5">{scene.description}</p>
      </div>
    </button>
  );
});
