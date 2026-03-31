"use client"

import { useThemeStore } from "@/stores/useThemeStore"
import { useEffect } from "react"

const FONT_MAP: Record<string, string> = {
  arial: "Arial, sans-serif",
  "atkinson-hyperlegible-next": "'Atkinson Hyperlegible Next', sans-serif",
  "comic-sans": "'Comic Sans MS', 'Comic Sans', cursive",
  georgia: "Georgia, serif",
  lato: "Lato, sans-serif",
  "noto-sans": "'Noto Sans', sans-serif",
  "open-dyslexic": "OpenDyslexic, sans-serif",
  "roboto-mono": "'Roboto Mono', monospace",
  "segoe-ui": "'Segoe UI', Tahoma, Geneva, Verdana, sans-serif",
  verdana: "Verdana, Geneva, sans-serif",
}

export function FontInjector() {
  const { theme } = useThemeStore()

  useEffect(() => {
    const fontFamily = theme.fontFamily ? FONT_MAP[theme.fontFamily] : FONT_MAP["lato"]
    if (fontFamily) {
      document.documentElement.style.setProperty("--font-family", fontFamily)
    }
  }, [theme.fontFamily])

  return null
}
