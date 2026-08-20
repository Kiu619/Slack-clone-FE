"use client"

import { useParams } from "next/navigation"
import { useEffect, useState } from "react"
import { CustomSelect } from "@/components/custom-select"
import { Separator } from "@/components/ui/separator"
import Typography from "@/components/ui/typography"
import { TIMEZONE_OPTIONS, formatLocalTimeInTimeZone } from "@/lib/timezone"
import { cn } from "@/lib/utils"
import {
  type DateFormat,
  type Language,
  type TimeFormat,
} from "@/stores/useLanguageRegionStore"
import { useAppTranslation } from "@/hooks/use-translation"
import { LANGUAGE_OPTIONS } from "@/providers/I18nProvider"
import { useLanguageRegionAutosave } from "@/hooks/useLanguageRegionAutosave"

const DATE_FORMAT_OPTIONS: Array<{
  id: DateFormat
  labelKey: string
}> = [
  { id: "en_US", labelKey: "MM/DD/YYYY" },
  { id: "vi_VN", labelKey: "DD/MM/YYYY" },
]

export default function PreferencesLanguageRegion() {
  const t = useAppTranslation("languageRegion")
  const { workspaceId } = useParams<{ workspaceId: string }>()

  const {
    language,
    dateFormat,
    timeFormat,
    timeZone,
    setLanguage,
    setDateFormat,
    setTimeFormat,
    setTimeZone,
  } = useLanguageRegionAutosave({ workspaceId })

  // Local clock display for the selected time zone
  const [localTime, setLocalTime] = useState<string>("")

  useEffect(() => {
    const updateTime = () => {
      setLocalTime(formatLocalTimeInTimeZone(timeZone))
    }
    updateTime()
    const interval = setInterval(updateTime, 1000)
    return () => clearInterval(interval)
  }, [timeZone])

  return (
    <div className="space-y-6">
      {/* Language */}
      <section>
        <Typography text={t("language")} variant="p" className="font-bold mb-2" />
          <Typography
            text={t("languageDescription")}
            variant="p"
            className="mb-3 text-sm text-muted-foreground"
          />
        <div className="max-w-sm">
          <CustomSelect
            options={LANGUAGE_OPTIONS}
            value={language}
            onChange={(v) => setLanguage(v as Language)}
            placeholder={t("selectLanguage")}
          />
        </div>
      </section>

      <Separator />

      {/* Time zone */}
      <section>
        <Typography text={t("timeZone")} variant="p" className="font-bold mb-2" />
        <Typography
          text={t("timeZoneDescription")}
          variant="p"
          className="mb-3 text-sm text-muted-foreground"
        />
        <div className="max-w-sm">
          <CustomSelect
            options={TIMEZONE_OPTIONS}
            value={timeZone}
            onChange={(v) => setTimeZone(v)}
            placeholder={t("selectTimeZone")}
          />
        </div>
        {localTime && (
          <p className="mt-2 text-sm text-muted-foreground">{localTime}</p>
        )}
      </section>

      <Separator />

      {/* Date format */}
      <section>
        <Typography text={t("dateFormat")} variant="p" className="font-bold mb-3" />
        <div className="grid grid-cols-2 gap-3">
          {DATE_FORMAT_OPTIONS.map((opt) => {
            const selected = dateFormat === opt.id
            return (
              <button
                key={opt.id}
                type="button"
                onClick={() => setDateFormat(opt.id)}
                className={cn(
                  "flex items-center gap-3 p-3 rounded-md border border-[#565856] transition-all text-left hover:bg-white/5",
                  selected &&
                    "ring-2 ring-selection-hover ring-offset-1 ring-offset-[#1A1D21] border-transparent"
                )}
              >
                <div
                  className={cn(
                    "w-4 h-4 rounded-full border-2 shrink-0 flex items-center justify-center transition-colors",
                    selected
                      ? "bg-selection-hover border-selection-hover"
                      : "border-muted-foreground/50"
                  )}
                >
                  {selected && (
                    <svg
                      viewBox="0 0 12 12"
                      className="w-2.5 h-2.5 text-white"
                      fill="none"
                      stroke="currentColor"
                      strokeWidth="2.5"
                    >
                      <polyline points="2 6 5 9 10 3" />
                    </svg>
                  )}
                </div>
                <div className="min-w-0">
                  <Typography
                    text={opt.labelKey}
                    variant="p"
                    className="text-sm font-normal truncate"
                  />
                </div>
              </button>
            )
          })}
        </div>
      </section>

      <Separator />

      {/* Time format */}
      <section>
        <Typography text={t("timeFormat")} variant="p" className="font-bold mb-3" />
        <div className="flex gap-3">
          {(["12h", "24h"] as TimeFormat[]).map((fmt) => {
            const selected = timeFormat === fmt
            return (
              <button
                key={fmt}
                type="button"
                onClick={() => setTimeFormat(fmt)}
                className={cn(
                  "flex items-center gap-3 p-3 rounded-md border border-[#565856] transition-all text-left hover:bg-white/5 min-w-35",
                  selected &&
                    "ring-2 ring-selection-hover ring-offset-1 ring-offset-[#1A1D21] border-transparent"
                )}
              >
                <div
                  className={cn(
                    "w-4 h-4 rounded-full border-2 shrink-0 flex items-center justify-center transition-colors",
                    selected
                      ? "bg-selection-hover border-selection-hover"
                      : "border-muted-foreground/50"
                  )}
                >
                  {selected && (
                    <svg
                      viewBox="0 0 12 12"
                      className="w-2.5 h-2.5 text-white"
                      fill="none"
                      stroke="currentColor"
                      strokeWidth="2.5"
                    >
                      <polyline points="2 6 5 9 10 3" />
                    </svg>
                  )}
                </div>
                <div>
                  <Typography
                    text={fmt === "12h" ? t("hour12") : t("hour24")}
                    variant="p"
                    className="text-sm font-normal"
                  />
                  <Typography
                    text={fmt === "12h" ? "1:00 PM" : "13:00"}
                    variant="p"
                    className="text-xs text-muted-foreground"
                  />
                </div>
              </button>
            )
          })}
        </div>
      </section>
    </div>
  )
}
