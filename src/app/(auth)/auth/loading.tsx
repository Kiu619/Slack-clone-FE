import { FullPageCenterSkeleton } from "@/components/loading-skeletons"

export default function Loading() {
  return (
    <FullPageCenterSkeleton
      titleWidth="w-52"
      subtitleWidth="w-72"
      bodyLines={3}
      actionCount={3}
      className="bg-white"
    />
  )
}
