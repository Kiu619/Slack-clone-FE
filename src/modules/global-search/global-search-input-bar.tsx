"use client";

import type { Channel, DirectMessageConversation, WorkspaceMember } from "@/lib/types";
import { cn } from "@/lib/utils";
import type { WorkspaceMemberDisplay } from "@/stores/useWorkspaceMemberStore";
import { BiMessageRounded, BiMessageRoundedDetail } from "react-icons/bi";
import { FiHash, FiSearch, FiSettings, FiX } from "react-icons/fi";
import { HiOutlineFaceSmile } from "react-icons/hi2";
import { ImFilesEmpty } from "react-icons/im";
import { LuLink, LuPin } from "react-icons/lu";
import { MdOutlineCalendarMonth, MdOutlinePerson } from "react-icons/md";
import { Button } from "../../components/ui/button";
import { Tooltip, TooltipContent, TooltipTrigger } from "../../components/ui/tooltip";
import Typography from "../../components/ui/typography";
import type { HasFilterType, IsFilterType, TypeFilterType } from "./types";
import { getConversationSummary, getMemberLabel } from "./utils";
import { X } from "lucide-react";
import { IoFilter } from "react-icons/io5";
import { useAppTranslation } from "@/hooks/use-translation";

type Props = {
  openFilters: boolean;
  onToggleFilters: () => void;
  onCloseSearch: () => void;
  inputWrapRef: React.RefObject<HTMLDivElement | null>;
  inputRef: React.RefObject<HTMLInputElement | null>;
  query: string;
  onQueryChange: (value: string) => void;
  onSubmitSearch: () => void;
  onInputFocus: () => void;
  onInputBlur: () => void;
  selectedFromMembers: WorkspaceMember[];
  selectedWithMembers: WorkspaceMember[];
  selectedInChannels: Channel[];
  selectedInConversations: DirectMessageConversation[];
  hasFilterTypes: HasFilterType[];
  isFilterTypes: IsFilterType[];
  typeFilterTypes: TypeFilterType[];
  afterDate: string | null;
  beforeDate: string | null;
  currentUserId?: string;
  memberOverlayMap: Record<string, WorkspaceMemberDisplay | undefined>;
  onRemoveFromMember: (memberId: string) => void;
  onRemoveWithMember: (memberId: string) => void;
  onRemoveInChannel: (channelId: string) => void;
  onRemoveInConversation: (conversationId: string) => void;
  onRemoveHasFilter: (type: HasFilterType) => void;
  onRemoveIsFilter: (type: IsFilterType) => void;
  onRemoveTypeFilter: (type: TypeFilterType) => void;
  onRemoveAfterDate: () => void;
  onRemoveBeforeDate: () => void;
};

export function GlobalSearchInputBar({
  openFilters,
  onToggleFilters,
  onCloseSearch,
  inputWrapRef,
  inputRef,
  query,
  onQueryChange,
  onSubmitSearch,
  onInputFocus,
  onInputBlur,
  selectedFromMembers,
  selectedWithMembers,
  selectedInChannels,
  selectedInConversations,
  hasFilterTypes,
  isFilterTypes,
  typeFilterTypes,
  afterDate,
  beforeDate,
  currentUserId,
  memberOverlayMap,
  onRemoveFromMember,
  onRemoveWithMember,
  onRemoveInChannel,
  onRemoveInConversation,
  onRemoveHasFilter,
  onRemoveIsFilter,
  onRemoveTypeFilter,
  onRemoveAfterDate,
  onRemoveBeforeDate,
}: Props) {
  const t = useAppTranslation("globalSearch");

  return (
    <div className="flex items-center justify-between p-2">
      <div className="flex flex-1 items-center gap-2">
        <FiSearch size={16} className="ml-2" />
        <div
          ref={inputWrapRef}
          className="relative flex flex-1 flex-wrap items-center gap-1 rounded-md px-1 py-1"
        >
          {selectedFromMembers.map((member) => {
            const label = getMemberLabel(member);
            return (
              <div
                key={member.id}
                className="group inline-flex items-center gap-1 rounded-md bg-sky-500/20 px-2 py-1 text-sm font-medium text-sky-500"
              >
                <span className="inline-flex size-5 items-center justify-center overflow-hidden rounded-md bg-sky-500/10">
                  {member.avatar ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img src={member.avatar} alt={label} className="size-full object-cover" />
                  ) : (
                    <MdOutlinePerson size={14} />
                  )}
                </span>
                <span>{`from:@${label}`}</span>
                <button
                  type="button"
                  onClick={() => onRemoveFromMember(member.id)}
                  aria-label={`Remove ${label}`}
                  className="rounded p-0.5 text-sky-400 hover:text-sky-300"
                >
                  <FiX size={14} />
                </button>
              </div>
            );
          })}
          {selectedWithMembers.map((member) => {
            const label = getMemberLabel(member);
            return (
              <div
                key={`with-${member.id}`}
                className="group inline-flex items-center gap-1 rounded-md bg-sky-500/20 px-2 py-1 text-sm font-medium text-sky-500"
              >
                <span className="inline-flex size-5 items-center justify-center overflow-hidden rounded-md bg-sky-500/10">
                  {member.avatar ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img src={member.avatar} alt={label} className="size-full object-cover" />
                  ) : (
                    <MdOutlinePerson size={14} />
                  )}
                </span>
                <span>{`with:@${label}`}</span>
                <button
                  type="button"
                  onClick={() => onRemoveWithMember(member.id)}
                  aria-label="Remove include filter"
                  className="rounded p-0.5 text-sky-400 hover:text-sky-300"
                >
                  <FiX size={14} />
                </button>
              </div>
            );
          })}
          {selectedInChannels.map((channel) => (
            <div
              key={`channel-${channel.id}`}
              className="group inline-flex items-center gap-1 rounded-md bg-sky-500/20 px-2 py-1 text-sm font-medium text-sky-500"
            >
              <span className="inline-flex size-5 items-center justify-center overflow-hidden rounded-md bg-sky-500/10">
                <FiHash size={14} />
              </span>
              <span>{`in:${channel.name}`}</span>
              <button
                type="button"
                onClick={() => onRemoveInChannel(channel.id)}
                aria-label={`Remove ${channel.name}`}
                className="rounded p-0.5 text-sky-400 hover:text-sky-300"
              >
                <FiX size={14} />
              </button>
            </div>
          ))}
          {selectedInConversations.map((conversation) => {
            const summary = getConversationSummary(conversation, currentUserId, memberOverlayMap);
            return (
              <div
                key={`conversation-${conversation.id}`}
                className="group inline-flex items-center gap-1 rounded-md bg-sky-500/20 px-2 py-1 text-sm font-medium text-sky-500"
              >
                <span className="inline-flex size-5 items-center justify-center overflow-hidden rounded-md bg-sky-500/10">
                  {summary.memberAvatars[0]?.avatar ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img
                      src={summary.memberAvatars[0].avatar || ""}
                      alt={summary.label}
                      className="size-full object-cover"
                    />
                  ) : (
                    <BiMessageRoundedDetail size={14} />
                  )}
                </span>
                <span>{`in:${summary.label}`}</span>
                <button
                  type="button"
                  onClick={() => onRemoveInConversation(conversation.id)}
                  aria-label={`Remove ${summary.label}`}
                  className="rounded p-0.5 text-sky-400 hover:text-sky-300"
                >
                  <FiX size={14} />
                </button>
              </div>
            );
          })}
          {hasFilterTypes.map((type) => {
            const label = type === "link" ? "has:link" : type === "reaction" ? "has:reaction" : "has:file";
            return (
              <div
                key={label}
                className="group inline-flex items-center gap-1 rounded-md bg-sky-500/20 px-2 py-1 text-sm font-medium text-sky-500"
              >
                <span className="inline-flex size-5 items-center justify-center overflow-hidden rounded-md bg-sky-500/10">
                  {type === "link" ? (
                    <LuLink size={14} />
                  ) : type === "reaction" ? (
                    <HiOutlineFaceSmile size={14} />
                  ) : (
                    <ImFilesEmpty size={14} />
                  )}
                </span>
                <span>{label}</span>
                <button
                  type="button"
                  onClick={() => onRemoveHasFilter(type)}
                  aria-label={`Remove ${label}`}
                  className="rounded p-0.5 text-sky-400 hover:text-sky-300"
                >
                  <FiX size={14} />
                </button>
              </div>
            );
          })}
          {isFilterTypes.map((type) => {
            const label =
              type === "saved"
                ? "is:saved"
                : type === "thread"
                  ? "is:thread"
                  : type === "pinned"
                    ? "is:pinned"
                    : "is:dm";
            return (
              <div
                key={`is-${label}`}
                className="group inline-flex items-center gap-1 rounded-md bg-sky-500/20 px-2 py-1 text-sm font-medium text-sky-500"
              >
                <span className="inline-flex size-5 items-center justify-center overflow-hidden rounded-md bg-sky-500/10">
                  {type === "saved" ? (
                    <LuPin size={14} />
                  ) : type === "thread" ? (
                    <BiMessageRoundedDetail size={14} />
                  ) : type === "pinned" ? (
                    <LuPin size={14} />
                  ) : (
                    <BiMessageRounded size={14} />
                  )}
                </span>
                <span>{label}</span>
                <button
                  type="button"
                  onClick={() => onRemoveIsFilter(type)}
                  aria-label={`Remove ${label}`}
                  className="rounded p-0.5 text-sky-400 hover:text-sky-300"
                >
                  <FiX size={14} />
                </button>
              </div>
            );
          })}
          {typeFilterTypes.map((type) => {
            const label = `type:${type}`;
            return (
              <div
                key={`footer-type-${label}`}
                className="group inline-flex items-center gap-1 rounded-md bg-sky-500/20 px-2 py-1 text-sm font-medium text-sky-500"
              >
                <span className="inline-flex size-5 items-center justify-center overflow-hidden rounded-md bg-sky-500/10">
                  <MdOutlineCalendarMonth size={14} />
                </span>
                <span>{label}</span>
                <button
                  type="button"
                  onClick={() => onRemoveTypeFilter(type)}
                  aria-label={`Remove ${label}`}
                  className="rounded p-0.5 text-sky-400 hover:text-sky-300"
                >
                  <FiX size={14} />
                </button>
              </div>
            );
          })}
          {afterDate ? (
            <div className="group inline-flex items-center gap-1 rounded-md bg-sky-500/20 px-2 py-1 text-sm font-medium text-sky-500">
              <span className="inline-flex size-5 items-center justify-center overflow-hidden rounded-md bg-sky-500/10">
                <MdOutlineCalendarMonth size={14} />
              </span>
              <span className="max-w-[160px] truncate">{`after:${afterDate}`}</span>
              <button
                type="button"
                onClick={onRemoveAfterDate}
                aria-label={`Remove after ${afterDate}`}
                className="rounded p-0.5 text-sky-400 hover:text-sky-300"
              >
                <FiX size={14} />
              </button>
            </div>
          ) : null}
          {beforeDate ? (
            <div className="group inline-flex items-center gap-1 rounded-md bg-sky-500/20 px-2 py-1 text-sm font-medium text-sky-500">
              <span className="inline-flex size-5 items-center justify-center overflow-hidden rounded-md bg-sky-500/10">
                <MdOutlineCalendarMonth size={14} />
              </span>
              <span className="max-w-[160px] truncate">{`before:${beforeDate}`}</span>
              <button
                type="button"
                onClick={onRemoveBeforeDate}
                aria-label={`Remove before ${beforeDate}`}
                className="rounded p-0.5 text-sky-400 hover:text-sky-300"
              >
                <FiX size={14} />
              </button>
            </div>
          ) : null}

          <input
            ref={inputRef}
            type="text"
            value={query}
            onChange={(event) => onQueryChange(event.target.value)}
            onKeyDown={(event) => {
              if (event.key !== "Enter") return;
              event.preventDefault();
              onSubmitSearch();
            }}
            onFocus={onInputFocus}
            onBlur={onInputBlur}
            placeholder={t("placeholder")}
            className="min-w-[180px] flex-1 border-0 bg-transparent outline-none ring-0 focus:border-0 focus:outline-none focus:ring-0"
          />
        </div>
      </div>
      <div className="flex items-center gap-2">
        <Tooltip>
          <TooltipTrigger>
            <div
              className={cn("hover:bg-selection-hover! p-1 rounded-md  hover:text-white!",
                openFilters && "bg-selection-hover text-white hover:bg-selection-hover!"
              )}
              onClick={onToggleFilters}
            >
              <IoFilter size={16} />
            </div>
          </TooltipTrigger>
          <TooltipContent>
            {openFilters ? <Typography text={t("filters.hide")} /> : <Typography text={t("filters.show")} />}
          </TooltipContent>
        </Tooltip>
        <button
          type="button"
          onClick={onCloseSearch}
          className="rounded-md opacity-70 transition-opacity hover:opacity-100 focus:outline-none focus:ring-2 focus:ring-selection-hove p-0.5"
        >
          <X size={20} />
        </button>
      </div>
    </div>
  );
}
