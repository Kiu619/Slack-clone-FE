"use client"

import { useTranslations } from "next-intl"
import { useLanguageRegionStore } from "@/stores/useLanguageRegionStore"
import type { Language, TimeFormat } from "@/stores/useLanguageRegionStore"

export function useAppTranslation(namespace?: string) {
  return useTranslations(namespace)
}

export function useDialogs() {
  return useTranslations("dialogs")
}

export function useLocale() {
  return useTranslations()("") ? "" : ""
}

export function useLanguage(): Language {
  return useLanguageRegionStore((state) => state.language)
}

export function useTimeFormat(): TimeFormat {
  return useLanguageRegionStore((state) => state.timeFormat)
}

export function useHuddle() {
  return useTranslations("huddlePreview")
}

export function useMessageList() {
  return useTranslations("messageList")
}
