import { Skeleton } from "@/components/ui/skeleton"
import { cn } from "@/lib/utils"

function StackRows({
  count,
  rowClassName,
}: {
  count: number
  rowClassName: string
}) {
  return (
    <div className="space-y-3">
      {Array.from({ length: count }, (_, i) => (
        <Skeleton key={i} className={rowClassName} />
      ))}
    </div>
  )
}

export function FullPageCenterSkeleton({
  titleWidth = "w-44",
  subtitleWidth = "w-64",
  bodyLines = 2,
  actionCount = 1,
  showIcon = true,
  className,
}: {
  titleWidth?: string
  subtitleWidth?: string
  bodyLines?: number
  actionCount?: number
  showIcon?: boolean
  className?: string
}) {
  return (
    <div
      className={cn(
        "flex min-h-screen items-center justify-center bg-white px-4 dark:bg-[#1A1D21]",
        className,
      )}
    >
      <div className="w-full max-w-md rounded-2xl border border-[#dddddd] bg-white p-8 shadow-sm dark:border-[#35373B] dark:bg-[#1A1D21]">
        {showIcon ? (
          <Skeleton className="mx-auto h-16 w-16 rounded-xl" />
        ) : null}

        <div className="mt-6 space-y-3 text-center">
          <Skeleton className={cn("mx-auto h-8", titleWidth)} />
          <Skeleton className={cn("mx-auto h-4", subtitleWidth)} />
        </div>

        <div className="mt-6 space-y-2">
          {Array.from({ length: bodyLines }, (_, i) => (
            <Skeleton
              key={i}
              className={cn(
                "h-4",
                i === bodyLines - 1 ? "w-3/4" : "w-full",
              )}
            />
          ))}
        </div>

        <div className="mt-8 space-y-3">
          {Array.from({ length: actionCount }, (_, i) => (
            <Skeleton key={i} className="h-12 w-full rounded-lg" />
          ))}
        </div>
      </div>
    </div>
  )
}

export function HomePageSkeleton() {
  return (
    <div className="min-h-screen bg-[#F8F8F8]">
      <div className="mx-auto max-w-7xl px-8 py-8">
        <header className="mb-16 flex flex-col items-center justify-center">
          <Skeleton className="h-12 w-28" />
          <Skeleton className="mt-4 h-4 w-56" />
        </header>

        <div className="grid grid-cols-1 gap-16 lg:grid-cols-2 mx-20">
          <div className="space-y-6">
            <Skeleton className="h-12 w-80" />
            <div className="space-y-3">
              <Skeleton className="h-4 w-full max-w-md" />
              <Skeleton className="h-4 w-5/6 max-w-sm" />
            </div>
            <Skeleton className="h-12 w-52 rounded-md" />
            <div className="space-y-2">
              <Skeleton className="h-3 w-full max-w-lg" />
              <Skeleton className="h-3 w-full max-w-md" />
            </div>
          </div>

          <div className="relative hidden lg:block">
            <Skeleton className="h-[400px] w-full rounded-2xl" />
          </div>
        </div>

        <div className="my-16 flex items-center">
          <Skeleton className="h-px flex-1" />
          <Skeleton className="mx-4 h-4 w-8" />
          <Skeleton className="h-px flex-1" />
        </div>

        <div className="mx-auto max-w-2xl space-y-4">
          <div className="space-y-2 text-center">
            <Skeleton className="mx-auto h-8 w-52" />
            <Skeleton className="mx-auto h-4 w-36" />
            <Skeleton className="mx-auto h-4 w-44" />
          </div>

          <div className="overflow-hidden rounded bg-white shadow-sm">
            <StackRows count={3} rowClassName="h-14 w-full" />
          </div>

          <div className="flex items-center justify-between rounded bg-[#efefef] px-6 py-3">
            <Skeleton className="h-4 w-44" />
            <Skeleton className="h-10 w-40 rounded-md" />
          </div>
        </div>
      </div>
    </div>
  )
}

export function WorkspacePanelSkeleton({
  titleWidth = "w-32",
  toolbarCount = 4,
  rowCount = 5,
  includeComposer = false,
}: {
  titleWidth?: string
  toolbarCount?: number
  rowCount?: number
  includeComposer?: boolean
}) {
  return (
    <div className="flex h-full min-h-0 min-w-0 flex-1 flex-col overflow-hidden bg-white dark:bg-[#1A1D21]">
      <div className="border-b border-[#dddddd] px-4 py-3 dark:border-[#35373B]">
        <Skeleton className={cn("h-6", titleWidth)} />
      </div>

      <div className="px-4 py-3">
        <div className="flex flex-wrap gap-2">
          {Array.from({ length: toolbarCount }, (_, i) => (
            <Skeleton key={i} className="h-8 w-24 rounded-full" />
          ))}
        </div>
      </div>

      <div className="min-h-0 flex-1 overflow-y-auto px-4 pb-4">
        <StackRows count={rowCount} rowClassName="h-16 w-full rounded-xl" />
      </div>

      {includeComposer ? (
        <div className="border-t border-[#dddddd] px-4 py-3 dark:border-[#35373B]">
          <Skeleton className="h-24 w-full rounded-xl" />
        </div>
      ) : null}
    </div>
  )
}

export function SearchResultsSkeleton({
  titleWidth = "w-32",
  resultCount = 5,
  includeToolbar = true,
}: {
  titleWidth?: string
  resultCount?: number
  includeToolbar?: boolean
}) {
  return (
    <div className="flex h-full min-h-0 min-w-0 flex-1 flex-col overflow-hidden bg-white dark:bg-[#1A1D21]">
      <div className="border-b border-[#dddddd] px-4 py-3 dark:border-[#35373B]">
        <Skeleton className={cn("h-6", titleWidth)} />
      </div>

      {includeToolbar ? (
        <div className="border-b border-[#dddddd] px-4 py-3 dark:border-[#35373B]">
          <div className="flex flex-wrap gap-2">
            {Array.from({ length: 5 }, (_, i) => (
              <Skeleton key={i} className="h-8 w-20 rounded-full" />
            ))}
          </div>
        </div>
      ) : null}

      <div className="min-h-0 flex-1 overflow-y-auto px-4 py-4">
        <StackRows count={resultCount} rowClassName="h-20 w-full rounded-xl" />
      </div>
    </div>
  )
}

export function SidePanelSkeleton({
  titleWidth = "w-24",
  rowCount = 6,
}: {
  titleWidth?: string
  rowCount?: number
}) {
  return (
    <div className="flex h-full min-h-0 min-w-0 flex-1 flex-col overflow-hidden bg-white dark:bg-[#1A1D21]">
      <div className="flex items-center justify-between border-b border-[#dddddd] px-4 py-3 dark:border-[#35373B]">
        <Skeleton className={cn("h-5", titleWidth)} />
        <Skeleton className="h-8 w-8 rounded-full" />
      </div>
      <div className="min-h-0 flex-1 overflow-y-auto px-4 py-4">
        <StackRows count={rowCount} rowClassName="h-14 w-full rounded-xl" />
      </div>
    </div>
  )
}

export function FilePreviewSkeleton() {
  return (
    <div className="w-full max-w-[400px] overflow-hidden rounded-lg border border-[#797c814d] bg-white dark:bg-[#1A1D21]">
      <div className="px-4 py-3 border-b border-[#797c814d]">
        <Skeleton className="h-4 w-3/4" />
        <Skeleton className="mt-2 h-3 w-1/2" />
      </div>
      <Skeleton className="h-[260px] w-full rounded-none" />
    </div>
  )
}

export function RecentHuddlesSkeleton() {
  return (
    <div className="flex flex-col">
      <div className="flex flex-col gap-2 px-4 py-2">
        {Array.from({ length: 20 }, (_, i) => (
          <div key={i} className="flex items-center gap-3 rounded-lg px-2 py-3  border border-[#797c814d]">
            <Skeleton className="h-10 w-10 rounded" />
            <div className="flex flex-col gap-2 flex-1">
              <Skeleton className="h-4 w-3/4" />
              <Skeleton className="h-3 w-1/2" />
            </div>
            <Skeleton className="h-6 w-6" />
            <Skeleton className="h-6 w-6" />
          </div>
        ))}
      </div>
    </div>
  )
}
