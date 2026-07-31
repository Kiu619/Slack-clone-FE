"use client";

import { getEffectiveOnline, getPresenceDotClass, getPresenceLabel } from "@/lib/presence";
import { cn } from "@/lib/utils";
import { useWorkspaceUserSocketPresence } from "@/stores/useWorkspacePresenceStore";

export function UserPresenceIndicator({
  workspaceId,
  userId,
  isAway,
  className,
  showLabel = false,
  size = "md",
}: {
  workspaceId: string;
  userId: string | undefined | null;
  isAway?: boolean | null;
  className?: string;
  showLabel?: boolean;
  size?: "sm" | "md" | "lg";
}) {
  const hasSocketConnection = useWorkspaceUserSocketPresence(workspaceId, userId);
  const isOnline = getEffectiveOnline(hasSocketConnection, isAway);
  const dotClass = getPresenceDotClass(isOnline);
  const label = getPresenceLabel(isOnline);
  const dotSize =
    size === "sm" ? "size-2" : size === "lg" ? "size-3" : "size-2.5";

  return (
    <div className={cn("inline-flex items-center gap-1.5", className)}>
      <span
        className={cn(
          "inline-flex shrink-0 rounded-full border border-white/80 dark:border-[#1A1D21]",
          dotSize,
          dotClass,
        )}
        aria-label={label}
      />
      {showLabel ? (
        <span className="text-xs text-[#616061] dark:text-[#ababad]">{label}</span>
      ) : null}
    </div>
  );
}
