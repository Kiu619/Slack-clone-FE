"use client"

import { FiSettings } from "react-icons/fi"
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip"
import Typography from "@/components/ui/typography"

const Setting = () => {
  return (
    <Tooltip>
      <TooltipTrigger asChild>
        <button className="hover:bg-[#312235] p-2 rounded-md hover:cursor-pointer border">
          <FiSettings className="text-workspace-side-panel" size={16} />
        </button>
      </TooltipTrigger>
      <TooltipContent
        side='bottom'
      >
        <Typography text='Manage my sidebar' variant='p' className="text-[13px]!" />
      </TooltipContent>
    </Tooltip>
  )
}

export default Setting
