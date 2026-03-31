"use client"

import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger
} from "@/components/ui/collapsible"
import Typography from '@/components/ui/typography'
import { useState } from 'react'
import { FaCaretDown, FaCaretRight } from "react-icons/fa"
import { FiHash } from "react-icons/fi"

const DirectMessages = () => {
  const [open, setOpen] = useState(false)
  return (
    <Collapsible open={open} onOpenChange={setOpen}>

      <CollapsibleTrigger asChild>
        <div className="flex items-center gap-x-2 px-3 py-1 hover:bg-[rgba(255,255,255,0.1)] cursor-pointer rounded-md">
          {open ? <FaCaretDown size={15} className="text-workspace-side-panel-text" /> : <FaCaretRight size={15} className="text-workspace-side-panel-text" />}
          <Typography text='Direct Messages' variant='p' className="text-[15px]! text-workspace-side-panel-text" />
        </div>
      </CollapsibleTrigger>

      <CollapsibleContent>
        <div className="flex items-center gap-x-2 px-3 py-1 hover:bg-[rgba(255,255,255,0.1)] cursor-pointer rounded-md">
          <FiHash size={14} className="text-workspace-side-panel-text" />
          <Typography text='Channels' variant='p' className="text-[14px]! text-workspace-side-panel-text" />
        </div>
      </CollapsibleContent>

    </Collapsible>
  )
}

export default DirectMessages
