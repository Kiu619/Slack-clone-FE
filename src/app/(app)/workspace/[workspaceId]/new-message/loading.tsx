import { WorkspacePanelSkeleton } from "@/components/loading-skeletons"

export default function Loading() {
  return <WorkspacePanelSkeleton titleWidth="w-40" rowCount={3} includeComposer />
}
