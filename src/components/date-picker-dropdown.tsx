"use client"

import * as React from "react"
import { format } from "date-fns"
import { Calendar as CalendarIcon, ChevronDown } from "lucide-react"

import { cn } from "@/lib/utils"
import { Button } from "@/components/ui/button"
import { Calendar } from "@/components/ui/calendar"
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover"

interface DatePickerDropdownProps {
  date: Date | undefined
  setDate: (date: Date | undefined) => void
  disabled?: boolean
}

export function DatePickerDropdown({
  date,
  setDate,
  disabled,
}: DatePickerDropdownProps) {
  return (
    <Popover>
      <PopoverTrigger asChild>
        <Button
          disabled={disabled}
          variant="ghost"
          className={cn(
            "flex-1 justify-between text-left font-normal border border-[#565856] rounded px-3 py-2 text-white text-sm hover:bg-transparent hover:border-[#797c81] transition-colors h-auto min-h-[40px]",
            !date && "text-[#ababad]"
          )}
        >
          <div className="flex items-center">
            <CalendarIcon className="mr-2 h-4 w-4 text-[#ababad]" />
            {date ? format(date, "EEEE, MMMM d") : <span>Pick a date</span>}
          </div>
          <ChevronDown className="h-4 w-4 text-[#ababad]" />
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-auto p-0 border-none rounded-lg bg-[#1A1D21] shadow-2xl overflow-hidden" align="start">
        <Calendar
          mode="single"
          selected={date}
          onSelect={setDate}
          disabled={{ before: new Date() }}
          initialFocus
          className="bg-[#1A1D21] text-white border-none"
        />
      </PopoverContent>
    </Popover>
  )
}
