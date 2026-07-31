import Link from 'next/link'

export default async function DeactivatedPage({
  searchParams,
}: {
  searchParams?: Promise<{ workspaceId?: string }>
}) {
  const resolvedSearchParams = searchParams
    ? await Promise.resolve(searchParams)
    : undefined
  const workspaceId = resolvedSearchParams?.workspaceId

  return (
    <main className="flex min-h-screen items-center justify-center bg-[radial-gradient(circle_at_top,_rgba(59,17,65,0.18),_transparent_45%),linear-gradient(180deg,_#0f1013,_#17181c_60%,_#111214)] px-6 py-12 text-white">
      <section className="w-full max-w-xl rounded-3xl border border-white/10 bg-white/5 p-8 shadow-2xl backdrop-blur-md">
        <div className="mb-6 inline-flex rounded-full border border-red-400/30 bg-red-500/10 px-4 py-1 text-sm font-semibold text-red-200">
          Access removed
        </div>

        <h1 className="text-3xl font-semibold tracking-tight md:text-4xl">
          You have been deactivated from this workspace
        </h1>

        <p className="mt-4 text-sm leading-6 text-white/75 md:text-base">
          Your workspace membership is no longer active, so you cannot continue
          using this workspace.
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
            Go to home
          </Link>
        </div>
      </section>
    </main>
  )
}
