import { apiClient } from '@/lib/axios'
import { draftKeys } from '@/lib/query-keys'
import { previewPlainFromDraftHtml } from '@/lib/message-drafts'
import type { QueryClient } from '@tanstack/react-query'

export type MessageDraftRow = {
  id: string
  contextKey: string
  content: string
  updatedAt: string
}

export async function fetchMessageDraftsList(
  workspaceId: string,
): Promise<MessageDraftRow[]> {
  const { data } = await apiClient.get<MessageDraftRow[]>(
    `/workspaces/${workspaceId}/message-drafts`,
  )
  return Array.isArray(data) ? data : []
}

export async function fetchMessageDraftCurrent(
  workspaceId: string,
  contextKey: string,
): Promise<MessageDraftRow | null> {
  const { data } = await apiClient.get<{ draft: MessageDraftRow | null }>(
    `/workspaces/${workspaceId}/message-drafts/current`,
    { params: { contextKey: encodeURIComponent(contextKey) } },
  )
  return data?.draft ?? null
}

export async function upsertMessageDraftApi(
  workspaceId: string,
  body: { contextKey: string; content: string },
): Promise<MessageDraftRow | { ok: true; deleted: boolean }> {
  const { data } = await apiClient.put<
    MessageDraftRow | { ok: true; deleted: boolean }
  >(`/workspaces/${workspaceId}/message-drafts`, body)
  return data
}

export async function deleteMessageDraftApi(
  workspaceId: string,
  contextKey: string,
): Promise<{ ok: true; deleted: boolean }> {
  const { data } = await apiClient.delete<{ ok: true; deleted: boolean }>(
    `/workspaces/${workspaceId}/message-drafts`,
    { params: { contextKey: encodeURIComponent(contextKey) } },
  )
  return data
}

/** Cập nhật cache `current` + list sau PUT/DELETE (tránh refetch race với composer). */
export function replaceMessageDraftInCaches(
  qc: QueryClient,
  workspaceId: string,
  contextKey: string,
  row: MessageDraftRow | null,
) {
  qc.setQueryData<MessageDraftRow | null>(
    draftKeys.current(workspaceId, contextKey),
    row,
  )
  qc.setQueryData<MessageDraftRow[]>(draftKeys.list(workspaceId), (old) => {
    if (!old) return old
    if (!row) return old.filter((d) => d.contextKey !== contextKey)
    const next = [...old.filter((d) => d.contextKey !== contextKey), row]
    return next.sort(
      (a, b) =>
        new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime(),
    )
  })
}

/** Lưu draft lên server và đồng bộ cache list/current (dùng cho debounce + flush unmount). */
export async function persistMessageDraftWithCache(
  qc: QueryClient,
  workspaceId: string,
  contextKey: string,
  html: string,
): Promise<void> {
  const plain = previewPlainFromDraftHtml(html, 50_000)
  if (!plain) {
    await deleteMessageDraftApi(workspaceId, contextKey)
    replaceMessageDraftInCaches(qc, workspaceId, contextKey, null)
    return
  }
  const data = await upsertMessageDraftApi(workspaceId, {
    contextKey,
    content: html,
  })
  if ('deleted' in data && data.deleted) {
    replaceMessageDraftInCaches(qc, workspaceId, contextKey, null)
    return
  }
  replaceMessageDraftInCaches(
    qc,
    workspaceId,
    contextKey,
    data as MessageDraftRow,
  )
}

/** Gọi sau PUT/DELETE để list + current đồng bộ */
export function invalidateMessageDraftQueries(
  qc: QueryClient,
  workspaceId: string,
  contextKey?: string,
) {
  void qc.invalidateQueries({ queryKey: draftKeys.list(workspaceId) })
  if (contextKey) {
    void qc.invalidateQueries({
      queryKey: draftKeys.current(workspaceId, contextKey),
    })
  }
}

export function applyDraftSyncToCache(
  qc: QueryClient,
  workspaceId: string,
  raw: unknown,
) {
  if (!raw || typeof raw !== 'object') return
  const p = raw as {
    action?: string
    workspaceId?: string
    id?: string
    contextKey?: string
    content?: string
    updatedAt?: string
  }
  if (
    p.workspaceId == null ||
    String(p.workspaceId) !== String(workspaceId)
  ) {
    return
  }
  const ctx = p.contextKey
  if (!ctx || typeof ctx !== 'string') return

  if (p.action === 'delete') {
    replaceMessageDraftInCaches(qc, workspaceId, ctx, null)
    return
  }

  if (p.action === 'upsert' && p.id && typeof p.content === 'string') {
    const row: MessageDraftRow = {
      id: p.id,
      contextKey: ctx,
      content: p.content,
      updatedAt: p.updatedAt ?? new Date().toISOString(),
    }
    replaceMessageDraftInCaches(qc, workspaceId, ctx, row)
  }
}
