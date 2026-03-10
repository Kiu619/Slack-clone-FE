"use client"

import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger
} from "@/components/ui/collapsible"
import Typography from '@/components/ui/typography'
import { useState } from 'react'
import { SlStar } from 'react-icons/sl'
import { FaCaretDown, FaCaretRight } from "react-icons/fa"

const Starred = () => {
  const [open, setOpen] = useState(false)
  const [hovered, setHovered] = useState(false)
  return (
    <Collapsible open={open} onOpenChange={setOpen}>

      <CollapsibleTrigger asChild>
        <div className="flex items-center gap-x-2 px-3 py-1 hover:bg-[#312235] cursor-pointer rounded-md" onMouseEnter={() => setHovered(true)} onMouseLeave={() => setHovered(false)}>
          {!hovered && <SlStar size={15} className="text-workspace-side-panel-text" />}
          {hovered && open && <FaCaretDown size={15} className="text-workspace-side-panel-text" />}
          {hovered && !open && <FaCaretRight size={15} className="text-workspace-side-panel-text" />}
          <Typography text='Starred' variant='p' className="text-[15px]! text-workspace-side-panel-text" />
        </div>
      </CollapsibleTrigger>

      <CollapsibleContent>
        <div>
          <div>Starred</div>
        </div>
      </CollapsibleContent>

    </Collapsible>
  )
}

export default Starred
