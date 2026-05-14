import { Suspense } from 'react'
import { DraftsScheduledPageClient } from '@/modules/workspace/drafts-scheduled/drafts-scheduled-page-client'

export default function WorkspaceDraftsPage() {
  return (
    <Suspense fallback={null}>
      <DraftsScheduledPageClient />
    </Suspense>
  )
}
