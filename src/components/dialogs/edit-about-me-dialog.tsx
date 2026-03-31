"use client"

import { useEffect, useState } from "react"
import { toast } from "sonner"
import { Button } from "@/components/ui/button"
import {
  CustomDialog,
  CustomDialogHeader,
  CustomDialogTitle,
  CustomDialogBody,
  CustomDialogFooter
} from "../custom-dialog"
import { User } from "@/lib/types"
import AboutMeEditor from "@/modules/profile/about-me-editor"
import { updateAboutMeApi } from "@/apis"
import { useQueryClient } from "@tanstack/react-query"
import { authKeys } from "@/lib/query-keys"
import { useProfilePanelStore } from "@/stores/useProfilePanelStore"

export function EditAboutMeDialog({ open, setOpen, userData, workspaceId }: { open: boolean, setOpen: (open: boolean) => void, userData: User, workspaceId: string }) {
  const queryClient = useQueryClient()
  const { open: openPanel } = useProfilePanelStore()
  const [content, setContent] = useState<string>(userData?.description || "")
  const [isSaving, setIsSaving] = useState(false)

  const originalDescription = userData?.description ?? ""
  const hasChanges = content !== originalDescription

  useEffect(() => {
    if (open && userData) {
      setContent(userData.description ?? "")
    }
  }, [open, userData])

  const handleSave = async () => {
    try {
      setIsSaving(true)
      const updated = await updateAboutMeApi(workspaceId, {
        description: content || null,
      })

      queryClient.setQueryData(authKeys.workspaceProfile(workspaceId), updated)
      openPanel({ userData: { ...userData, ...updated }, workspaceId })

      setOpen(false)
      toast.success("About me updated successfully")
    } catch {
      toast.error("Failed to update about me. Please try again.")
    } finally {
      setIsSaving(false)
    }
  }

  return (
    <CustomDialog open={open} onOpenChange={setOpen}>
      <CustomDialogHeader onOpenChange={setOpen}>
        <CustomDialogTitle>Edit about me</CustomDialogTitle>
      </CustomDialogHeader>

      <CustomDialogBody className="bg-white dark:bg-[#1A1D21] px-5 py-4">
        <AboutMeEditor initialContent={userData?.description || ""} onContentChange={setContent} />
      </CustomDialogBody>

      <CustomDialogFooter className="px-6 py-4">
        <Button
          variant="ghost"
          onClick={() => setOpen(false)}
          className="text-white hover:bg-[#2C2E33] hover:text-white mr-2"
        >
          Cancel
        </Button>
        <Button
          onClick={handleSave}
          disabled={isSaving || !hasChanges}
          className="bg-[#007a5a] hover:bg-[#006248] text-white font-bold px-4 py-2"
        >
          {isSaving ? "Saving..." : "Save Changes"}
        </Button>
      </CustomDialogFooter>
    </CustomDialog>
  )
}
