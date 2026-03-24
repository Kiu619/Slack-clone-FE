"use client";

import { EditAboutMeDialog } from "@/components/dialogs/edit-about-me-dialog";
import { EditContactInforDialog } from "@/components/dialogs/edit-contact-infor-dialog";
import { EditProfileDialog } from "@/components/dialogs/edit-profile-dialog";
import { SetAStatusDialog } from "@/components/dialogs/set-a-status-dialog";
import { getMemberStatusApi } from "@/apis";
import { useWorkspace } from "@/hooks/use-workspace";
import { useProfilePanelStore } from "@/stores/useProfilePanelStore";
import { useUserStore } from "@/stores/useUserStore";
import { useQuery } from "@tanstack/react-query";
import DOMPurify from "dompurify";
import { X } from "lucide-react";
import { useState } from "react";
import { GoDot, GoDotFill } from "react-icons/go";
import { LuClock3 } from "react-icons/lu";
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

export default function ProfilePanel() {
  const { user: currentUserData } = useUserStore();
  const { userData, workspaceId, close } = useProfilePanelStore();
  const [isOpenEditProfileDialog, setIsOpenEditProfileDialog] = useState(false);
  const [isOpenEditContactInforDialog, setIsOpenEditContactInforDialog] =
    useState(false);
  const [isOpenEditAboutMeDialog, setIsOpenEditAboutMeDialog] = useState(false);
  const [isOpenSetStatusDialog, setIsOpenSetStatusDialog] = useState(false);
  const [isViewAsCoworker, setIsViewAsCoworker] = useState(false);

  const isOwner = currentUserData?.id === userData?.id;
  const showOwnerView = isOwner && !isViewAsCoworker;

  // Fetch workspace-specific status (statusText, statusEmoji) cho user đang xem
  const { data: memberStatus } = useQuery({
    queryKey: ["workspace-member-status", workspaceId, userData?.id],
    queryFn: () => getMemberStatusApi(workspaceId!, userData!.id),
    enabled: !!workspaceId && !!userData?.id,
    staleTime: 30_000,
  });

  console.log("memberstatus", memberStatus)

  const { data: workspaceMeta } = useWorkspace(workspaceId ?? "");

  const getLocalTime = () => {
    const date = new Date();
    const tzValue = userData?.timeZone;
    if (!tzValue) {
      const browserTz = Intl.DateTimeFormat().resolvedOptions().timeZone;
      return `${date.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit", timeZone: browserTz })} ${browserTz} (local time)`;
    }
    const iana = timeZoneValueToIana(tzValue);
    const timeStr = iana
      ? date.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit", timeZone: iana })
      : date.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
    return `${timeStr} local time`;
  };

  const sanitizedContent = () => {
    if (typeof window === "undefined") return userData?.description;
    return DOMPurify.sanitize(userData?.description || "", {
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
  return (
    <div className="flex flex-col h-full bg-[#1A1D21] text-[#d1d2d3] overflow-hidden">
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-3 border-b border-[#797c814d] shrink-0">
        <span className="font-semibold text-white text-[15px]">Profile</span>
        <button
          onClick={close}
          className="p-1 rounded hover:bg-[#222529] text-[#797c81] hover:text-white transition-colors"
        >
          <X size={18} />
        </button>
      </div>

      {/* Banner for View as coworker */}
      {isViewAsCoworker && (
        <div className="bg-[#1264a3] text-white px-4 py-2 flex items-center justify-between shrink-0">
          <span className="text-[13px]">
            This is how others see your profile
          </span>
          <button
            onClick={() => setIsViewAsCoworker(false)}
            className="text-[13px] font-bold hover:underline"
          >
            Done
          </button>
        </div>
      )}

      {/* Body */}
      <Avatar
        src={userData?.avatar ?? ""}
        alt={userData?.name ?? ""}
        className="mx-auto mt-4 w-60 h-60 rounded-lg"
      />

      <div className="flex flex-col p-4 space-y-3">
        <div className="flex items-center justify-between">
          <Typography
            text={userData?.name ?? ""}
            variant="h5"
            className="text-white font-semibold"
          />
          {showOwnerView && (
            <Typography
              text="Edit"
              variant="p"
              className="text-[#2BA5CE] font-semibold cursor-pointer hover:underline"
              onClick={() => setIsOpenEditProfileDialog(true)}
            />
          )}
        </div>

        {userData?.namePronunciation &&
          userData?.namePronunciation !== null && (
            <Typography
              text={userData?.namePronunciation}
              variant="p"
              className="text-[#2BA5CE] font-normal"
            />
          )}

        {showOwnerView &&
          userData?.namePronunciation === null && (
            <button
              className="flex items-center"
              onClick={() => setIsOpenEditProfileDialog(true)}
            >
              <MdAdd size={20} className="text-[#2BA5CE]" />
              <Typography
                text="Add a name pronunciation"
                variant="p"
                className="text-[#2BA5CE] font-normal"
              />
            </button>
          )}

        {(memberStatus?.isAway ?? userData?.isAway) ? (
          <div className="flex items-center gap-2 ">
            <GoDot className="text-white text-[12px]" />
            <Typography
              text="Away"
              variant="p"
              className="text-[#D1D2D3] font-normal"
            />
          </div>
        ) : (
          <div className="flex items-center gap-2">
            <GoDotFill className="text-green-600" size={12} />
            <Typography
              text="Online"
              variant="p"
              className="text-[#D1D2D3] font-normal"
            />
          </div>
        )}

        {/* Workspace status (statusEmoji + statusText) */}
        {(memberStatus?.statusText || memberStatus?.statusEmoji) && (
          <div className="flex items-center gap-2">
            {memberStatus.statusEmoji && (
              <span className="text-[18px]">{memberStatus.statusEmoji}</span>
            )}
            {memberStatus.statusText && (
              <Typography
                text={memberStatus.statusText}
                variant="p"
                className="text-[#D1D2D3] font-normal"
              />
            )}
          </div>
        )}

        <div className="flex items-center gap-2">
          <LuClock3 size={20} />
          <Typography
            text={getLocalTime()}
            variant="p"
            className="text-[#D1D2D3] font-normal"
          />
        </div>

        {showOwnerView ? (
          <div className="flex items-center gap-2">
            <button
              className="flex-1 px-3 py-1 border border-[#797c81] rounded-md"
              onClick={() => setIsOpenSetStatusDialog(true)}
            >
              {memberStatus?.statusText ? (
                <Typography
                  text="Edit status"
                  variant="p"
                  className="text-[#D1D2D3] font-semibold"
                />
              ) : (
                <Typography
                  text="Set a status"
                  variant="p"
                  className="text-[#D1D2D3] font-semibold"
                />
              )}
            </button>
            <button
              className="flex-1 px-3 py-1 border border-[#797c81] rounded-md"
              onClick={() => setIsViewAsCoworker(true)}
            >
              <Typography
                text="View as a coworker"
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
                    <div className="hover:text-white hover:bg-blue-700 px-5 py-1 cursor-pointer">
                      <Typography variant="p" text="Copy display name" />
                    </div>
                    <Separator />
                    <div className="hover:text-white hover:bg-blue-700 px-5 py-1 cursor-pointer">
                      <Typography variant="p" text="View preferences" />
                    </div>
                    <div className="hover:text-white hover:bg-blue-700 px-5 py-1 cursor-pointer flex items-center justify-between">
                      <Typography variant="p" text="Account settings" />
                      <MdOpenInNew size={16} />
                    </div>
                    <Separator />
                    <div className="hover:text-white hover:bg-blue-700 px-5 py-1 cursor-pointer">
                      <Typography variant="p" text="View your files" />
                    </div>
                    <div className="hover:text-white hover:bg-blue-700 px-5 py-1 cursor-pointer"
                      
                    >
                      <Typography variant="p" text="Set you away" />
                    </div>
                    <Separator />
                    <div className="hover:text-white hover:bg-blue-700 px-5 py-1 cursor-pointer">
                      <Typography variant="p" text="Copy member ID" />
                    </div>
                  </div>
                </div>
              </PopoverContent>
            </Popover>
          </div>
        ) : (
          <div className="flex items-center gap-2">
            <button className="flex-1 px-3 py-1 border border-[#797c81] rounded-md"
              onClick={() => {
                console.log("message");
                if (isViewAsCoworker) {
                  return;
                }
                // router.push(`/messages/${userData?.userId}`);
              }}
            >
              <Typography
                text="Message"
                variant="p"
                className="text-[#D1D2D3] font-semibold"
              />
            </button>
            <button className="flex-1 px-3 py-1 border border-[#797c81] rounded-md"
              onClick={() => {
                console.log("huddle");
                if (isViewAsCoworker) {
                  return;
                }
                // router.push(`/huddles/${userData?.userId}`);
              }}
            >
              <Typography
                text="Start a huddle"
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
                    <div className="hover:text-white hover:bg-blue-700 px-5 py-1 cursor-pointer">
                      <Typography variant="p" text="Copy display name" />
                    </div>
                    <Separator />
                    <div className="hover:text-white hover:bg-blue-700 px-5 py-1 cursor-pointer">
                      <Typography variant="p" text="View files" />
                    </div>
                    <Separator />
                    <div className="hover:text-white hover:bg-blue-700 px-5 py-1 cursor-pointer">
                      <Typography variant="p" text="Copy member ID" />
                    </div>
                    <Separator />
                    <div className="hover:text-white hover:bg-red-500 px-5 py-1 cursor-pointer text-red-500">
                      <Typography variant="p" text="Hide from you" />
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
            text="Contact information"
            variant="p"
            className="text-white font-semibold"
          />
          {showOwnerView && (
            <Typography
              text="Edit"
              variant="p"
              className="text-[#2BA5CE] font-semibold cursor-pointer hover:underline"
              onClick={() => setIsOpenEditContactInforDialog(true)}
            />
          )}
        </div>

        <div className="flex gap-2 items-center">
          <div className="flex items-center justify-center w-9 h-9 rounded-md bg-[#222529]">
            <MdOutlineMail size={20} />
          </div>
          <div className="flex flex-col">
            <Typography
              text="Email"
              variant="p"
              className="text-[#D1D2D3] text-[13px] font-semibold"
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
            <div className="flex items-center justify-center w-9 h-9 rounded-md bg-[#222529]">
              <MdOutlinePhone size={20} />
            </div>
            <div className="flex flex-col">
              <Typography
                text="Phone"
                variant="p"
                className="text-[#D1D2D3] text-[13px] font-semibold"
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
                text="Add a phone number"
                variant="p"
                className="text-[#2BA5CE] font-normal"
              />
            </button>
          )}
      </div>

      <Separator />

      <div className="flex flex-col p-4 space-y-3">
        <div className="flex items-center justify-between">
          <Typography
            text="About me"
            variant="p"
            className="text-white font-semibold"
          />
          {showOwnerView && (
            <Typography
              text="Edit"
              variant="p"
              className="text-[#2BA5CE] font-semibold cursor-pointer hover:underline"
              onClick={() => setIsOpenEditAboutMeDialog(true)}
            />
          )}
        </div>

        {userData?.description && userData?.description !== null && (
          <div
            className="text-[15px] text-[#d1d2d3] leading-relaxed message-content"
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
                text="Add a description"
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
            memberStatus={memberStatus}
            workspaceName={workspaceMeta?.name}
          />
        )}
      </div>
    </div>
  );
}
