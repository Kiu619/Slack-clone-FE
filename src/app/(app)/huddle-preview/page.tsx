"use client"

import { Suspense } from "react"
import { useSearchParams } from "next/navigation"
import { HuddlePreviewWindow } from "@/modules/huddle-preview/huddle-preview-window"
import type { HuddlePreviewTargetType } from "@/lib/open-huddle-preview-window"
import { ThemeProvider } from "@/providers/theme-provider"
import { ThemeScope } from "@/components/theme-scope"
import { defaultTheme } from "@/stores/useThemeStore"

function readParam(value: string | null, fallback = "") {
  return value?.trim() || fallback
}

function HuddlePreviewPageContent() {
  const searchParams = useSearchParams()
  const workspaceId = readParam(searchParams.get("workspaceId"))
  const rawEntityType = readParam(searchParams.get("entityType"), "channel")
  const entityType: HuddlePreviewTargetType =
    rawEntityType === "dm" ? "dm" : "channel"
  const entityId = readParam(searchParams.get("entityId"))
  const label = readParam(searchParams.get("label"))
  const mode = readParam(searchParams.get("mode"), "start")

  if (!workspaceId || !entityId || !label) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-black px-4 text-white">
        <div className="max-w-md rounded-xl border border-white/10 bg-white/5 px-6 py-5 text-center shadow-2xl">
          <h1 className="text-lg font-semibold">Huddle preview unavailable</h1>
          <p className="mt-2 text-sm text-white/70">
            Missing workspace, entity, or label information for this popup.
          </p>
        </div>
      </div>
    )
  }

  return (
    <HuddlePreviewWindow
      workspaceId={workspaceId}
      entityType={entityType}
      entityId={entityId}
      label={label}
      mode={mode === "join" ? "join" : "start"}
    />
  )
}

export default function HuddlePreviewPage() {
  return (
    <ThemeProvider attribute="class" defaultTheme="system" enableSystem disableTransitionOnChange>
      <ThemeScope scope="huddle-preview" initialTheme={defaultTheme}>
        <Suspense
          fallback={
            <div className="flex min-h-screen items-center justify-center bg-black px-4 text-white">
              <div className="max-w-md rounded-xl border border-white/10 bg-white/5 px-6 py-5 text-center shadow-2xl">
                <h1 className="text-lg font-semibold">Loading huddle preview...</h1>
                <p className="mt-2 text-sm text-white/70">
                  Preparing the popup window.
                </p>
              </div>
            </div>
          }
        >
          <HuddlePreviewPageContent />
        </Suspense>
      </ThemeScope>
    </ThemeProvider>
  )
}
