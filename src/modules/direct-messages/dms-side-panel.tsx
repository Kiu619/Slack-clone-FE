"use client";

import { UserStatusEmojiInline } from "@/components/user-status-emoji-inline";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { Separator } from "@/components/ui/separator";
import { Switch } from "@/components/ui/switch";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import Typography from "@/components/ui/typography";
import { useAuth } from "@/hooks/use-auth";
import { useConversations } from "@/hooks/use-conversations";
import { useToggleLaterMessage } from "@/hooks/use-messages";
import { useDebouncedValue } from "@/hooks/use-debounce";
import { useLaterSavedMessageIds, useRemindMe } from "@/hooks/use-saved-items";
import { User, Workspace } from "@/lib/types";
import { mergeUserForDisplay, useWorkspaceMemberStore } from "@/stores/useWorkspaceMemberStore";
import { useShallow } from "zustand/react/shallow";
import { cn } from "@/lib/utils";
import { type Theme } from "@/stores/useThemeStore";
import { format, isToday, isYesterday } from "date-fns";
import DOMPurify from "dompurify";
import { openDmInWorkspace } from "@/lib/open-dm-in-workspace";
import { useMainPanelStore } from "@/stores/useMainPanelStore";
import { useParams, usePathname, useRouter } from "next/navigation";
import { useEffect, useMemo, useRef, useState } from "react";
import { FiBellOff, FiSearch } from "react-icons/fi";
import { LuLink } from "react-icons/lu";
import {
  MdBookmark,
  MdBookmarkBorder,
  MdMoreVert,
  MdOutlineKeyboardArrowRight,
} from "react-icons/md";
import NewMessage from "../workspace/workspace-side-panel/new-message";

// Dynamic import EmojiPicker để tránh SSR
import { RxText } from "react-icons/rx";
import { toast } from "sonner";
import {
  ICON_TRANSITION,
  MENU_ITEM_STYLE,
  TOOLBAR_ITEM_STYLE,
  SUBMENU_ITEM_STYLE,
} from "@/constants/styles";
interface Props {
  theme: Theme;
  currentWorkspaceData: Workspace;
}

const DMSidePanel = ({ theme, currentWorkspaceData }: Props) => {
  const params = useParams<{ workspaceId: string; conversationId?: string }>();
  const pathname = usePathname();
  const router = useRouter();
  const mainPanelView = useMainPanelStore((s) => s.view);
  const { user: currentUser } = useAuth();

  const [searchQuery, setSearchQuery] = useState("");
  const debouncedSearch = useDebouncedValue(searchQuery, 300);
  const [isSearchFocused, setIsSearchFocused] = useState(false);
  const searchRef = useRef<HTMLDivElement>(null);

  const {
    isRemindMeOpen,
    setIsRemindMeOpen,
    remindInMinutes,
    remindInHours,
    remindTomorrow,
    remindNextMonday,
  } = useRemindMe();
  const [activeMoreActionsId, setActiveMoreActionsId] = useState<string | null>(
    null,
  );

  const { data: conversations, isLoading } = useConversations(
    params.workspaceId,
  );

  const { mutate: toggleLaterMessage } = useToggleLaterMessage(
    params.workspaceId,
  );

  const handleToggleLaterForMessage = (messageId: string) => {
    toggleLaterMessage(messageId);
  };

  const { data: searchResults, isLoading: isSearching } = useConversations(
    params.workspaceId,
    debouncedSearch,
  );

  const workspaceIdForOverlay =
    params.workspaceId ?? currentWorkspaceData.id;

  const memberOverlayMap = useWorkspaceMemberStore(
    useShallow((s) => s.byWorkspace[workspaceIdForOverlay] ?? {}),
  );

  const hasAtLeastOneMessage = (conv: { lastMessageId?: string | null }) =>
    !!conv.lastMessageId;

  const conversationsWithMessages = useMemo(
    () => (conversations ?? []).filter(hasAtLeastOneMessage),
    [conversations],
  );

  const filteredResults = useMemo(() => {
    if (!debouncedSearch.trim()) return [];
    return (searchResults ?? []).filter(hasAtLeastOneMessage);
  }, [debouncedSearch, searchResults]);

  const dmLastMessageIds = useMemo(
    () =>
      conversationsWithMessages
        .map((c) => c.lastMessageId)
        .filter((id): id is string => Boolean(id)),
    [conversationsWithMessages],
  );

  const { savedMessageIdSet } = useLaterSavedMessageIds(
    params.workspaceId,
    dmLastMessageIds,
  );

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (
        searchRef.current &&
        !searchRef.current.contains(event.target as Node)
      ) {
        setIsSearchFocused(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const getConversationName = (members: User[]) => {
    const otherMembers = members.filter((m) => m.id !== currentUser?.id);
    if (otherMembers.length === 0) return "You";
    return otherMembers
      .map((m) => {
        const d = mergeUserForDisplay(m, memberOverlayMap[m.id]);
        return d.displayName || d.name || d.email || "";
      })
      .join(", ");
  };

  const getConversationAvatar = (member: User) => {
    const d = mergeUserForDisplay(member, memberOverlayMap[member.id]);
    return (
      <Avatar className="size-10 rounded-lg">
        <AvatarImage src={d.avatar || ""} />
        <AvatarFallback className="bg-sky-500 text-white rounded-lg">
          {(d.displayName || d.name || "U")
            .substring(0, 2)
            .toUpperCase()}
        </AvatarFallback>
      </Avatar>
    );
  };

  const formatLastMessageTime = (dateStr: string | null) => {
    if (!dateStr) return "";
    const date = new Date(dateStr);
    if (isToday(date)) return format(date, "h:mm a");
    if (isYesterday(date)) return "Yesterday";
    return format(date, "EEEE");
  };

  const sanitizedContent = (content: string) => {
    return DOMPurify.sanitize(content, {
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
    <>
      <div className="flex justify-between items-center">
        <span className="text-lg font-extrabold text-workspace-side-panel-text">
          Direct messages
        </span>

        <div className="flex gap-x-2">
          <div className="flex items-center space-x-2">
            <Label
              htmlFor="unread-mode"
              className="text-workspace-side-panel-text text-xs"
            >
              Unreads
            </Label>
            <Switch id="unread-mode" className="scale-75" />
          </div>

          <NewMessage />
        </div>
      </div>

      <div className="relative z-20" ref={searchRef}>
        <FiSearch
          className="pointer-events-none absolute left-2.5 top-1/2 -translate-y-1/2 text-workspace-side-panel-text/50"
          size={18}
        />
        <Input
          placeholder="Find a DM"
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          onFocus={() => setIsSearchFocused(true)}
          className={cn(
            "h-9 rounded-lg border-[#000000] bg-white/10 pl-9 text-[14px] text-workspace-side-panel-text placeholder:text-workspace-side-panel-text/50",
          )}
          autoComplete="off"
        />

        {isSearchFocused && searchQuery.trim() && (
          <div className="absolute top-full left-0 right-0 mt-1 bg-white dark:bg-[#1A1D21] border border-[#797c814d] rounded-md shadow-lg max-h-[300px] overflow-y-auto z-50 py-1">
            {isSearching ? (
              <div className="px-4 py-2 text-sm text-gray-400 animate-pulse">
                Searching...
              </div>
            ) : filteredResults.length === 0 ? (
              <div className="px-4 py-2 text-sm text-gray-400">
                No results found
              </div>
            ) : (
              filteredResults.map((conv) => {
                const otherMember =
                  conv.members.find((m) => m.id !== currentUser?.id) ||
                  currentUser;

                return (
                  <div
                    key={conv.id}
                    onClick={() => {
                      setSearchQuery("");
                      setIsSearchFocused(false);
                      openDmInWorkspace(
                        router,
                        pathname,
                        params.workspaceId,
                        conv.id,
                      );
                    }}
                    className="flex items-center gap-x-2 px-3 py-2 hover:bg-selection-hover cursor-pointer group"
                  >
                    {getConversationAvatar(otherMember!)}
                    <div className="flex flex-col min-w-0 flex-1">
                      <div className="flex min-w-0 items-center gap-1">
                        <span className="min-w-0 flex-1 truncate text-sm font-bold">
                          {getConversationName(conv.members)}
                        </span>
                        {(() => {
                          const others = conv.members.filter(
                            (m) => m.id !== currentUser?.id,
                          );
                          const isOneToOne =
                            !conv.isGroup && others.length === 1;
                          if (!isOneToOne) return null;
                          const peer = mergeUserForDisplay(
                            others[0] as User,
                            memberOverlayMap[others[0].id],
                          );
                          return (
                            <UserStatusEmojiInline
                              statusEmoji={peer.statusEmoji}
                              statusText={peer.statusText}
                              emojiClassName="text-[13px]"
                              interactive={Boolean(peer.statusText?.trim())}
                            />
                          );
                        })()}
                      </div>
                      <div className="text-xs  group-hover:text-sky-100 truncate flex items-center gap-x-1">
                        {conv.lastMessageContent ? (
                          <div
                            className="truncate"
                            dangerouslySetInnerHTML={{
                              __html: sanitizedContent(conv.lastMessageContent),
                            }}
                          />
                        ) : (
                          <span className="italic opacity-50">No messages</span>
                        )}
                      </div>
                    </div>
                  </div>
                );
              })
            )}
          </div>
        )}
      </div>

      <div className="flex flex-col gap-y-1 mt-4 overflow-y-auto flex-1 pr-2 custom-scrollbar">
        {isLoading ? (
          <div className="text-workspace-side-panel-text/50 text-xs px-2">
            Loading...
          </div>
        ) : conversationsWithMessages.length === 0 ? (
          <div className="text-workspace-side-panel-text/50 text-xs px-2">
            No DMs with messages yet.
          </div>
        ) : (
          conversationsWithMessages.map((conv) => {
            const otherMember =
              conv.members.find((m) => m.id !== currentUser?.id) || currentUser;
            const isActive =
              mainPanelView.type === "dm" &&
              mainPanelView.conversationId === conv.id;
            const lastMsgTime = formatLastMessageTime(conv.lastMessageAt);
            const isLastMsgFromMe = conv.lastMessageUserId === currentUser?.id;
            return (
              <div key={conv.id} className="relative group">
                <button
                  type="button"
                  onClick={() =>
                    openDmInWorkspace(
                      router,
                      pathname,
                      currentWorkspaceData.id,
                      conv.id,
                    )
                  }
                  className={cn(
                    "flex w-full items-center gap-x-3 p-2 rounded-lg cursor-pointer transition-colors text-left",
                    isActive ? "text-white" : "hover:bg-white/10",
                  )}
                  style={
                    isActive ? { backgroundColor: theme.selectedItems } : {}
                  }
                >
                  <div className="relative shrink-0">
                    {getConversationAvatar(otherMember!)}
                    <div
                      className={cn(
                        "absolute -bottom-0.5 -right-0.5 size-3 rounded-full border-2 border-transparent",
                        otherMember &&
                          mergeUserForDisplay(
                            otherMember as User,
                            memberOverlayMap[otherMember.id],
                          ).isAway
                          ? "bg-gray-400"
                          : "bg-green-500",
                      )}
                    />
                  </div>

                  <div className="flex flex-col flex-1 min-w-0">
                    <div className="flex items-center justify-between gap-2">
                      <div className="flex min-w-0 flex-1 items-center gap-1">
                        <span className="text-[14px] font-bold text-workspace-side-panel-text truncate min-w-0">
                          {getConversationName(conv.members)}
                        </span>
                        {(() => {
                          const others = conv.members.filter(
                            (m) => m.id !== currentUser?.id,
                          );
                          const isOneToOne =
                            !conv.isGroup && others.length === 1;
                          if (!isOneToOne) return null;
                          const peer = mergeUserForDisplay(
                            others[0] as User,
                            memberOverlayMap[others[0].id],
                          );
                          return (
                            <UserStatusEmojiInline
                              statusEmoji={peer.statusEmoji}
                              statusText={peer.statusText}
                              emojiClassName={cn(
                                "text-[13px]",
                                isActive && "text-white",
                              )}
                              interactive={Boolean(peer.statusText?.trim())}
                              className={
                                isActive
                                  ? "hover:bg-white/15 focus-visible:ring-white/80"
                                  : undefined
                              }
                            />
                          );
                        })()}
                      </div>
                      <span className="text-[11px] text-workspace-side-panel-text/50 shrink-0">
                        {lastMsgTime}
                      </span>
                    </div>

                    <div className="text-[13px] text-workspace-side-panel-text/70 truncate font-semibold">
                      {conv.lastMessageContent ? (
                        <div className="flex items-center gap-x-1 ">
                          {isLastMsgFromMe && (
                            <span className="mr-1">You:</span>
                          )}
                          <div
                            dangerouslySetInnerHTML={{
                              __html: sanitizedContent(conv.lastMessageContent),
                            }}
                          />
                        </div>
                      ) : (
                        <span className="italic opacity-50">
                          No messages yet
                        </span>
                      )}
                    </div>
                  </div>
                </button>

                <div
                  className={cn(
                    "absolute right-4 top-1/2 -translate-y-1/2 items-center gap-0.5 bg-white dark:bg-[#1A1D21] border border-[#797c814d] rounded-lg shadow-lg px-1 py-0.5 z-10",
                    activeMoreActionsId === conv.id
                      ? "flex"
                      : "hidden group-hover:flex",
                  )}
                >
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <button
                        className={TOOLBAR_ITEM_STYLE}
                        onClick={(e) => {
                          e.stopPropagation();
                          if (conv.lastMessageId) {
                            handleToggleLaterForMessage(conv.lastMessageId);
                          } else {
                            toast.error("No message to save");
                          }
                        }}
                      >
                        {conv.lastMessageId &&
                        savedMessageIdSet.has(conv.lastMessageId) ? (
                          <MdBookmark
                            size={20}
                            className={cn(ICON_TRANSITION, "text-[#36C5F0]")}
                          />
                        ) : (
                          <MdBookmarkBorder
                            size={20}
                            className={ICON_TRANSITION}
                          />
                        )}
                      </button>
                    </TooltipTrigger>
                    <TooltipContent side="top">
                      <p className="text-xs">
                        {conv.lastMessageId &&
                        savedMessageIdSet.has(conv.lastMessageId)
                          ? "Remove from Later"
                          : "Save for later"}
                      </p>
                    </TooltipContent>
                  </Tooltip>

                  <Popover
                    open={activeMoreActionsId === conv.id}
                    onOpenChange={(open) =>
                      setActiveMoreActionsId(open ? conv.id : null)
                    }
                  >
                    <Tooltip>
                      <TooltipTrigger asChild>
                        <PopoverTrigger asChild>
                          <p
                            className={TOOLBAR_ITEM_STYLE}
                            onClick={(e) => {
                              e.stopPropagation();
                              // onMoreActions?.()
                            }}
                          >
                            <MdMoreVert size={20} className={ICON_TRANSITION} />
                          </p>
                        </PopoverTrigger>
                      </TooltipTrigger>
                      <TooltipContent side="top">
                        <p className="text-xs">More actions</p>
                      </TooltipContent>
                    </Tooltip>
                    <PopoverContent
                      side="bottom"
                      align="end"
                      sideOffset={8}
                      className="w-auto border-[#797c814d] bg-white dark:bg-[#1A1D21]"
                      withOverlay={true}
                      onOpenAutoFocus={(e) => e.preventDefault()}
                    >
                      <div className="py-2 ">
                        <div className="flex flex-col space-y-1">
                          <div
                            onMouseEnter={() => setIsRemindMeOpen(true)}
                            onMouseLeave={() => setIsRemindMeOpen(false)}
                          >
                            <div
                              className={cn(
                                MENU_ITEM_STYLE,
                                "relative justify-between",
                              )}
                            >
                              <div className="flex items-center gap-2">
                                <svg
                                  xmlns="http://www.w3.org/2000/svg"
                                  viewBox="0 0 20 20"
                                  data-pef="true"
                                  data-qa="reminder"
                                  aria-hidden="true"
                                  className="size-4"
                                >
                                  <path
                                    fill="currentColor"
                                    fillRule="evenodd"
                                    d="M10 2.5a7.5 7.5 0 1 0 .455 14.986.75.75 0 0 1 .09 1.498Q10.275 19 10 19a9 9 0 1 1 8.852-7.364.75.75 0 1 1-1.476-.271Q17.5 10.7 17.5 10A7.5 7.5 0 0 0 10 2.5M15.975 13a.8.8 0 0 0-.618.267 1.04 1.04 0 0 0-.228.484c-.423.129-.736.398-.94.825-.21.443-.3 1.046-.312 1.814l-.659.66-.004.005c-.222.245-.282.557-.13.82.142.246.428.375.736.375h1.186a.99.99 0 0 0 .974.7c.32 0 .57-.125.742-.314.106-.115.178-.25.223-.386h1.184c.309 0 .595-.129.737-.375.151-.263.092-.575-.13-.82l-.005-.004-.657-.66c-.012-.77-.101-1.372-.313-1.815-.203-.428-.516-.696-.94-.825a1.04 1.04 0 0 0-.227-.484.8.8 0 0 0-.619-.267M10.75 5.75a.75.75 0 0 0-1.5 0v5.5h4.5a.75.75 0 0 0 0-1.5h-3z"
                                    clipRule="evenodd"
                                  ></path>
                                </svg>
                                <Typography variant="p" text="Remind me" />
                              </div>
                              <MdOutlineKeyboardArrowRight size={13} />
                            </div>
                            {isRemindMeOpen && (
                              <div className="absolute top-2 left-65 w-full border border-[#797c814d] bg-white dark:bg-[#1A1D21] py-2 shadow-lg rounded-md z-50">
                                <div
                                  className={SUBMENU_ITEM_STYLE}
                                  onClick={() =>
                                    remindInMinutes(30, {
                                      type: "message",
                                      messageId: conv.lastMessageId,
                                    })
                                  }
                                >
                                  <Typography
                                    variant="p"
                                    text="In 30 minutes"
                                  />
                                </div>
                                <div
                                  className={SUBMENU_ITEM_STYLE}
                                  onClick={() =>
                                    remindInHours(1, {
                                      type: "message",
                                      messageId: conv.lastMessageId,
                                    })
                                  }
                                >
                                  <Typography variant="p" text="In 1 hour" />
                                </div>
                                <div
                                  className={SUBMENU_ITEM_STYLE}
                                  onClick={() =>
                                    remindInHours(3, {
                                      type: "message",
                                      messageId: conv.lastMessageId,
                                    })
                                  }
                                >
                                  <Typography variant="p" text="In 3 hours" />
                                </div>
                                <div
                                  className={SUBMENU_ITEM_STYLE}
                                  onClick={() =>
                                    remindTomorrow({
                                      type: "message",
                                      messageId: conv.lastMessageId,
                                    })
                                  }
                                >
                                  <Typography
                                    variant="p"
                                    text="Tomorrow at 9:00 AM"
                                  />
                                </div>
                                <div
                                  className={SUBMENU_ITEM_STYLE}
                                  onClick={() =>
                                    remindNextMonday({
                                      type: "message",
                                      messageId: conv.lastMessageId,
                                    })
                                  }
                                >
                                  <Typography
                                    variant="p"
                                    text="Monday at 9:00 AM"
                                  />
                                </div>
                              </div>
                            )}
                          </div>

                          <div className={MENU_ITEM_STYLE}>
                            <FiBellOff size={16} />
                            <Typography
                              variant="p"
                              text="Turn off notifications for replies"
                            />
                          </div>

                          <Separator />

                          <div
                            className={MENU_ITEM_STYLE}
                            onClick={() => {
                              navigator.clipboard.writeText(
                                `${window.location.origin}/workspace/${currentWorkspaceData.id}/dms`,
                              );
                              toast.success("Link copied to clipboard");
                            }}
                          >
                            <LuLink size={16} />
                            <Typography variant="p" text="Copy link" />
                          </div>
                          <div
                            className={MENU_ITEM_STYLE}
                            onClick={() => {
                              navigator.clipboard.writeText(
                                getConversationName(conv.members) || "",
                              );
                              toast.success("Name copied to clipboard");
                            }}
                          >
                            <RxText size={16} />
                            <Typography variant="p" text="Copy name" />
                          </div>
                        </div>
                      </div>
                    </PopoverContent>
                  </Popover>
                </div>
              </div>
            );
          })
        )}
      </div>
    </>
  );
};

export default DMSidePanel;
