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
import {
  Select,
  SelectContent,
  SelectGroup,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"

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

// const TIMEZONE_OPTIONS = [
//   { label: "(UTC-11:00) Midway Island, American Samoa", value: "(UTC-11:00)" },
//   { label: "(UTC-10:00) Hawaii", value: "(UTC-10:00)" },
//   { label: "(UTC-09:00) Alaska", value: "(UTC-09:00)" },
//   { label: "(UTC-08:00) Pacific Time (US & Canada)", value: "(UTC-08:00)" },
//   { label: "(UTC-07:00) Mountain Time (US & Canada)", value: "(UTC-07:00)" },
//   { label: "(UTC-06:00) Central Time (US & Canada)", value: "(UTC-06:00)" },
//   { label: "(UTC-05:00) Eastern Time (US & Canada)", value: "(UTC-05:00)" },
//   { label: "(UTC-04:00) Atlantic Time (Canada)", value: "(UTC-04:00)" },
//   { label: "(UTC-03:00) Argentina, Brazil", value: "(UTC-03:00)" },
//   { label: "(UTC-02:00) South Georgia/South Sandwich Islands", value: "(UTC-02:00)" },
//   { label: "(UTC-01:00) Azores", value: "(UTC-01:00)" },
//   { label: "(UTC+00:00) London, Lisbon, Dublin", value: "(UTC+00:00)" },
//   { label: "(UTC+01:00) Amsterdam, Berlin, Madrid", value: "(UTC+01:00)" },
//   { label: "(UTC+02:00) Athens, Istanbul, Cairo", value: "(UTC+02:00)" },
//   { label: "(UTC+03:00) Moscow, Nairobi", value: "(UTC+03:00)" },
//   { label: "(UTC+04:00) Dubai, Abu Dhabi", value: "(UTC+04:00)" },
//   { label: "(UTC+05:00) Karachi, Tashkent", value: "(UTC+05:00)" },
//   { label: "(UTC+06:00) Dhaka, Novosibirsk", value: "(UTC+06:00)" },
//   { label: "(UTC+07:00) Bangkok, Hanoi, Jakarta", value: "(UTC+07:00)" },
//   { label: "(UTC+08:00) Beijing, Singapore, Hong Kong", value: "(UTC+08:00)" },
//   { label: "(UTC+09:00) Tokyo, Seoul", value: "(UTC+09:00)" },
//   { label: "(UTC+10:00) Sydney, Melbourne", value: "(UTC+10:00)" },
//   { label: "(UTC+11:00) Solomon Islands, New Caledonia", value: "(UTC+11:00)" },
//   { label: "(UTC+12:00) Auckland, Fiji", value: "(UTC+12:00)" },
//   { label: "(UTC+13:00) Samoa, Tonga", value: "(UTC+13:00)" },
//   { label: "(UTC+14:00) Kiribati", value: "(UTC+14:00)" },
// ]


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
      toast.success("Profile updated successfully")
    } catch {
      toast.error("Failed to update profile. Please try again.")
    } finally {
      setIsUploading(false)
    }
  }

  const fileInputRef = useRef<HTMLInputElement>(null)

  const handleFileSelect = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0]
    if (file) {
      // Validate file type
      const validTypes = ['image/png', 'image/jpg', 'image/jpeg', 'image/gif', 'image/webp']
      if (!validTypes.includes(file.type)) {
        toast.error('Please select a valid image (PNG, JPG, JPEG, GIF, WEBP)')
        return
      }

      // Validate file size (5MB)
      if (file.size > 5000000) {
        toast.error('File size must be less than 5MB')
        return
      }

      setSelectedFile(file)

      // Create preview URL
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
            <CustomDialogTitle>Edit your profile</CustomDialogTitle>
          </CustomDialogHeader>

          <CustomDialogBody className="bg-white dark:bg-[#1A1D21] p-6 flex space-x-8">
            <div className="flex-1 space-y-6">
              <FieldGroup className="space-y-4">
                <FormField
                  control={form.control}
                  name="name"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel className=" font-bold">Full name</FormLabel>
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
                      <FormLabel className=" font-bold">Display name</FormLabel>
                      <FormControl>
                        <Input
                          {...field}
                          className="bg-transparent border-[#565856] transition-all"
                        />
                      </FormControl>
                      <Typography
                        text="This could be your first name, or a nickname — however you’d like people to refer to you in Slack."
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
                      <FormLabel className=" font-bold">Name pronunciation</FormLabel>
                      <FormControl>
                        <Input
                          {...field}
                          placeholder="Kiuu (pronounced: KEE-uu)"
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
                    <FormLabel className=" font-bold">Time zone</FormLabel>
                    {/* <Select 
                        onValueChange={field.onChange} 
                        value={field.value} 
                      >
                        <FormControl>
                          <SelectTrigger className="w-full bg-transparent border-[#565856]  h-11">
                            <SelectValue placeholder="Select a timezone" />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent 
                          position="popper" 
                          side="bottom" 
                          sideOffset={4}
                          className="z-1100 bg-white dark:bg-[#1A1D21] border-[#565856]  w-(--radix-select-trigger-width) max-h-[300px] overflow-y-auto"
                        >
                          <SelectGroup>
                            {TIMEZONE_OPTIONS.map((item) => (
                              <SelectItem 
                                key={item.value} 
                                value={item.value}
                                className="focus:bg-[#1264a3] focus: cursor-pointer"
                              >
                                {item.label}
                              </SelectItem>
                            ))}
                          </SelectGroup>
                        </SelectContent>
                      </Select> */}

                    <CustomSelect
                      options={TIMEZONE_OPTIONS}
                      value={field.value}
                      onChange={(value) => {
                        field.onChange(value)
                      }}
                    />

                    <Typography
                      text="Your current time zone. Used to send summary emails, for Times Zone features and more."
                      variant="p"
                      className="text-[#ABABAD] text-xs mt-1"
                    />
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            <div className="space-y-4">
              <Typography text="Profile photo" variant='p' className=' font-bold text-sm' />
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
                  Upload Photo
                </Button>
                {previewUrl && (
                  <Button
                    type="button"
                    variant="ghost"
                    className="w-full text-[#1264a3] hover:text-[#0b4d7a] dark:hover:bg-transparent font-normal"
                    onClick={handleRemovePhoto}
                  >
                    Remove Photo
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
              Cancel
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
              {isUploading ? "Saving..." : "Save Changes"}
            </Button>
          </CustomDialogFooter>
        </form>
      </Form>
    </CustomDialog>
  )
}
