"use client";

import { Input } from "@/components/ui/input";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import Typography from "@/components/ui/typography";
import { useState, useEffect } from "react";
import { HexColorPicker } from "react-colorful";
import { HiOutlinePencil } from "react-icons/hi";

interface ColorPickerProps {
  color: string;
  onChange: (color: string) => void;
  label: string;
}

const ColorPicker = ({ color, onChange, label }: ColorPickerProps) => {
  const [inputValue, setInputValue] = useState(color);
  const [isHovered, setIsHovered] = useState(false);

  useEffect(() => {
    setInputValue(color);
  }, [color]);

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setInputValue(e.target.value.replace("#", ""));
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Enter") {
      const formattedColor = `#${inputValue}`;
      if (/^#[0-9A-F]{6}$/i.test(formattedColor)) {
        onChange(formattedColor);
      }
    }
  };

  const bgBase = `color-mix(in srgb, ${color}, black 40%)`;
  const bgHover = `color-mix(in srgb, ${color}, black 30%)`;

  return (
    <div className="w-full">
      <Typography
        text={label}
        variant="p"
        className="text-sm font-normal text-gray-300 mb-1"
      />

      <Popover>
        <PopoverTrigger asChild>
          <div
            onMouseEnter={() => setIsHovered(true)}
            onMouseLeave={() => setIsHovered(false)}
            className="flex gap-2 items-center justify-between group cursor-pointer rounded-full p-1 w-full border border-white/5 transition-all duration-200"
            style={{
              backgroundColor: isHovered ? bgHover : bgBase,
              borderColor: isHovered ? `color-mix(in srgb, ${color}, white 20%)` : "rgba(255,255,255,0.05)"
            }}
          >
            <div className="flex gap-2 items-center flex-1">
              <div
                className="w-6 h-6 rounded-full border border-white/20 shrink-0 shadow-sm"
                style={{ backgroundColor: color }}
              />

              <Typography
                text={color.toUpperCase()}
                variant="p"
                className="text-sm font-medium text-white"
              />
            </div>

            <HiOutlinePencil
              size={18}
              className="text-gray-400 group-hover:text-white transition-colors mr-2"
            />
          </div>
        </PopoverTrigger>

        <PopoverContent className="z-1100 w-auto p-3 bg-white dark:bg-[#1A1D21] border-white/10 shadow-xl" align="start" sideOffset={8}>
          <div className="flex flex-col gap-3">
            <HexColorPicker color={color} onChange={onChange} />
            <div className="flex items-center gap-2">
              <span className="text-sm text-gray-400 font-mono">#</span>
              <Input
                value={inputValue.replace("#", "")}
                onChange={handleInputChange}
                onKeyDown={handleKeyDown}
                className="h-9 w-28 bg-[#222529] border-white/10 text-sm focus-visible:ring-1 focus-visible:ring-[#1264A3] text-white font-mono"
                maxLength={6}
                placeholder="FFFFFF"
              />

            </div>
          </div>
        </PopoverContent>
      </Popover>
    </div>
  );
};

export default ColorPicker;