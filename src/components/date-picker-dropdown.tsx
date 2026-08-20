"use client"

import * as React from "react"
import { Calendar as CalendarIcon, ChevronDown } from "lucide-react"
import { enUS, vi } from "date-fns/locale"
import { format } from "date-fns"
import type { Locale as DateFnsLocale } from "date-fns"

import { cn } from "@/lib/utils"
import { Button } from "@/components/ui/button"
import { Calendar } from "@/components/ui/calendar"
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover"
import { useLanguage, useDateFormat } from "@/hooks/use-translation"

interface DatePickerDropdownProps {
  date: Date | undefined
  setDate: (date: Date | undefined) => void
  disabled?: boolean
}

const LOCALE_FOR_PICKER: Record<"en" | "vi", DateFnsLocale> = {
  en: enUS,
  vi: vi,
}

function formatLocalizedDate(date: Date, language: "en" | "vi", dateFormat: "en_US" | "vi_VN"): string {
  const dateLocale = LOCALE_FOR_PICKER[language]
  // Format based on dateFormat preference: en_US = "MMMM do, yyyy", vi_VN = "do MMMM yyyy"
  if (dateFormat === 'vi_VN') {
    return format(date, "do MMMM yyyy", { locale: dateLocale })
  } else {
    return format(date, "MMMM do, yyyy", { locale: dateLocale })
  }
}

export function DatePickerDropdown({
  date,
  setDate,
  disabled,
}: DatePickerDropdownProps) {
  const language = useLanguage()
  const dateFormat = useDateFormat()
  const [isOpen, setIsOpen] = React.useState(false)
  const pickerLocale = LOCALE_FOR_PICKER[language]

  const pickADateLabel = language === 'vi' ? 'Chọn ngày' : 'Pick a date'

  return (
    <Popover>
      <PopoverTrigger asChild>
        <Button
          disabled={disabled}
          variant="ghost"
          className={cn(
            "flex-1 justify-between text-left font-normal border border-[#565856] rounded px-3 py-2 text-sm hover:bg-transparent hover:border-[#797c81] transition-colors h-auto min-h-[40px]",
            !date && "", isOpen && "border-[#1d9bd1] ring-1 ring-[#1d9bd1]"
          )}
          onClick={() => setIsOpen(!isOpen)}
        >
          <div className="flex items-center">
            <CalendarIcon className="mr-2 h-4 w-4" />
            {date ? formatLocalizedDate(date, language, dateFormat) : <span>{pickADateLabel}</span>}
          </div>
          <ChevronDown
            className={cn(
              "h-4 w-4  transition-transform duration-200",
              isOpen && "rotate-180"
            )}
          />
        </Button>
      </PopoverTrigger>
      <PopoverContent
        className="w-auto p-0 border rounded-lg bg-white dark:bg-[#1A1D21] shadow-2xl overflow-hidden z-1100"
        align="start"
      >
        <Calendar
          mode="single"
          selected={date}
          onSelect={setDate}
          disabled={{ before: new Date() }}
          autoFocus
          locale={pickerLocale}
          className="bg-white dark:bg-[#1A1D21] border-none"
        />
      </PopoverContent>
    </Popover>
  )
}