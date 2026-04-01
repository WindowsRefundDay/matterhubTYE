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
import { NavItem } from "./nav-item";
import type { Screen } from "@/types";

interface NavLayerProps {
  currentScreen: Screen;
  onSelect: (screen: Screen) => void;
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

export function NavLayer({ currentScreen, onSelect }: NavLayerProps) {
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

  const handleDragEnd = useCallback(
    (_: unknown, info: PanInfo) => {
      const currentTop = y.get();
      const vy = info.velocity.y;

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
    [closedTop, openTop, snapTo, y]
  );

  const toggleDrawer = useCallback(() => {
    if (snapPoint === "full") {
      snapTo("open");
    } else if (snapPoint === "open") {
      snapTo("closed");
    } else {
      snapTo("open");
    }
  }, [snapPoint, snapTo]);

  const handleHandlePress = useCallback(() => {
    if (suppressToggleRef.current) return;
    toggleDrawer();
  }, [toggleDrawer]);

  const handleNavSelect = useCallback(
    (screen: Screen) => {
      onSelect(screen);
      snapTo("closed");
    },
    [onSelect, snapTo]
  );

  return (
    <motion.div
      style={{ y, willChange: "transform", backfaceVisibility: "hidden" }}
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
      className="absolute inset-0 z-30 isolate touch-none overflow-hidden perf-panel"
    >
      <div className="pointer-events-none absolute inset-0 z-0 overflow-hidden">
        <motion.div
          className="absolute inset-0 border-t border-border/30 bg-surface/85 backdrop-blur-lg"
          style={{
            scaleX: curveScaleX,
            borderTopLeftRadius: topCornerRadius,
            borderTopRightRadius: topCornerRadius,
            willChange: "transform, border-radius",
            backfaceVisibility: "hidden",
            transformOrigin: "top center",
          }}
          transformTemplate={(_, generatedTransform) =>
            generatedTransform === "none" ? "translateZ(0)" : `${generatedTransform} translateZ(0)`
          }
        />
      </div>

      <motion.button
        type="button"
        className="relative z-10 flex items-center justify-center cursor-grab active:cursor-grabbing"
        style={{ height: PEEK_HEIGHT }}
        onPointerDown={(event) => dragControls.start(event)}
        onClick={handleHandlePress}
      >
        <AssistantHandle state="drawer" />
      </motion.button>

      <motion.div
        style={{ opacity: contentOpacity }}
        className="relative z-10 grid grid-cols-5 items-start px-2"
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
    </motion.div>
  );
}
