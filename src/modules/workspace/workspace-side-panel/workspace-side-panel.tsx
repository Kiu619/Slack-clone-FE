"use client"

import { Channel, User, Workspace } from "@/lib/types"
import { Separator } from "@/components/ui/separator"
import DratfsAndSend from "./drafts-and-send/drafts-and-send"
import HeaderTitle from "./header-title"
import Huddle from "./huddle/huddle"
import NewMessage from "./new-message"
import Setting from "./setting"
import Starred from "./starred/starred"
import Thread from "./thread/thread"
import Channels from "./channels/channels"
import DirectMessages from "./direct-messages/direct-messages"

interface Props {
  currentWorkspaceData: Workspace
  userData: User
  userWorkspaceChannels: Channel[]
}

const WorkspaceSidePanel = ({ currentWorkspaceData, userData, userWorkspaceChannels }: Props) => {
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
        <Thread />

        <Huddle />

        <DratfsAndSend />
      </div>

      <Separator className="my-2" />

      <div className="">
        <Starred />

        <Channels currentWorkspaceData={currentWorkspaceData} userWorkspaceChannels={userWorkspaceChannels} />

        {/* <DirectMessages /> */}
      </div>
    </>
  )
}

export default WorkspaceSidePanel
