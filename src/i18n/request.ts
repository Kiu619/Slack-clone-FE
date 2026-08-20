import { getRequestConfig } from 'next-intl/server'
import { locales, defaultLocale, type Locale } from './config'

function getLocaleFromHeader(acceptLanguage: string | null): Locale {
  if (!acceptLanguage) return defaultLocale

  const languages = acceptLanguage
    .split(',')
    .map((lang) => {
      const [code, q = '1'] = lang.trim().split(';q=')
      return { code: code.trim(), q: parseFloat(q) }
    })
    .sort((a, b) => b.q - a.q)
    .map((l) => l.code)

  for (const lang of languages) {
    const normalized = lang.toLowerCase()
    if (locales.includes(normalized as Locale)) {
      return normalized as Locale
    }
    const base = lang.split('-')[0].toLowerCase()
    const match = locales.find((l) => l.toLowerCase() === base || l.toLowerCase().startsWith(base + '-'))
    if (match) return match
  }

  return defaultLocale
}

export default getRequestConfig(async ({ requestLocale }) => {
  const acceptLanguage = (await requestLocale)?.toString() ?? null
  const locale = getLocaleFromHeader(acceptLanguage)

  return {
    locale,
    timeZone: 'UTC',
    messages: (await import(`./messages/${locale}.json`)).default,
  }
})
