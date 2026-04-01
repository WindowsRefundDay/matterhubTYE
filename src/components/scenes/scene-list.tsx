"use client";

import { useSmartHomeActions, useSmartHomeStaticData } from "@/hooks/use-smart-home";
import { SceneTile } from "./scene-tile";

export function SceneList() {
  const { scenes } = useSmartHomeStaticData();
  const { activateScene } = useSmartHomeActions();

  return (
    <div className="h-full flex flex-col">
      <h1 className="text-[20px] font-medium text-foreground mb-4">Scenes</h1>
      <div className="grid grid-cols-3 gap-3 flex-1">
        {scenes.map((scene) => (
          <SceneTile key={scene.id} scene={scene} onActivate={activateScene} />
        ))}
      </div>
    </div>
  );
}
