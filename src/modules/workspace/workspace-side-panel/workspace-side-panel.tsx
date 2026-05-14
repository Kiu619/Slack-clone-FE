"use client"

import { Channel, User, Workspace } from "@/lib/types"
import { Separator } from "@/components/ui/separator"
import DraftsAndSend from "./drafts-and-send/drafts-and-send"
import HeaderTitle from "./header-title"
import Huddle from "./huddle/huddle"
import NewMessage from "./new-message"
import Setting from "./setting"
import Starred from "./starred/starred"
import Thread from "./threads/threads"
import Channels from "./channels/channels"
import DirectMessages from "../../direct-messages/direct-messages"
import { useThemeStore, type Theme } from "@/stores/useThemeStore"

interface Props {
  theme: Theme
  currentWorkspaceData: Workspace
  userData: User
  userWorkspaceChannels: Channel[]
}

const WorkspaceSidePanel = ({ theme, currentWorkspaceData, userData, userWorkspaceChannels }: Props) => {
  return (
    <>
      <div className="flex justify-between items-center">
        <HeaderTitle currentWorkspaceData={currentWorkspaceData} />

        <div className="flex gap-x-2">
          <Setting />


          <NewMessage />

        </div>
      </div>

      <div className="">
        <Thread theme={theme} workspaceId={currentWorkspaceData.id} />

        <Huddle />

        <DraftsAndSend theme={theme} workspaceId={currentWorkspaceData.id} />
      </div>

      <Separator className="my-2 h-[0.5px]" />

      <div className="">
        <Starred theme={theme} currentWorkspaceData={currentWorkspaceData} />

        <Channels theme={theme} currentWorkspaceData={currentWorkspaceData} userWorkspaceChannels={userWorkspaceChannels} />

        <DirectMessages theme={theme} currentWorkspaceData={currentWorkspaceData} />
      </div>
    </>
  )
}

export default WorkspaceSidePanel
