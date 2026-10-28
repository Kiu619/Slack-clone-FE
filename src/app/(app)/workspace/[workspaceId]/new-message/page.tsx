'use client'

import { Suspense } from 'react'
import { useParams } from 'next/navigation'
import NewMessageComposer from '@/modules/workspace/new-message-composer'

function NewMessagePageInner() {
  const params = useParams<{ workspaceId: string }>()
  return <NewMessageComposer workspaceId={params.workspaceId} />
}

export default function NewMessagePage() {
  return (
    <Suspense fallback={null}>
      <NewMessagePageInner />
    </Suspense>
  )
}
