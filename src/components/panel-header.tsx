"use client"

import { cn } from "@/lib/utils"
import { IoChevronBack, IoCloseOutline } from "react-icons/io5"

interface PanelHeaderProps {
  title: string
  onClose: () => void
  className?: string
}

export function PanelHeader({ title, onClose, className }: PanelHeaderProps) {
  return (
    <div className={cn("flex items-center justify-between px-4 pt-3 mb-3", className)}>
      <h2 className="text-lg font-bold">{title}</h2>
      <div className="flex items-center gap-1">
        <button
          type="button"
          onClick={onClose}
          className="p-1.5 rounded-md hover:bg-[#797c811a] transition-colors md:hidden"
          aria-label="Close panel"
        >
          <IoChevronBack size={24} />
        </button>
        <button
          type="button"
          onClick={onClose}
          className="p-1.5 rounded-md hover:bg-[#797c811a] transition-colors hidden md:block"
          aria-label="Close panel"
        >
          <IoCloseOutline size={24} />
        </button>
      </div>
    </div>
  )
}
