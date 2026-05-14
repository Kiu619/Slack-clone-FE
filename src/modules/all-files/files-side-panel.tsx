import { Theme } from "@/stores/useThemeStore";
import React from "react";

export default function FilesSidePanel({ theme }: { theme: Theme }) {
  return (
    <div className="flex flex-col h-full">
      <span className="text-lg font-extrabold text-workspace-side-panel-text">
        All files
      </span>
    </div>
  );
}
