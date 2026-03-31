"use client"

import { GoChevronDown } from "react-icons/go"
import { TfiMobile } from "react-icons/tfi"
import Avatar from "@/components/avatar"
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover"
import { Separator } from "@/components/ui/separator"
import { Workspace } from "@/lib/types"
import { usePreferencesStore } from "@/stores/usePreferencesStore"

interface Props {
  currentWorkspaceData: Workspace
}

const HeaderTitle = ({ currentWorkspaceData }: Props) => {
  const { open: openPreferences } = usePreferencesStore()
  return (
    <Popover>
      <PopoverTrigger asChild>
        <button
          className="flex items-center gap-x-2 hover:bg-[rgba(255,255,255,0.1)] px-2 hover:cursor-pointer rounded-md"
        >
          <span className="text-lg font-extrabold">{currentWorkspaceData.name}</span>
          <GoChevronDown />
        </button>
      </PopoverTrigger>
      <PopoverContent
        withOverlay={true}
        align='start'
        className="translate-x-[-20px]"
      >
        <div className="py-3">
          <div className="flex items-center gap-x-2 px-6">
            {currentWorkspaceData.imageUrl ? (
              <div className='w-9 h-9 rounded-lg'>
                <Avatar src={currentWorkspaceData.imageUrl} className='w-9 h-9 rounded-lg' />
              </div>
            ) : (
              <div className='text-center place-content-center cursor-pointer items-center text-black w-9 h-9 rounded-lg overflow-hidden bg-[#ABABAD] font-bold text-xl'>
                {currentWorkspaceData.name.slice(0, 1).toUpperCase()}
              </div>
            )}
            <span className="font-bold">{currentWorkspaceData.name}</span>
          </div>
          <Separator className="my-2" />
          <div className="px-6 text-[13px]">
            Your workspaces is currently on Slack&apos;s Pro Trial
          </div>
          <Separator className="my-2" />
          <div className="px-6 hover:bg-selection-hover cursor-pointer">Invite people to {currentWorkspaceData.name}</div>
          <Separator className="my-2" />
          <div
            className="px-6 hover:bg-selection-hover cursor-pointer"
            onClick={openPreferences}
          >
            Preferences
          </div>
          <Separator className="my-2" />
          <div className="px-6 flex items-center justify-between hover:bg-selection-hover cursor-pointer">Get the mobile app
            <TfiMobile />
          </div>
          <Separator className="my-2" />
          <div className="px-6 hover:bg-selection-hover cursor-pointer">Sign out</div>

        </div>
      </PopoverContent>
    </Popover>
  )
}

export default HeaderTitle
