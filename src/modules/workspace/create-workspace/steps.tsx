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
import { defaultTheme } from '@/stores/useThemeStore'


const Steps = () => {
  const { name, currStep, emails } = useCreateWorkspaceValues()
  const theme = defaultTheme

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

  const getWorkspaceSidePanelBackground = () => {
    const baseColor = `color-mix(in srgb, ${theme.systemNav}, var(--theme-mix-base) var(--theme-mix-sidepanel))`

    if (theme.isGradient) {
      const blendColor = `color-mix(in srgb, ${theme.selectedItems}, var(--theme-mix-base) var(--theme-mix-sidepanel))`
      return `linear-gradient(to bottom, ${baseColor}, ${blendColor})`
    }

    return baseColor
  }

  return (
    <ResizablePanelGroup
      orientation="horizontal"
      className="h-full w-full overflow-hidden rounded-lg border border-[#462B4A] bg-white shadow-sm dark:bg-[#1A1D21] md:min-w-[450px]"
    >
      <ResizablePanel
        defaultSize={23}
        style={{ background: getWorkspaceSidePanelBackground() }}
      >
        <div className="flex h-full flex-col gap-2 p-6">
          <Typography text={name ?? ''} variant="h6" className="text-white" />

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
      <ResizablePanel defaultSize={77} className="flex h-full min-h-0 items-stretch bg-white p-6 dark:bg-[#1A1D21]">
        <div className="flex h-full w-full flex-col gap-4 px-6 py-10 lg:max-w-3xl lg:pl-12">
          {stepInView}
        </div>
      </ResizablePanel>
    </ResizablePanelGroup>
  )
}

export default Steps
