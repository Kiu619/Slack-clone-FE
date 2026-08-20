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
import { CustomSelect } from "../custom-select"
import { User } from "@/lib/types"
import { useForm } from "react-hook-form"
import Avatar from "../avatar"
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "../ui/form"
import Typography from "../ui/typography"

import * as z from "zod"
import { zodResolver } from "@hookform/resolvers/zod"
import { useEffect, useRef, useState } from "react"
import { toast } from "sonner"
import { updateProfileApi } from "@/apis"
import { useProfilePanelStore } from "@/stores/useProfilePanelStore"
import { useQueryClient } from "@tanstack/react-query"
import { authKeys } from "@/lib/query-keys"
import { TIMEZONE_OPTIONS } from "@/lib/timezone"
import { useDialogs } from "@/hooks/use-translation"

const formSchema = z.object({
  name: z
    .string()
    .min(5, "Name must be at least 5 characters.")
    .max(32, "Name must be at most 32 characters."),
  displayName: z
    .string()
    .refine(
      (val) => !val || val.length === 0 || (val.length >= 2 && val.length <= 50),
      { message: "Display name must be 2–50 characters when provided." }
    ),
  namePronunciation: z
    .string()
    .refine(
      (val) => !val || val.length === 0 || (val.length >= 2 && val.length <= 50),
      { message: "Name pronunciation must be 2–50 characters when provided." }
    ),
  timeZone: z.string(),
})

export function EditProfileDialog({ open, setOpen, userData, workspaceId }: { open: boolean, setOpen: (open: boolean) => void, userData: User, workspaceId: string }) {
  const t = useDialogs();
  const queryClient = useQueryClient()
  const { open: openPanel } = useProfilePanelStore()

  const form = useForm<z.infer<typeof formSchema>>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      name: userData?.name || "",
      displayName: userData?.displayName ?? "",
      namePronunciation: userData?.namePronunciation ?? "",
      timeZone: userData?.timeZone || TIMEZONE_OPTIONS[18].value,
    },
  })

  const [selectedFile, setSelectedFile] = useState<File | null>(null)
  const [previewUrl, setPreviewUrl] = useState<string | null>(userData?.avatar || null)
  const [isUploading, setIsUploading] = useState(false)

  useEffect(() => {
    if (open && userData) {
      form.reset({
        name: userData.name || "",
        displayName: userData.displayName ?? "",
        namePronunciation: userData.namePronunciation ?? "",
        timeZone: userData.timeZone || TIMEZONE_OPTIONS[18].value,
      })
      setPreviewUrl(userData.avatar || null)
      setSelectedFile(null)
    }
  }, [open, userData, form])

  const onSubmit = async (data: z.infer<typeof formSchema>) => {
    try {
      setIsUploading(true)

      let avatarUrl: string | null | undefined = undefined
      if (selectedFile) {
        const { uploadToCloudinary } = await import('@/lib/cloudinary')
        avatarUrl = await uploadToCloudinary(selectedFile, 'slack-clone/user-avatars')
      } else if (!!userData?.avatar && !previewUrl) {
        avatarUrl = null
      }

      const updated = await updateProfileApi(workspaceId, {
        name: data.name,
        displayName: data.displayName || null || undefined,
        namePronunciation: data.namePronunciation || null,
        timeZone: data.timeZone || null,
        ...(avatarUrl !== undefined && { avatar: avatarUrl }),
      })

      queryClient.setQueryData(authKeys.workspaceProfile(workspaceId), updated)
      openPanel({ userData: { ...userData, ...updated }, workspaceId })

      setOpen(false)
      toast.success(t('editProfile.profileUpdatedSuccess'))
    } catch {
      toast.error(t('editProfile.profileUpdateFailed'))
    } finally {
      setIsUploading(false)
    }
  }

  const fileInputRef = useRef<HTMLInputElement>(null)

  const handleFileSelect = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0]
    if (file) {
      const validTypes = ['image/png', 'image/jpg', 'image/jpeg', 'image/gif', 'image/webp']
      if (!validTypes.includes(file.type)) {
        toast.error(t('editProfile.invalidImageType'))
        return
      }

      if (file.size > 5000000) {
        toast.error(t('editProfile.fileTooLarge'))
        return
      }

      setSelectedFile(file)

      const reader = new FileReader()
      reader.onload = (e) => {
        setPreviewUrl(e.target?.result as string)
      }
      reader.readAsDataURL(file)
    }
  }

  const handleRemovePhoto = () => {
    setSelectedFile(null)
    setPreviewUrl(null)
    if (fileInputRef.current) {
      fileInputRef.current.value = ""
    }
  }

  return (
    <CustomDialog open={open} onOpenChange={setOpen} maxWidth="720px">
      <Form {...form}>
        <form onSubmit={form.handleSubmit(onSubmit)} className="flex flex-col h-full">
          <CustomDialogHeader onOpenChange={setOpen}>
            <CustomDialogTitle>{t('editProfile.title')}</CustomDialogTitle>
          </CustomDialogHeader>

          <CustomDialogBody className="bg-white dark:bg-[#1A1D21] p-6 flex space-x-8">
            <div className="flex-1 space-y-6">
              <FieldGroup className="space-y-4">
                <FormField
                  control={form.control}
                  name="name"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel className=" font-bold">{t('editProfile.fullName')}</FormLabel>
                      <FormControl>
                        <Input
                          {...field}
                          className="bg-transparent transition-all border-[#565856]"
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="displayName"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel className=" font-bold">{t('editProfile.displayName')}</FormLabel>
                      <FormControl>
                        <Input
                          {...field}
                          className="bg-transparent border-[#565856] transition-all"
                        />
                      </FormControl>
                      <Typography
                        text={t('editProfile.displayNameDescription')}
                        variant="p"
                        className="text-[#ABABAD] text-xs mt-1"
                      />
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="namePronunciation"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel className=" font-bold">{t('editProfile.namePronunciation')}</FormLabel>
                      <FormControl>
                        <Input
                          {...field}
                          placeholder={t('editProfile.namePronunciationPlaceholder')}
                          className="bg-transparent border-[#565856]  focus:border-[#1264a3] transition-all"
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </FieldGroup>

              <FormField
                control={form.control}
                name="timeZone"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel className=" font-bold">{t('editProfile.timeZone')}</FormLabel>

                    <CustomSelect
                      options={TIMEZONE_OPTIONS}
                      value={field.value}
                      onChange={(value) => {
                        field.onChange(value)
                      }}
                    />

                    <Typography
                      text={t('editProfile.timeZoneDescription')}
                      variant="p"
                      className="text-[#ABABAD] text-xs mt-1"
                    />
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            <div className="space-y-4">
              <Typography text={t('editProfile.profilePhoto')} variant='p' className=' font-bold text-sm' />
              <div className="relative group">
                <Avatar
                  src={previewUrl ?? ""}
                  alt={userData?.name ?? ""}
                  className="w-48 h-48 rounded-lg object-cover border-2 border-[#565856]"
                />
                <input
                  ref={fileInputRef}
                  type="file"
                  accept="image/*"
                  onChange={handleFileSelect}
                  className="hidden"
                />
              </div>
              <div className="flex flex-col space-y-2">
                <Button
                  type="button"
                  variant="outline"
                  className="w-full border-[#565856]  dark:hover:bg-[#2C2E33]"
                  onClick={() => fileInputRef.current?.click()}
                >
                  {t('editProfile.uploadPhoto')}
                </Button>
                {previewUrl && (
                  <Button
                    type="button"
                    variant="ghost"
                    className="w-full text-[#1264a3] hover:text-[#0b4d7a] dark:hover:bg-transparent font-normal"
                    onClick={handleRemovePhoto}
                  >
                    {t('editProfile.removePhoto')}
                  </Button>
                )}
              </div>
            </div>
          </CustomDialogBody>

          <CustomDialogFooter className="px-6 py-4">
            <Button
              variant="outline"
              type="button"
              onClick={() => setOpen(false)}
            >
              {t('common.cancel')}
            </Button>
            <Button
              disabled={
                isUploading ||
                form.formState.isSubmitting ||
                !form.formState.isValid ||
                !(
                  form.formState.isDirty ||
                  selectedFile !== null ||
                  (!!userData?.avatar && !previewUrl)
                )
              }
              type="submit"
              variant="success"
            >
              {isUploading ? t('editProfile.saving') : t('editProfile.saveChanges')}
            </Button>
          </CustomDialogFooter>
        </form>
      </Form>
    </CustomDialog>
  )
}
