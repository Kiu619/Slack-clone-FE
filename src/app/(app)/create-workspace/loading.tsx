import { FullPageCenterSkeleton } from "@/components/loading-skeletons"

export default function Loading() {
  return (
    <FullPageCenterSkeleton
      titleWidth="w-56"
      subtitleWidth="w-72"
      bodyLines={3}
      actionCount={2}
    />
  )
}
