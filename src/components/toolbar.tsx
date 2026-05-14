"use client"

import { Workspace } from "@/lib/types"
import { FaMagnifyingGlass } from "react-icons/fa6"
import Typography from "./ui/typography"
import { RecentToolbarPopover } from "@/components/recent-toolbar-popover"
import { useRouter } from "next/navigation"

interface ToolbarProps {
  workspaceId: string
  currentWorkspaceData: Workspace
}

const Toolbar = ({ workspaceId, currentWorkspaceData }: ToolbarProps) => {
  const router = useRouter()

  const goSearch = () => {
    router.push(`/workspace/${workspaceId}/search`)
  }

  return (
    <div className="h-[42px] flex items-center justify-center">
      <div className="flex items-center gap-x-2">
        <RecentToolbarPopover workspaceId={workspaceId} />
        <button
          type="button"
          onClick={goSearch}
          className="max-w-[1000px] lg:w-[950px] w-[500px] bg-[rgba(255,255,255,0.3)] rounded-md hover:cursor-pointer border flex items-center h-[28px] text-left"
        >
          <FaMagnifyingGlass className="text-[#C0B4C2] mx-2 shrink-0" size={14} />
          <Typography text={`Search ${currentWorkspaceData.name}`} variant="p" className="text-[13px]/1 text-white pr-2 " />
        </button>
      </div>
    </div>
  )
}

export default Toolbar
