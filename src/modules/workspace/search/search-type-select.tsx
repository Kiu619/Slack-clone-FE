"use client"

import { Button } from "@/components/ui/button"
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover"
import Typography from "@/components/ui/typography"
import { useAppTranslation } from "@/hooks/use-translation"
import { ACTIVE_ITEM_STYLE } from "@/constants/styles"
import { cn } from "@/lib/utils"
import { ChevronDown } from "lucide-react"
import { FiCheck } from "react-icons/fi"

type SearchType = "messages" | "dms" | "files" | "channels"

export function SearchTypeSelect({ value, open, onOpenChange, onChange }: Props) {
  const t = useAppTranslation("search")

  return (
    <Popover open={open} onOpenChange={onOpenChange}>
      <PopoverTrigger asChild>
        <Button variant="outline" className="rounded-md bg-transparent p-1">
          <Typography
            variant="p"
            className="text-[13px]"
            text={t(`searchType.${value}` as never)}
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
        {(["messages", "dms", "channels", "files"] as const).map((type) => (
          <Button
            variant="checkedMenu"
            key={type}
            onClick={() => {
              onChange(type)
              onOpenChange(false)
            }}
            className={cn(
              "flex items-center justify-between px-2 py-1",
              "cursor-pointer hover:bg-selection-hover hover:text-white",
              value === type && ACTIVE_ITEM_STYLE,
            )}
          >
            <span className="text-sm font-medium">{t(`searchType.${type}` as never)}</span>
            {value === type ? (
              <FiCheck size={14} className="text-white" />
            ) : null}
          </Button>
        ))}
      </PopoverContent>
    </Popover>
  )
}

type Props = {
  value: SearchType
  open: boolean
  onOpenChange: (open: boolean) => void
  onChange: (value: SearchType) => void
}
