import { ReactRenderer } from '@tiptap/react'
import tippy, { Instance as TippyInstance, Props as TippyProps } from 'tippy.js'
import { MentionList } from './mention-list'
import type { User, WorkspaceMember } from '@/lib/types'
import { mergeUserForDisplay, useWorkspaceMemberStore } from '@/stores/useWorkspaceMemberStore'

export const createSuggestion = (
  workspaceMembers: WorkspaceMember[] = [],
  currentMembers: any[] = [],
  channelName?: string,
  workspaceId?: string,
) => {
  const overlayMap = () =>
    workspaceId
      ? useWorkspaceMemberStore.getState().byWorkspace[workspaceId] ?? {}
      : {}

  return {
    items: ({ query }: { query: string }) => {
      let items: (WorkspaceMember | { id: string; name: string; type: 'special'; description: string; notInChannel?: boolean })[] = []

      // Nếu ở trong channel, thêm @channel và @here
      if (channelName) {
        items.push(
          {
            id: 'channel',
            name: 'channel',
            type: 'special',
            description: 'Notify everyone in this channel.',
          },
          {
            id: 'here',
            name: 'here',
            type: 'special',
            description: 'Notify every online member in this channel.',
          }
        )
      }

      // Thêm các thành viên workspace và đánh dấu nếu không có trong channel/DM hiện tại
      const currentMemberIds = new Set(currentMembers.map(m => m.id))
      const map = overlayMap()
      const q = query.trim().toLowerCase()

      const members = workspaceMembers
        .filter((item) => {
          const d = mergeUserForDisplay(item as User, map[item.id])
          const lowName = (d.name ?? "").toLowerCase()
          const lowDisplay = (d.displayName ?? "").toLowerCase()
          const lowEmail = (d.email ?? item.email).toLowerCase()
          return (
            lowName.includes(q) ||
            lowDisplay.includes(q) ||
            lowEmail.includes(q)
          )
        })
        .map(item => ({
          ...item,
          notInChannel: !currentMemberIds.has(item.id)
        }))
        .slice(0, 10)

      items = [...items, ...members]

      if (q) {
        items = items.filter((item) => {
          if ("type" in item && item.type === "special") {
            const name = (item.name ?? "").toLowerCase()
            const desc = (item.description ?? "").toLowerCase()
            return name.includes(q) || desc.includes(q)
          }
          const m = item as WorkspaceMember
          const d = mergeUserForDisplay(m as User, map[m.id])
          const lowName = (d.name ?? "").toLowerCase()
          const lowDisplay = (d.displayName ?? "").toLowerCase()
          const lowEmail = (d.email ?? m.email).toLowerCase()
          return (
            lowName.includes(q) ||
            lowDisplay.includes(q) ||
            lowEmail.includes(q)
          )
        })
      }

      return items
    },

    render: () => {
      let component: ReactRenderer<any>
      let popup: TippyInstance[]

      return {
        onStart: (props: any) => {
          component = new ReactRenderer(MentionList, {
            props: { ...props, workspaceId },
            editor: props.editor,
          })

          if (!props.clientRect) {
            return
          }

          popup = tippy('body', {
            getReferenceClientRect: props.clientRect,
            appendTo: () => document.body,
            content: component.element,
            showOnCreate: true,
            interactive: true,
            trigger: 'manual',
            placement: 'bottom-start',
          } as Partial<TippyProps>)
        },

        onUpdate(props: any) {
          component.updateProps({ ...props, workspaceId })

          if (!props.clientRect) {
            return
          }

          popup[0].setProps({
            getReferenceClientRect: props.clientRect,
          })
        },

        onKeyDown(props: any) {
          if (props.event.key === 'Escape') {
            popup[0].hide()
            return true
          }

          const handled = component.ref?.onKeyDown(props)
          if (handled) {
            props.event.stopPropagation()
          }
          return handled
        },

        onExit() {
          popup[0].destroy()
          component.destroy()
        },
      }
    },
  }
}
