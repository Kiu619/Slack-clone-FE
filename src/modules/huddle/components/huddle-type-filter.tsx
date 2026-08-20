"use client"

import { Button } from "@/components/ui/button"
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover"
import Typography from "@/components/ui/typography"
import { ACTIVE_ITEM_STYLE } from "@/constants/styles"
import { cn } from "@/lib/utils"
import { ChevronDown } from "lucide-react"
import { FiCheck } from "react-icons/fi"
import { useAppTranslation } from "@/hooks/use-translation"

type HuddleTypeFilterValue = "all" | "missed"

type Props = {
  value: HuddleTypeFilterValue
  open: boolean
  onOpenChange: (open: boolean) => void
  onChange: (value: HuddleTypeFilterValue) => void
}

export function HuddleTypeFilter({ value, open, onOpenChange, onChange }: Props) {
  const t = useAppTranslation('huddle.typeFilter')

  const options = [
    { id: "all" as const, label: t('allHuddles') },
    { id: "missed" as const, label: t('missedHuddles') },
  ]

  return (
    <Popover open={open} onOpenChange={onOpenChange}>
      <PopoverTrigger asChild>
        <Button variant="outline" className="rounded-md bg-transparent p-1">
          <Typography
            variant="p"
            className="text-[13px]"
            text={options.find((option) => option.id === value)?.label ?? t('allHuddles')}
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
        className="py-2 w-50!"
        onOpenAutoFocus={(event) => event.preventDefault()}
      >
        {options.map((option) => (
          <Button
            variant="checkedMenu"
            key={option.id}
            onClick={() => {
              onChange(option.id)
              onOpenChange(false)
            }}
            className={cn(
              "flex items-center justify-between px-2 py-1",
              "cursor-pointer hover:bg-selection-hover hover:text-white",
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
