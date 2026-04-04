"use client"

import { Button } from "@/components/ui/button"
import {
  CustomDialog,
  CustomDialogHeader,
  CustomDialogTitle,
  CustomDialogBody,
  CustomDialogFooter
} from "../custom-dialog"
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
    <CustomDialog open={open} onOpenChange={setOpen}>
      <Form {...form}>
        <form onSubmit={form.handleSubmit(onSubmit)} className="flex flex-col h-full">
          <CustomDialogHeader onOpenChange={setOpen}>
            <CustomDialogTitle>Edit contact information</CustomDialogTitle>
          </CustomDialogHeader>

          <CustomDialogBody className="bg-white dark:bg-[#1A1D21] p-6">
            <div className="flex-1 space-y-6">
              <FieldGroup className="space-y-4">
                <FormField
                  name="email"
                  disabled

                  render={({ field }) => (
                    <FormItem>
                      <FormLabel className="font-bold flex items-center gap-1.5"><FaLock size={12} /> Email</FormLabel>
                      <Input
                        {...field}
                        defaultValue={userData.email}
                        className="bg-transparent border-[#565856] focus:border-selection-hover transition-all"
                      />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="phone"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel className="font-bold">Phone</FormLabel>
                      <FormControl>
                        <Input
                          {...field}
                          className="bg-transparent border-[#565856] focus:border-selection-hover transition-all"
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

              </FieldGroup>
            </div>
          </CustomDialogBody>

          <CustomDialogFooter className="px-6 py-4">
            <Button
              variant="ghost"
              type="button"
              onClick={() => setOpen(false)}
              className="dark:hover:bg-[#2C2E33] mr-2"
            >
              Cancel
            </Button>
            <Button
              disabled={form.formState.isSubmitting || !form.formState.isValid || !form.formState.isDirty}
              type="submit"
              className="bg-[#007a5a] hover:bg-[#006248] font-bold px-4 py-2"
            >
              Save Changes
            </Button>
          </CustomDialogFooter>
        </form>
      </Form>
    </CustomDialog>
  )
}
