"use client";

import { useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { X } from "lucide-react";
import { cn } from "@/lib/utils";
import { AnimatePresence, motion } from "framer-motion";
import { Button } from "./ui/button";

interface CustomDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  children: React.ReactNode;
  maxWidth?: string; // Optional custom max width
  overlayTransparent?: boolean;
}

export const CustomDialog = ({ open, onOpenChange, children, maxWidth = "520px", overlayTransparent = false }: CustomDialogProps) => {
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setMounted(true);
    if (open) {
      document.body.style.overflow = "hidden";
    } else {
      document.body.style.overflow = "unset";
    }

    const handleEsc = (e: KeyboardEvent) => {
      if (e.key === "Escape") onOpenChange(false);
    };

    if (open) {
      window.addEventListener("keydown", handleEsc);
    }

    return () => {
      document.body.style.overflow = "unset";
      window.removeEventListener("keydown", handleEsc);
    };
  }, [open, onOpenChange]);

  if (!mounted) return null;

  return createPortal(
    <AnimatePresence>
      {open && (
        <div className="fixed inset-0 z-500 flex items-center justify-center p-4">
          {/* Backdrop */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={() => onOpenChange(false)}
            className={cn("absolute inset-0 bg-black/60 backdrop-blur-[2px]", overlayTransparent && "bg-transparent opacity-0!")}
          />

          {/* Modal Content */}
          <motion.div
            initial={{ opacity: 0, scale: 0.95, y: 20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95, y: 20 }}
            transition={{ type: "spring", damping: 25, stiffness: 300 }}
            className="relative w-full overflow-hidden rounded-lg border border-white/10 bg-white dark:bg-[#1A1D21] shadow-2xl"
            style={{ maxWidth }}
          >
            {children}
          </motion.div>
        </div>
      )}
    </AnimatePresence>,
    document.body
  );
};

export const CustomDialogHeader = ({ children, className, showClose = true, onOpenChange }: {
  children: React.ReactNode;
  className?: string;
  showClose?: boolean;
  onOpenChange?: (open: boolean) => void;
}) => (
  <div className={cn("flex items-center justify-between border-b border-[#2C2E33] px-6 py-4", className)}>
    {children}
    {showClose && (
      <button
        type="button"
        onClick={() => onOpenChange?.(false)}
        className="rounded-sm opacity-70 transition-opacity hover:opacity-100 focus:outline-none focus:ring-2 focus:ring-selection-hover "
      >
        <X size={20} />
      </button>
    )}
  </div>
);

export const CustomDialogTitle = ({ children, className }: { children: React.ReactNode; className?: string }) => (
  <h2 className={cn("text-xl font-bold ", className)}>{children}</h2>
);

export const CustomDialogBody = ({ children, className }: { children: React.ReactNode; className?: string }) => (
  <div className={cn("px-6 py-4 overflow-y-auto max-h-[70vh] custom-scrollbar", className)}>
    {children}
  </div>
);

export const CustomDialogFooter = ({ children, className }: { children: React.ReactNode; className?: string }) => (
  <div className={cn("flex items-center justify-end gap-3 border-t border-[#2C2E33] bg-white dark:bg-[#1A1D21] px-6 py-4", className)}>
    {children}
  </div>
);
