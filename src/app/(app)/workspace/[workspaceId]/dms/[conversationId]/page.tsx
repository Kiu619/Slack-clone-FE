import { redirect } from 'next/navigation'

interface Props {
  params: Promise<{ workspaceId: string; conversationId: string }>
}

/**
 * Mọi deep link `/dms/<bất kỳ>` → `/dms` (URL canonical, không giữ id trong path).
 * Redirect server để tránh phụ thuộc hydrate + router.replace (Strict Mode / race).
 */
export default async function DmDeepLinkStripPage({ params }: Props) {
  const { workspaceId } = await params
  redirect(`/workspace/${workspaceId}/dms`)
}
