import type { Channel, DirectMessageConversation, User, WorkspaceMember } from "@/lib/types";
import { mergeUserForDisplay, type WorkspaceMemberDisplay } from "@/stores/useWorkspaceMemberStore";

export function getMemberLabel(
  member?: Partial<Pick<WorkspaceMember, "displayName" | "name" | "email">> | null,
) {
  return member?.displayName || member?.name || member?.email || "Workspace member";
}

export function getMemberSecondaryLabel(
  member?: Partial<Pick<WorkspaceMember, "displayName" | "name" | "email">> | null,
) {
  return member?.name || member?.email?.split("@")[0] || member?.email || "Workspace member";
}

export function toLocalDate(date: Date) {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

export function resolveWorkspaceMember(
  memberId: string,
  currentUser: User | null | undefined,
  workspaceMembers: WorkspaceMember[],
  memberOverlayMap: Record<string, WorkspaceMemberDisplay | undefined>,
) {
  if (currentUser && memberId === currentUser.id) {
    return {
      id: currentUser.id,
      displayName: currentUser.displayName || currentUser.name || currentUser.email,
      name: currentUser.name || currentUser.email.split("@")[0] || currentUser.email,
      email: currentUser.email,
      avatar: currentUser.avatar || null,
    } as WorkspaceMember;
  }

  const member = workspaceMembers.find((item) => item.id === memberId) ?? null;
  const overlay = memberOverlayMap[memberId];
  if (!member && !overlay) return null;
  return {
    ...(member ?? {}),
    ...(overlay ?? {}),
    id: memberId,
  } as WorkspaceMember;
}

export function getConversationSummary(
  conversation: DirectMessageConversation,
  currentUserId: string | undefined,
  memberOverlayMap: Record<string, WorkspaceMemberDisplay | undefined>,
) {
  const otherMembers = conversation.members.filter((member) => member.id !== currentUserId);
  const label =
    otherMembers
      .map((member) => {
        const display = memberOverlayMap[member.id];
        return (
          display?.displayName ??
          display?.name ??
          member.displayName ??
          member.name ??
          member.email ??
          ""
        );
      })
      .filter(Boolean)
      .join(", ") || "Direct Message";

  return {
    label,
    memberAvatars: conversation.members
      .filter((member) => member.id !== currentUserId)
      .map((member) => ({
        id: member.id,
        avatar: member.avatar,
        displayName: member.displayName,
        name: member.name,
      })),
  };
}

export function getChannelLabel(channel: Channel) {
  return channel.name;
}

export function getFileTypesLabel(selectedTypes: string[], fileTypes: Array<{ id: string; label: string }>) {
  if (selectedTypes.length === 0) return "Select type";
  if (selectedTypes.length === 1) {
    return fileTypes.find((type) => type.id === selectedTypes[0])?.label ?? "Select type";
  }
  return `${selectedTypes.length} file types`;
}

export function getMergedMember(
  member: WorkspaceMember,
  overlayMap: Record<string, WorkspaceMemberDisplay | undefined>,
) {
  return mergeUserForDisplay(member as User, overlayMap[member.id]);
}
