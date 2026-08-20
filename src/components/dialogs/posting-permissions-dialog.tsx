"use client"

import React, { useEffect, useMemo, useRef, useState } from "react"
import { useQuery } from "@tanstack/react-query"
import { useForm, useWatch } from "react-hook-form"
import {
  CustomDialog,
  CustomDialogBody,
  CustomDialogFooter,
  CustomDialogHeader,
  CustomDialogTitle
} from "../custom-dialog"
import { Button } from "../ui/button"
import Typography from "../ui/typography"
import { cn } from "@/lib/utils"
import { Separator } from "../ui/separator"
import type { UpdateChannelPayload, User, WorkspaceMember } from "@/lib/types"
import { fetchWorkspaceMembersApi } from "@/apis"
import { useDebouncedValue } from "@/hooks/use-debounce"
import { useWorkspaceMemberStore } from "@/stores/useWorkspaceMemberStore"
import { useShallow } from "zustand/react/shallow"
import {
  MESSAGE_TARGET_DROPDOWN_CLASS,
  MESSAGE_TARGET_INPUT_WRAP_CLASS,
  MessageTargetChip,
  MessageTargetSearchRow,
} from "@/components/message-target-picker"
import { useDialogs } from "@/hooks/use-translation"

interface Props {
  open: boolean
  onOpenChange: (open: boolean) => void
  workspaceId: string
  currentUserId?: string
  initialValue?: NonNullable<UpdateChannelPayload["postingSettings"]> | null
  onSave: (value: NonNullable<UpdateChannelPayload["postingSettings"]>) => void
}

type PostingMode = NonNullable<UpdateChannelPayload["postingSettings"]>["mode"]

type PostingPermissionsFormValues = NonNullable<UpdateChannelPayload["postingSettings"]>

function matchesMemberSearch(
  m: WorkspaceMember,
  raw: string,
  overlay?: Partial<User> | null,
): boolean {
  const q = raw.trim().toLowerCase()
  if (!q) return true
  const d = { ...m, ...(overlay ?? {}) } as User
  const name = (d.name ?? "").toLowerCase()
  const displayName = (d.displayName ?? "").toLowerCase()
  const email = (d.email ?? m.email).toLowerCase()
  return name.includes(q) || displayName.includes(q) || email.includes(q)
}

export default function PostingPermissionsDialog({
  open,
  onOpenChange,
  workspaceId,
  currentUserId,
  initialValue,
  onSave,
}: Props) {
  const t = useDialogs();
  const [searchQuery, setSearchQuery] = useState("")
  const searchRef = useRef<HTMLDivElement>(null)
  const initialFormValues = useMemo<PostingPermissionsFormValues>(() => {
    const value = initialValue ?? null
    return {
      mode: value?.mode ?? "everyone",
      allowThreads: value?.allowThreads ?? true,
      allowMentions: value?.allowMentions ?? true,
      specificUserIds: value?.specificUserIds ?? [],
    }
  }, [initialValue])
  const initialSignature = useMemo(
    () => JSON.stringify(initialFormValues),
    [initialFormValues],
  )

  const form = useForm<PostingPermissionsFormValues>({
    defaultValues: {
      mode: "everyone",
      allowThreads: true,
      allowMentions: true,
      specificUserIds: [],
    },
  })

  const mode = useWatch({ control: form.control, name: "mode" })
  const specificUserIds = useWatch({ control: form.control, name: "specificUserIds" })
  const allowThreads = useWatch({ control: form.control, name: "allowThreads" })
  const allowMentions = useWatch({ control: form.control, name: "allowMentions" })

  const debouncedSearch = useDebouncedValue(searchQuery, 250)
  const memberOverlayMap = useWorkspaceMemberStore(
    useShallow((s) => s.byWorkspace[workspaceId] ?? {}),
  )

  const { data: workspaceMembers = [] } = useQuery({
    queryKey: ["workspace-members", workspaceId],
    queryFn: () => fetchWorkspaceMembersApi(workspaceId),
    enabled: open && !!workspaceId,
    staleTime: 30_000,
  })

  useEffect(() => {
    if (!open) return
    form.reset(initialFormValues)
  }, [open, form, initialFormValues])

  const pendingIdSet = useMemo(() => new Set(specificUserIds ?? []), [specificUserIds])

  const filteredMembers = useMemo(() => {
    const q = debouncedSearch.trim()
    return workspaceMembers
      .filter((m) => m.id !== currentUserId)
      .filter((m) => !pendingIdSet.has(m.id))
      .filter((m) => matchesMemberSearch(m, q, memberOverlayMap[m.id]))
  }, [workspaceMembers, currentUserId, pendingIdSet, debouncedSearch, memberOverlayMap])

  const pendingMembersResolved = useMemo(() => {
    const map = new Map(workspaceMembers.map((m) => [m.id, m]))
    return (specificUserIds ?? [])
      .map((id) => map.get(id))
      .filter(Boolean) as WorkspaceMember[]
  }, [specificUserIds, workspaceMembers])

  const showMemberPicker = mode === "admins_plus_specific_people"
  const showDropdown = showMemberPicker && debouncedSearch.trim().length > 0

  const displayMember = (m: WorkspaceMember) => {
    const overlay = memberOverlayMap[m.id] as Partial<User> | undefined
    return {
      name: overlay?.name ?? m.name,
      displayName: overlay?.displayName ?? m.displayName ?? null,
      avatar: overlay?.avatar ?? m.avatar,
      statusEmoji: overlay?.statusEmoji ?? m.statusEmoji,
      statusText: overlay?.statusText ?? m.statusText,
      email: overlay?.email ?? m.email,
    }
  }

  const addPendingUser = (userId: string) => {
    const current = form.getValues("specificUserIds")
    if (current.includes(userId)) return
    form.setValue("specificUserIds", [...current, userId], { shouldDirty: true })
    setSearchQuery("")
  }

  const removePendingUser = (userId: string) => {
    const current = form.getValues("specificUserIds")
    form.setValue(
      "specificUserIds",
      current.filter((id) => id !== userId),
      { shouldDirty: true },
    )
  }

  const closeAndReset = (next: boolean) => {
    onOpenChange(next)
    if (!next) {
      setSearchQuery("")
    }
  }

  const save = () => {
    void form.handleSubmit((values) => {
      onSave({
        ...values,
        specificUserIds:
          values.mode === "admins_plus_specific_people" ? values.specificUserIds : [],
      })
      closeAndReset(false)
    })()
  }

  const isSaveDisabled =
    !form.formState.isDirty ||
    JSON.stringify({
      mode,
      allowThreads,
      allowMentions,
      specificUserIds: specificUserIds ?? [],
    }) === initialSignature

  const postingOptions = useMemo(() => [
    { id: "everyone" as PostingMode, label: t('postingPermissions.everyone') },
    { id: "admin_only" as PostingMode, label: t('postingPermissions.adminsOnly') },
    { id: "admins_plus_specific_people" as PostingMode, label: t('postingPermissions.adminsPlusSpecific') },
  ], [t])

  return (
    <CustomDialog open={open} onOpenChange={closeAndReset}>
      <CustomDialogHeader onOpenChange={closeAndReset}>
        <CustomDialogTitle>{t('postingPermissions.title')}</CustomDialogTitle>
      </CustomDialogHeader>
      <CustomDialogBody className="bg-white dark:bg-[#1A1D21]">
        <div className="flex flex-col gap-5">
          <div className="flex flex-col gap-4">
            <Typography text={t('postingPermissions.whoCanPost')} className="font-semibold" />

            <div className="flex flex-col gap-2">
              {postingOptions.map((option) => {
                const checked = mode === option.id
                return (
                  <label key={option.id} className="flex cursor-pointer items-center gap-3">
                    <span
                      className={cn(
                        "relative flex size-3 items-center justify-center rounded-full border transition-colors",
                        checked
                          ? "border-selection-hover bg-selection-hover"
                          : "border-[#77797d] bg-transparent",
                      )}
                    >
                      {checked ? <span className="size-1 rounded-full bg-white" /> : null}
                    </span>
                    <input
                      type="radio"
                      name="posting-permissions"
                      value={option.id}
                      checked={checked}
                      onChange={() => form.setValue("mode", option.id, { shouldDirty: true })}
                      className="sr-only"
                    />
                    <Typography as="span" className="text-[13px] font-semibold">
                      {option.label}
                    </Typography>
                  </label>
                )
              })}

              {showMemberPicker ? (
                <div className="pl-7">
                  <div className="relative mt-2" ref={searchRef}>
                    <div className={cn(MESSAGE_TARGET_INPUT_WRAP_CLASS, "min-h-10 bg-white p-1.5 dark:bg-[#1A1D21] focus-within:ring-selection-hover")}>
                      {pendingMembersResolved.map((member) => {
                        const d = displayMember(member)
                        return (
                          <MessageTargetChip
                            key={member.id}
                            kind="member"
                            member={{
                              id: member.id,
                              displayName: d.displayName || d.name || member.email,
                              name: d.name || member.email.split("@")[0] || member.email,
                              email: member.email,
                              avatar: d.avatar || null,
                            }}
                            onRemove={() => removePendingUser(member.id)}
                          />
                        )
                      })}

                      <div className="flex min-w-[160px] flex-1 items-center gap-2">
                        <input
                          value={searchQuery}
                          onChange={(e) => setSearchQuery(e.target.value)}
                          placeholder={t('postingPermissions.findMembers')}
                          className="min-w-0 flex-1 border-0 bg-transparent text-[13px] outline-none placeholder:text-muted-foreground"
                        />
                      </div>
                    </div>

                    {showDropdown ? (
                      <div className={cn(MESSAGE_TARGET_DROPDOWN_CLASS, "bg-white py-2 shadow-lg dark:bg-[#222529]")}>
                        {filteredMembers.length === 0 ? (
                          <div className="px-4 py-2 text-sm text-muted-foreground">
                            {t('postingPermissions.noMatchingPeople')}
                          </div>
                        ) : (
                          filteredMembers.map((member) => {
                            const d = displayMember(member)
                            return (
                              <MessageTargetSearchRow
                                key={member.id}
                                workspaceId={workspaceId}
                                kind="member"
                                member={{
                                  id: member.id,
                                  displayName: d.displayName || d.name || member.email,
                                  name: d.name || member.email.split("@")[0] || member.email,
                                  email: d.email,
                                  avatar: d.avatar || null,
                                }}
                                onClick={() => addPendingUser(member.id)}
                              />
                            )
                          })
                        )}
                      </div>
                    ) : null}
                  </div>
                </div>
              ) : null}
            </div>
          </div>

          <Separator />

          <div className="flex flex-col gap-4">
            {mode !== "everyone" ? (
              <label className="flex cursor-pointer items-start gap-3">
                <input
                  type="checkbox"
                  checked={allowThreads}
                  onChange={(e) =>
                    form.setValue("allowThreads", e.target.checked, { shouldDirty: true })
                  }
                  className="size-3 cursor-pointer accent-selection-hover"
                />
                <div className="flex flex-col gap-1">
                  <Typography text={t('postingPermissions.allowThreads')} className="text-[13px] font-semibold" />
                  <Typography
                    text={t('postingPermissions.allowThreadsDescription')}
                    className="max-w-108 text-[13px] leading-5 text-muted-foreground"
                  />
                </div>
              </label>
            ) : null}

            <label className="flex cursor-pointer items-start gap-3">
              <input
                type="checkbox"
                checked={allowMentions}
                onChange={(e) =>
                  form.setValue("allowMentions", e.target.checked, { shouldDirty: true })
                }
                className="size-3 cursor-pointer accent-selection-hover"
              />
              <div className="flex flex-col gap-1">
                <Typography text={t('postingPermissions.allowMentions')} className="text-[13px] font-semibold" />
                <Typography
                  text={t('postingPermissions.allowMentionsDescription')}
                  className="max-w-108 text-[13px] leading-5 text-muted-foreground"
                />
              </div>
            </label>
          </div>
        </div>
      </CustomDialogBody>

      <CustomDialogFooter>
        <Button
          type="button"
          variant="outline"
          onClick={() => closeAndReset(false)}
          className="border-[#4A4D52] bg-transparent px-4 py-2 hover:bg-white/5"
        >
          {t('common.cancel')}
        </Button>
        <Button
          type="button"
          variant="success"
          onClick={save}
          disabled={isSaveDisabled}
          className="px-4 py-2"
        >
          {t('common.save')}
        </Button>
      </CustomDialogFooter>
    </CustomDialog>
  )
}
