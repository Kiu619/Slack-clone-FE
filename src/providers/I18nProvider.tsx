/* eslint-disable react-hooks/set-state-in-effect */
"use client"

import { useEffect, useState } from "react"
import type { Locale } from "@/i18n/config"
import en from "@/i18n/messages/en.json"
import vi from "@/i18n/messages/vi.json"
import { useLanguageRegionStore } from "@/stores/useLanguageRegionStore"
import { NextIntlClientProvider } from "next-intl"
import { useMemo } from "react"

export const LANGUAGE_OPTIONS = [
  { label: "English (US)", value: "en" },
  { label: "Tiếng Việt", value: "vi" },
]

const messagesMap: Record<string, typeof en> = {
  en,
  vi,
}

interface I18nProviderProps {
  children: React.ReactNode
  /** Locale from server-side cookie (SSR). Used as default on the first render
   *  so there is no flash — even before Zustand has hydrated. */
  initialLocale?: Locale
}

export function I18nProvider({
  children,
  initialLocale,
}: I18nProviderProps) {
  const storeLanguage = useLanguageRegionStore((s) => s.language)
  const storeSetLanguage = useLanguageRegionStore((s) => s.setLanguage)

  // Track whether this provider has already rendered once.
  // Before mount: use initialLocale (cookie from server) — no flash.
  // After mount: use storeLanguage (Zustand hydrated from query cache).
  const [hasMounted, setHasMounted] = useState(false)

  useEffect(() => {
    if (initialLocale && initialLocale !== storeLanguage) {
      storeSetLanguage(initialLocale)
    }
    setHasMounted(true)
  }, []) // eslint-disable-line react-hooks/exhaustive-deps

  const locale = useMemo<Locale>(() => {
    if (hasMounted) {
      // After first effect run: Zustand is hydrated from TanStack Query cache
      // (via useHydrateLanguageRegionStore in WorkspaceShell) — use it.
      return (storeLanguage || "en") as Locale
    }
    // SSR + first client render: use the server-provided cookie locale.
    // This prevents the flash caused by Zustand's hardcoded 'en' default.
    return (initialLocale || "en") as Locale
  }, [hasMounted, storeLanguage, initialLocale])

  const messages = messagesMap[locale] || messagesMap.en

  return (
    <NextIntlClientProvider locale={locale} messages={messages} timeZone="UTC">
      {children}
    </NextIntlClientProvider>
  )
}

export function getLanguageLabel(value: string) {
  const option = LANGUAGE_OPTIONS.find((opt) => opt.value === value)
  return option?.label || value
}
