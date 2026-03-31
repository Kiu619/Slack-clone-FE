"use client"

import Typography from "@/components/ui/typography"
import { Channel } from "@/lib/types"
import { FiHash } from "react-icons/fi"
import { RiHeadphoneLine } from 'react-icons/ri'

import {
  Tooltip,
  TooltipContent,
  TooltipTrigger
} from "@/components/ui/tooltip"
import { IoMdMore } from "react-icons/io"
import { IoChevronDownOutline, IoPersonOutline } from "react-icons/io5"

const Header = ({ currentChannelData }: { currentChannelData: Channel }) => {
  return (
    <div className="flex items-center justify-between">
      <Tooltip>
        <TooltipTrigger asChild>
          <div className="flex items-center gap-1 cursor-pointer hover:bg-[#222529] px-2 py-1 rounded-md">
            <FiHash size={18} />
            <Typography text={currentChannelData.name} variant='p' className="text-[18px]!" />
          </div>
        </TooltipTrigger>

        <TooltipContent
          side='bottom'
        >
          <Typography text="Get channel details" variant='p' className="text-[14px]!" />
        </TooltipContent>
      </Tooltip>


      <div className="flex items-center gap-1">
        <Tooltip>
          <TooltipTrigger asChild>
            <button className="flex items-center gap-1 cursor-pointer hover:bg-[rgba(255,255,255,0.5)] dark:hover:bg-[#222529] px-2 py-1 rounded-md border border-[#797c814d]">
              <IoPersonOutline size={18} />
              <Typography text="Members" variant='p' className="text-[13px]!" />
            </button>
          </TooltipTrigger>
          <TooltipContent
            side='bottom'
            align='center'
          >
            <Typography text="View all members of this channel" variant='p' className="text-[14px]!" />
          </TooltipContent>
        </Tooltip>


        <div className="flex items-center rounded-md border border-[#797c814d]">
          <Tooltip>
            <TooltipTrigger asChild>
              <button className="cursor-pointer hover:bg-[rgba(255,255,255,0.5)] dark:hover:bg-[#222529] px-2 py-1 rounded-l-md">
                <RiHeadphoneLine size={18} />
              </button>
            </TooltipTrigger>
            <TooltipContent
              side='bottom'
              align='center'
            >
              <Typography text="Start huddle" variant='p' className="text-[14px]!" />
            </TooltipContent>
          </Tooltip>

          <span className="h-4 w-px bg-[#797c814d]"></span>

          <Tooltip>
            <TooltipTrigger asChild>
              <button className="cursor-pointer hover:bg-[rgba(255,255,255,0.5)] dark:hover:bg-[#222529] px-2 py-1 rounded-r-md">
                <IoChevronDownOutline size={16} />
              </button>
            </TooltipTrigger>
            <TooltipContent
              side='bottom'
              align='center'
            >
              <Typography text="More options" variant='p' className="text-[14px]!" />
            </TooltipContent>
          </Tooltip>
        </div>

        <Tooltip>
          <TooltipTrigger asChild>
            <button className="cursor-pointer hover:bg-[rgba(255,255,255,0.5)] dark:hover:bg-[#222529] px-2 py-1 rounded-md">
              <IoMdMore size={20} />
            </button>
          </TooltipTrigger>
          <TooltipContent
            side='bottom'
            align='center'
          >
            <Typography text="More actions" variant='p' className="text-[14px]!" />
          </TooltipContent>
        </Tooltip>
      </div>
    </div>
  )
}

export default Header
