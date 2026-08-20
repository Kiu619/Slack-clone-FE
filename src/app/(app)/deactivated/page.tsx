'use client'

import Link from 'next/link'
import { useAppTranslation } from '@/hooks/use-translation'
import { useParams } from 'next/navigation'

export default function DeactivatedPage() {
  const t = useAppTranslation('deactivated')
  const params = useParams()
  const workspaceId = params?.workspaceId as string | undefined

  return (
    <main className="flex min-h-screen items-center justify-center bg-[radial-gradient(circle_at_top,rgba(59,17,65,0.18),transparent_45%),linear-gradient(180deg,#0f1013,#17181c_60%,#111214)] px-6 py-12 text-white">
      <section className="w-full max-w-xl rounded-3xl border border-white/10 bg-white/5 p-8 shadow-2xl backdrop-blur-md">
        <div className="mb-6 inline-flex rounded-full border border-red-400/30 bg-red-500/10 px-4 py-1 text-sm font-semibold text-red-200">
          {t('accessRemoved')}
        </div>

        <h1 className="text-3xl font-semibold tracking-tight md:text-4xl">
          {t('title')}
        </h1>

        <p className="mt-4 text-sm leading-6 text-white/75 md:text-base">
          {t('description')}
        </p>

        {workspaceId ? (
          <p className="mt-3 text-xs text-white/45">
            Workspace ID: <span className="font-medium text-white/65">{workspaceId}</span>
          </p>
        ) : null}

        <div className="mt-8 flex flex-col gap-3 sm:flex-row">
          <Link
            href="/"
            className="inline-flex items-center justify-center rounded-xl bg-[#2eb67d] px-5 py-3 text-sm font-semibold text-white transition-colors hover:bg-[#249667]"
          >
            {t('goToHome')}
          </Link>
        </div>
      </section>
    </main>
  )
}
