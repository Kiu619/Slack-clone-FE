"use client"

import { FiSettings } from "react-icons/fi"
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip"
import Typography from "@/components/ui/typography"
import { useAppTranslation } from "@/hooks/use-translation"

const Setting = () => {
  const t = useAppTranslation("workspaceSidePanel")

  return (
    <Tooltip>
      <TooltipTrigger asChild>
        <button className="hover:bg-[rgba(255,255,255,0.1)] p-2 rounded-md hover:cursor-pointer border">
          <FiSettings className="text-workspace-side-panel" size={16} />
        </button>
      </TooltipTrigger>
      <TooltipContent
        side='bottom'
      >
        <Typography text={t("manageMySidebar")} variant='p' className="text-[13px]!" />
      </TooltipContent>
    </Tooltip>
  )
}

export default Setting
