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
  Dialog,
  DialogContent,
  DialogTitle,
} from '@/components/ui/dialog'
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
    <Dialog
      open={dialogOpen}
      onOpenChange={() => {
        setDialogOpen((prev) => !prev)
        form.reset()
      }}
    >
      <DialogContent className="p-0 gap-0 bg-[#1a1d21] lg:max-w-[1000px]">
        <div className="flex min-h-[750px]">
          {/* Left Side - Form */}
          <div className="w-[35%] p-6 overflow-y-auto flex flex-col">
            <DialogTitle className="text-white text-2xl font-bold mb-6">
              Channel details
            </DialogTitle>

            <Form {...form}>
              <form
                onSubmit={form.handleSubmit(onSubmit)}
                className="space-y-6 flex flex-col gap-6 justify-between h-full"
              >
                <div className="flex flex-col gap-6">
                  <FormField
                    name="name"
                    control={form.control}
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel className="text-white font-semibold">
                          Channel name
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
                              className="pl-8 bg-[#2a2d31] border-gray-600 text-white placeholder:text-gray-500"
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
                          >
                            <div className="flex items-start gap-3">
                              <RadioGroupItem
                                value="public"
                                id="public"
                                className="mt-0.5 border-gray-500 text-white"
                              />
                              <Label
                                htmlFor="public"
                                className="text-white font-normal cursor-pointer"
                              >
                                Public — anyone in workspace
                              </Label>
                            </div>

                            <div className="flex items-start gap-3">
                              <RadioGroupItem
                                value="private"
                                id="private"
                                className="mt-0.5 border-gray-500 text-white"
                              />
                              <Label
                                htmlFor="private"
                                className="text-white font-normal cursor-pointer"
                              >
                                Private — only specific people
                              </Label>
                            </div>
                          </RadioGroup>
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>

                <Button
                  className="w-full bg-white text-black hover:bg-gray-200 font-semibold"
                  disabled={createChannel.isPending}
                  type="submit"
                >
                  {createChannel.isPending ? 'Creating...' : 'Create'}
                </Button>
              </form>
            </Form>
          </div>

          {/* Right Side - Preview */}
          <div className="flex-1 bg-workspace-background px-10 py-15">
            <div className="bg-[#1a1d21] rounded-lg h-full flex flex-col">
              {/* Channel Header */}
              <div className="border-b border-gray-700 p-4">
                <div className="flex items-center justify-between mb-4">
                  <div className="flex items-center gap-2">
                    {isPrivate ? (
                      <Lock className="w-5 h-5 text-gray-400" />
                    ) : (
                      <Hash className="w-5 h-5 text-white" />
                    )}
                    <h3 className="text-white text-xl font-bold">
                      {previewName}
                    </h3>
                  </div>
                  <button className="text-gray-400 hover:text-white transition-colors">
                    <Link2 className="w-5 h-5" />
                  </button>
                </div>

                <div className="flex gap-6">
                  <button className="text-white font-semibold pb-2 border-b-2 border-white">
                    Messages
                  </button>
                  <button className="text-gray-400 font-semibold pb-2 hover:text-white transition-colors">
                    Canvas
                  </button>
                </div>
              </div>

              <div className="flex-1 p-8 flex flex-col items-center justify-center gap-3">
                <div className="flex h-12 w-12 items-center justify-center rounded-full bg-[#2a2d31]">
                  {isPrivate ? (
                    <Lock className="w-6 h-6 text-gray-400" />
                  ) : (
                    <Hash className="w-6 h-6 text-gray-400" />
                  )}
                </div>
                <p className="text-white font-semibold">#{previewName}</p>
                <p className="text-gray-500 text-sm text-center">
                  {isPrivate
                    ? 'This is a private channel — only invited members can see it.'
                    : 'This is the beginning of the channel. Anyone in the workspace can join.'}
                </p>
              </div>
            </div>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  )
}

export default CreateChannelDialog
