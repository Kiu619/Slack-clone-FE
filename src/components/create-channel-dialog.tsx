import { zodResolver } from '@hookform/resolvers/zod'
import { Link2, Lock, Hash } from 'lucide-react'
import { useRouter } from 'next/navigation'
import { Dispatch, SetStateAction } from 'react'
import { useForm, useWatch } from 'react-hook-form'
import { toast } from 'sonner'
import { z } from 'zod'
import axios from 'axios'

import { Button } from '@/components/ui/button'
import {
  CustomDialog
} from '@/components/custom-dialog'
import {
  Form,
  FormControl,
  FormDescription,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from '@/components/ui/form'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group'
import { useCreateChannel } from '@/hooks/use-channel'

const formSchema = z.object({
  name: z
    .string()
    .min(2, 'Channel name must be at least 2 characters')
    .max(80, 'Channel name must be at most 80 characters')
    .regex(
      /^[a-z0-9][a-z0-9-_]*$/,
      'Use lowercase letters, numbers, hyphens or underscores',
    ),
  isPrivate: z.enum(['public', 'private']),
})

type FormValues = z.infer<typeof formSchema>

type Props = {
  dialogOpen: boolean
  setDialogOpen: Dispatch<SetStateAction<boolean>>
  workspaceId: string
}

const CreateChannelDialog = ({ dialogOpen, setDialogOpen, workspaceId }: Props) => {
  const router = useRouter()
  const createChannel = useCreateChannel(workspaceId)

  const form = useForm<FormValues>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      name: '',
      isPrivate: 'public',
    },
  })

  const watchedName = useWatch({ control: form.control, name: 'name' })
  const watchedVisibility = useWatch({ control: form.control, name: 'isPrivate' })
  const previewName = watchedName || 'channel-name'
  const isPrivate = watchedVisibility === 'private'

  const onSubmit = async ({ name, isPrivate: vis }: FormValues) => {
    try {
      const channel = await createChannel.mutateAsync({
        name,
        isPrivate: vis === 'private',
        type: 'text',
      })
      toast.success(`#${channel.name} created!`)
      form.reset()
      setDialogOpen(false)
      router.push(`/workspace/${workspaceId}/channel/${channel.id}`)
    } catch (err) {
      const message =
        axios.isAxiosError(err)
          ? err.response?.data?.message ?? 'Failed to create channel'
          : 'Failed to create channel'
      toast.error(message)
    }
  }

  return (
    <CustomDialog
      open={dialogOpen}
      onOpenChange={(open) => {
        if (!open) {
          setDialogOpen(false)
          form.reset()
        }
      }}
      maxWidth="1000px"
    >
      <div className="flex bg-white dark:bg-[#1A1D21] min-h-[750px] overflow-hidden rounded-lg">
        {/* Left Side - Form */}
        <div className="w-[35%] p-8 overflow-y-auto flex flex-col border-r border-white/5">
          <h2 className="text-white text-2xl font-bold mb-8">
            Channel details
          </h2>

          <Form {...form}>
            <form
              onSubmit={form.handleSubmit(onSubmit)}
              className="space-y-6 flex flex-col justify-between flex-1"
            >
              <div className="space-y-6">
                <FormField
                  name="name"
                  control={form.control}
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel className="text-white font-semibold flex items-center gap-2">
                        <Hash size={16} className="text-[#ABABAD]" /> Channel name
                      </FormLabel>
                      <FormControl>
                        <div className="relative">
                          <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400">
                            #
                          </span>
                          <Input
                            placeholder="e.g. plan-budget"
                            {...field}
                            onChange={(e) =>
                              field.onChange(
                                e.target.value.toLowerCase().replace(/\s+/g, '-'),
                              )
                            }
                            className="pl-8 bg-transparent border-white/20 text-white placeholder:text-gray-500 focus-visible:ring-[#1264A3]"
                          />
                        </div>
                      </FormControl>
                      <FormDescription className="text-gray-400 text-xs">
                        Use lowercase letters, numbers, hyphens or underscores.
                      </FormDescription>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  name="isPrivate"
                  control={form.control}
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel className="text-white font-semibold">
                        Visibility
                      </FormLabel>
                      <FormControl>
                        <RadioGroup
                          onValueChange={field.onChange}
                          value={field.value}
                          className="space-y-4 pt-2"
                        >
                          <div className="flex items-start gap-4 p-3 rounded-md hover:bg-white/5 cursor-pointer transition-colors border border-white/5">
                            <RadioGroupItem
                              value="public"
                              id="public"
                              className="mt-1 border-gray-500 text-white"
                            />
                            <Label
                              htmlFor="public"
                              className="text-white font-normal cursor-pointer leading-tight"
                            >
                              <span className="block font-bold mb-0.5 text-sm">Public</span>
                              <span className="text-[#ABABAD] text-xs">Anyone in the workspace can view and join this channel.</span>
                            </Label>
                          </div>

                          <div className="flex items-start gap-4 p-3 rounded-md hover:bg-white/5 cursor-pointer transition-colors border border-white/5">
                            <RadioGroupItem
                              value="private"
                              id="private"
                              className="mt-1 border-gray-500 text-white"
                            />
                            <Label
                              htmlFor="private"
                              className="text-white font-normal cursor-pointer leading-tight"
                            >
                              <span className="block font-bold mb-0.5 text-sm">Private</span>
                              <span className="text-[#ABABAD] text-xs">Only specific people you invite can view this channel.</span>
                            </Label>
                          </div>
                        </RadioGroup>
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>

              <div className="pt-8 mt-auto sticky bottom-0 bg-white dark:bg-[#1A1D21]">
                <Button
                  className="w-full bg-[#007a5a] text-white hover:bg-[#006248] font-bold h-11"
                  disabled={createChannel.isPending}
                  type="submit"
                >
                  {createChannel.isPending ? 'Creating...' : 'Create Channel'}
                </Button>
              </div>
            </form>
          </Form>
        </div>

        {/* Right Side - Preview */}
        <div className="flex-1 bg-[#121417] p-12">
          <div className="bg-white dark:bg-[#1A1D21] rounded-xl h-full flex flex-col border border-white/10 shadow-2xl overflow-hidden animate-in fade-in zoom-in-95 duration-500">
            {/* Channel Header */}
            <div className="border-b border-white/5 p-4 bg-white/5">
              <div className="flex items-center justify-between mb-4">
                <div className="flex items-center gap-3">
                  {isPrivate ? (
                    <Lock className="w-5 h-5 text-[#ABABAD]" />
                  ) : (
                    <Hash className="w-5 h-5 text-white" />
                  )}
                  <h3 className="text-white text-lg font-bold">
                    {previewName}
                  </h3>
                </div>
                <div className="flex items-center gap-1.5 opacity-50">
                  <div className="h-2 w-2 rounded-full bg-[#007a5a]" />
                  <span className="text-[10px] text-white uppercase font-bold tracking-tight">Active</span>
                </div>
              </div>

              <div className="flex gap-6 px-1">
                <button className="text-white font-bold text-sm pb-2 border-b-2 border-[#1264A3]">
                  Messages
                </button>
                <button className="text-[#ABABAD] font-bold text-sm pb-2 hover:text-white transition-colors">
                  Canvas
                </button>
              </div>
            </div>

            <div className="flex-1 p-10 flex flex-col items-center justify-center gap-4">
              <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-white/5 border border-white/10 mb-2">
                {isPrivate ? (
                  <Lock className="w-8 h-8 text-[#ABABAD]" />
                ) : (
                  <Hash className="w-8 h-8 text-[#ABABAD]" />
                )}
              </div>
              <h4 className="text-white text-xl font-bold">#{previewName}</h4>
              <p className="text-[#ABABAD] text-sm text-center max-w-[300px] leading-relaxed">
                {isPrivate
                  ? 'This is a private channel — only invited members can see it.'
                  : 'This is the beginning of the channel. Anyone in the workspace can join.'}
              </p>
              <Button variant="ghost" size="sm" className="mt-4 text-[#1264A3] hover:text-[#1264A3] hover:bg-white/5">
                Learn about channels
              </Button>
            </div>
          </div>
        </div>
      </div>
    </CustomDialog>
  )
}

export default CreateChannelDialog
