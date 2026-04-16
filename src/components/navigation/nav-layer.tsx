"use client";

import { useState, useCallback, useEffect, useRef } from "react";
import {
  animate,
  motion,
  useDragControls,
  useMotionValue,
  useTransform,
  type PanInfo,
} from "framer-motion";
import type { ValueAnimationTransition } from "motion-dom";
import { AssistantHandle } from "@/components/assistant/assistant-handle";
import { DrawerVoicePanel } from "./drawer-voice-panel";
import { NavItem } from "./nav-item";
import type { DisplayVisualPhase } from "@/types/system";
import type { Screen } from "@/types";
import type { ConversationTurn, VoiceState } from "@/hooks/use-voice-assistant";

interface NavLayerProps {
  currentScreen: Screen;
  displayPhase?: DisplayVisualPhase;
  onSelect: (screen: Screen) => void;
  voiceState: VoiceState;
  isVoiceSessionOpen: boolean;
  turns: ConversationTurn[];
  currentImage: { url: string; caption?: string } | null;
  onAssistantActivate: () => void;
  onAssistantDismiss: () => void;
}

const navItems: { screen: Screen; icon: string; label: string }[] = [
  { screen: "home", icon: "home", label: "Home" },
  { screen: "rooms", icon: "grid", label: "Rooms" },
  { screen: "devices", icon: "layers", label: "Devices" },
  { screen: "scenes", icon: "sparkles", label: "Scenes" },
  { screen: "settings", icon: "settings", label: "Settings" },
];

const DRAWER_HEIGHT = 160;
const PEEK_HEIGHT = 56;
const FULL_TOP = 0;
const INITIAL_VIEWPORT_HEIGHT = DRAWER_HEIGHT + PEEK_HEIGHT + 20;
const SPRING_TRANSITION = { type: "spring", damping: 28, stiffness: 300 } as const;
const SNAP_SPRING = { type: "spring", damping: 34, stiffness: 240 } as const;
type DrawerTransition = ValueAnimationTransition<number>;

type SnapPoint = "closed" | "open" | "full";

export function NavLayer({
  currentScreen,
  displayPhase = "awake",
  onSelect,
  voiceState,
  isVoiceSessionOpen,
  turns,
  currentImage,
  onAssistantActivate,
  onAssistantDismiss,
}: NavLayerProps) {
  const initialClosedTop = Math.max(INITIAL_VIEWPORT_HEIGHT - PEEK_HEIGHT, FULL_TOP);

  const [snapPoint, setSnapPoint] = useState<SnapPoint>("closed");
  const [viewportH, setViewportH] = useState(INITIAL_VIEWPORT_HEIGHT);
  const y = useMotionValue(initialClosedTop);
  const dragControls = useDragControls();
  const animationRef = useRef<{ stop: () => void } | null>(null);
  const snapPointRef = useRef<SnapPoint>("closed");
  const viewportHRef = useRef(INITIAL_VIEWPORT_HEIGHT);
  const suppressToggleRef = useRef(false);

  const closedTop = Math.max(viewportH - PEEK_HEIGHT, FULL_TOP);
  const openTop = Math.max(viewportH - DRAWER_HEIGHT, FULL_TOP);

  useEffect(() => {
    const syncViewport = () => {
      const nextViewportH = window.innerHeight;
      if (nextViewportH === viewportHRef.current) return;

      const nextClosedTop = Math.max(nextViewportH - PEEK_HEIGHT, FULL_TOP);
      const nextOpenTop = Math.max(nextViewportH - DRAWER_HEIGHT, FULL_TOP);
      const nextTop =
        snapPointRef.current === "full"
          ? FULL_TOP
          : snapPointRef.current === "open"
            ? nextOpenTop
          : nextClosedTop;

      viewportHRef.current = nextViewportH;
      setViewportH(nextViewportH);
      y.set(nextTop);
    };

    syncViewport();
    window.addEventListener("resize", syncViewport);

    return () => {
      window.removeEventListener("resize", syncViewport);
      animationRef.current?.stop();
    };
  }, [y]);

  useEffect(() => {
    snapPointRef.current = snapPoint;
  }, [snapPoint]);

  const getSnapTop = useCallback(
    (point: SnapPoint) => {
      if (point === "full") return FULL_TOP;
      if (point === "open") return openTop;
      return closedTop;
    },
    [closedTop, openTop]
  );

  const getOpenProgress = useCallback(
    (top: number) => {
      const range = Math.max(closedTop - openTop, 1);
      return Math.min(Math.max((closedTop - top) / range, 0), 1);
    },
    [closedTop, openTop]
  );

  const getFullProgress = useCallback(
    (top: number) => {
      const range = Math.max(openTop - FULL_TOP, 1);
      return Math.min(Math.max((openTop - top) / range, 0), 1);
    },
    [openTop]
  );

  const contentOpacity = useTransform(y, (top) => getOpenProgress(top));
  const drawerSurfaceHeight = useTransform(y, (top) =>
    Math.max(viewportH - top, PEEK_HEIGHT)
  );

  const curveRadius = useTransform(y, (top) => {
    if (top >= openTop) {
      return 20 + getOpenProgress(top) * 24;
    }

    const fullProgress = getFullProgress(top);
    const bellPeak = 0.3;

    if (fullProgress <= bellPeak) {
      return 44 + (fullProgress / bellPeak) * 36;
    }

    return 80 * Math.max(0, 1 - (fullProgress - bellPeak) / (1 - bellPeak));
  });

  const curveSpread = useTransform(y, (top) => {
    if (top >= openTop) {
      return 5 + getOpenProgress(top) * 5;
    }

    const fullProgress = getFullProgress(top);
    const bellPeak = 0.3;

    if (fullProgress <= bellPeak) {
      return 10 + (fullProgress / bellPeak) * 8;
    }

    return 18 * Math.max(0, 1 - (fullProgress - bellPeak) / (1 - bellPeak));
  });

  const topCornerRadius = useTransform(curveRadius, (radius) => `50% ${radius}px`);
  const curveScaleX = useTransform(curveSpread, (spread) => 1 + (spread * 2) / 100);

  const animateTo = useCallback(
    (nextTop: number, transition: DrawerTransition = SPRING_TRANSITION) => {
      animationRef.current?.stop();
      animationRef.current = animate(y, nextTop, transition);
    },
    [y]
  );

  const snapTo = useCallback(
    (point: SnapPoint) => {
      if (!viewportH) return;
      animateTo(getSnapTop(point), point === "full" ? SNAP_SPRING : SPRING_TRANSITION);
      setSnapPoint(point);
    },
    [animateTo, getSnapTop, viewportH]
  );

  useEffect(() => {
    if (isVoiceSessionOpen) return;
    if (snapPointRef.current !== "full") return;
    animateTo(closedTop, SPRING_TRANSITION);
    snapPointRef.current = "closed";
  }, [animateTo, closedTop, isVoiceSessionOpen]);

  const handleDragEnd = useCallback(
    (_: unknown, info: PanInfo) => {
      const currentTop = y.get();
      const vy = info.velocity.y;

      if (isVoiceSessionOpen) {
        const dismissThreshold = openTop * 0.35;
        const shouldDismiss = vy >= 900 || currentTop > dismissThreshold;

        if (shouldDismiss) {
          onAssistantDismiss();
          snapTo("closed");
        } else {
          snapTo("full");
        }

        requestAnimationFrame(() => {
          suppressToggleRef.current = false;
        });
        return;
      }

      if (vy <= -1200) {
        snapTo(currentTop <= openTop * 0.8 ? "full" : "open");
      } else if (vy >= 1200) {
        snapTo(currentTop >= openTop ? "closed" : "open");
      } else {
        const closedThreshold = openTop + (closedTop - openTop) / 2;
        const fullThreshold = openTop * 0.45;

        if (currentTop >= closedThreshold) {
          snapTo("closed");
        } else if (currentTop <= fullThreshold) {
          snapTo("full");
        } else {
          snapTo("open");
        }
      }

      requestAnimationFrame(() => {
        suppressToggleRef.current = false;
      });
    },
    [closedTop, isVoiceSessionOpen, onAssistantDismiss, openTop, snapTo, y]
  );

  const handleHandlePress = useCallback(() => {
    if (suppressToggleRef.current) return;

    if (isVoiceSessionOpen) {
      onAssistantDismiss();
      snapTo("closed");
      return;
    }

    snapTo("full");
    onAssistantActivate();
  }, [isVoiceSessionOpen, onAssistantDismiss, onAssistantActivate, snapTo]);

  const handleNavSelect = useCallback(
    (screen: Screen) => {
      onSelect(screen);
      snapTo("closed");
    },
    [onSelect, snapTo]
  );

  const shouldShowNavItems = !isVoiceSessionOpen;

  return (
    <motion.div
      style={{ y, willChange: "transform", backfaceVisibility: "hidden" }}
      data-theme="minimalist"
      data-display-phase={displayPhase}
      transformTemplate={(_, generatedTransform) =>
        generatedTransform === "none" ? "translateZ(0)" : `${generatedTransform} translateZ(0)`
      }
      drag="y"
      dragControls={dragControls}
      dragListener={false}
      dragConstraints={{ top: FULL_TOP, bottom: closedTop }}
      dragElastic={0.06}
      onDragStart={() => {
        suppressToggleRef.current = true;
      }}
      onDragEnd={handleDragEnd}
      className="absolute inset-0 z-30 isolate touch-none overflow-hidden transition-colors duration-500 ease-out perf-panel"
    >
      <motion.div
        className="pointer-events-none absolute left-0 right-0 top-0 z-0 border-t border-border bg-background transition-colors duration-500 ease-out"
        style={{
          height: drawerSurfaceHeight,
          scaleX: curveScaleX,
          borderTopLeftRadius: topCornerRadius,
          borderTopRightRadius: topCornerRadius,
          willChange: "height, transform, border-radius",
          backfaceVisibility: "hidden",
          transformOrigin: "top center",
        }}
        transformTemplate={(_, generatedTransform) =>
          generatedTransform === "none" ? "translateZ(0)" : `${generatedTransform} translateZ(0)`
        }
      />

      <motion.div
        className="relative z-10 flex w-full items-center justify-center cursor-grab active:cursor-grabbing"
        style={{ height: PEEK_HEIGHT }}
        onPointerDown={(event) => dragControls.start(event)}
      >
        <button
          type="button"
          onPointerDown={(event) => {
            event.preventDefault();
            event.stopPropagation();
          }}
          onClick={handleHandlePress}
          className="relative z-20 flex items-center justify-center rounded-md"
          aria-label={isVoiceSessionOpen ? "Stop voice session" : "Start voice session"}
        >
          <AssistantHandle state={isVoiceSessionOpen ? voiceState : "drawer"} />
        </button>
      </motion.div>

      {isVoiceSessionOpen && (
        <DrawerVoicePanel
          turns={turns}
          voiceState={voiceState}
          currentImage={currentImage}
        />
      )}

      {shouldShowNavItems && (
        <motion.div
          style={{ opacity: contentOpacity }}
          className="relative z-10 grid grid-cols-5 items-start px-2 pt-1"
        >
          {navItems.map((item) => (
            <div key={item.screen} className="flex justify-center">
              <NavItem
                screen={item.screen}
                icon={item.icon}
                label={item.label}
                isActive={currentScreen === item.screen}
                onSelect={handleNavSelect}
              />
            </div>
          ))}
        </motion.div>
      )}
    </motion.div>
  );
}
