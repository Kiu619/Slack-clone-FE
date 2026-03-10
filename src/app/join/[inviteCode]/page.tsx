'use client'

import { useEffect, useRef } from 'react'
import { useParams, useRouter } from 'next/navigation'
import { toast } from 'sonner'
import Image from 'next/image'
import { useJoinWorkspace } from '@/hooks/use-workspace'
import { useAuth } from '@/hooks/use-auth'
import { Button } from '@/components/ui/button'
import Typography from '@/components/ui/typography'

export default function JoinWorkspacePage() {
  const params = useParams()
  const router = useRouter()
  const inviteCode = params.inviteCode as string
  const { isAuthenticated, isLoading: authLoading, user } = useAuth()
  const { mutateAsync: joinWorkspace, isPending } = useJoinWorkspace()
  const autoJoined = useRef(false)

  // If not authenticated, redirect to auth with redirect back here
  useEffect(() => {
    if (!isAuthenticated) {
      router.replace(`/auth?redirect=/join/${inviteCode}`)
    }
  }, [authLoading, isAuthenticated, inviteCode, router])

  const handleJoin = async () => {
    if (autoJoined.current) return
    autoJoined.current = true

    try {
      const workspace = await joinWorkspace(inviteCode)
      toast.success(`You joined "${workspace.name}" successfully!`)
      router.replace('/')
    } catch (err: any) {
      const msg =
        err?.response?.data?.message ?? 'Failed to join workspace'

      if (msg.includes('already a member')) {
        toast.info('You are already a member of this workspace.')
        router.replace('/')
        return
      }

      toast.error(msg)
      autoJoined.current = false
    }
  }

  if (authLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-white">
        <div className="w-8 h-8 border-4 border-[#3b1141] border-t-transparent rounded-full animate-spin" />
      </div>
    )
  }

  if (!isAuthenticated) return null

  return (
    <div className="min-h-screen flex flex-col items-center justify-center bg-[#F8F8F8] px-4">
      <div className="bg-white rounded-xl shadow-md p-10 max-w-md w-full text-center space-y-6">
        <Image
          src="https://a.slack-edge.com/bv1-13/slack_logo-ebd02d1.svg"
          alt="Slack"
          width={100}
          height={100}
          className="mx-auto"
        />

        <div className="space-y-2">
          <Typography
            text="You've been invited!"
            variant="h2"
            className="font-bold text-[#1d1c1d]"
          />
          <Typography
            text={`Hi ${user?.email ?? ''}, someone has invited you to join a workspace on Slack Clone.`}
            variant="p"
            className="text-[#616061] text-sm"
          />
        </div>

        <Button
          onClick={handleJoin}
          disabled={isPending}
          className="w-full bg-[#3b1141] hover:bg-[#3b1141]/90 text-white font-semibold py-3"
        >
          {isPending ? 'Joining...' : 'Accept Invitation'}
        </Button>

        <button
          onClick={() => router.push('/')}
          className="text-sm text-[#616061] hover:underline"
        >
          Go to home instead
        </button>
      </div>
    </div>
  )
}
