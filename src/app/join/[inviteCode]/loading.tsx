import { FullPageCenterSkeleton } from "@/components/loading-skeletons"

export default function Loading() {
  return (
    <FullPageCenterSkeleton
      titleWidth="w-48"
      subtitleWidth="w-72"
      bodyLines={2}
      actionCount={1}
      className="bg-[#f8f8f8]"
    />
  )
}
