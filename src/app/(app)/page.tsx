'use client'

import Image from 'next/image'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { FiSearch } from 'react-icons/fi'
import { IoIosArrowForward } from 'react-icons/io'
import { Button } from '@/components/ui/button'
import Typography from '@/components/ui/typography'
import { useAuth } from '@/hooks/use-auth'
import { useWorkspaces } from '@/hooks/use-workspace'
import type { Workspace } from '@/lib/types'
import { Skeleton } from '@/components/ui/skeleton'
import { useEffect } from 'react'

const VISIBLE_COUNT = 5

function WorkspaceInitials({ name }: { name: string }) {
  const initials = name
    .split(' ')
    .slice(0, 2)
    .map((w) => w[0]?.toUpperCase() ?? '')
    .join('')
  return <span>{initials}</span>
}

function WorkspaceRow({ workspace }: { workspace: Workspace }) {
  const router = useRouter()
  return (
    <button
      key={workspace.id}
      onClick={() => router.push(`/workspace/${workspace.id}`)}
      className="flex w-full items-center gap-4 border-b border-[#DDDDDD] px-6 py-4 text-left transition-colors hover:bg-gray-50 last:border-b-0"
    >
      {workspace.imageUrl ? (
        <Image
          src={workspace.imageUrl}
          alt={workspace.name}
          width={36}
          height={36}
          className="rounded object-cover"
        />
      ) : (
        <div className="flex h-9 w-9 items-center justify-center rounded bg-[#363636] text-sm font-bold text-white">
          <WorkspaceInitials name={workspace.name} />
        </div>
      )}
      <div className="flex-1">
        <div className="font-semibold text-[#1D1C1D]">{workspace.name}</div>
        <div className="flex items-center gap-1 text-xs text-[#616061]">
          <svg
            className="h-3 w-3"
            fill="currentColor"
            viewBox="0 0 20 20"
          >
            <path d="M9 6a3 3 0 11-6 0 3 3 0 016 0zM17 6a3 3 0 11-6 0 3 3 0 016 0zM12.93 17c.046-.327.07-.66.07-1a6.97 6.97 0 00-1.5-4.33A5 5 0 0119 16v1h-6.07zM6 11a5 5 0 015 5v1H1v-1a5 5 0 015-5z" />
          </svg>
          <span>
            {workspace.memberCount}{' '}
            {workspace.memberCount === 1 ? 'member' : 'members'}
          </span>
          <span className="ml-2 capitalize text-[#3b1141] font-medium">
            {workspace.role}
          </span>
        </div>
      </div>
      <IoIosArrowForward className="h-5 w-5 text-[#616061]" />
    </button>
  )
}

export default function Home() {
  const router = useRouter()
  const { user, isLoading: authLoading, isAuthenticated } = useAuth()
  const { data: workspaces, isLoading: wsLoading } = useWorkspaces()

  useEffect(() => {
    if (!authLoading && !isAuthenticated) {
      router.replace('/auth')
    }
  }, [authLoading, isAuthenticated, router])

  if (authLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-[#F8F8F8]">
        <div className="w-8 h-8 border-4 border-[#3b1141] border-t-transparent rounded-full animate-spin" />
      </div>
    )
  }

  const visibleWorkspaces = workspaces?.slice(0, VISIBLE_COUNT) ?? []

  return (
    <div className="min-h-screen bg-[#F8F8F8]">
      <div className="mx-auto max-w-7xl px-8 py-8">
        {/* Header */}
        <header className="mb-16 flex flex-col items-center justify-center">
          <Image
            src="https://a.slack-edge.com/bv1-13/slack_logo-ebd02d1.svg"
            alt="Slack"
            width={120}
            height={120}
          />
          {user && (
            <div className="mt-3 flex items-center gap-2 text-sm">
              <Typography
                variant="muted"
                as="span"
                className="text-[#616061]"
              >
                Confirmed as
                <Typography
                  text={` ${user.email}`}
                  className="text-black font-bold"
                  as="span"
                />
              </Typography>
              <Link href="/auth" className="text-[#1264A3] hover:underline">
                Change
              </Link>
            </div>
          )}
        </header>

        <div className="grid grid-cols-1 gap-16 lg:grid-cols-2 mx-20">
          {/* Left: Create Workspace */}
          <div className="space-y-6">
            <div>
              <Typography
                text="Create a new Slack workspace"
                variant="h1"
                as="h1"
                className="font-bold"
              />
              <Typography
                variant="p"
                as="div"
                className="max-w-md text-md text-[#454245] mt-2"
                text="Slack gives your team a home — a place where they can talk and work together."
              />
            </div>

            <Button
              variant="secondary"
              size="lg"
              className="bg-[#3b1141] hover:bg-[#3b1141]/90 text-white w-md"
              onClick={() => router.push('/create-workspace')}
            >
              <Typography text="Create a Workspace" variant="p" />
            </Button>

            <p className="text-xs leading-relaxed text-[#616061] max-w-md">
              By continuing, you&rsquo;re agreeing to our{' '}
              <Link href="#" className="text-[#1264A3] hover:underline">
                Main Services Agreement
              </Link>
              ,{' '}
              <Link href="#" className="text-[#1264A3] hover:underline">
                User Terms of Service
              </Link>
              , and{' '}
              <Link href="#" className="text-[#1264A3] hover:underline">
                Slack Supplemental Terms
              </Link>
              .
            </p>
          </div>

          {/* Right: Illustration */}
          <div className="relative hidden lg:flex lg:items-center lg:justify-center">
            <div className="relative h-[400px] w-full">
              <div className="absolute right-0 top-0 h-40 w-40 rounded-lg bg-gradient-to-br from-purple-400 to-pink-400 shadow-lg" />
              <div className="absolute bottom-0 right-20 h-32 w-32 rounded-lg bg-gradient-to-br from-green-400 to-blue-400 shadow-lg" />
              <div className="absolute left-0 top-20 h-48 w-48 rounded-lg bg-gradient-to-br from-orange-400 to-red-400 shadow-lg" />
            </div>
          </div>
        </div>

        {/* Divider */}
        <div className="my-16 flex items-center">
          <div className="flex-1 border-t border-[#DDDDDD]" />
          <span className="px-4 text-sm font-semibold text-[#616061]">OR</span>
          <div className="flex-1 border-t border-[#DDDDDD]" />
        </div>

        {/* Open Workspace */}
        <div className="mx-auto max-w-2xl">
          <div className="mb-6 text-center">
            <h2 className="mb-2 text-2xl font-semibold text-[#1D1C1D]">
              Open a workspace
            </h2>
            <p className="text-base text-[#454245]">Ready to launch</p>
            {user && (
              <p className="text-base font-medium text-[#1D1C1D]">
                {user.email}
              </p>
            )}
          </div>

          <div className="mb-6 overflow-hidden rounded bg-white shadow-sm">
            {wsLoading ? (
              <div className="p-4 space-y-3">
                {[1, 2, 3].map((i) => (
                  <Skeleton key={i} className="h-14 w-full" />
                ))}
              </div>
            ) : visibleWorkspaces.length === 0 ? (
              <div className="px-6 py-8 text-center text-[#616061]">
                <p className="text-sm">
                  You don&apos;t have any workspaces yet.
                </p>
                <Button
                  className="mt-4 bg-[#3b1141] hover:bg-[#3b1141]/90 text-white"
                  onClick={() => router.push('/create-workspace')}
                >
                  Create your first workspace
                </Button>
              </div>
            ) : (
              <>
                {visibleWorkspaces.map((ws) => (
                  <WorkspaceRow key={ws.id} workspace={ws} />
                ))}
                {(workspaces?.length ?? 0) > VISIBLE_COUNT && (
                  <button className="w-full px-6 py-3 text-left text-sm hover:underline text-black cursor-pointer">
                    Show {(workspaces?.length ?? 0) - VISIBLE_COUNT} more
                    workspaces ▼
                  </button>
                )}
              </>
            )}
          </div>

          {/* Try Different Email */}
          <div className="flex items-center justify-between rounded bg-[#efefef] px-6 py-2">
            <div className="flex items-center gap-2 text-sm text-[#616061]">
              <FiSearch className="h-4 w-4" />
              <span>Not seeing your workspace?</span>
            </div>
            <Link
              href="/auth"
              className="rounded border border-[#DDDDDD] bg-white px-4 py-2 text-sm font-semibold text-[#1D1C1D] transition-colors hover:bg-gray-50"
            >
              Try a Different Email
            </Link>
          </div>
        </div>
      </div>
    </div>
  )
}
