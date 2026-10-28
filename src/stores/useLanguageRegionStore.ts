import { create } from 'zustand'

export type TimeFormat = '12h' | '24h'
export type Language = 'en' | 'vi'

export interface MemberPreferences {
  locale: Language | null
  timeFormat: TimeFormat | null
}

interface LanguageRegionStore {
  timeZone: string
  timeFormat: TimeFormat
  language: Language

  setTimeZone: (tz: string) => void
  setTimeFormat: (fmt: TimeFormat) => void
  setLanguage: (lang: Language) => void
  hydrateFromStore: (prefs: MemberPreferences, timeZone: string) => void
}

export const useLanguageRegionStore = create<LanguageRegionStore>()((set) => ({
  timeZone: Intl.DateTimeFormat().resolvedOptions().timeZone,
  timeFormat: '12h',
  language: 'en',

  setTimeZone: (tz) => set({ timeZone: tz }),

  setTimeFormat: (fmt) => set({ timeFormat: fmt }),

  setLanguage: (lang) => set({ language: lang }),

  hydrateFromStore: (prefs, timeZone) => {
    set({
      language: prefs.locale ?? 'en',
      timeFormat: prefs.timeFormat ?? '12h',
      timeZone,
    })
  },
}))
