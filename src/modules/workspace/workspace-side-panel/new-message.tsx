"use client"

import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip"
import Typography from "@/components/ui/typography"
import { FiEdit } from "react-icons/fi"

const NewMessage = () => {
  return (
    <Tooltip>
      <TooltipTrigger asChild>
        <button className="hover:bg-[#312235] p-2 rounded-md hover:cursor-pointer border">
          <FiEdit className="text-workspace-side-panel" size={16} />
        </button>
      </TooltipTrigger>
      <TooltipContent
        side='bottom'
      >
        <Typography text='New messages' variant='p' className="text-[13px]!" />
      </TooltipContent>
    </Tooltip>
  )
}

export default NewMessage
