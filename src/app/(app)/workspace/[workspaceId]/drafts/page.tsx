import { Suspense } from 'react'
import { WorkspacePanelSkeleton } from '@/components/loading-skeletons'
import { DraftsScheduledPageClient } from '@/modules/workspace/drafts-scheduled/drafts-scheduled-page-client'

export default function WorkspaceDraftsPage() {
  return (
    <Suspense fallback={<WorkspacePanelSkeleton titleWidth="w-36" rowCount={4} />}>
      <DraftsScheduledPageClient />
    </Suspense>
  )
}
