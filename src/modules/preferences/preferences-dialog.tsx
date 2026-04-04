"use client";

import {
  CustomDialog,
  CustomDialogHeader,
  CustomDialogTitle,
  CustomDialogBody
} from "@/components/custom-dialog";
import Typography from "@/components/ui/typography";
import { cn } from "@/lib/utils";
import { usePreferencesStore } from "@/stores/usePreferencesStore";
import { useThemeStore } from "@/stores/useThemeStore";
import { AnimatePresence, motion } from "framer-motion";
import {
  Accessibility,
  Activity,
  Bell,
  Globe,
  Laptop,
  MessageSquare,
  Monitor,
  Shield,
  Volume2,
} from "lucide-react";
import { useParams } from "next/navigation";
import { useEffect, useState } from "react";
import PreferencesAppearance from "./appearance";
import { updateProfileApi } from "@/apis";

const TABS = [
  { id: "notifications", label: "Notifications", icon: Bell },
  { id: "appearance", label: "Appearance", icon: Monitor },
  { id: "messages-media", label: "Messages & media", icon: MessageSquare },
  { id: "language", label: "Language & region", icon: Globe },
  { id: "accessibility", label: "Accessibility", icon: Accessibility },
  { id: "audio-video", label: "Audio & video", icon: Volume2 },
  { id: "privacy", label: "Privacy & visibility", icon: Shield },
  { id: "advanced", label: "Advanced", icon: Activity },
];

export const PreferencesDialog = () => {
  const { isOpen, close } = usePreferencesStore();
  const [activeTab, setActiveTab] = useState("notifications");
  const [overlayTransparent, setOverlayTransparent] = useState(false);
  const { workspaceId } = useParams() as { workspaceId: string };

  const { theme, savedTheme, resetTheme, confirmTheme } = useThemeStore();

  // Navigation interception state
  const [pendingTab, setPendingTab] = useState<string | null>(null);
  const [isClosingPending, setIsClosingPending] = useState(false);
  const [showConfirmation, setShowConfirmation] = useState(false);

  const isDirty = JSON.stringify(theme) !== JSON.stringify(savedTheme);

  const handleTabChange = (tabId: string) => {
    if (activeTab === "appearance" && isDirty) {
      setPendingTab(tabId);
      setShowConfirmation(true);
      return;
    }
    setActiveTab(tabId);
    setOverlayTransparent(tabId === "appearance");
  };

  const handleDialogClose = () => {
    if (activeTab === "appearance" && isDirty) {
      setIsClosingPending(true);
      setShowConfirmation(true);
      return;
    }
    close();
  };

  const proceedWithNavigation = () => {
    if (isClosingPending) {
      close();
    } else if (pendingTab) {
      setActiveTab(pendingTab);
      setOverlayTransparent(pendingTab === "appearance");
    }
    resetPendingActions();
  };

  const resetPendingActions = () => {
    setPendingTab(null);
    setIsClosingPending(false);
    setShowConfirmation(false);
  };

  const handleUndo = () => {
    resetTheme();
    proceedWithNavigation();
  };

  const handleSave = async () => {
    if (!workspaceId) return;
    try {
      await updateProfileApi(workspaceId, {
        theme: JSON.stringify(theme),
      });
      confirmTheme();
      proceedWithNavigation();
    } catch (error) {
      console.error("Failed to save theme", error);
    }
  };

  const handleKeepEditing = () => {
    resetPendingActions();
  };

  return (
    <CustomDialog
      open={isOpen}
      onOpenChange={handleDialogClose}
      maxWidth="820px"
      overlayTransparent={overlayTransparent}
    >
      <CustomDialogHeader onOpenChange={handleDialogClose}>
        <CustomDialogTitle className="text-xl font-bold">
          Preferences
        </CustomDialogTitle>
      </CustomDialogHeader>

      <div className="flex bg-white dark:bg-[#1A1D21] h-[650px]">
        {/* Sidebar */}
        <div className="min-w-[205px] flex flex-col pt-4 px-3 border-r border-[#2C2E33]">
          <div className="flex-1 overflow-y-auto custom-scrollbar pr-2">
            {TABS.map((tab) => (
              <button
                key={tab.id}
                onClick={() => handleTabChange(tab.id)}
                className={cn(
                  "w-full flex items-center gap-3 px-3 py-1.5 mt-1 text-sm transition-all duration-200 dark:text-[#d1d2d3] hover:bg-white/5 rounded-sm",
                  activeTab === tab.id &&
                  "bg-[#1164A3] text-white hover:bg-[#1164A3] font-medium",
                )}
              >
                <tab.icon
                  size={18}
                  className={cn(
                    activeTab === tab.id ? "text-white" : "dark:text-[#d1d2d3]",
                  )}
                />
                <span>{tab.label}</span>
              </button>
            ))}
          </div>
        </div>

        {/* Content Area */}
        <div className="flex-1 flex flex-col bg-white dark:bg-[#1A1D21] relative overflow-hidden">
          <div className="flex-1 overflow-y-auto custom-scrollbar overflow-x-hidden">
            <AnimatePresence mode="wait">
              <motion.div
                key={activeTab}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -10 }}
                transition={{ duration: 0.15 }}
                className="px-8 py-6"
              >
                {activeTab === "appearance" && (
                  <PreferencesAppearance />
                )}

                {!["appearance"].includes(activeTab) && (
                  <div className="flex flex-col items-center justify-center py-20 dark:text-[#d1d2d3]/50">
                    <Laptop size={64} className="mb-6 opacity-10" />
                    <Typography
                      text="This preference item is coming soon"
                      variant="p"
                      className="text-base italic font-light"
                    />
                  </div>
                )}
              </motion.div>
            </AnimatePresence>
          </div>

          {/* Unsaved Changes Confirmation Footer */}
          {showConfirmation && (
            <div className="absolute bottom-0 left-0 right-0 bg-[#F8F8F8] dark:bg-[#1A1D21] border-t border-[#313338] p-4 flex items-center justify-between z-30 animate-in slide-in-from-bottom-5 duration-300 shadow-2xl">
              <div className="flex flex-col">
                <Typography text="Save changes?" className="font-bold dark:text-white text-sm" />
                <Typography text="This will change the appearance of your Slack." className="text-xs text-gray-400" />
              </div>
              <div className="flex items-center gap-2">
                <button
                  onClick={handleUndo}
                  className="px-4 py-2 text-sm font-bold dark:text-white hover:bg-white/10 rounded-sm transition-colors border border-[#565856]"
                >
                  Undo changes
                </button>
                <button
                  onClick={handleKeepEditing}
                  className="px-4 py-2 text-sm font-bold dark:text-white hover:bg-white/10 rounded-sm transition-colors border border-[#565856]"
                >
                  Keep editing
                </button>
                <button
                  onClick={handleSave}
                  className="px-4 py-2 text-sm font-bold bg-selection-hover hover:bg-[#0E4F82] text-white rounded-sm transition-colors"
                >
                  Save changes
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </CustomDialog>
  );
};
