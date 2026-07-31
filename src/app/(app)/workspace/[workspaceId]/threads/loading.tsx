import { WorkspacePanelSkeleton } from "@/components/loading-skeletons"

export default function Loading() {
  return <WorkspacePanelSkeleton titleWidth="w-28" rowCount={4} includeComposer />
}
