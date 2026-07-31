"use client"

import Link from "next/link"
import { useQuery } from "@tanstack/react-query"
import Typography from '@/components/ui/typography'
import { draftKeys, scheduledMessageKeys } from "@/lib/query-keys"
import { fetchMessageDraftsList } from "@/lib/message-drafts-api"
import { fetchScheduledMessagesList } from "@/lib/scheduled-messages-api"
import { VscSend } from 'react-icons/vsc'
import { LuPencil } from "react-icons/lu"
import { MdOutlineScheduleSend } from "react-icons/md"
import { usePathname } from "next/navigation";
import { Theme } from "@/stores/useThemeStore";

type DraftsAndSendProps = {
  theme: Theme
  workspaceId: string
}

const capCount = (n: number) => (n > 99 ? "99+" : String(n))

const DraftsAndSend = ({ theme, workspaceId }: DraftsAndSendProps) => {
  const { data: draftList = [] } = useQuery({
    queryKey: draftKeys.list(workspaceId),
    queryFn: () => fetchMessageDraftsList(workspaceId),
    enabled: !!workspaceId,
    staleTime: 30_000,
  })
  const draftCount = draftList.length

  const { data: pendingScheduled = [] } = useQuery({
    queryKey: scheduledMessageKeys.list(workspaceId, "pending"),
    queryFn: () => fetchScheduledMessagesList(workspaceId, "pending"),
    enabled: !!workspaceId,
    staleTime: 30_000,
  })
  const scheduledCount = pendingScheduled.length

  const pathname = usePathname();
  const isActive = pathname === `/workspace/${workspaceId}/drafts`;

  return (
    <Link
      href={`/workspace/${workspaceId}/drafts`}
      style={isActive ? { backgroundColor: theme.selectedItems } : {}}
      className={`flex min-w-0 items-center gap-x-2 px-3 py-1 hover:bg-[rgba(255,255,255,0.1)] cursor-pointer rounded-md ${isActive ? "text-workspace-text-active" : ""}`}
    >
      <VscSend size={20} className={isActive ? "shrink-0 text-workspace-text-active" : "shrink-0 text-workspace-side-panel-text"} />
      <Typography
        text="Drafts & scheduled"
        variant="p"
        className={`min-w-0 flex-1 text-[15px]! ${isActive ? "text-workspace-text-active" : "text-workspace-side-panel-text"}`}
      />
      {(draftCount > 0 || scheduledCount > 0) ? (
        <div
          className={`flex shrink-0 items-center gap-2.5 text-[12px] font-semibold tabular-nums ${isActive ? "text-workspace-text-active/80" : "text-workspace-side-panel-text/80"}`}
          aria-label={`${draftCount} drafts, ${scheduledCount} scheduled`}
        >
          {draftCount > 0 ? (
            <span className="flex items-center gap-0.5" title="Drafts">
              <LuPencil size={14} className="opacity-90" aria-hidden />
              <span>{capCount(draftCount)}</span>
            </span>
          ) : null}
          {scheduledCount > 0 ? (
            <span className="flex items-center gap-0.5" title="Scheduled">
              <MdOutlineScheduleSend size={16} className="opacity-90" aria-hidden />
              <span>{capCount(scheduledCount)}</span>
            </span>
          ) : null}
        </div>
      ) : null}
    </Link>
  )
}

export default DraftsAndSend
