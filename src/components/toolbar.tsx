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
    <div className="h-[42px] flex items-center justify-center">
      <div className="flex items-center gap-x-2">
        <FaArrowLeft className="" size={16} />
        <FaArrowRight className="" size={16} />
        <TbHistoryToggle className="" size={18} />
        <button className="max-w-[1000px] lg:w-[950px] w-[500px] bg-[rgba(255,255,255,0.3)] rounded-md hover:cursor-pointer border flex items-center h-[28px]">
          <FaMagnifyingGlass className="text-[#C0B4C2] mx-2" size={14} />
          <Typography text={`Search ${currentWorkspaceData.name}`} variant="p" className="text-[13px]/1 text-white pr-2 " />
        </button>
      </div>
    </div>
  )
}

export default Toolbar
