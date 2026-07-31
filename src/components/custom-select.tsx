/* eslint-disable react-hooks/set-state-in-effect */
"use client";

import { useEffect, useLayoutEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { ChevronDown, Check } from "lucide-react";
import { cn } from "@/lib/utils";
import { AnimatePresence, motion } from "framer-motion";
import { Button } from "./ui/button";
import { ACTIVE_ITEM_STYLE } from "@/constants/styles";

interface Option {
  label: string;
  value: string;
}

interface CustomSelectProps {
  options: Option[];
  value?: string;
  defaultValue?: string;
  onChange?: (value: string) => void;
  onKeyDown?: (e: React.KeyboardEvent) => void;
  onBlur?: () => void;
  className?: string;
  placeholder?: string;
  editable?: boolean;
  isInvalid?: boolean;
}

export const CustomSelect = ({
  options,
  value,
  defaultValue,
  onChange,
  onKeyDown,
  onBlur,
  className,
  placeholder = "Select...",
  editable = false,
  isInvalid = false,
}: CustomSelectProps) => {
  const [isOpen, setIsOpen] = useState(false);
  const [mounted, setMounted] = useState(false);
  const [coords, setCoords] = useState({ top: 0, left: 0, width: 0 });

  const [internalValue, setInternalValue] = useState(defaultValue || "");
  const currentValue = value !== undefined ? value : internalValue;
  const selected = options.find((opt) => opt.value === currentValue);

  const [inputValue, setInputValue] = useState("");

  const triggerRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const dropdownRef = useRef<HTMLDivElement>(null);
  const selectedItemRef = useRef<HTMLButtonElement>(null);

  // Đồng bộ inputValue khi selected hoặc currentValue thay đổi
  useEffect(() => {
    if (selected) {
      setInputValue(selected.label);
    } else if (currentValue) {
      // Nếu không tìm thấy option nhưng có value (trường hợp tự nhập hoặc format đặc biệt)
      // Nếu value là HH:mm, ta nên format nó sang nhãn AM/PM nếu cha chưa format
      setInputValue(currentValue);
    }
  }, [selected, currentValue]);

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
    setInputValue(option.label);
    setIsOpen(false);
    onChange?.(option.value);
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const newVal = e.target.value;
    setInputValue(newVal);
    if (!isOpen) setIsOpen(true);

    // Gọi onChange ngay lập tức để form nhận được giá trị đang gõ
    if (editable) {
      onChange?.(newVal);
    }
  };

  const handleInputBlur = () => {
    // Nếu người dùng nhập nội dung mới, ta bắn event onChange với nội dung đó
    // Logic parse thông minh sẽ nằm ở component cha (ReminderDialog)
    if (editable && inputValue !== (selected?.label || "")) {
      onChange?.(inputValue);
    }
    onBlur?.();
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    onKeyDown?.(e);
    if (e.key === "Enter") {
      e.preventDefault();
      setIsOpen(false);
      if (editable) {
        onChange?.(inputValue);
      }
    }
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
          className="overflow-hidden rounded-md border border-input bg-white dark:bg-[#1A1D21] shadow-2xl ring-1 ring-black/5"
        >
          <div className="custom-scrollbar max-h-70 overflow-y-auto py-1.5">
            {options.length > 0 ? (
              options.map((option) => (
                <Button
                  type="button"
                  variant="checkedMenu"
                  key={option.value}
                  ref={currentValue === option.value ? selectedItemRef : null}
                  onClick={() => handleSelect(option)}
                  className={cn(
                    currentValue === option.value && ACTIVE_ITEM_STYLE
                  )}
                >
                  <span className=" truncate">{option.label}</span>
                  {currentValue === option.value && (
                    <Check size={14} className="ml-2" />
                  )}
                </Button>
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
        onClick={() => !editable && setIsOpen(!isOpen)}
        className={cn(
          "flex h-10 w-full items-center justify-between rounded-md border border-input bg-transparent px-3 py-2 text-sm transition-all focus:outline-none dark:bg-input/30",
          isInvalid && "border-red-500",
          !editable ? "cursor-pointer hover:border-selection-hover select-none" : "cursor-text",
          isOpen && (isInvalid ? "ring-[3px] ring-red-500/20" : "border-selection-hover ring-[3px] ring-offset-0 ring-focus-ring")
        )}
      >
        <input
          ref={inputRef}
          type="text"
          readOnly={!editable}
          value={inputValue}
          onChange={handleInputChange}
          onBlur={handleInputBlur}
          onKeyDown={handleKeyDown}
          onFocus={() => editable && setIsOpen(true)}
          placeholder={placeholder}
          className={cn(
            "w-full border-none bg-transparent p-0 text-inherit outline-none placeholder:text-muted-foreground",
            !editable && "cursor-pointer select-none"
          )}
        />
        <ChevronDown
          onClick={(e) => {
            if (editable) {
              e.stopPropagation();
              setIsOpen(!isOpen);
            }
          }}
          className={cn(
            "h-4 w-4 transition-transform duration-200 shrink-0 ml-2",
            !editable ? "pointer-events-none" : "cursor-pointer",
            isOpen && "rotate-180"
          )}
        />
      </div>

      {mounted && createPortal(dropdownMenu, document.body)}
    </div>
  );
};
