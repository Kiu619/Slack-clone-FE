"use client"

import { useLayoutEffect } from 'react'
import type { ReactNode } from 'react'
import { defaultTheme, useThemeStore, type Theme } from '@/stores/useThemeStore'

interface ThemeScopeProps {
  scope: string
  initialTheme?: Theme
  children: ReactNode
}

export function ThemeScope({
  scope,
  initialTheme = defaultTheme,
  children,
}: ThemeScopeProps) {
  const setScope = useThemeStore((s) => s.setScope)

  useLayoutEffect(() => {
    setScope(scope, initialTheme)
  }, [initialTheme, scope, setScope])

  return children
}
