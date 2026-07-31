"use client"

import Sidebar from './sidebar'
import Steps from './steps'
import Toolbar from './toolbar'
import { getContrastTextColor } from "@/lib/color-contrast"
import { defaultTheme } from "@/stores/useThemeStore"
import { useMemo } from "react"

const CreateWorkspaceMain = () => {
  const theme = defaultTheme

  const sysNavBackground = useMemo(() => {
    const baseColor = `color-mix(in srgb, ${theme.systemNav}, var(--theme-mix-base) var(--theme-mix-sysnav))`

    if (theme.isGradient) {
      const blendColor = `color-mix(in srgb, ${theme.selectedItems}, var(--theme-mix-base) var(--theme-mix-sysnav))`
      return `linear-gradient(to bottom right, ${baseColor}, ${blendColor})`
    }

    return baseColor
  }, [theme])

  const sidePanelBackground = useMemo(() => {
    const baseColor = `color-mix(in srgb, ${theme.systemNav}, var(--theme-mix-base) var(--theme-mix-sidepanel))`

    if (theme.isGradient) {
      const blendColor = `color-mix(in srgb, ${theme.selectedItems}, var(--theme-mix-base) var(--theme-mix-sidepanel))`
      return `linear-gradient(to bottom, ${baseColor}, ${blendColor})`
    }

    return baseColor
  }, [theme])

  const selectedItemTextColor = getContrastTextColor(theme.selectedItems)

  return (
    <div
      className="workspace-theme flex h-screen w-screen flex-col overflow-hidden"
      style={{
        background: sysNavBackground,
        ['--create-workspace-sysnav-bg' as string]: sysNavBackground,
        ['--create-workspace-sidepanel-bg' as string]: sidePanelBackground,
        ['--color-selection-hover-foreground' as string]: selectedItemTextColor,
        ['--color-workspace-text-active' as string]: selectedItemTextColor,
      }}
    >
      <Toolbar />
      <div className="flex min-h-0 flex-1">
        <Sidebar />
        <div className="mr-1 mb-1 flex-1 min-w-0">
          <Steps />
        </div>
      </div>
    </div>
  )
}

export default CreateWorkspaceMain
