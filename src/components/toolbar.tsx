"use client"

import { Workspace } from "@/lib/types"
import { FaArrowLeft, FaArrowRight } from "react-icons/fa6"
import { TbHistoryToggle } from "react-icons/tb"
import Typography from "./ui/typography"
import { FaMagnifyingGlass } from "react-icons/fa6"

interface ToolbarProps {
  currentWorkspaceData: Workspace
}

const Toolbar = ({ currentWorkspaceData }: ToolbarProps) => {
  return (
    <div className="h-[42px] w-full bg-workspace-background flex items-center justify-center">
      <div className="flex items-center gap-x-2">
        <FaArrowLeft className="text-workspace-side-panel" size={16} />
        <FaArrowRight className="text-workspace-side-panel" size={16} />
        <TbHistoryToggle className="text-workspace-side-panel" size={18} />
        <button className="bg-[#735078] rounded-md hover:cursor-pointer border flex items-center justify-between max-w-[1000px] w-[950px] h-[28px]">
          <Typography text= {`Search ${currentWorkspaceData.name}`} variant="p" className="text-[13px]! text-white pl-2" />
          <FaMagnifyingGlass className="text-[#C0B4C2] mr-2" size={16} />
        </button>
      </div>
    </div>
  )
}

export default Toolbar
