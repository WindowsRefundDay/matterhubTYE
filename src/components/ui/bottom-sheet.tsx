"use client";

import { motion, AnimatePresence } from "framer-motion";
import { cn } from "@/lib/utils";
import { Icon } from "@/components/ui/icon";

interface BottomSheetProps {
  open: boolean;
  onClose: () => void;
  title?: string;
  children: React.ReactNode;
  className?: string;
}

export function BottomSheet({ open, onClose, title, children, className }: BottomSheetProps) {
  return (
    <AnimatePresence>
      {open && (
        <>
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.2 }}
            className="absolute inset-0 bg-black/50 z-40"
            onPointerDown={onClose}
          />
          <motion.div
            initial={{ y: "100%" }}
            animate={{ y: 0 }}
            exit={{ y: "100%" }}
            transition={{ type: "spring", damping: 30, stiffness: 300 }}
            className={cn(
              "absolute bottom-0 left-0 right-0 z-50 rounded-t-2xl",
              "bg-surface border-t border-border/50",
              "max-h-[85%] overflow-hidden flex flex-col",
              className
            )}
          >
            {title && (
              <div className="flex items-center justify-between px-5 py-4 border-b border-border/30">
                <h2 className="text-[16px] font-medium text-foreground">{title}</h2>
                <button
                  onPointerDown={onClose}
                  className="p-1 rounded-full text-foreground/40 hover:text-foreground/60 active:scale-90 transition-transform"
                >
                  <Icon name="x" size={20} />
                </button>
              </div>
            )}
            <div className="flex-1 overflow-y-auto scrollbar-hide p-5">
              {children}
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
}
