import { WorkspacePanelSkeleton } from "@/components/loading-skeletons"

export default function Loading() {
  return <WorkspacePanelSkeleton titleWidth="w-32" rowCount={6} includeComposer />
}
