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
import {
  Select,
  SelectContent,
  SelectGroup,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
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
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogContent className="sm:max-w-[700px] p-0 overflow-hidden border-none bg-[#1A1D21]">
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="flex flex-col h-full">
            <DialogHeader className="px-6 py-4 border-b border-[#2C2E33]">
              <DialogTitle className="text-white text-xl font-bold">Edit your profile</DialogTitle>
            </DialogHeader>

            <div className="flex flex-1 p-6 space-x-8 overflow-y-auto">
              <div className="flex-1 space-y-6">
                <FieldGroup className="space-y-4">
                  <FormField
                    control={form.control}
                    name="name"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel className="text-white font-bold">Full name</FormLabel>
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

                  <FormField
                    control={form.control}
                    name="displayName"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel className="text-white font-bold">Display name</FormLabel>
                        <FormControl>
                          <Input 
                            {...field}
                            className="bg-transparent border-[#565856] text-white focus:border-[#1264a3] transition-all"
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
                        <FormLabel className="text-white font-bold">Name pronunciation</FormLabel>
                        <FormControl>
                          <Input 
                            {...field}
                            placeholder="Kiuu (pronounced: KEE-uu)"
                            className="bg-transparent border-[#565856] text-white focus:border-[#1264a3] transition-all"
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
                      <FormLabel className="text-white font-bold">Time zone</FormLabel>
                      <Select 
                        onValueChange={field.onChange} 
                        value={field.value}
                      >
                        <FormControl>
                          <SelectTrigger className="w-full bg-transparent border-[#565856] text-white h-11">
                            <SelectValue placeholder="Select a timezone" />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent 
                          position="popper" 
                          side="bottom" 
                          sideOffset={4}
                          className="bg-[#1A1D21] border-[#565856] text-white w-(--radix-select-trigger-width) max-h-[300px] overflow-y-auto"
                        >
                          <SelectGroup>
                            {TIMEZONE_OPTIONS.map((item) => (
                              <SelectItem 
                                key={item.value} 
                                value={item.value}
                                className="focus:bg-[#1264a3] focus:text-white cursor-pointer"
                              >
                                {item.label}
                              </SelectItem>
                            ))}
                          </SelectGroup>
                        </SelectContent>
                      </Select>
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
                <Typography text="Profile photo" variant='p' className='text-white font-bold text-sm' />
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
                    className="w-full border-[#565856] text-white hover:bg-[#2C2E33] hover:text-white"
                    onClick={() => fileInputRef.current?.click()}
                  >
                    Upload Photo
                  </Button>
                  {previewUrl && (
                    <Button 
                      type="button"
                      variant="ghost" 
                      className="w-full text-[#1264a3] hover:text-[#0b4d7a] hover:bg-transparent font-normal"
                      onClick={handleRemovePhoto}
                    >
                      Remove Photo
                    </Button>
                  )}
                </div>
              </div>
            </div>

            <DialogFooter className="px-6 py-4 border-t border-[#2C2E33] bg-[#1A1D21]">
              <DialogClose asChild>
                <Button variant="ghost" className="text-white hover:bg-[#2C2E33] hover:text-white mr-2">Cancel</Button>
              </DialogClose>
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
                className="bg-[#007a5a] hover:bg-[#006248] text-white font-bold px-4 py-2"
              >
                {isUploading ? "Saving..." : "Save Changes"}
              </Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  )
}
