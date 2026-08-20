"use client"

import PostingPermissionsDialog from '@/components/dialogs/posting-permissions-dialog'
import { Button } from '@/components/ui/button'
import Typography from '@/components/ui/typography'
import { Channel } from '@/lib/types'
import { useDeleteChannel, useUpdateChannel } from '@/hooks/use-channel'
import { useUserStore } from '@/stores/useUserStore'
import { useWorkspace } from '@/hooks/use-workspace'
import { useRouter } from 'next/navigation'
import React, { useState } from 'react'
import { FiHash } from 'react-icons/fi'
import { LuTrash2 } from 'react-icons/lu'
import { MdOutlineLock } from 'react-icons/md'
import { hasWorkspacePermission, type WorkspaceRoleKey } from '@/lib/workspace-permissions'
import { useAppTranslation } from '@/hooks/use-translation'

export default function SettingsTab({ currentChannelData, onOpenChange, isMember }: { currentChannelData: Channel, onOpenChange: (open: boolean) => void, isMember: boolean }) {
  const currentUser = useUserStore((s) => s.user)
  const router = useRouter()
  const { data: workspace } = useWorkspace(currentChannelData.workspaceId)
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const t = useAppTranslation('channel.settings')

  const canEditPostingSettings = hasWorkspacePermission(
    workspace,
    (currentUser?.role as WorkspaceRoleKey | null) ?? null,
    'edit_channel_posting_permissions',
  )
  const canChangePrivacy = hasWorkspacePermission(
    workspace,
    (currentUser?.role as WorkspaceRoleKey | null) ?? null,
    currentChannelData.isPrivate
      ? 'convert_private_channels_to_public'
      : 'convert_public_channels_to_private',
  )
  const canDeleteChannel = hasWorkspacePermission(
    workspace,
    (currentUser?.role as WorkspaceRoleKey | null) ?? null,
    'delete_channels',
  )
  const updateChannelMutation = useUpdateChannel(currentChannelData.workspaceId, currentChannelData.id)
  const deleteChannelMutation = useDeleteChannel(currentChannelData.workspaceId)

  const postingSettings = currentChannelData.postingSettings
  const selectedOption = postingSettings?.mode ?? 'everyone'
  const allowThreads = postingSettings?.allowThreads ?? true
  const allowMentions = postingSettings?.allowMentions ?? true

  return (
    <div className='flex flex-col gap-4'>
      <div className="rounded-lg border border-[#797c814d] bg-white p-4 dark:bg-[#1A1D21]">
        <div className="flex items-center justify-between gap-2">
          <Typography text={t('postingPermissions')} className="font-bold" />
          {isMember && canEditPostingSettings ? (
            <button
              type="button"
              onClick={() => setIsDialogOpen(true)}
              className="w-fit shrink-0 text-left text-[12px] font-semibold text-selection-hover hover:underline sm:text-[13px] dark:text-selection-hover! dark:hover:bg-transparent! dark:hover:text-selection-hover! hover:bg-transparent! hover:text-selection-hover!"
            >
              {t('edit')}
            </button>
          ) : null}
        </div>

        <div className="mt-3">
          <ul className="space-y-2 text-[15px] leading-6 text-[#1d1c1d] dark:text-[#D1D2D3]">
            <li className="flex gap-2">
              <span className="mt-2 size-1 rounded-full bg-muted-foreground" />
              <Typography
                text={
                  selectedOption === 'everyone'
                    ? t('everyoneCanPost')
                    : selectedOption === 'admin_only'
                      ? t('onlyAdminsCanPost')
                      : t('adminsAndSpecificCanPost')
                }
                className="leading-5 text-muted-foreground"
              />
            </li>
            <li className="flex gap-2">
              <span className="mt-2 size-1 rounded-full bg-muted-foreground" />
              <Typography
                className="leading-5 text-muted-foreground"
              >{allowThreads ? t('everyoneCanReply') : t('noOneCanReply')}</Typography>
            </li>
            <li className="flex gap-2">
              <span className="mt-2 size-1 rounded-full bg-muted-foreground" />
              <Typography className="leading-5 text-muted-foreground">
                {allowMentions
                  ? selectedOption === 'everyone'
                    ? t('workspaceMentionsNote')
                    : t('withPermissionCanMention')
                  : t('noOneCanMention')}
              </Typography>
            </li>
          </ul>
        </div>
      </div>

      {!currentChannelData.isDefaultChannel && (canChangePrivacy || canDeleteChannel) && (
        <div className="rounded-lg border border-[#797c814d] bg-white dark:bg-[#1A1D21]">
          {canChangePrivacy ? (
            currentChannelData.isPrivate ? (
              <Button
                type="button"
                onClick={() =>
                  updateChannelMutation.mutate({
                    isPrivate: false,
                  })
                }
                disabled={updateChannelMutation.isPending}
                className="w-full gap-2 justify-start border-b border-[#797c814d] p-4 cursor-pointer"
              >
                <FiHash size={15} />
                <Typography text={t('changeToPublicChannel')} className="font-semibold leading-3" />
              </Button>
            ) : (
              <Button
                type="button"
                onClick={() =>
                  updateChannelMutation.mutate({
                    isPrivate: true,
                  })
                }
                disabled={updateChannelMutation.isPending}
                className="w-full gap-2 justify-start border-b border-[#797c814d] p-4 cursor-pointer"
              >
                <MdOutlineLock size={15} />
                <Typography text={t('changeToPrivateChannel')} className="font-semibold leading-3" />
              </Button>
            )
          ) : null}
          {canDeleteChannel ? (
            <Button
              type="button"
              onClick={() => {
                const ok = window.confirm(t('deleteChannelConfirm'))
                if (!ok) return
                deleteChannelMutation.mutate(currentChannelData.id, {
                  onSuccess: () => {
                    setIsDialogOpen(false)
                    onOpenChange(false)
                    router.replace(`/workspace/${currentChannelData.workspaceId}`)
                  },
                })
              }}
              disabled={deleteChannelMutation.isPending}
              className="w-full gap-2 justify-start p-4 text-red-500 dark:text-red-500! cursor-pointer hover:text-red-500!"
            >
              <LuTrash2 size={15} />
              <Typography text={t('deleteThisChannel')} className="font-semibold leading-3" />
            </Button>
          ) : null}
        </div>
      )}


      <PostingPermissionsDialog
        open={isDialogOpen}
        onOpenChange={setIsDialogOpen}
        workspaceId={currentChannelData.workspaceId}
        currentUserId={currentUser?.id}
        initialValue={currentChannelData.postingSettings ?? null}
        onSave={(postingSettings) =>
          updateChannelMutation.mutate({
            postingSettings,
          })
        }
      />

    </div>
  )
}
