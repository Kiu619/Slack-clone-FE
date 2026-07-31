"use client"

import { Button } from "@/components/ui/button"
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover"
import Typography from "@/components/ui/typography"
import { ACTIVE_ITEM_STYLE } from "@/constants/styles"
import { cn } from "@/lib/utils"
import { ChevronDown } from "lucide-react"
import { FiCheck } from "react-icons/fi"

type SearchType = "messages" | "dms" | "files" | "channels"

const OPTIONS = [
  { id: "messages", label: "Messages", enabled: true },
  { id: "dms", label: "DMs", enabled: true },
  { id: "channels", label: "Channels", enabled: true },
  { id: "files", label: "Files", enabled: true },
] as const

type Props = {
  value: SearchType
  open: boolean
  onOpenChange: (open: boolean) => void
  onChange: (value: SearchType) => void
}

export function SearchTypeSelect({ value, open, onOpenChange, onChange }: Props) {
  return (
    <Popover open={open} onOpenChange={onOpenChange}>
      <PopoverTrigger asChild>
        <Button variant="outline" className="rounded-md bg-transparent p-1">
          <Typography
            variant="p"
            className="text-[13px]"
            text={OPTIONS.find((option) => option.id === value)?.label ?? "Messages"}
          />
          <ChevronDown
            size={13}
            className={cn(
              "transition-transform duration-200",
              open ? "rotate-180" : "rotate-0",
            )}
          />
        </Button>
      </PopoverTrigger>
      <PopoverContent
        withOverlay={true}
        side="bottom"
        align="start"
        sideOffset={8}
        className="py-2"
        onOpenAutoFocus={(event) => event.preventDefault()}
      >
        {OPTIONS.map((option) => (
          <Button
            variant="checkedMenu"
            key={option.id}
            onClick={() => {
              if (!option.enabled) return
              onChange(option.id as SearchType)
              onOpenChange(false)
            }}
            className={cn(
              "flex items-center justify-between px-2 py-1",
              option.enabled
                ? "cursor-pointer hover:bg-selection-hover hover:text-white"
                : "cursor-not-allowed opacity-50",
              value === option.id && ACTIVE_ITEM_STYLE,
            )}
          >
            <span className="text-sm font-medium">{option.label}</span>
            {value === option.id ? (
              <FiCheck size={14} className="text-white" />
            ) : null}
          </Button>
        ))}
      </PopoverContent>
    </Popover>
  )
}
