"use client";

import { cloneElement, isValidElement, useEffect, useLayoutEffect, useRef, useState, type ReactElement, type ReactNode } from "react";
import { createPortal } from "react-dom";
import { cn } from "@/lib/utils";
import {
  MESSAGE_TARGET_DROPDOWN_CLASS,
  MESSAGE_TARGET_INPUT_WRAP_CLASS,
} from "@/components/message-target-picker";

type TargetPickerFieldProps = {
  label: string;
  input: ReactNode;
  chips: ReactNode;
  dropdown: ReactNode;
  rightAdornment?: ReactNode;
  className?: string;
  fieldRef?: React.RefObject<HTMLDivElement | null>;
};

export function TargetPickerField({
  label,
  input,
  chips,
  dropdown,
  rightAdornment,
  className,
  fieldRef,
}: TargetPickerFieldProps) {
  const [mounted, setMounted] = useState(false);
  const [coords, setCoords] = useState({ top: 0, left: 0, width: 0 });
  const localRef = useRef<HTMLDivElement>(null);
  const dropdownRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    setMounted(true);
  }, []);

  useLayoutEffect(() => {
    if (!dropdown) return;
    const el = fieldRef?.current ?? localRef.current;
    if (!el) return;

    const update = () => {
      const rect = el.getBoundingClientRect();
      setCoords({
        top: rect.bottom,
        left: rect.left,
        width: rect.width,
      });
    };

    update();
    window.addEventListener("resize", update);
    window.addEventListener("scroll", update, true);
    return () => {
      window.removeEventListener("resize", update);
      window.removeEventListener("scroll", update, true);
    };
  }, [dropdown, fieldRef]);

  const renderedInput = (() => {
    if (!isValidElement(input)) return input;

    const inputElement = input as ReactElement<{ className?: string }>;
    const inputProps = inputElement.props;
    return cloneElement(inputElement, {
      className: cn(
        inputProps.className,
        "h-auto min-h-[28px] flex-1 border-0 bg-transparent px-1 py-0 text-sm shadow-none focus-visible:border-0 focus-visible:ring-0 dark:bg-transparent",
      ),
    });
  })();

  return (
    <div className={cn("relative flex flex-col gap-1.5", className)} ref={fieldRef ?? localRef}>
      <div className="text-[13px] font-bold">{label}</div>
      <div className={cn(MESSAGE_TARGET_INPUT_WRAP_CLASS, rightAdornment && "pr-2")}>
        {chips}
        <div className="min-w-[180px] flex-1">
          {renderedInput}
        </div>
        {rightAdornment ? (
          <div className="ml-1 shrink-0 pointer-events-none">
            {rightAdornment}
          </div>
        ) : null}
      </div>

      {mounted && dropdown ? (
        createPortal(
          <div
            ref={dropdownRef}
            style={{
              position: "fixed",
              top: coords.top + 5,
              left: coords.left,
              width: coords.width,
              zIndex: 1100,
            }}
            className={cn(
              MESSAGE_TARGET_DROPDOWN_CLASS,
              "overflow-hidden",
            )}
          >
            <div className="custom-scrollbar max-h-[280px] overflow-y-auto py-1.5">
              {dropdown}
            </div>
          </div>,
          document.body,
        )
      ) : null}
    </div>
  );
}

export { MESSAGE_TARGET_DROPDOWN_CLASS, MESSAGE_TARGET_INPUT_WRAP_CLASS }
