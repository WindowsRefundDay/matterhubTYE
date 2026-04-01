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

// Drawer sizing — generous for touch on 5" screens
const DRAWER_HEIGHT = 160;
// Peek area: large enough to comfortably grab/swipe (≥48px touch target)
const PEEK_HEIGHT = 56;
const CLOSED_Y = DRAWER_HEIGHT - PEEK_HEIGHT;
const SPRING_TRANSITION = { type: "spring", damping: 28, stiffness: 300 } as const;

export function NavLayer({ currentScreen, onSelect }: NavLayerProps) {
  const [isOpen, setIsOpen] = useState(false);
  const y = useMotionValue(DRAWER_HEIGHT + 20);
  const dragControls = useDragControls();
  const animationRef = useRef<{ stop: () => void } | null>(null);

  const contentOpacity = useTransform(y, [CLOSED_Y, 0], [0, 1]);

  const animateTo = useCallback(
    (nextY: number) => {
      animationRef.current?.stop();
      animationRef.current = animate(y, nextY, SPRING_TRANSITION);
    },
    [y]
  );

  const setDrawerOpen = useCallback(
    (open: boolean) => {
      animateTo(open ? 0 : CLOSED_Y);
      setIsOpen(open);
    },
    [animateTo]
  );

  // Animate to peek position on mount.
  useEffect(() => {
    animateTo(CLOSED_Y);

    return () => {
      animationRef.current?.stop();
    };
  }, [animateTo]);

  const handleDragEnd = useCallback(
    (_: unknown, info: PanInfo) => {
      const shouldOpen = info.velocity.y < -80 || y.get() < CLOSED_Y / 2;
      setDrawerOpen(shouldOpen);
    },
    [setDrawerOpen, y]
  );

  const toggleDrawer = useCallback(() => {
    setDrawerOpen(!isOpen);
  }, [isOpen, setDrawerOpen]);

  const handleNavSelect = useCallback(
    (screen: Screen) => {
      onSelect(screen);
      setDrawerOpen(false);
    },
    [onSelect, setDrawerOpen]
  );

  return (
    <motion.div
      style={{ y, height: DRAWER_HEIGHT }}
      drag="y"
      dragControls={dragControls}
      dragListener={false}
      dragConstraints={{ top: 0, bottom: CLOSED_Y }}
      dragElastic={0.15}
      onDragEnd={handleDragEnd}
      className="absolute bottom-0 left-0 right-0 z-30 touch-none"
    >
      {/* Curved top edge */}
      <div className="absolute inset-x-0 top-0 h-full overflow-hidden">
        <div
          className="absolute inset-x-[-10%] top-0 bottom-0 bg-surface/85 backdrop-blur-lg border-t border-border/30"
          style={{
            borderTopLeftRadius: "50% 44px",
            borderTopRightRadius: "50% 44px",
            willChange: "transform",
            transform: "translateZ(0)",
            isolation: "isolate",
            zIndex: 0,
          }}
        />
      </div>

      {/* Grab handle — large touch area (56px tall, full width) */}
      <div
        className="relative z-10 flex justify-center items-center cursor-grab active:cursor-grabbing"
        style={{ height: PEEK_HEIGHT }}
        onPointerDown={(event) => dragControls.start(event)}
        onClick={toggleDrawer}
      >
        <div className="w-14 h-1.5 rounded-full bg-foreground/25" />
      </div>

      {/* Nav items — evenly spaced, large touch targets */}
      <motion.div
        style={{ opacity: contentOpacity }}
        className="relative z-10 flex items-center justify-evenly px-2"
      >
        {navItems.map((item) => (
          <NavItem
            key={item.screen}
            screen={item.screen}
            icon={item.icon}
            label={item.label}
            isActive={currentScreen === item.screen}
            onSelect={handleNavSelect}
          />
        ))}
      </motion.div>
    </motion.div>
  );
}
