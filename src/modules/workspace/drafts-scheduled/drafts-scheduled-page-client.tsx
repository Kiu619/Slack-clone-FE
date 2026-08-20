'use client'

import { useMemo, useState, useCallback, useEffect } from 'react'
import { useParams, useRouter, useSearchParams } from 'next/navigation'
import { useQuery, useQueryClient, useMutation } from '@tanstack/react-query'
import { fetchDirectMessagesApi } from '@/apis'
import { useChannels } from '@/hooks/use-channel'
import { useUserStore } from '@/stores/useUserStore'
import { useNewMessageStore } from '@/stores/useNewMessageStore'
import { usePendingDraftNavigationStore } from '@/stores/usePendingDraftNavigationStore'
import { draftKeys, messageKeys, scheduledMessageKeys } from '@/lib/query-keys'
import { apiClient } from '@/lib/axios'
import {
  deleteMessageDraftApi,
  fetchMessageDraftCurrent,
  fetchMessageDraftsList,
  type MessageDraftRow,
  replaceMessageDraftInCaches,
  upsertMessageDraftApi,
} from '@/lib/message-drafts-api'
import {
  buildOpenThreadSearch,
  serverDraftToSummary,
  type MessageDraftSummary,
  NEW_MSG_RESTORE_CHANNEL_KEY,
  NEW_MSG_RESTORE_DM_KEY,
} from '@/lib/message-drafts'
import {
  cancelScheduledMessageApi,
  createScheduledMessageApi,
  fetchScheduledMessagesList,
  invalidateScheduledMessageQueries,
  updateScheduledMessageApi,
  type ScheduledMessageRow,
} from '@/lib/scheduled-messages-api'
import { toast } from 'sonner'
import Typography from '@/components/ui/typography'
import {
  DraftsScheduledTabBar,
  type DraftsScheduledTabId,
} from './drafts-scheduled-tab-bar'
import { DraftsTabContent } from './drafts-tab-content'
import { ScheduledTabContent } from './scheduled-tab-content'
import ScheduleSendDialog from '@/components/dialogs/schedule-send-dialog'
import {
  buildCreateScheduledBodyFromDraftSummary,
  scheduledAtIsoToFormDefaults,
  scheduledRowToDraftContextKey,
} from './schedule-from-context'
import type { Message } from '@/lib/types'
import {
  applyDraftsOutboundOptimistic,
  finalizeDraftsOutboundOptimistic,
  rollbackDraftsOutboundOptimistic,
  type OutboundSendRow,
} from './drafts-outbound-optimistic'
import { useAppTranslation } from '@/hooks/use-translation'

type ScheduleTarget =
  | { kind: 'draft'; row: MessageDraftSummary }
  | { kind: 'reschedule'; row: ScheduledMessageRow }

export const DraftsScheduledPageClient = () => {
  const t = useAppTranslation('draftsScheduled')
  const params = useParams<{ workspaceId: string | string[] }>()
  const workspaceId =
    typeof params.workspaceId === 'string'
      ? params.workspaceId
      : Array.isArray(params.workspaceId)
        ? params.workspaceId[0] ?? ''
        : ''
  const router = useRouter()
  const searchParams = useSearchParams()
  const queryClient = useQueryClient()
  const user = useUserStore((s) => s.user)
  const openNewMessage = useNewMessageStore((s) => s.openNewMessage)
  const [tab, setTab] = useState<DraftsScheduledTabId>('drafts')

  const tabQuery = searchParams.get('tab')
  useEffect(() => {
    setTab(tabQuery === 'scheduled' ? 'scheduled' : 'drafts')
  }, [tabQuery])

  const handleTabChange = useCallback(
    (next: DraftsScheduledTabId) => {
      setTab(next)
      const qs = new URLSearchParams(searchParams.toString())
      if (next === 'scheduled') {
        qs.set('tab', 'scheduled')
      } else {
        qs.delete('tab')
      }
      const q = qs.toString()
      router.replace(
        `/workspace/${workspaceId}/drafts${q ? `?${q}` : ''}`,
        { scroll: false },
      )
    },
    [workspaceId, router, searchParams],
  )

  const [scheduleOpen, setScheduleOpen] = useState(false)
  const [scheduleTarget, setScheduleTarget] = useState<ScheduleTarget | null>(
    null,
  )
  const [scheduleSubmitting, setScheduleSubmitting] = useState(false)

  useEffect(() => {
    if (!scheduleOpen) setScheduleTarget(null)
  }, [scheduleOpen])

  const { data: channels = [] } = useChannels(workspaceId)
  const { data: conversations = [] } = useQuery({
    queryKey: ['dm-conversations', workspaceId],
    queryFn: () => fetchDirectMessagesApi(workspaceId),
    enabled: !!workspaceId,
  })

  const { data: draftRows = [] } = useQuery({
    queryKey: draftKeys.list(workspaceId),
    queryFn: () => fetchMessageDraftsList(workspaceId),
    enabled: !!workspaceId,
    staleTime: 30_000,
  })

  const summaries = useMemo(() => {
    const list = draftRows
      .map((r) => serverDraftToSummary(r))
      .filter((s): s is MessageDraftSummary => s !== null)
    return list.sort((a, b) => b.updatedAt - a.updatedAt)
  }, [draftRows])

  const { data: pendingScheduled = [] } = useQuery({
    queryKey: scheduledMessageKeys.list(workspaceId, 'pending'),
    queryFn: () => fetchScheduledMessagesList(workspaceId, 'pending'),
    enabled: !!workspaceId,
    staleTime: 15_000,
  })

  const { mutate: cancelScheduled, isPending: isCancelling } = useMutation({
    mutationFn: (id: string) => cancelScheduledMessageApi(workspaceId, id),
    onSuccess: () => {
      void queryClient.invalidateQueries({
        queryKey: scheduledMessageKeys.all(workspaceId),
      })
      toast.success(t('toast.scheduleCancelled'))
    },
    onError: () => {
      toast.error(t('toast.scheduleCancelFailed'))
    },
  })

  const invalidateMessageCachesForRow = useCallback(
    (row: { channelId?: string | null; conversationId?: string | null; parentId?: string | null }) => {
      const tid = row.channelId ?? row.conversationId
      if (tid) {
        void queryClient.invalidateQueries({ queryKey: messageKeys.list(tid) })
      }
      if (row.parentId) {
        void queryClient.invalidateQueries({
          queryKey: messageKeys.thread(row.parentId),
        })
      }
    },
    [queryClient],
  )

  const openDraftRow = useCallback(
    async (row: MessageDraftSummary) => {
      const fromList = draftRows.find((d) => d.contextKey === row.contextKey)
      if (fromList) {
        queryClient.setQueryData<MessageDraftRow | null>(
          draftKeys.current(workspaceId, row.contextKey),
          fromList,
        )
      }
      void queryClient.prefetchQuery({
        queryKey: draftKeys.current(workspaceId, row.contextKey),
        queryFn: () => fetchMessageDraftCurrent(workspaceId, row.contextKey),
      })

      usePendingDraftNavigationStore.getState().setPending({
        workspaceId,
        contextKey: row.contextKey,
        html: row.html,
      })

      if (row.isComposeNew && row.channelId) {
        if (typeof window !== 'undefined') {
          sessionStorage.setItem(NEW_MSG_RESTORE_CHANNEL_KEY, row.channelId)
        }
        openNewMessage()
        return
      }
      if (row.isComposeNew && row.conversationId) {
        if (typeof window !== 'undefined') {
          sessionStorage.setItem(NEW_MSG_RESTORE_DM_KEY, row.conversationId)
        }
        openNewMessage()
        return
      }
      if (row.isComposeNew) {
        openNewMessage()
        return
      }

      if (row.channelId) {
        const base = `/workspace/${workspaceId}/channel/${row.channelId}`
        const url =
          row.isThread && row.parentId
            ? `${base}${buildOpenThreadSearch(row.parentId)}`
            : base
        router.push(url)
        return
      }
      if (row.conversationId) {
        const base = `/workspace/${workspaceId}/dm/${row.conversationId}`
        const url =
          row.isThread && row.parentId
            ? `${base}${buildOpenThreadSearch(row.parentId)}`
            : base
        router.push(url)
      }
    },
    [draftRows, queryClient, workspaceId, openNewMessage, router],
  )

  const openScheduledForEdit = useCallback(
    async (row: ScheduledMessageRow) => {
      const contextKey = scheduledRowToDraftContextKey(row)
      const draftRow: MessageDraftRow = {
        id: `scheduled-nav-${row.id}`,
        contextKey,
        content: row.content,
        updatedAt: new Date().toISOString(),
      }
      queryClient.setQueryData<MessageDraftRow | null>(
        draftKeys.current(workspaceId, contextKey),
        draftRow,
      )
      usePendingDraftNavigationStore.getState().setPending({
        workspaceId,
        contextKey,
        html: row.content,
      })

      if (row.channelId) {
        const base = `/workspace/${workspaceId}/channel/${row.channelId}`
        const url = row.parentId
          ? `${base}${buildOpenThreadSearch(row.parentId)}`
          : base
        router.push(url)
        return
      }
      if (row.conversationId) {
        const base = `/workspace/${workspaceId}/dm/${row.conversationId}`
        const url = row.parentId
          ? `${base}${buildOpenThreadSearch(row.parentId)}`
          : base
        router.push(url)
      }
    },
    [queryClient, workspaceId, router],
  )

  const handleDeleteDraft = useCallback(
    async (row: MessageDraftSummary) => {
      try {
        await deleteMessageDraftApi(workspaceId, row.contextKey)
        replaceMessageDraftInCaches(
          queryClient,
          workspaceId,
          row.contextKey,
          null,
        )
        toast.success(t('toast.draftDeleted'))
      } catch {
        toast.error(t('toast.draftDeleteFailed'))
      }
    },
    [queryClient, workspaceId, t],
  )

  const handleScheduleDraft = useCallback((row: MessageDraftSummary) => {
    try {
      buildCreateScheduledBodyFromDraftSummary(
        row,
        new Date(Date.now() + 120_000).toISOString(),
      )
    } catch {
      toast.error(t('toast.draftNoChannelOrDM'))
      return
    }
    setScheduleTarget({ kind: 'draft', row })
    setScheduleOpen(true)
  }, [t])

  const handleReschedule = useCallback((row: ScheduledMessageRow) => {
    setScheduleTarget({ kind: 'reschedule', row })
    setScheduleOpen(true)
  }, [])

  const handleScheduleConfirm = useCallback(
    async (scheduledAtIso: string) => {
      if (!scheduleTarget) return
      setScheduleSubmitting(true)
      try {
        if (scheduleTarget.kind === 'draft') {
          const body = buildCreateScheduledBodyFromDraftSummary(
            scheduleTarget.row,
            scheduledAtIso,
          )
          await createScheduledMessageApi(workspaceId, body)
          await deleteMessageDraftApi(
            workspaceId,
            scheduleTarget.row.contextKey,
          )
          replaceMessageDraftInCaches(
            queryClient,
            workspaceId,
            scheduleTarget.row.contextKey,
            null,
          )
          toast.success(t('toast.messageScheduled'))
        } else {
          await updateScheduledMessageApi(
            workspaceId,
            scheduleTarget.row.id,
            { scheduledAt: scheduledAtIso },
          )
          toast.success(t('toast.scheduleRescheduled'))
        }
        invalidateScheduledMessageQueries(queryClient, workspaceId)
        void queryClient.invalidateQueries({
          queryKey: draftKeys.list(workspaceId),
        })
      } catch {
        toast.error(
          scheduleTarget.kind === 'draft'
            ? t('toast.scheduleFailed')
            : t('toast.rescheduleFailed'),
        )
        throw new Error('schedule failed')
      } finally {
        setScheduleSubmitting(false)
      }
    },
    [scheduleTarget, queryClient, workspaceId, t],
  )

  const postMessagePayload = useCallback(async (row: OutboundSendRow) => {
    const payload = {
      content: row.content,
      parentId: row.parentId ?? undefined,
      alsoSendToChannel: row.alsoSendToChannel ?? false,
    }
    if (row.channelId) {
      const { data } = await apiClient.post<Message>(
        `/channels/${row.channelId}/messages`,
        payload,
      )
      return data
    }
    if (row.conversationId) {
      const { data } = await apiClient.post<Message>(
        `/direct-messages/${row.conversationId}/messages`,
        payload,
      )
      return data
    }
    throw new Error('no_target')
  }, [])

  const handleSendDraft = useCallback(
    async (row: MessageDraftSummary) => {
      const outbound: OutboundSendRow = {
        content: row.html,
        channelId: row.channelId,
        conversationId: row.conversationId,
        parentId: row.parentId,
        alsoSendToChannel: false,
      }
      const opt =
        user != null
          ? applyDraftsOutboundOptimistic(
              queryClient,
              workspaceId,
              outbound,
              user,
            )
          : null
      try {
        const newMessage = await postMessagePayload(outbound)
        finalizeDraftsOutboundOptimistic(
          queryClient,
          workspaceId,
          outbound,
          newMessage,
          opt,
        )
        await deleteMessageDraftApi(workspaceId, row.contextKey)
        replaceMessageDraftInCaches(
          queryClient,
          workspaceId,
          row.contextKey,
          null,
        )
        invalidateMessageCachesForRow(row)
        void queryClient.invalidateQueries({
          queryKey: draftKeys.list(workspaceId),
        })
        toast.success(t('toast.messageSent'))
      } catch (e: unknown) {
        rollbackDraftsOutboundOptimistic(
          queryClient,
          workspaceId,
          outbound,
          opt,
        )
        const err = e as { message?: string }
        if (err?.message === 'no_target') {
          toast.error(t('toast.draftNoTarget'))
        } else {
          toast.error(t('toast.messageSendFailed'))
        }
      }
    },
    [
      postMessagePayload,
      workspaceId,
      queryClient,
      invalidateMessageCachesForRow,
      user,
      t,
    ],
  )

  const handleSendScheduledNow = useCallback(
    async (row: ScheduledMessageRow) => {
      const outbound: OutboundSendRow = {
        content: row.content,
        channelId: row.channelId,
        conversationId: row.conversationId,
        parentId: row.parentId,
        alsoSendToChannel: row.alsoSendToChannel,
      }
      const opt =
        user != null
          ? applyDraftsOutboundOptimistic(
              queryClient,
              workspaceId,
              outbound,
              user,
            )
          : null
      try {
        const newMessage = await postMessagePayload(outbound)
        finalizeDraftsOutboundOptimistic(
          queryClient,
          workspaceId,
          outbound,
          newMessage,
          opt,
        )
        try {
          await cancelScheduledMessageApi(workspaceId, row.id)
        } catch {
          toast.warning(t('toast.messageSentScheduleNotCancelled'))
        }
        invalidateScheduledMessageQueries(queryClient, workspaceId)
        invalidateMessageCachesForRow(row)
        toast.success(t('toast.messageSent'))
      } catch (e: unknown) {
        rollbackDraftsOutboundOptimistic(
          queryClient,
          workspaceId,
          outbound,
          opt,
        )
        const err = e as { message?: string }
        if (err?.message === 'no_target') {
          toast.error(t('toast.scheduledNoChannelOrDM'))
        } else {
          toast.error(t('toast.messageSendFailed'))
        }
      }
    },
    [postMessagePayload, workspaceId, queryClient, invalidateMessageCachesForRow, user, t],
  )

  const handleCancelScheduleToDraft = useCallback(
    async (row: ScheduledMessageRow) => {
      try {
        await cancelScheduledMessageApi(workspaceId, row.id)
        const contextKey = scheduledRowToDraftContextKey(row)
        await upsertMessageDraftApi(workspaceId, {
          contextKey,
          content: row.content,
        })
        invalidateScheduledMessageQueries(queryClient, workspaceId)
        void queryClient.invalidateQueries({
          queryKey: draftKeys.list(workspaceId),
        })
        void queryClient.invalidateQueries({
          queryKey: draftKeys.current(workspaceId, contextKey),
        })
        toast.success(t('toast.convertedToDraft'))
      } catch {
        toast.error(t('toast.draftSaveFailed'))
      }
    },
    [workspaceId, queryClient, t],
  )

  const scheduleDialogDefaults =
    scheduleTarget?.kind === 'reschedule'
      ? scheduledAtIsoToFormDefaults(scheduleTarget.row.scheduledAt)
      : undefined

  return (
    <div className="flex min-h-0 flex-1 flex-col bg-white dark:bg-[#1A1D21]">
      <div className="border-b border-[#797c814d]">
        <div className="flex items-center justify-between gap-4 px-4">
          <Typography text={t('title')} variant="h5" />
        </div>
        <DraftsScheduledTabBar
          tab={tab}
          onTabChange={handleTabChange}
          draftsCount={summaries.length}
          scheduledCount={pendingScheduled.length}
          t={t}
        />
      </div>

      <div className="min-h-0 flex-1 overflow-y-auto px-6 py-4">
        {tab === 'drafts' && (
          <DraftsTabContent
            summaries={summaries}
            channels={channels}
            conversations={conversations}
            userId={user?.id}
            onOpenDraft={openDraftRow}
            onDeleteDraft={handleDeleteDraft}
            onScheduleDraft={handleScheduleDraft}
            onSendDraft={handleSendDraft}
            onNewMessage={openNewMessage}
            t={t}
          />
        )}
        {tab === 'scheduled' && (
          <ScheduledTabContent
            rows={pendingScheduled}
            channels={channels}
            conversations={conversations}
            userId={user?.id}
            isCancelling={isCancelling}
            onEditScheduled={openScheduledForEdit}
            onReschedule={handleReschedule}
            onSendNow={handleSendScheduledNow}
            onCancelToDraft={handleCancelScheduleToDraft}
            onDeleteScheduled={(row) => cancelScheduled(row.id)}
            onNewMessage={openNewMessage}
            t={t}
          />
        )}
      </div>

      <ScheduleSendDialog
        key={
          scheduleTarget
            ? `${scheduleTarget.kind}-${scheduleTarget.kind === 'draft' ? scheduleTarget.row.contextKey : scheduleTarget.row.id}`
            : 'closed'
        }
        open={scheduleOpen}
        onOpenChange={setScheduleOpen}
        onConfirm={handleScheduleConfirm}
        defaultValues={scheduleDialogDefaults}
        isSubmitting={scheduleSubmitting}
      />
    </div>
  )
}
