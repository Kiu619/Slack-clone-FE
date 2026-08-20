"use client";

import { EditAboutMeDialog } from "@/components/dialogs/edit-about-me-dialog";
import { EditContactInforDialog } from "@/components/dialogs/edit-contact-infor-dialog";
import { EditProfileDialog } from "@/components/dialogs/edit-profile-dialog";
import { SetAStatusDialog } from "@/components/dialogs/set-a-status-dialog";
import {
  getMemberStatusApi,
  getOrCreateDirectMessageApi,
  getWorkspaceProfileApi,
  updateProfileApi,
} from "@/apis";
import { useWorkspace } from "@/hooks/use-workspace";
import { useAppTranslation } from "@/hooks/use-translation";
import { useProfilePanelStore } from "@/stores/useProfilePanelStore";
import { useUserStore } from "@/stores/useUserStore";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { openDmInWorkspace } from "@/lib/open-dm-in-workspace";
import { mergeAccountWithWorkspaceProfile } from "@/lib/merge-user";
import DOMPurify from "dompurify";
import { usePathname, useRouter } from "next/navigation";
import { useState, useMemo } from "react";
import { LuClock3 } from "react-icons/lu"
import { PanelHeader } from "@/components/panel-header";
import {
  MdAdd,
  MdMoreVert,
  MdOpenInNew,
  MdOutlineMail,
  MdOutlinePhone,
} from "react-icons/md";
import Avatar from "../../components/avatar";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "../../components/ui/popover";
import { Separator } from "../../components/ui/separator";
import Typography from "../../components/ui/typography";
import { timeZoneValueToIana } from "@/lib/timezone";
import { toast } from "sonner";
import { isAxiosError } from "axios";
import { usePreferencesStore } from "@/stores/usePreferencesStore";
import { authKeys, messageKeys } from "@/lib/query-keys";
import type { User, WorkspaceMemberStatus } from "@/lib/types";
import {
  mergeMemberStatusWithOverlay,
  mergeUserForDisplay,
  useWorkspaceMemberOverlay,
} from "@/stores/useWorkspaceMemberStore";
import { Skeleton } from "@/components/ui/skeleton";
import { UserStatusEmojiInline } from "@/components/user-status-emoji-inline";
import { UserPresenceIndicator } from "@/components/user-presence-indicator";

/** Gộp GET member status vào `User` (dùng khi mở profile từ cookie chỉ có `{ id }`). */
function memberStatusToUserPatch(s: WorkspaceMemberStatus): Partial<User> {
  return {
    id: s.id,
    email: s.email,
    name: s.name ?? undefined,
    displayName: s.displayName,
    avatar: s.avatar ?? undefined,
    membershipStatus: s.membershipStatus ?? undefined,
    isAway: s.isAway,
    status: s.status ?? undefined,
    namePronunciation: s.namePronunciation ?? undefined,
    phone: s.phone ?? undefined,
    description: s.description ?? undefined,
    timeZone: s.timeZone ?? undefined,
    statusText: s.statusText ?? undefined,
    statusEmoji: s.statusEmoji ?? undefined,
    statusExpiration: s.statusExpiration ?? undefined,
    notificationsPausedUntil: s.notificationsPausedUntil ?? undefined,
  };
}

export default function ProfilePanel() {
  const t = useAppTranslation("profile");
  const { user: currentUserData } = useUserStore();
  const {
    userData: storeUserData,
    workspaceId,
    close,
  } = useProfilePanelStore();
  const [isOpenEditProfileDialog, setIsOpenEditProfileDialog] = useState(false);
  const [isOpenEditContactInforDialog, setIsOpenEditContactInforDialog] =
    useState(false);
  const [isOpenEditAboutMeDialog, setIsOpenEditAboutMeDialog] = useState(false);
  const [isOpenSetStatusDialog, setIsOpenSetStatusDialog] = useState(false);
  const [isViewAsCoworker, setIsViewAsCoworker] = useState(false);
  const { open: openPreferencesDialog } = usePreferencesStore();
  const queryClient = useQueryClient();

  const isOwner = currentUserData?.id === storeUserData?.id;
  const showOwnerView = isOwner && !isViewAsCoworker;

  const { data: workspaceProfile } = useQuery<User>({
    queryKey: authKeys.workspaceProfile(workspaceId!),
    queryFn: () => getWorkspaceProfileApi(workspaceId!),
    enabled: !!workspaceId,
    staleTime: 60 * 1000,
  });

  /** Restore từ cookie: `openProfile` chỉ truyền `{ id }` — thiếu email/name/avatar. */
  const isThinProfileRestore =
    !isOwner &&
    !!storeUserData?.id &&
    Object.keys(storeUserData as object).length <= 1;

  const userDataBeforeStatus = isOwner
    ? (mergeAccountWithWorkspaceProfile(
        currentUserData as any,
        workspaceProfile,
      ) ?? storeUserData)
    : storeUserData;

  const memberOverlay = useWorkspaceMemberOverlay(
    workspaceId ?? "",
    userDataBeforeStatus?.id,
  );

  const {
    data: memberStatus,
    isPending: memberStatusPending,
    isError: memberStatusError,
  } = useQuery({
    queryKey: ["workspace-member-status", workspaceId, userDataBeforeStatus?.id],
    queryFn: () =>
      getMemberStatusApi(workspaceId!, userDataBeforeStatus!.id),
    enabled: !!workspaceId && !!userDataBeforeStatus?.id,
    staleTime: 30_000,
  });

  const userData = useMemo(() => {
    if (!userDataBeforeStatus?.id) return null;
    if (isOwner) return userDataBeforeStatus;
    const base = userDataBeforeStatus as User;
    if (memberStatus) {
      return { ...base, ...memberStatusToUserPatch(memberStatus), id: base.id };
    }
    return base;
  }, [isOwner, userDataBeforeStatus, memberStatus]);

  const awaitingOtherMemberProfile =
    isThinProfileRestore && memberStatusPending && !memberStatus;
  const failedOtherMemberProfile =
    isThinProfileRestore && memberStatusError && !memberStatus;

  const displayUser = useMemo(() => {
    if (!userData) return null;
    return mergeUserForDisplay(userData as User, memberOverlay);
  }, [userData, memberOverlay]);

  const profileHeadline = useMemo(() => {
    if (!displayUser) return "";
    return (
      displayUser.displayName?.trim() ||
      displayUser.name?.trim() ||
      displayUser.email?.split("@")[0]?.trim() ||
      ""
    );
  }, [displayUser]);

  const mergedMemberStatus = useMemo(
    () => mergeMemberStatusWithOverlay(memberStatus, memberOverlay),
    [memberStatus, memberOverlay],
  );
  const isDeactivatedMember =
    mergedMemberStatus?.membershipStatus === "deactivated" ||
    displayUser?.membershipStatus === "deactivated";

  const router = useRouter();
  const pathname = usePathname();
  const [isOpeningDm, setIsOpeningDm] = useState(false);

  const handleMessagePeer = async () => {
    if (isViewAsCoworker) return;
    if (!workspaceId || !userData?.id) {
      toast.error(t("error.couldNotOpenDm"));
      return;
    }
    if (userData.id === currentUserData?.id) {
      toast.error(t("error.cannotMessageSelf"));
      return;
    }
    setIsOpeningDm(true);
    try {
      const conv = await getOrCreateDirectMessageApi(workspaceId, [
        userData.id,
      ]);
      await queryClient.invalidateQueries({
        queryKey: messageKeys.conversations(workspaceId),
      });
      close();
      openDmInWorkspace(router, pathname, workspaceId, conv.id);
    } catch (e: unknown) {
      const msg = isAxiosError(e)
        ? (e.response?.data as { message?: string } | undefined)?.message
        : undefined;
      toast.error(
        typeof msg === "string" && msg.trim()
          ? msg
          : t("error.couldNotOpenDirectMessage"),
      );
    } finally {
      setIsOpeningDm(false);
    }
  };

  const handleUpdateStatus = async () => {
    if (!displayUser || !workspaceId) return;
    await updateProfileApi(workspaceId, {
      isAway: !displayUser.isAway,
    });
    await queryClient.invalidateQueries({
      queryKey: authKeys.workspaceProfile(workspaceId!),
    });
    if (userData?.id) {
      await queryClient.invalidateQueries({
        queryKey: ["workspace-member-status", workspaceId, userData.id],
      });
    }
  };

  const { data: workspaceMeta } = useWorkspace(workspaceId ?? "");

  const getLocalTime = () => {
    const date = new Date();
    const tzValue = displayUser?.timeZone;
    if (!tzValue) {
      const browserTz = Intl.DateTimeFormat().resolvedOptions().timeZone;
      return `${date.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit", timeZone: browserTz })} ${browserTz} (${t("localTimeSuffix")})`;
    }
    const iana = timeZoneValueToIana(tzValue);
    const timeStr = iana
      ? date.toLocaleTimeString([], {
          hour: "2-digit",
          minute: "2-digit",
          timeZone: iana,
        })
      : date.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
    return `${timeStr} (${t("localTimeSuffix")})`;
  };

  const sanitizedContent = () => {
    if (typeof window === "undefined") return displayUser?.description;
    return DOMPurify.sanitize(displayUser?.description || "", {
      ALLOWED_TAGS: [
        "p",
        "br",
        "strong",
        "em",
        "s",
        "u",
        "code",
        "pre",
        "ul",
        "ol",
        "li",
        "a",
        "blockquote",
        "span",
      ],
      ALLOWED_ATTR: ["href", "target", "rel", "class"],
    });
  };
  if (!storeUserData?.id || !workspaceId) {
    return null;
  }

  if (awaitingOtherMemberProfile) {
    return (
      <div className="flex flex-col h-full bg-white dark:bg-[#1A1D21] dark:text-[#d1d2d3] overflow-hidden">
        <PanelHeader title={t("title")} onClose={close} />
        <div className="flex flex-col gap-4 p-6 flex-1">
          <Skeleton className="mx-auto mt-4 h-60 w-60 rounded-lg" />
          <Skeleton className="h-6 w-48 mx-auto" />
          <Skeleton className="h-4 w-full max-w-md mx-auto" />
          <Skeleton className="h-4 w-full max-w-sm mx-auto" />
        </div>
      </div>
    );
  }

  if (failedOtherMemberProfile) {
    return (
      <div className="flex flex-col h-full bg-white dark:bg-[#1A1D21] dark:text-[#d1d2d3]">
        <PanelHeader title={t("title")} onClose={close} />
        <div className="p-6 text-[15px] text-[#616061] dark:text-[#ababad]">
          {t("couldNotLoadProfile")}
        </div>
      </div>
    );
  }

  if (!userData || !displayUser) {
    return null;
  }

  return (
    <div className="flex flex-col h-full bg-white dark:bg-[#1A1D21] dark:text-[#d1d2d3] overflow-y-auto overflow-x-hidden">
      {/* Header */}
      <PanelHeader title={t("title")} onClose={close} />

      {/* Banner for View as coworker */}
      {isViewAsCoworker && (
        <div className="bg-selection-hover text-white px-4 py-2 flex items-center justify-between shrink-0">
          <span className="text-[13px]">
            {t("viewAsCoworker.banner")}
          </span>
          <button
            onClick={() => setIsViewAsCoworker(false)}
            className="text-[13px] font-bold hover:underline"
          >
            {t("viewAsCoworker.done")}
          </button>
        </div>
      )}

      {/* Body */}
      <div className="flex-1 h-full overflow-y-auto">
        <Avatar
          src={displayUser?.avatar ?? ""}
          alt={(profileHeadline || displayUser?.name) ?? ""}
          className="mx-auto mt-4 w-60 h-60 rounded-lg"
        />

        <div className="flex flex-col p-4 space-y-3">
          <div className="flex items-center justify-between">
            <Typography
              text={(profileHeadline || displayUser?.name) ?? ""}
              variant="h5"
              className="font-semibold"
            />
            {showOwnerView && (
              <Typography
                text={t("edit")}
                variant="p"
                className="text-[#2BA5CE] font-semibold cursor-pointer hover:underline"
                onClick={() => setIsOpenEditProfileDialog(true)}
              />
            )}
          </div>

          {isDeactivatedMember && (
            <div className="inline-flex w-fit items-center rounded-md border border-[#797c814d] bg-[#2a2d31] px-2 py-1 text-[12px] font-semibold text-[#d1d2d3]">
              {t("status.deactivatedAccount")}
            </div>
          )}

          {displayUser?.namePronunciation &&
            displayUser?.namePronunciation !== null && (
              <Typography
                text={displayUser?.namePronunciation}
                variant="p"
                className="text-[#2BA5CE] font-normal"
              />
            )}

          {showOwnerView && displayUser?.namePronunciation === null && (
            <button
              className="flex items-center"
              onClick={() => setIsOpenEditProfileDialog(true)}
            >
              <MdAdd size={20} className="text-[#2BA5CE]" />
              <Typography
                text={t("status.addNamePronunciation")}
                variant="p"
                className="text-[#2BA5CE] font-normal"
              />
            </button>
          )}

          <UserPresenceIndicator
            workspaceId={workspaceId ?? ""}
            userId={displayUser?.id}
            isAway={mergedMemberStatus?.isAway}
            showLabel
          />

          {/* Workspace status (statusEmoji + statusText) */}
          {(mergedMemberStatus?.statusEmoji?.trim() ||
            mergedMemberStatus?.statusText?.trim()) && (
            <div className="flex items-center gap-2">
              <UserStatusEmojiInline
                statusEmoji={mergedMemberStatus?.statusEmoji}
                statusText={mergedMemberStatus?.statusText}
                emojiClassName="text-[18px]"
                interactive={Boolean(mergedMemberStatus?.statusText?.trim())}
              />
              {mergedMemberStatus?.statusText?.trim() && (
                <Typography
                  text={mergedMemberStatus.statusText}
                  variant="p"
                  className="dark:text-[#d1d2d3] font-normal"
                />
              )}
            </div>
          )}

          <div className="flex items-center gap-2">
            <LuClock3 size={20} />
            <Typography
              text={getLocalTime()}
              variant="p"
              className="dark:text-[#d1d2d3] font-normal"
            />
          </div>

          {showOwnerView ? (
            <div className="flex flex-col sm:flex-row items-center gap-2">
              <button
                className="flex-1 px-3 py-1 border border-[#797c81] rounded-md"
                onClick={() => setIsOpenSetStatusDialog(true)}
              >
                {mergedMemberStatus?.statusText ? (
                  <Typography
                    text={t("status.editStatus")}
                    variant="p"
                    className="dark:text-[#d1d2d3] font-semibold"
                  />
                ) : (
                  <Typography
                    text={t("status.setStatus")}
                    variant="p"
                    className="dark:text-[#d1d2d3] font-semibold"
                  />
                )}
              </button>
              <button
                className="flex-1 px-3 py-1 border border-[#797c81] rounded-md"
                onClick={() => setIsViewAsCoworker(true)}
              >
                <Typography
                  text={t("actions.viewAsCoworker")}
                  variant="p"
                  className=" font-semibold cursor-pointer"
                />
              </button>
              <Popover>
                <PopoverTrigger asChild>
                  <p className="cursor-pointer p-1 border border-[#797c81] rounded-md">
                    <MdMoreVert size={22} />
                  </p>
                </PopoverTrigger>
                <PopoverContent
                  side="right"
                  withOverlay={true}
                  align="start"
                  sideOffset={-32}
                  alignOffset={32}
                >
                  <div className="py-2">
                    <div className="flex flex-col space-y-1">
                      <div
                        className="hover:text-white hover:bg-selection-hover px-5 py-1 cursor-pointer"
                        onClick={() => {
                          navigator.clipboard.writeText(
                            displayUser?.displayName || "",
                          );
                          toast.success(t("actions.displayNameCopied"));
                        }}
                      >
                        <Typography variant="p" text={t("actions.copyDisplayName")} />
                      </div>
                      <Separator />
                      <div
                        className="hover:text-white hover:bg-selection-hover px-5 py-1 cursor-pointer"
                        onClick={() => {
                          openPreferencesDialog();
                        }}
                      >
                        <Typography variant="p" text={t("actions.viewPreferences")} />
                      </div>
                      <div className="hover:text-white hover:bg-selection-hover px-5 py-1 cursor-pointer flex items-center justify-between">
                        <Typography variant="p" text={t("actions.accountSettings")} />
                        <MdOpenInNew size={16} />
                      </div>
                      <Separator />
                      <div className="hover:text-white hover:bg-selection-hover px-5 py-1 cursor-pointer">
                        <Typography variant="p" text={t("actions.viewYourFiles")} />
                      </div>
                      <div
                        className="hover:text-white hover:bg-selection-hover px-5 py-1 cursor-pointer"
                        onClick={handleUpdateStatus}
                      >
                        <Typography
                          variant="p"
                          text={
                            displayUser?.isAway
                              ? t("actions.setYourselfActive")
                              : t("actions.setYourselfAway")
                          }
                        />
                      </div>
                      <Separator />
                      <div
                        className="hover:text-white hover:bg-selection-hover px-5 py-1 cursor-pointer"
                        onClick={() => {
                          navigator.clipboard.writeText(userData?.id || "");
                          toast.success(t("actions.memberIdCopied"));
                        }}
                      >
                        <Typography variant="p" text={t("actions.copyMemberId")} />
                      </div>
                    </div>
                  </div>
                </PopoverContent>
              </Popover>
            </div>
          ) : (
            <div className="flex items-center gap-2">
              <button
                type="button"
                className="flex-1 px-3 py-1 border border-[#797c81] rounded-md disabled:opacity-50 disabled:pointer-events-none"
                disabled={isOpeningDm || isDeactivatedMember}
                onClick={() => {
                  void handleMessagePeer();
                }}
              >
                <Typography
                  text={
                    isDeactivatedMember
                      ? t("coworkerActions.deactivated")
                      : isOpeningDm
                        ? t("coworkerActions.opening")
                        : t("coworkerActions.message")
                  }
                  variant="p"
                  className="dark:text-[#d1d2d3] font-semibold"
                />
              </button>
              <button
                className="flex-1 px-3 py-1 border border-[#797c81] rounded-md disabled:opacity-50 disabled:pointer-events-none"
                disabled={isDeactivatedMember}
                onClick={() => {
                  console.log("huddle");
                  if (isViewAsCoworker) {
                    return;
                  }
                  // router.push(`/huddles/${userData?.userId}`);
                }}
              >
                <Typography
                  text={t("coworkerActions.startHuddle")}
                  variant="p"
                  className=" font-semibold cursor-pointer"
                />
              </button>
              <Popover>
                <PopoverTrigger asChild>
                  <p className="cursor-pointer p-1 border border-[#797c81] rounded-md">
                    <MdMoreVert size={22} />
                  </p>
                </PopoverTrigger>
                <PopoverContent
                  side="right"
                  withOverlay={true}
                  align="start"
                  sideOffset={-32}
                  alignOffset={32}
                >
                  <div className="py-2">
                    <div className="flex flex-col space-y-1">
                      <div
                        className="hover:text-white hover:bg-selection-hover px-5 py-1 cursor-pointer"
                        onClick={() => {
                          navigator.clipboard.writeText(
                            displayUser?.displayName || "",
                          );
                          toast.success(t("actions.displayNameCopied"));
                        }}
                      >
                        <Typography variant="p" text={t("actions.copyDisplayName")} />
                      </div>
                      <Separator />
                      <div className="hover:text-white hover:bg-selection-hover px-5 py-1 cursor-pointer">
                        <Typography variant="p" text={t("coworkerActions.viewFiles")} />
                      </div>
                      <Separator />
                      <div
                        className="hover:text-white hover:bg-selection-hover px-5 py-1 cursor-pointer"
                        onClick={() => {
                          navigator.clipboard.writeText(userData?.id || "");
                          toast.success(t("actions.memberIdCopied"));
                        }}
                      >
                        <Typography variant="p" text={t("actions.copyMemberId")} />
                      </div>
                    </div>
                  </div>
                </PopoverContent>
              </Popover>
            </div>
          )}
        </div>

        <Separator />

        <div className="flex flex-col p-4 space-y-3">
          <div className="flex items-center justify-between">
            <Typography
              text={t("contactInformation")}
              variant="p"
              className="font-semibold"
            />
            {showOwnerView && (
              <Typography
                text={t("edit")}
                variant="p"
                className="text-[#2BA5CE] font-semibold cursor-pointer hover:underline"
                onClick={() => setIsOpenEditContactInforDialog(true)}
              />
            )}
          </div>

          <div className="flex gap-2 items-center">
            <div className="flex items-center justify-center w-9 h-9 rounded-md bg-[#e8e8e8] dark:bg-[#222529]">
              <MdOutlineMail size={20} />
            </div>
            <div className="flex flex-col">
              <Typography
                text={t("email")}
                variant="p"
                className="dark:text-[#d1d2d3] text-[13px] font-semibold"
              />
              <Typography
                text={userData?.email ?? ""}
                variant="p"
                className="text-[#2BA5CE] font-normal"
              />
            </div>
          </div>

          {userData?.phone && userData?.phone !== null && (
            <div className="flex gap-2 items-center">
              <div className="flex items-center justify-center w-9 h-9 rounded-md bg-[#e8e8e8] dark:bg-[#222529]">
                <MdOutlinePhone size={20} />
              </div>
              <div className="flex flex-col">
                <Typography
                  text={t("phone")}
                  variant="p"
                  className="dark:text-[#d1d2d3] text-[13px] font-semibold"
                />
                <Typography
                  text={userData?.phone}
                  variant="p"
                  className="text-[#2BA5CE] font-normal"
                />
              </div>
            </div>
          )}

          {showOwnerView &&
            userData?.phone === null &&
            userData?.phone !== undefined &&
            userData?.phone !== "" && (
              <button
                className="flex items-center"
                onClick={() => setIsOpenEditContactInforDialog(true)}
              >
                <MdAdd size={20} className="text-[#2BA5CE]" />
                <Typography
                  text={t("addPhoneNumber")}
                  variant="p"
                  className="text-[#2BA5CE] font-normal"
                />
              </button>
            )}
        </div>

        <Separator />

        <div className="flex flex-col p-4 space-y-3">
          <div className="flex items-center justify-between">
            <Typography text={t("aboutMe")} variant="p" className="font-semibold" />
            {showOwnerView && (
              <Typography
                text={t("edit")}
                variant="p"
                className="text-[#2BA5CE] font-semibold cursor-pointer hover:underline"
                onClick={() => setIsOpenEditAboutMeDialog(true)}
              />
            )}
          </div>

          {userData?.description && userData?.description !== null && (
            <div
              className="text-[15px] dark:text-[#d1d2d3] leading-relaxed message-content"
              dangerouslySetInnerHTML={{ __html: sanitizedContent() || "" }}
            />
          )}

          {showOwnerView &&
            userData?.description === null &&
            userData?.description !== undefined &&
            userData?.description !== "" && (
              <button className="flex items-center">
                <MdAdd size={20} className="text-[#2BA5CE]" />
                <Typography
                  text={t("addDescription")}
                  variant="p"
                  className="text-[#2BA5CE] font-normal"
                  onClick={() => setIsOpenEditAboutMeDialog(true)}
                />
              </button>
            )}

          <EditProfileDialog
            open={isOpenEditProfileDialog}
            setOpen={setIsOpenEditProfileDialog}
            userData={userData!}
            workspaceId={workspaceId!}
          />
          <EditContactInforDialog
            open={isOpenEditContactInforDialog}
            setOpen={setIsOpenEditContactInforDialog}
            userData={userData!}
            workspaceId={workspaceId!}
          />
          <EditAboutMeDialog
            open={isOpenEditAboutMeDialog}
            setOpen={setIsOpenEditAboutMeDialog}
            userData={userData!}
            workspaceId={workspaceId!}
          />
          {workspaceId && (
            <SetAStatusDialog
              open={isOpenSetStatusDialog}
              setOpen={setIsOpenSetStatusDialog}
              userData={userData!}
              workspaceId={workspaceId}
              statusSource="profile"
              memberStatus={mergedMemberStatus}
              workspaceName={workspaceMeta?.name}
            />
          )}
        </div>
      </div>
    </div>
  );
}
