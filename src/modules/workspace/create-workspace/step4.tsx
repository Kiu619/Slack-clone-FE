'use client'

import { IoSparklesSharp } from 'react-icons/io5'
import { Button } from '@/components/ui/button'
import Typography from '@/components/ui/typography'
import { toast } from 'sonner'
import { useCreateWorkspaceValues } from '@/stores/useCreateWorkspaceStore'
import { useCreateWorkspace } from '@/hooks/use-workspace'
import { useLanguageRegionStore } from '@/stores/useLanguageRegionStore'
import slugify from 'slugify'
import { useRouter } from 'next/navigation'
import axios from 'axios'

const Step4 = () => {
  const router = useRouter()
  const { name, imageUrl, invite_code, emails, setCurrStep, resetWorkspace } =
    useCreateWorkspaceValues()
  const { mutateAsync: createWorkspace, isPending } = useCreateWorkspace()
  const timeZone = useLanguageRegionStore((s) => s.timeZone)

  const slug = slugify(name, { lower: true, strict: true })

  const handleSubmit = async () => {
    try {
      const workspace = await createWorkspace({
        name: name.trim(),
        slug,
        inviteCode: invite_code,
        imageUrl: imageUrl || '',
        memberEmails: emails,
        timeZone,
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
          className="text-[#616061] dark:text-[#d1d2d3]"
        />
        <IoSparklesSharp fill="#FFD700" size={20} />
      </div>

      <Typography
        text="Are you ready to start using Slack?"
        variant="h1"
        className="font-bold text-[#1d1c1d] dark:text-white"
      />

      <div className="space-y-2 text-sm text-[#454245] dark:text-white/70">
        <p>
          <span className="font-medium text-[#1d1c1d] dark:text-white">Name:</span> {name}
        </p>
        <p>
          <span className="font-medium text-[#1d1c1d] dark:text-white">Slug:</span> {slug}
        </p>
        {imageUrl && (
          <p>
            <span className="font-medium text-[#1d1c1d] dark:text-white">Image:</span> uploaded ✓
          </p>
        )}
        {emails.length > 0 && (
          <p>
            <span className="font-medium text-[#1d1c1d] dark:text-white">Inviting:</span>{' '}
            {emails.length} member{emails.length > 1 ? 's' : ''}
          </p>
        )}
      </div>

      <div className="mt-4 flex gap-2">
        <Button
          onClick={() => setCurrStep(3)}
          disabled={isPending}
          className="h-auto cursor-pointer border-none bg-transparent p-0 font-normal text-[#616061] hover:text-[#1d1c1d] dark:text-[#d1d2d3] dark:hover:text-white"
        >
          Go back
        </Button>

        <Button
          className="w-30 bg-[#3b1141] font-bold text-white hover:bg-[#3b1141]/90 disabled:opacity-60"
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
