"use client"

import { Button } from "@/components/ui/button"
import {
  Dialog,
  DialogClose,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle
} from "@/components/ui/dialog"
import { FieldGroup } from "@/components/ui/field"
import { Input } from "@/components/ui/input"
import { User } from "@/lib/types"
import { useForm } from "react-hook-form"
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "../ui/form"

import { updateContactApi } from "@/apis"
import { useProfilePanelStore } from "@/stores/useProfilePanelStore"
import { useQueryClient } from "@tanstack/react-query"
import { authKeys } from "@/lib/query-keys"
import { zodResolver } from "@hookform/resolvers/zod"
import { FaLock } from "react-icons/fa6"
import { toast } from "sonner"
import * as z from "zod"

const formSchema = z.object({
  phone: z
    .string()
})

export function EditContactInforDialog({ open, setOpen, userData, workspaceId }: { open: boolean, setOpen: (open: boolean) => void, userData: User, workspaceId: string }) {
  const queryClient = useQueryClient()
  const { open: openPanel } = useProfilePanelStore()

  const form = useForm<z.infer<typeof formSchema>>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      phone: userData?.phone || "",
    }
  })

  const onSubmit = async (data: z.infer<typeof formSchema>) => {
    try {
      const updated = await updateContactApi(workspaceId, {
        phone: data.phone || null,
      })

      queryClient.setQueryData(authKeys.workspaceProfile(workspaceId), updated)
      openPanel({ userData: { ...userData, ...updated }, workspaceId })

      setOpen(false)
      toast.success("Contact information updated successfully")
    } catch {
      toast.error("Failed to update contact information. Please try again.")
    }
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogContent className="sm:max-w-[500px] p-0 overflow-hidden border-none bg-[#1A1D21]">
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="flex flex-col h-full">
            <DialogHeader className="px-6 py-4 border-b border-[#2C2E33]">
              <DialogTitle className="text-white text-xl font-bold">Edit contact information</DialogTitle>
            </DialogHeader>

            <div className="flex flex-1 p-6 space-x-8 overflow-y-auto">
              <div className="flex-1 space-y-6">
                <FieldGroup className="space-y-4">
                  <FormField
                    name="email"
                    disabled
                    
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel className="text-white font-bold"><FaLock size={12} /> Email</FormLabel>
                        <Input
                          {...field}
                          defaultValue={userData.email}
                          className="bg-transparent border-[#565856] text-white focus:border-[#1264a3] transition-all"
                        />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={form.control}
                    name="phone"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel className="text-white font-bold">Phone</FormLabel>
                        <FormControl>
                          <Input
                            {...field}
                            className="bg-transparent border-[#565856] text-white focus:border-[#1264a3] transition-all"
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                </FieldGroup>
              </div>
            </div>

            <DialogFooter className="px-6 py-4 border-t border-[#2C2E33] bg-[#1A1D21]">
              <DialogClose asChild>
                <Button variant="ghost" className="text-white hover:bg-[#2C2E33] hover:text-white mr-2">Cancel</Button>
              </DialogClose>
              <Button
                disabled={form.formState.isSubmitting || !form.formState.isValid || !form.formState.isDirty}
                type="submit"
                className="bg-[#007a5a] hover:bg-[#006248] text-white font-bold px-4 py-2"
              >
                Save Changes
              </Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  )
}
