"use client"

import { useEffect, useState } from "react"
import { toast } from "sonner"
import { Button } from "@/components/ui/button"
import {
  Dialog,
  DialogClose,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle
} from "@/components/ui/dialog"
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
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogContent className="sm:max-w-[500px] p-0 overflow-hidden border-none bg-[#1A1D21]">
        <DialogHeader className="px-6 py-4 border-b border-[#2C2E33]">
          <DialogTitle className="text-white text-xl font-bold">Edit about me</DialogTitle>
        </DialogHeader>

        <div className="mx-5 my-4">
          <AboutMeEditor initialContent={userData?.description || ""} onContentChange={setContent} />
        </div>
        
        <DialogFooter className="px-6 py-4 border-t border-[#2C2E33] bg-[#1A1D21]">
          <DialogClose asChild>
            <Button variant="ghost" className="text-white hover:bg-[#2C2E33] hover:text-white mr-2">Cancel</Button>
          </DialogClose>
          <Button
            onClick={handleSave}
            disabled={isSaving || !hasChanges}
            className="bg-[#007a5a] hover:bg-[#006248] text-white font-bold px-4 py-2"
          >
            {isSaving ? "Saving..." : "Save Changes"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
