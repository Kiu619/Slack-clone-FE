"use client"

import Typography from "@/components/ui/typography";
import { cn } from "@/lib/utils";
import { Theme } from "@/stores/useThemeStore";
import { redirect, usePathname } from "next/navigation";
import { BiMessageSquareDetail } from "react-icons/bi";

const Threads = ({ theme, workspaceId }: { theme: Theme, workspaceId: string }) => {
  const pathname = usePathname();
  const isActive = pathname === `/workspace/${workspaceId}/threads`;
  return (
    <div
      className={cn("flex items-center gap-x-2 px-3 py-1 hover:bg-[rgba(255,255,255,0.1)] cursor-pointer rounded-md")}
      style={isActive ? { backgroundColor: theme.selectedItems } : {}}
      onClick={() => redirect(`/workspace/${workspaceId}/threads`)}
    >
      <BiMessageSquareDetail
        size={20}
        className={cn("text-workspace-side-panel-text", isActive ? "text-white" : "")}
      />
      <Typography
        text="Threads"
        variant="p"
        className={cn("text-[15px]! text-workspace-side-panel-text ", isActive ? "text-white" : "")}
      />
    </div>
  );
};

export default Threads;
