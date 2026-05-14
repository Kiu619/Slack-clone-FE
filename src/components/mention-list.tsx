"use client";

import React, {
  forwardRef,
  useEffect,
  useImperativeHandle,
  useState,
} from "react";
import type { User, WorkspaceMember } from "@/lib/types";
import {
  mergeUserForDisplay,
  useWorkspaceMemberStore,
} from "@/stores/useWorkspaceMemberStore";
import { useShallow } from "zustand/react/shallow";
import { Avatar, AvatarFallback, AvatarImage } from "./ui/avatar";
import { LuMegaphone } from "react-icons/lu";
import { cn } from "@/lib/utils";
import { UserStatusEmojiInline } from "@/components/user-status-emoji-inline";

export interface MentionListProps {
  items: (
    | (WorkspaceMember & { notInChannel?: boolean })
    | {
        id: string;
        name: string;
        type: "special";
        description: string;
        notInChannel?: boolean;
      }
  )[];
  command: (props: { id: string; label: string }) => void;
  workspaceId?: string;
}

export const MentionList = forwardRef((props: MentionListProps, ref) => {
  const [selectedIndex, setSelectedIndex] = useState(0);

  const wid = props.workspaceId ?? "";
  const memberOverlayMap = useWorkspaceMemberStore(
    useShallow((s) => (wid ? s.byWorkspace[wid] ?? {} : {})),
  );

  const displayMember = (m: WorkspaceMember) =>
    mergeUserForDisplay(m as User, memberOverlayMap[m.id]);

  const selectItem = (index: number) => {
    const item = props.items[index];

    if (item) {
      if ("type" in item && item.type === "special") {
        props.command({ id: item.id, label: item.name || "" });
        return;
      }
      const wm = item as WorkspaceMember;
      const d = displayMember(wm);
      const label =
        d.name?.trim() ||
        d.displayName?.trim() ||
        wm.email.split("@")[0] ||
        wm.email;
      props.command({ id: item.id, label });
    }
  };

  const upHandler = () => {
    setSelectedIndex(
      (selectedIndex + props.items.length - 1) % props.items.length,
    );
  };

  const downHandler = () => {
    setSelectedIndex((selectedIndex + 1) % props.items.length);
  };

  const enterHandler = () => {
    selectItem(selectedIndex);
  };

  useEffect(() => setSelectedIndex(0), [props.items]);

  useImperativeHandle(ref, () => ({
    onKeyDown: ({ event }: { event: KeyboardEvent }) => {
      if (event.key === "ArrowUp") {
        upHandler();
        event.stopPropagation();
        return true;
      }

      if (event.key === "ArrowDown") {
        downHandler();
        event.stopPropagation();
        return true;
      }

      if (event.key === "Enter") {
        enterHandler();
        event.stopPropagation();
        event.preventDefault();
        return true;
      }

      return false;
    },
  }));

  return (
    <div className="bg-white dark:bg-[#1A1D21] border border-[#797c814d] rounded-lg shadow-xl overflow-hidden min-w-[350px] max-h-[800px] flex flex-col">
      <div className="overflow-y-auto py-2">
        {props.items.length > 0 ? (
          props.items.map((item, index) => {
            const isSpecial = "type" in item && item.type === "special";
            const wm = !isSpecial ? (item as WorkspaceMember) : null;
            const d = wm ? displayMember(wm) : null;
            const primary =
              d &&
              (d.name?.trim() ||
                d.displayName?.trim() ||
                wm!.email.split("@")[0]);
            const secondary =
              d &&
              d.displayName?.trim() &&
              d.displayName.trim() !== (d.name?.trim() ?? "");

            return (
              <button
                key={item.id}
                onClick={(e) => {
                  e.preventDefault();
                  e.stopPropagation();
                  selectItem(index);
                }}
                onMouseEnter={() => setSelectedIndex(index)}
                className={`w-full flex items-center gap-2 px-3 py-1.5 text-left border-none outline-none cursor-pointer transition-none ${
                  index === selectedIndex
                    ? "bg-selection-hover text-white"
                    : "bg-transparent dark:text-[#d1d2d3]"
                }`}
                style={{
                  backgroundColor:
                    index === selectedIndex
                      ? "var(--color-selection-hover)"
                      : "transparent",
                  color: index === selectedIndex ? "white" : undefined,
                }}
              >
                {isSpecial ? (
                  <div
                    className={`w-6 h-6 rounded flex items-center justify-center ${index === selectedIndex ? "bg-selection-hover" : ""}`}
                  >
                    <LuMegaphone
                      size={14}
                      className={
                        index === selectedIndex
                          ? "text-white"
                          : "text-gray-600 dark:text-gray-400"
                      }
                    />
                  </div>
                ) : (
                  <Avatar className="w-6 h-6 rounded">
                    <AvatarImage src={d?.avatar || undefined} />
                    <AvatarFallback className="text-[10px] rounded bg-orange-500 text-white">
                      {(d?.name?.charAt(0) || d?.displayName?.charAt(0) || "?").toUpperCase()}
                    </AvatarFallback>
                  </Avatar>
                )}

                <div className="flex flex-col min-w-0 leading-tight w-full">
                  <div className="flex items-center justify-between gap-1">
                    <div className="flex items-center gap-1 min-w-0 flex-1">
                      <span className="font-bold truncate min-w-0">
                        {isSpecial ? item.name : primary}
                      </span>
                      {!isSpecial && d ? (
                        <UserStatusEmojiInline
                          statusEmoji={d.statusEmoji}
                          statusText={d.statusText}
                          emojiClassName={cn(
                            "text-[13px]",
                            index === selectedIndex && "text-white",
                          )}
                          interactive={Boolean(d.statusText?.trim())}
                          className={
                            index === selectedIndex
                              ? "hover:bg-white/15 focus-visible:ring-white/80"
                              : undefined
                          }
                        />
                      ) : null}
                      {!isSpecial && secondary ? (
                        <span
                          className={`text-xs truncate ${index === selectedIndex ? "text-white/70" : "text-gray-500"}`}
                        >
                          {d?.displayName}
                        </span>
                      ) : null}
                    </div>
                    {item.id === "channel" || item.id === "here" ? null : (
                      <span
                        className={`text-[11px] ml-1 ${index === selectedIndex ? "text-white/50" : "text-gray-400"}`}
                      >
                        {(item as WorkspaceMember).id === "me" ? "(you)" : ""}
                        {item.notInChannel ? "Not in channel" : ""}
                      </span>
                    )}
                  </div>
                  {"description" in item && (
                    <span
                      className={`text-[11px] truncate ${index === selectedIndex ? "text-white/70" : "text-gray-500"}`}
                    >
                      {item.description}
                    </span>
                  )}
                </div>
              </button>
            );
          })
        ) : (
          <div className="px-3 py-2 text-sm text-gray-500">
            No results found
          </div>
        )}
      </div>
    </div>
  );
});

MentionList.displayName = "MentionList";
