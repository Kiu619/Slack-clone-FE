/* eslint-disable react-hooks/set-state-in-effect */
"use client";

import { useEffect, useLayoutEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { ChevronDown, Check } from "lucide-react";
import { cn } from "@/lib/utils";
import { AnimatePresence, motion } from "framer-motion";

interface Option {
  label: string;
  value: string;
}

interface CustomSelectProps {
  options: Option[];
  value?: string;
  defaultValue?: string;
  onChange?: (value: string) => void;
  className?: string;
  placeholder?: string;
}

export const CustomSelect = ({
  options,
  value,
  defaultValue,
  onChange,
  className,
  placeholder = "Select...",
}: CustomSelectProps) => {
  const [isOpen, setIsOpen] = useState(false);
  const [mounted, setMounted] = useState(false);
  const [coords, setCoords] = useState({ top: 0, left: 0, width: 0 });

  const [internalValue, setInternalValue] = useState(defaultValue || "");
  const currentValue = value !== undefined ? value : internalValue;
  const selected = options.find((opt) => opt.value === currentValue);

  const triggerRef = useRef<HTMLDivElement>(null);
  const dropdownRef = useRef<HTMLDivElement>(null);
  const selectedItemRef = useRef<HTMLDivElement>(null);

  // Tự động cuộn vào item đang chọn khi mở
  useEffect(() => {
    if (isOpen) {
      const timer = setTimeout(() => {
        selectedItemRef.current?.scrollIntoView({
          block: "center",
          behavior: "auto",
        });
      }, 60);
      return () => clearTimeout(timer);
    }
  }, [isOpen]);

  useEffect(() => {
    setMounted(true);

    const handleClickOutside = (event: MouseEvent) => {
      if (
        triggerRef.current && !triggerRef.current.contains(event.target as Node) &&
        dropdownRef.current && !dropdownRef.current.contains(event.target as Node)
      ) {
        setIsOpen(false);
      }
    };

    const handleGlobalScroll = (event: Event) => {
      if (dropdownRef.current && dropdownRef.current.contains(event.target as Node)) {
        return;
      }
      if (isOpen) setIsOpen(false);
    };

    if (isOpen) {
      document.addEventListener("mousedown", handleClickOutside);
      window.addEventListener("scroll", handleGlobalScroll, true);
      window.addEventListener("resize", () => setIsOpen(false));
    }

    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
      window.removeEventListener("scroll", handleGlobalScroll, true);
      window.removeEventListener("resize", () => setIsOpen(false));
    };
  }, [isOpen]);

  useLayoutEffect(() => {
    if (isOpen && triggerRef.current) {
      const rect = triggerRef.current.getBoundingClientRect();
      setCoords({
        top: rect.bottom,
        left: rect.left,
        width: rect.width,
      });
    }
  }, [isOpen]);

  const handleSelect = (option: Option) => {
    setInternalValue(option.value);
    setIsOpen(false);
    onChange?.(option.value);
  };

  const dropdownMenu = (
    <AnimatePresence>
      {isOpen && (
        <motion.div
          ref={dropdownRef}
          initial={{ opacity: 0, scale: 0.98, y: -4 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.98, y: -4 }}
          transition={{ duration: 0.1, ease: [0.4, 0, 0.2, 1] }}
          style={{
            position: "fixed",
            top: coords.top + 5,
            left: coords.left,
            width: coords.width,
            zIndex: 1100,
          }}
          className="overflow-hidden rounded-md border border-white/10 bg-white dark:bg-[#1A1D21] shadow-2xl ring-1 ring-black/5"
        >
          <div className="custom-scrollbar max-h-[280px] overflow-y-auto py-1.5">
            {options.length > 0 ? (
              options.map((option) => (
                <div
                  key={option.value}
                  ref={currentValue === option.value ? selectedItemRef : null}
                  onClick={() => handleSelect(option)}
                  className={cn(
                    "group flex w-full cursor-pointer items-center px-4 py-2.5 text-[14px] transition-colors",
                    currentValue === option.value
                      ? "bg-selection-hover text-white"
                      : " hover:bg-selection-hover hover:text-white"
                  )}
                >
                  <span className="flex-1 truncate">{option.label}</span>
                  {currentValue === option.value && (
                    <Check size={14} className="ml-2" />
                  )}
                </div>
              ))
            ) : (
              <div className="px-4 py-8 text-[13px] text-center italic">
                No results found
              </div>
            )}
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );

  return (
    <div className={cn("w-full", className)}>
      <div
        ref={triggerRef}
        onClick={() => setIsOpen(!isOpen)}
        className={cn(
          "flex h-[40px] w-full items-center justify-between rounded-md border border-[#565856] bg-transparent px-3 py-2 text-sm transition-all focus:outline-none",
          "cursor-pointer hover:border-selection-hover select-none",
          isOpen && "border-selection-hover ring-[3px] ring-offset-0 ring-focus-ring"
        )}
      >
        <span>
          {selected ? selected.label : placeholder}
        </span>
        <ChevronDown
          className={cn(
            "h-4 w-4 transition-transform duration-200",
            isOpen && "rotate-180"
          )}
        />
      </div>

      {mounted && createPortal(dropdownMenu, document.body)}
    </div>
  );
};
