"use client";

import Typography from "@/components/ui/typography";
import { User } from "@/lib/types";
import { getDmDisplayName } from "@/lib/dm-members";
import { Avatar, AvatarFallback, AvatarImage, AvatarGroup } from "@/components/ui/avatar";
import { useAuth } from "@/hooks/use-auth";
import { Button } from "@/components/ui/button";
import { useProfilePanelStore } from "@/stores/useProfilePanelStore";
import {
  mergeUserForDisplay,
  useWorkspaceMemberStore,
} from "@/stores/useWorkspaceMemberStore";
import { useShallow } from "zustand/react/shallow";

interface DMIntroProps {
  members: User[];
  isGroup: boolean;
  createdAt: string;
  workspaceId: string;
}

const DMIntro = ({ members, isGroup, createdAt, workspaceId }: DMIntroProps) => {
  const { user: currentUser } = useAuth();
  const otherMembers = members.filter(m => m.id !== currentUser?.id);
  const isSelf = otherMembers.length === 0;

  const memberOverlayMap = useWorkspaceMemberStore(
    useShallow((s) => s.byWorkspace[workspaceId] ?? {}),
  );

  const displayMember = (m: User) =>
    mergeUserForDisplay(m, memberOverlayMap[m.id]);

  const {
    open: openProfilePanel,
  } = useProfilePanelStore();

  const getDMName = () => {
    if (isSelf) return "you";
    return getDmDisplayName(members, currentUser?.id, displayMember);
  };

  const renderAvatar = () => {
    if (!isGroup || otherMembers.length === 1) {
      const member = otherMembers[0] || currentUser;
      if (!member) {
        return (
          <Avatar size="lg" className="size-16 mb-4">
            <AvatarFallback className="bg-sky-500 text-white text-xl">U</AvatarFallback>
          </Avatar>
        );
      }
      const d = displayMember(member as User);
      return (
        <Avatar size="lg" className="size-16 mb-4">
          <AvatarImage src={d.avatar || ""} />
          <AvatarFallback className="bg-sky-500 text-white text-xl">
            {(d.displayName || d.name || "U").substring(0, 2).toUpperCase()}
          </AvatarFallback>
        </Avatar>
      );
    }

    return (
      <div className="flex mb-4">
        <AvatarGroup>
          {otherMembers.slice(0, 3).map((member) => {
            const d = displayMember(member);
            return (
            <Avatar key={member.id} size="lg" className="size-16!">
              <AvatarImage src={d.avatar || ""} />
              <AvatarFallback className="text-lg">
                {(d.displayName || d.name || "U").substring(0, 1).toUpperCase()}
              </AvatarFallback>
            </Avatar>
          );
          })}
        </AvatarGroup>
      </div>
    );
  };

  return (
    <div className="px-4 pt-12 pb-8">
      {renderAvatar()}
      
      <div className="flex flex-col gap-y-1">
        <Typography
          text={isSelf ? "This is your space" : getDMName()}
          variant="h2"
          className="text-2xl font-bold dark:text-white"
        />
        
        <div className="text-[15px] text-[#616061] dark:text-[#ababad] leading-normal">
          {isSelf ? (
            <p>
              This is your very own space. Draft messages, list your to-dos, or keep links handy. 
              You can also talk to yourself here, but please bear in mind you’ll have to provide both sides of the conversation.
            </p>
          ) : (
            <p>
              This is the very beginning of your direct message history with{" "}
              <span className="font-bold text-[#1d1c1d] dark:text-[#f9f8f9]">
                {getDMName()}
              </span>
              . Only the two of you are in this conversation, and no one else can join it.
            </p>
          )}
        </div>

        {!isSelf && !isGroup && (
          <div className="mt-4 flex gap-x-2">
            <Button variant="outline" size="sm" className="font-bold"
              onClick={() => openProfilePanel({ userData: displayMember(otherMembers[0]), workspaceId })}
            >
              View Profile
            </Button>
          </div>
        )}
      </div>
    </div>
  );
};

export default DMIntro;
