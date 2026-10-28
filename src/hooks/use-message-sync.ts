import { useQueryClient } from "@tanstack/react-query";
import { useCallback } from "react";
import { Message, MessagesPage, SavedItemsPage, ThreadsPage } from "@/lib/types";
import { messageKeys, workspaceKeys } from "@/lib/query-keys";
import { useMessageStore } from "@/stores/useMessageStore";
import { useThreadPanelStore } from "@/stores/useThreadPanelStore";
import { useUserStore } from "@/stores/useUserStore";

/**
 * useMessageSync - Bộ não điều khiển việc đồng bộ dữ liệu tin nhắn toàn cục.
 * Kết hợp giữa Zustand (Source of Truth) và React Query (Lists/Cache).
 */
export function useMessageSync() {
  const queryClient = useQueryClient();
  const store = useMessageStore();
  const currentUserId = useUserStore((s) => s.user?.id ?? null);

  /**
   * Cập nhật tin nhắn ở tất cả mọi nơi
   */
  const syncMessageUpdate = useCallback((updatedMessage: Partial<Message> & { id: string }) => {
    if (updatedMessage.attachments) {
      console.log(
        `[MessageSync] syncMessageUpdate - id: ${updatedMessage.id}, ` +
        `attachments count: ${updatedMessage.attachments.length}, ` +
        `attachments[0] URL length: ${updatedMessage.attachments[0]?.url?.length ?? 'N/A'}, ` +
        `attachments[0] URL: ${updatedMessage.attachments[0]?.url ?? 'N/A'}`,
      );
    }

    // Filter undefined values — prevents overwriting valid fields with undefined
    // (e.g. when backend broadcasts UPDATE without all fields, like finalizeAttachment
    // which previously sent replyCount=undefined for parent message).
    const sanitizedUpdate = Object.fromEntries(
      Object.entries(updatedMessage).filter(([_, v]) => v !== undefined),
    ) as Partial<Message> & { id: string };

    // 1. Update Zustand Entity (Cực nhanh, O(1))
    store.updateEntity(updatedMessage.id, sanitizedUpdate);

    // 1b. Nếu là thread update (replyCount tăng), set isUnread nếu:
    // - Message có replyCount > 0
    // - Current user KHÔNG phải là author
    // - Current user KHÔNG nằm trong replyParticipantIds
    if (sanitizedUpdate.replyCount !== undefined && sanitizedUpdate.replyCount > 0) {
      const entity = store.entities[updatedMessage.id] as Record<string, unknown> | undefined;
      const authorId = (entity?.user as { id?: string } | null)?.id;
      const participantIds = entity?.replyParticipantIds as string[] | undefined;
      
      const isOwnMessage = currentUserId && (
        authorId === currentUserId || 
        participantIds?.includes(currentUserId)
      );
      
      if (!isOwnMessage && entity && !(entity.isUnread as boolean)) {
        store.updateEntity(updatedMessage.id, { isUnread: true } as Partial<Message>);
      }
    }

    // 2. Nếu là cập nhật nội dung, cũng cập nhật trường `parent` trong các reply
    // có alsoSendToChannel = true đang dùng nội dung này làm "replied to a thread: ..."
    if (updatedMessage.content !== undefined || updatedMessage.attachments !== undefined) {
      const allEntities = useMessageStore.getState().entities;
      Object.values(allEntities).forEach((entity) => {
        if (entity.parentId === updatedMessage.id && entity.alsoSendToChannel) {
          store.updateEntity(entity.id, {
            parent: {
              ...entity.parent,
              content: updatedMessage.content ?? entity.parent?.content ?? '',
              attachments: updatedMessage.attachments ?? entity.parent?.attachments ?? [],
              deletedAt: updatedMessage.deletedAt ?? entity.parent?.deletedAt ?? null,
            },
          });
        }
      });
    }

    // 2. Update Thread Panel nếu đang mở tin nhắn này
    const { updateMessage: syncThreadPanel, messageId: openParentId } = useThreadPanelStore.getState();
    if (openParentId === updatedMessage.id) {
      syncThreadPanel(sanitizedUpdate);
    }

    // 3. Update React Query Cache (Legacy support & list reactivity)
    const updateTransform = (old: any) => {
      if (!old?.pages) return old;
      return {
        ...old,
        pages: old.pages.map((page: MessagesPage) => ({
          ...page,
          messages: page.messages.map((m) => {
            if (m.id === updatedMessage.id) return { ...m, ...sanitizedUpdate };
            // Cập nhật parent.content trong các reply alsoSendToChannel
            if (
              m.parentId === updatedMessage.id &&
              m.alsoSendToChannel &&
              (sanitizedUpdate.content !== undefined || sanitizedUpdate.attachments !== undefined)
            ) {
              return {
                ...m,
                parent: {
                  ...m.parent,
                  content: sanitizedUpdate.content ?? m.parent?.content ?? '',
                  attachments: sanitizedUpdate.attachments ?? m.parent?.attachments ?? [],
                  deletedAt: sanitizedUpdate.deletedAt ?? m.parent?.deletedAt ?? null,
                },
              };
            }
            return m;
          }),
        })),
      };
    };

    queryClient.setQueriesData({ queryKey: messageKeys.all }, updateTransform);
    queryClient.setQueriesData({ queryKey: messageKeys.threadsAll }, updateTransform);
    
    // Threads Page sync
    queryClient.setQueriesData({ queryKey: workspaceKeys.all }, (old: any) => {
      if (!old?.pages) return old;
      return {
        ...old,
        pages: old.pages.map((page: ThreadsPage) => {
          if (!page.threads) return page;
          return {
            ...page,
            threads: page.threads.map((t) => {
              if (t.id === updatedMessage.id) return { ...t, ...sanitizedUpdate };
              return {
                ...t,
                replies: t.replies.map((r) => {
                  if (r.id === updatedMessage.id) return { ...r, ...sanitizedUpdate };
                  // Cập nhật parent.content trong reply alsoSendToChannel trên Threads Page
                  if (
                    r.parentId === updatedMessage.id &&
                    r.alsoSendToChannel &&
                    (sanitizedUpdate.content !== undefined || sanitizedUpdate.attachments !== undefined)
                  ) {
                    return {
                      ...r,
                      parent: {
                        ...r.parent,
                        content: sanitizedUpdate.content ?? r.parent?.content ?? '',
                        attachments: sanitizedUpdate.attachments ?? r.parent?.attachments ?? [],
                        deletedAt: sanitizedUpdate.deletedAt ?? r.parent?.deletedAt ?? null,
                      },
                    };
                  }
                  return r;
                }),
              };
            }),
          };
        }),
      };
    });

    if (updatedMessage.isPinned !== undefined) {
      const ent = useMessageStore.getState().entities[updatedMessage.id];
      const tid = ent?.channelId ?? ent?.conversationId;
      if (tid) {
        void queryClient.invalidateQueries({ queryKey: ["pinned-messages", tid] });
      } else {
        void queryClient.invalidateQueries({ queryKey: messageKeys.pinnedAll });
      }
    } else {
      queryClient.setQueriesData({ queryKey: messageKeys.pinnedAll }, (old: Message[] | undefined) =>
        old?.map((m) => (m.id === updatedMessage.id ? { ...m, ...sanitizedUpdate } : m)),
      );
    }
  }, [queryClient, store, currentUserId]);

  /**
   * Xử lý khi tin nhắn bị xóa
   */
  const syncMessageDeletion = useCallback((messageId: string) => {
    const deletionPatch = { deletedAt: new Date().toISOString(), content: '' };
    
    // 1. Update Zustand
    store.updateEntity(messageId, deletionPatch);

    // 2. Update Thread Panel
    const { messageId: openParentId } = useThreadPanelStore.getState();
    if (openParentId === messageId) {
      useThreadPanelStore.getState().updateMessage({ id: messageId, ...deletionPatch });
    }

    // 3. Update React Query
    const deleteTransform = (old: any) => {
      if (!old?.pages) return old;
      return {
        ...old,
        pages: old.pages.map((page: MessagesPage) => ({
          ...page,
          messages: page.messages.map((m) =>
            m.id === messageId ? { ...m, ...deletionPatch } : m
          ),
        })),
      };
    };
    queryClient.setQueriesData({ queryKey: messageKeys.all }, deleteTransform);
    queryClient.setQueriesData({ queryKey: messageKeys.threadsAll }, deleteTransform);
    void queryClient.invalidateQueries({ queryKey: messageKeys.pinnedAll });
  }, [queryClient, store]);

  /**
   * Xử lý khi có tin nhắn mới (Đặc biệt quan trọng cho Thread Panel)
   */
  const syncMessageCreation = useCallback((newMessage: Message) => {
    // 1. Update Zustand Entity
    store.upsertEntities([newMessage]);

    // 2. Nếu là reply, update React Query Cache cho Thread Panel
    if (newMessage.parentId) {
      queryClient.setQueryData(
        messageKeys.thread(newMessage.parentId),
        (old: { pages: MessagesPage[]; pageParams: unknown[] } | undefined) => {
          if (!old) return old;
          const alreadyExists = old.pages.some((page) =>
            page.messages.some((m) => m.id === newMessage.id)
          );
          if (alreadyExists) return old;

          const firstPage = old.pages[0] || { messages: [] };
          return {
            ...old,
            pages: [
              { ...firstPage, messages: [newMessage, ...firstPage.messages] },
              ...old.pages.slice(1),
            ],
          };
        }
      );

      // 3. Cập nhật React Query Cache cho trang Threads (workspaceKeys.all)
      queryClient.setQueriesData({ queryKey: workspaceKeys.all }, (old: any) => {
        if (!old?.pages) return old;
        return {
          ...old,
          pages: old.pages.map((page: ThreadsPage) => {
            if (!page.threads) return page;
            return {
              ...page,
              threads: page.threads.map((t) => {
                if (t.id === newMessage.parentId) {
                  // Tránh trùng lặp
                  if (t.replies.some((r) => r.id === newMessage.id)) return t;
                  return {
                    ...t,
                    replies: [...t.replies, newMessage],
                  };
                }
                return t;
              }),
            };
          }),
        };
      });
    }
  }, [queryClient, store]);

  return {
    syncMessageUpdate,
    syncMessageDeletion,
    syncMessageCreation,
  };
}
