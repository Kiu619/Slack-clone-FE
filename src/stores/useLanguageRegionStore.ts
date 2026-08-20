import { create } from 'zustand'

export type DateFormat = 'en_US' | 'vi_VN'
export type TimeFormat = '12h' | '24h'
export type Language = 'en' | 'vi'

export interface MemberPreferences {
  locale: Language | null
  dateFormat: DateFormat | null
  timeFormat: TimeFormat | null
}

interface LanguageRegionStore {
  timeZone: string
  dateFormat: DateFormat
  timeFormat: TimeFormat
  language: Language

  setTimeZone: (tz: string) => void
  setDateFormat: (fmt: DateFormat) => void
  setTimeFormat: (fmt: TimeFormat) => void
  setLanguage: (lang: Language) => void
  hydrateFromStore: (prefs: MemberPreferences, timeZone: string) => void
}

export const useLanguageRegionStore = create<LanguageRegionStore>()((set) => ({
  timeZone: Intl.DateTimeFormat().resolvedOptions().timeZone,
  dateFormat: 'en_US',
  timeFormat: '12h',
  language: 'en',

  setTimeZone: (tz) => set({ timeZone: tz }),

  setDateFormat: (fmt) => set({ dateFormat: fmt }),

  setTimeFormat: (fmt) => set({ timeFormat: fmt }),

  setLanguage: (lang) => set({ language: lang }),

  hydrateFromStore: (prefs, timeZone) => {
    set({
      language: prefs.locale ?? 'en',
      dateFormat: prefs.dateFormat ?? 'en_US',
      timeFormat: prefs.timeFormat ?? '12h',
      timeZone,
    })
  },
}))
