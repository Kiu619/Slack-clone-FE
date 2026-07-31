/* eslint-disable react-hooks/set-state-in-effect */
"use client";

import { CustomSelect } from "@/components/custom-select";
import { Separator } from "@/components/ui/separator";
import Typography from "@/components/ui/typography";
import { FUN_NEW_THEMES, SINGLE_COLOR_THEMES, VISION_ASSISTIVE_THEMES } from "@/constants/themes";
import { cn } from "@/lib/utils";
import { useThemeStore } from "@/stores/useThemeStore";
import { Check } from "lucide-react";
import { useTheme } from "next-themes";
import { useEffect, useState } from "react";
import { HiOutlineSparkles } from "react-icons/hi";
import { IoArrowUpSharp } from "react-icons/io5";
import {
  MdComputer,
  MdGradient,
  MdOutlineDarkMode,
  MdOutlineLightMode,
} from "react-icons/md";
import { RiShareForwardLine } from "react-icons/ri";
import { toast } from "sonner";
import ColorPicker from "./color-picker";
import ImportThemeDialog from "./import-theme-dialog";


const FONT_OPTIONS = [
  { label: "Arial", value: "arial" },
  { label: "Atkinson Hyperlegible Next", value: "atkinson-hyperlegible-next" },
  { label: "Comic Sans", value: "comic-sans" },
  { label: "Georgia", value: "georgia" },
  { label: "Lato", value: "lato" },
  { label: "Noto Sans", value: "noto-sans" },
  { label: "OpenDyslexic", value: "open-dyslexic" },
  { label: "Roboto Mono", value: "roboto-mono" },
  { label: "Segoe UI", value: "segoe-ui" },
  { label: "Verdana", value: "verdana" },
]

const COLOR_PREVIEW_STYLE =
  "w-9 h-9 rounded-full border border-white/10 shrink-0 overflow-hidden";

export default function PreferencesAppearance() {
  const { theme: colorMode, setTheme: setColorMode } = useTheme();

  const [shareThemeClick, setShareThemeClick] = useState(false)
  const [isImportDialogOpen, setIsImportDialogOpen] = useState(false);
  const { theme: customColors, setTheme: setCustomColors } = useThemeStore();

  const [activeTab, setActiveTab] = useState<"slack-themes" | "custom-theme">(
    customColors.id === "custom-theme" ? "custom-theme" : "slack-themes",
  );

  const [slackThemePreview, setSlackThemePreview] =
    useState(customColors.id || "aubergine");

  // Sync state if customColors.id changes from outside (e.g. navigation undo/save)
  useEffect(() => {
    if (customColors.id === "custom-theme") {
      setActiveTab("custom-theme");
    } else {
      setActiveTab("slack-themes");
      setSlackThemePreview(customColors.id || "aubergine");
    }
  }, [customColors.id]);

  const handleColorChange = (key: keyof typeof customColors) => (color: string) => {
    setCustomColors({ ...customColors, [key]: color, id: "custom-theme" });
  };

  const themeButtonClass = (selected: boolean) =>
    cn(
      "border border-[#565856] p-2 rounded-md flex items-center gap-3 justify-start hover:bg-white/5 transition-colors text-left w-full",
      selected && "ring-2 ring-selection-hover ring-offset-2 ring-offset-[#1A1D21]",
    );

  const handleShareTheme = () => {
    const themeString = `${customColors.systemNav}, ${customColors.selectedItems}`;
    navigator.clipboard.writeText(themeString);

    setShareThemeClick(true)
    toast.success("Theme strings copied to clipboard!");

    setTimeout(() => {
      setShareThemeClick(false)
    }, 2000)
  }

  const generateRandomHex = () => {
    const randomColor = Math.floor(Math.random() * 16777216).toString(16);
    return '#' + '0'.repeat(6 - randomColor.length) + randomColor;
  };

  const handleSurpriseMe = () => {
    setCustomColors({
      ...customColors,
      systemNav: generateRandomHex(),
      selectedItems: generateRandomHex(),
      id: "custom-theme",
    });
  };

  const handleImportTheme = (colors: { systemNav: string; selectedItems: string }) => {
    setCustomColors({ ...customColors, ...colors, id: "custom-theme" });
    toast.success("Theme imported successfully!");
  }

  return (
    <div className="space-y-4">
      <section>
        <Typography text="Font" variant="p" className="font-bold mb-4" />

        <CustomSelect
          options={FONT_OPTIONS}
          value={customColors.fontFamily || "lato"}
          onChange={(v) => handleColorChange("fontFamily")(v as string)}
        />
      </section>

      <Separator />

      <section>
        <Typography text="Color mode " variant="p" className="font-bold" />

        <Typography
          text="Choose if Slack’s appearance should be light or dark, or follow your computer’s settings."
          variant="p"
          className="mb-4 font-normal text-sm"
        />

        <div className="flex w-full gap-2 items-center justify-between ">
          <button
            type="button"
            onClick={() => setColorMode("light")}
            className={cn(
              "flex align-middle justify-center items-center gap-2 w-1/3 button-primary border border-[#565856] p-2 rounded-sm",
              colorMode === "light" &&
              "ring-2 ring-selection-hover ring-offset-2 ring-offset-[#1A1D21]",
            )}
          >
            <MdOutlineLightMode size={18} />
            <Typography
              text="Light"
              variant="p"
              className="font-normal text-sm"
            />
          </button>
          <button
            type="button"
            onClick={() => setColorMode("dark")}
            className={cn(
              "flex align-middle justify-center items-center gap-2 w-1/3 button-primary border border-[#565856] p-2 rounded-sm",
              colorMode === "dark" &&
              "ring-2 ring-selection-hover ring-offset-2 ring-offset-[#1A1D21]",
            )}
          >
            <MdOutlineDarkMode size={18} />
            <Typography
              text="Dark"
              variant="p"
              className="font-normal text-sm"
            />
          </button>
          <button
            type="button"
            onClick={() => setColorMode("system")}
            className={cn(
              "flex align-middle justify-center items-center gap-2 w-1/3 button-primary border border-[#565856] p-2 rounded-sm",
              colorMode === "system" &&
              "ring-2 ring-selection-hover ring-offset-2 ring-offset-[#1A1D21]",
            )}
          >
            <MdComputer size={18} />
            <Typography
              text="System"
              variant="p"
              className="font-normal text-sm"
            />
          </button>
        </div>
      </section>

      <Separator />

      <section>
        <div className="flex w-full gap-2 items-center mb-4">
          <button
            type="button"
            onClick={() => setActiveTab("slack-themes")}
            className={`${activeTab === "slack-themes" ? "border-b-2 border-selection-hover pb-1" : "text-gray-500 pb-1"}`}
          >
            <Typography
              text="Slack themes"
              variant="p"
              className={`${activeTab === "slack-themes" ? "font-bold text-selection-hover" : "font-bold text-gray-500"}`}
            />
          </button>

          <button
            type="button"
            onClick={() => setActiveTab("custom-theme")}
            className={`${activeTab === "custom-theme" ? "border-b-2 border-selection-hover pb-1" : "text-gray-500 pb-1"}`}
          >
            <Typography
              text="Custom theme"
              variant="p"
              className={`${activeTab === "custom-theme" ? "font-bold text-selection-hover" : "font-bold text-gray-500"}`}
            />
          </button>
        </div>

        {activeTab === "slack-themes" && (
          <div className="">
            <Typography
              text="Single color"
              variant="p"
              className="text-sm font-normal mb-3"
            />

            <div className="grid grid-cols-3 gap-2">
              {SINGLE_COLOR_THEMES.map((theme) => {
                const selected = slackThemePreview === (theme.id);
                return (
                  <button
                    key={theme.id}
                    type="button"
                    onClick={() => {
                      setSlackThemePreview(theme.id);
                      const colors = colorMode === "light" ? theme.themeColor.light : theme.themeColor.dark;
                      setCustomColors({ ...customColors, ...colors, id: theme.id });
                    }}
                    className={themeButtonClass(selected)}
                  >
                    <div
                      className={COLOR_PREVIEW_STYLE}
                      style={{
                        background: colorMode === "light" ? theme.bg.light : theme.bg.dark
                      }}
                    />

                    <Typography
                      text={theme.name}
                      variant="p"
                      className="text-sm font-normal"
                    />
                  </button>
                );
              })}
            </div>

            <Typography
              text="Vision assistive"
              variant="p"
              className="text-sm font-normal mb-3 mt-4"
            />

            <div className="grid grid-cols-3 gap-2">
              {/* VISION_THEMES */}
              {VISION_ASSISTIVE_THEMES.map((theme) => {
                const selected = slackThemePreview === (theme.id);
                return (
                  <button
                    key={theme.id}
                    type="button"
                    onClick={() => {
                      setSlackThemePreview(theme.id);
                      const colors = colorMode === "light" ? theme.themeColor.light : theme.themeColor.dark;
                      setCustomColors({ ...customColors, ...colors, id: theme.id });
                    }}
                    className={themeButtonClass(selected)}
                  >
                    <div
                      className={COLOR_PREVIEW_STYLE}
                      style={{
                        background: colorMode === "light" ? theme.bg.light : theme.bg.dark
                      }}
                    />

                    <Typography
                      text={theme.name}
                      variant="p"
                      className="text-sm font-normal"
                    />
                  </button>
                );
              })}
            </div>

            <Typography
              text="Fun and new"
              variant="p"
              className="text-sm font-normal mb-3 mt-4"
            />

            <div className="grid grid-cols-3 gap-2">
              {/* FUN_THEMES */}
              {FUN_NEW_THEMES.map((theme) => {
                const selected = slackThemePreview === (theme.id);
                return (
                  <button
                    key={theme.id}
                    type="button"
                    onClick={() => {
                      setSlackThemePreview(theme.id);
                      const colors = colorMode === "light" ? theme.themeColor.light : theme.themeColor.dark;
                      setCustomColors({ ...customColors, ...colors, id: theme.id });
                    }}
                    className={themeButtonClass(selected)}
                  >
                    <div
                      className={COLOR_PREVIEW_STYLE}
                      style={{
                        background: colorMode === "light" ? theme.bg.light : theme.bg.dark
                      }}
                    />

                    <Typography
                      text={theme.name}
                      variant="p"
                      className="text-sm font-normal"
                    />
                  </button>
                );
              })}
            </div>
          </div>
        )}

        {activeTab === "custom-theme" && (
          <div className="">
            <Typography
              text="Theme colors"
              variant="p"
              className="text-sm font-normal mb-3"
            />

            <div className="flex gap-2">
              <button
                type="button"
                className="flex align-middle justify-center items-center gap-2 border border-[#565856] py-1 px-2 rounded-sm"
                onClick={handleShareTheme}
              >
                {shareThemeClick ?
                  (<><Check size={18} />
                    <Typography
                      text="Copied"
                      variant="p"
                      className="text-sm font-normal"
                    /></>) :
                  (<><RiShareForwardLine size={18} />
                    <Typography
                      text="Share"
                      variant="p"
                      className="text-sm font-normal"
                    /></>
                  )}

              </button>

              <button
                type="button"
                className="flex align-middle justify-center items-center gap-2 border border-[#565856] py-1 px-2 rounded-sm"
                onClick={() => setIsImportDialogOpen(true)}
              >
                <IoArrowUpSharp size={18} />
                <Typography
                  text="Import"
                  variant="p"
                  className="text-sm font-normal"
                />
              </button>

              <button
                type="button"
                className="flex align-middle justify-center items-center gap-2 border border-[#565856] py-1 px-2 rounded-sm"
                onClick={handleSurpriseMe}
              >
                <HiOutlineSparkles size={18} />
                <Typography
                  text="Surprise me"
                  variant="p"
                  className="text-sm font-normal"
                />
              </button>
            </div>

            <div className="grid grid-cols-2 gap-x-6 gap-y-4 mt-4">
              <ColorPicker
                label="System navigation"
                color={customColors.systemNav}
                onChange={handleColorChange("systemNav")}
              />
              <ColorPicker
                label="Selected items"
                color={customColors.selectedItems}
                onChange={handleColorChange("selectedItems")}
              />
            </div>

            <div className="mt-8">
              <div className="flex items-start gap-x-3">
                <input
                  id="window-gradient"
                  type="checkbox"
                  checked={customColors.isGradient}
                  onChange={(e) => {
                    setCustomColors({ ...customColors, isGradient: e.target.checked });
                  }}
                  className="size-3 cursor-pointer accent-selection-hover"
                />
                <div className="flex flex-col gap-y-1">
                  <label htmlFor="window-gradient" className="flex items-center gap-x-2 cursor-pointer select-none">
                    <MdGradient size={18} />
                    <Typography text="Window gradient" className="text-sm font-semibold" />
                  </label>
                  <Typography
                    text="Blend Window background and Selected items colors together in window backgrounds."
                    className="text-[13px] leading-normal pr-8 text-muted-foreground"
                  />
                </div>
              </div>
            </div>
          </div>
        )}
      </section>
      <ImportThemeDialog open={isImportDialogOpen} onOpenChange={setIsImportDialogOpen} onImport={handleImportTheme} />
    </div>
  );
}
