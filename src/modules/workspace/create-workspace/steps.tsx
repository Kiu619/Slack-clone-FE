'use client'

import {
  ResizableHandle,
  ResizablePanel,
  ResizablePanelGroup
} from "@/components/ui/resizable"
import Typography from "@/components/ui/typography"

import { useCreateWorkspaceValues } from '@/stores/useCreateWorkspaceStore'
import { useMemo } from "react"

import Avatar from "@/components/avatar"
import Step1 from "./step1"
import Step2 from "./step2"
import Step3 from "./step3"
import Step4 from "./step4"


const Steps = () => {
  const { name, currStep, emails } = useCreateWorkspaceValues()

  const stepInView = useMemo(() => {
    switch (currStep) {
      case 1:
        return <Step1 />
      case 2:
        return <Step2 />
      case 3:
        return <Step3 />
      case 4:
        return <Step4 />
    }
  }, [currStep])

  return (
    <ResizablePanelGroup
      orientation="horizontal"
      className="h-full rounded-lg border border-[#462B4A] md:min-w-[450px] w-full"
    >
      <ResizablePanel defaultSize={23}>
        <div className="flex flex-col gap-2 h-full p-6 bg-[#231226]">
          <Typography text={name ?? ''} variant="h6" className="text-white " />

          {currStep >= 3 &&
            (<>
              <Typography text="Direct Message" variant="p" className="text-white text-sm!" />
              {emails.length > 0 && emails.map((email) => (
                <div className="flex items-center gap-2 ml-2" key={email}>
                  <Avatar src="https://a.slack-edge.com/bv1-13-br/ava_0002-72-c702398.png" />
                  <Typography text={email.split('@')[0]} variant="p" className="text-white text-sm!" key={email} />
                </div>
              ))}
            </>)
          }
        </div>
      </ResizablePanel>
      <ResizableHandle />
      <ResizablePanel defaultSize={77} className="h-full items-center justify-center p-6 bg-white dark:bg-[#1A1D21]">
        <div className="flex flex-col gap-4 lg:w-[50%] w-[80%] p-10">
          {stepInView}
        </div>
      </ResizablePanel>
    </ResizablePanelGroup>
  )
}

export default Steps
