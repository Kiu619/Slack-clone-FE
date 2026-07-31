import type { DirectMessageConversation, User, WorkspaceMember } from "@/lib/types";

type MemberLike = Pick<User, "id"> &
  Partial<Pick<User, "displayName" | "name" | "email" | "membershipStatus">>;

type ResolveMember<T extends MemberLike> = (member: T) => MemberLike;

export function isDeactivatedUser(member: Pick<User, "membershipStatus"> | null | undefined) {
  return member?.membershipStatus === "deactivated";
}

export function isActiveWorkspaceMember(
  member: Pick<WorkspaceMember, "membershipStatus"> | null | undefined,
) {
  return member?.membershipStatus === "active";
}

export function getMemberBaseDisplayName(member: MemberLike) {
  return (
    member.displayName?.trim() ||
    member.name?.trim() ||
    member.email?.trim() ||
    member.id
  );
}

export function getDmMemberDisplayName(member: MemberLike) {
  const baseName = getMemberBaseDisplayName(member);
  return isDeactivatedUser(member) ? `${baseName}` : baseName;
}

export function getOtherDmMembers<T extends MemberLike>(
  members: T[],
  currentUserId: string | undefined | null,
) {
  return members.filter((member) => member.id !== currentUserId);
}

export function getDmDisplayName<T extends MemberLike>(
  members: T[],
  currentUserId: string | undefined | null,
  resolveMember?: ResolveMember<T>,
) {
  const otherMembers = getOtherDmMembers(members, currentUserId);
  if (otherMembers.length === 0) return "You";

  return otherMembers
    .map((member) => getDmMemberDisplayName(resolveMember?.(member) ?? member))
    .join(", ");
}

export function isOneToOneWithDeactivatedPeer(
  conversation: Pick<DirectMessageConversation, "isGroup" | "members">,
  currentUserId: string | undefined | null,
  resolveMember?: ResolveMember<User>,
) {
  if (conversation.isGroup) return false;
  const otherMembers = getOtherDmMembers(conversation.members, currentUserId);
  if (otherMembers.length !== 1) return false;
  const peer = resolveMember?.(otherMembers[0]) ?? otherMembers[0];
  return isDeactivatedUser(peer);
}
