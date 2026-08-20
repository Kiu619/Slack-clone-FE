'use client'

import { Suspense } from "react"
import { useSearchParams } from "next/navigation"
import { HuddlePreviewWindow } from "@/modules/huddle-preview/huddle-preview-window"
import type { HuddlePreviewTargetType } from "@/lib/open-huddle-preview-window"
import { ThemeProvider } from "@/providers/theme-provider"
import { ThemeScope } from "@/components/theme-scope"
import { defaultTheme } from "@/stores/useThemeStore"
import { useAppTranslation } from "@/hooks/use-translation"

function readParam(value: string | null, fallback = "") {
  return value?.trim() || fallback
}

function HuddlePreviewPageContent() {
  const t = useAppTranslation('huddlePreview')
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
          <h1 className="text-lg font-semibold">{t('unavailable')}</h1>
          <p className="mt-2 text-sm text-white/70">
            {t('missingInfo')}
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

function LoadingFallback() {
  const t = useAppTranslation('huddlePreview')
  return (
    <div className="flex min-h-screen items-center justify-center bg-black px-4 text-white">
      <div className="max-w-md rounded-xl border border-white/10 bg-white/5 px-6 py-5 text-center shadow-2xl">
        <h1 className="text-lg font-semibold">{t('loading')}</h1>
        <p className="mt-2 text-sm text-white/70">
          {t('preparing')}
        </p>
      </div>
    </div>
  )
}

export default function HuddlePreviewPage() {
  return (
    <ThemeProvider attribute="class" defaultTheme="system" enableSystem disableTransitionOnChange>
      <ThemeScope scope="huddle-preview" initialTheme={defaultTheme}>
        <Suspense fallback={<LoadingFallback />}>
          <HuddlePreviewPageContent />
        </Suspense>
      </ThemeScope>
    </ThemeProvider>
  )
}
