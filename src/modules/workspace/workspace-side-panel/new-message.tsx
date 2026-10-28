"use client"

import { useParams, useRouter } from "next/navigation"
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip"
import Typography from "@/components/ui/typography"
import { FiEdit } from "react-icons/fi"
import { useAppTranslation } from "@/hooks/use-translation"

const NewMessage = () => {
  const router = useRouter()
  const params = useParams<{ workspaceId: string }>()
  const t = useAppTranslation("workspaceSidePanel")

  return (
    <Tooltip>
      <TooltipTrigger asChild>
        <button
          onClick={() =>
            router.push(`/workspace/${params.workspaceId}/new-message`)
          }
          className="hover:bg-[rgba(255,255,255,0.1)] p-2 rounded-md hover:cursor-pointer border flex items-center justify-center"
        >
          <FiEdit className="text-workspace-side-panel" size={16} />
        </button>
      </TooltipTrigger>
      <TooltipContent
        side='bottom'
      >
        <Typography text={t("newMessages")} variant='p' className="text-[13px]!" />
      </TooltipContent>
    </Tooltip>
  )
}

export default NewMessage
