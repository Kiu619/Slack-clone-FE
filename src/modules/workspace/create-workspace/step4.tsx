'use client'

import { IoSparklesSharp } from 'react-icons/io5'
import { Button } from '@/components/ui/button'
import Typography from '@/components/ui/typography'
import { toast } from 'sonner'
import { useCreateWorkspaceValues } from '@/stores/useCreateWorkspaceStore'
import { useCreateWorkspace } from '@/hooks/use-workspace'
import slugify from 'slugify'
import { useRouter } from 'next/navigation'
import axios from 'axios'

const Step4 = () => {
  const router = useRouter()
  const { name, imageUrl, invite_code, emails, setCurrStep, resetWorkspace } =
    useCreateWorkspaceValues()
  const { mutateAsync: createWorkspace, isPending } = useCreateWorkspace()

  const slug = slugify(name, { lower: true, strict: true })

  const handleSubmit = async () => {
    try {
      const workspace = await createWorkspace({
        name: name.trim(),
        slug,
        inviteCode: invite_code,
        imageUrl: imageUrl || '',
        memberEmails: emails,
      })

      toast.success(`Workspace "${workspace.name}" created successfully!`)
      resetWorkspace()
      router.push(`/`)
    } catch (err) {
      if (axios.isAxiosError(err)) {
        const msg = err.response?.data?.message || 'Failed to create workspace'
        toast.error(msg)
      } else {
        toast.error('Something went wrong. Please try again.')
      }
    }
  }

  return (
    <>
      <div className="flex items-center gap-2">
        <Typography
          text="Your workspace is ready to go!"
          variant="p"
          className="text-gray-700"
        />
        <IoSparklesSharp fill="#FFD700" size={20} />
      </div>

      <Typography
        text="Are you ready to start using Slack?"
        variant="h1"
        className="text-white font-bold"
      />

      <div className="space-y-2 text-sm text-white/70">
        <p>
          <span className="text-white font-medium">Name:</span> {name}
        </p>
        <p>
          <span className="text-white font-medium">Slug:</span> {slug}
        </p>
        {imageUrl && (
          <p>
            <span className="text-white font-medium">Image:</span> uploaded ✓
          </p>
        )}
        {emails.length > 0 && (
          <p>
            <span className="text-white font-medium">Inviting:</span>{' '}
            {emails.length} member{emails.length > 1 ? 's' : ''}
          </p>
        )}
      </div>

      <div className="flex gap-2 mt-4">
        <Button
          onClick={() => setCurrStep(3)}
          disabled={isPending}
          className="text-gray-400 hover:text-gray-300 p-0 h-auto font-normal cursor-pointer bg-transparent border-none"
        >
          Go back
        </Button>

        <Button
          className="bg-workspace-background hover:bg-workspace-background/90 w-30 font-bold text-white disabled:opacity-60"
          onClick={handleSubmit}
          disabled={isPending}
        >
          {isPending ? 'Creating...' : "Yes, I'm ready!"}
        </Button>
      </div>
    </>
  )
}

export default Step4
