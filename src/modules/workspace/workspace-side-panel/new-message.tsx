"use client"

import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip"
import Typography from "@/components/ui/typography"
import { FiEdit } from "react-icons/fi"
import { useNewMessageStore } from "@/stores/useNewMessageStore"

const NewMessage = () => {
  const openNewMessage = useNewMessageStore(s => s.openNewMessage)

  return (
    <Tooltip>
      <TooltipTrigger asChild>
        <button 
          onClick={openNewMessage}
          className="hover:bg-[rgba(255,255,255,0.1)] p-2 rounded-md hover:cursor-pointer border flex items-center justify-center"
        >
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
