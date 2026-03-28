"use client";

import { motion } from "framer-motion";
import { Icon } from "@/components/ui/icon";
import type { Scene } from "@/types";

interface SceneTileProps {
  scene: Scene;
  onActivate: (sceneId: string) => void;
}

export function SceneTile({ scene, onActivate }: SceneTileProps) {
  return (
    <motion.button
      whileTap={{ scale: 0.96 }}
      onPointerDown={() => onActivate(scene.id)}
      className="flex flex-col gap-3 p-4 rounded-2xl bg-surface border border-border/20 text-left active:bg-accent/10 active:border-accent/20 transition-colors"
    >
      <div className="w-10 h-10 rounded-xl bg-surface-raised flex items-center justify-center">
        <Icon name={scene.icon} size={20} className="text-foreground/60" />
      </div>
      <div>
        <p className="text-[14px] font-medium text-foreground">{scene.name}</p>
        <p className="text-[11px] text-foreground/35 mt-0.5">{scene.description}</p>
      </div>
    </motion.button>
  );
}
