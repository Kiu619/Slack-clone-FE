"use client";

import type { Channel, DirectMessageConversation, WorkspaceMember } from "@/lib/types";
import type { WorkspaceMemberDisplay } from "@/stores/useWorkspaceMemberStore";
import { BiMessageRounded, BiMessageRoundedDetail } from "react-icons/bi";
import { FiHash } from "react-icons/fi";
import { HiOutlineFaceSmile } from "react-icons/hi2";
import { ImFilesEmpty } from "react-icons/im";
import { LuLink, LuPin } from "react-icons/lu";
import { MdOutlineCalendarMonth, MdOutlinePerson } from "react-icons/md";
import { Separator } from "../../components/ui/separator";
import Typography from "../../components/ui/typography";
import { getConversationSummary, getMemberLabel } from "./utils";
import type { HasFilterType, IsFilterType, TypeFilterType } from "./types";

type Props = {
  selectedFromMembers: WorkspaceMember[];
  selectedWithMembers: WorkspaceMember[];
  selectedInChannels: Channel[];
  selectedInConversations: DirectMessageConversation[];
  hasFilterTypes: HasFilterType[];
  isFilterTypes: IsFilterType[];
  typeFilterTypes: TypeFilterType[];
  afterDate: string | null;
  beforeDate: string | null;
  query: string;
  currentUserId?: string;
  memberOverlayMap: Record<string, WorkspaceMemberDisplay | undefined>;
};

export function GlobalSearchSelectedSummary({
  selectedFromMembers,
  selectedWithMembers,
  selectedInChannels,
  selectedInConversations,
  hasFilterTypes,
  isFilterTypes,
  typeFilterTypes,
  afterDate,
  beforeDate,
  query,
  currentUserId,
  memberOverlayMap,
}: Props) {
  const trimmedQuery = query.trim();

  return (
    <>
      <Separator />
      <div className="flex flex-col">
        <div className="flex items-center justify-between px-4 py-3">
          <div className="flex flex-1 flex-wrap items-center gap-1">
            <Typography text="Show results for:" />

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
                  <span>{`with:${label}`}</span>
                </div>
              );
            })}
            {selectedInChannels.map((channel) => (
              <div
                key={`in-channel-${channel.id}`}
                className="group inline-flex items-center gap-1 rounded-md bg-sky-500/20 px-2 py-1 text-sm font-medium text-sky-500"
              >
                <span className="inline-flex size-5 items-center justify-center overflow-hidden rounded-md bg-sky-500/10">
                  <FiHash size={14} />
                </span>
                <span>{`in:${channel.name}`}</span>
              </div>
            ))}
            {selectedInConversations.map((conversation) => {
              const summary = getConversationSummary(conversation, currentUserId, memberOverlayMap);
              return (
                <div
                  key={`in-conv-${conversation.id}`}
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
                </div>
              );
            })}
            {hasFilterTypes.map((type) => {
              const label =
                type === "link" ? "has:link" : type === "reaction" ? "has:reaction" : "has:file";
              return (
                <div
                  key={`has-${label}`}
                  className="group inline-flex items-center gap-1 rounded-md bg-sky-500/20 px-2 py-1 text-sm font-medium text-sky-500"
                >
                  <span className="inline-flex size-5 items-center justify-center overflow-hidden rounded-md bg-sky-500/10">
                    {type === "link" ? <LuLink size={14} /> : type === "reaction" ? <HiOutlineFaceSmile size={14} /> : <ImFilesEmpty size={14} />}
                  </span>
                  <span>{label}</span>
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
                  key={`footer-is-${label}`}
                  className="group inline-flex items-center gap-1 rounded-md bg-sky-500/20 px-2 py-1 text-sm font-medium text-sky-500"
                >
                  <span className="inline-flex size-5 items-center justify-center overflow-hidden rounded-md bg-sky-500/10">
                    {type === "saved" ? <LuPin size={14} /> : type === "thread" ? <BiMessageRoundedDetail size={14} /> : type === "pinned" ? <LuPin size={14} /> : <BiMessageRounded size={14} />}
                  </span>
                  <span>{label}</span>
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
                    <ImFilesEmpty size={14} />
                  </span>
                  <span>{label}</span>
                </div>
              );
            })}
            {afterDate ? (
              <div className="group inline-flex items-center gap-1 rounded-md bg-sky-500/20 px-2 py-1 text-sm font-medium text-sky-500">
                <span className="inline-flex size-5 items-center justify-center overflow-hidden rounded-md bg-sky-500/10">
                  <MdOutlineCalendarMonth size={14} />
                </span>
                <span className="max-w-[160px] truncate">{`after:${afterDate}`}</span>
              </div>
            ) : null}
            {beforeDate ? (
              <div className="group inline-flex items-center gap-1 rounded-md bg-sky-500/20 px-2 py-1 text-sm font-medium text-sky-500">
                <span className="inline-flex size-5 items-center justify-center overflow-hidden rounded-md bg-sky-500/10">
                  <MdOutlineCalendarMonth size={14} />
                </span>
                <span className="max-w-[160px] truncate">{`before:${beforeDate}`}</span>
              </div>
            ) : null}
            {trimmedQuery ? (
              <span className="max-w-full truncate text-sm font-medium">
                {trimmedQuery}
              </span>
            ) : null}
          </div>

          <kbd className="shrink-0 rounded border border-[#c4c4c4] bg-[#f0f0f0] px-1.5 py-0.5 font-mono text-[11px] font-medium text-[#555] dark:border-[#555] dark:bg-[#2a2d31] dark:text-[#d1d2d3]">
            Enter
          </kbd>
        </div>
      </div>
    </>
  );
}
