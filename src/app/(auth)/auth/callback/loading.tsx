import { FullPageCenterSkeleton } from "@/components/loading-skeletons"

export default function Loading() {
  return (
    <FullPageCenterSkeleton
      titleWidth="w-40"
      subtitleWidth="w-56"
      bodyLines={1}
      actionCount={1}
      showIcon={false}
      className="bg-white"
    />
  )
}
