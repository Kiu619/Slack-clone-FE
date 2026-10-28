import type { DirectMessageConversation, User, WorkspaceMember } from "@/lib/types";

type MemberLike = Pick<User, "id"> &
  Partial<Pick<User, "displayName" | "name" | "email" | "membershipStatus">>;

type ResolveMember<T extends MemberLike> = (member: T) => MemberLike;

/**
 * User bị "deactivate" (membershipStatus = 'deactivated') — vẫn còn row
 * trong workspace_members nhưng không thể truy cập workspace.
 * UI vẫn hiển thị tên thật + badge "Deactivated".
 */
export function isDeactivatedUser(
  member: Pick<User, "membershipStatus"> | null | undefined,
) {
  return member?.membershipStatus === "deactivated";
}

/**
 * User bị "delete" khỏi workspace — workspace_members row đã bị hard-delete.
 * UI phải hiển thị "Deleted user" + avatar mặc định, không hiển thị tên thật.
 */
export function isDeletedUser(
  member: Pick<User, "membershipStatus"> | null | undefined,
) {
  return member?.membershipStatus === "deleted";
}

/**
 * User không còn "active" trong workspace (deactivate HOẶC delete).
 * Dùng cho các UI surface cần ẩn/vo hiệu hoá action với user không active.
 */
export function isInactiveUser(
  member: Pick<User, "membershipStatus"> | null | undefined,
) {
  return isDeactivatedUser(member) || isDeletedUser(member);
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

/**
 * Tên hiển thị cho DM member.
 *
 * - Deleted user  → "Deleted user"
 * - Deactivated   → giữ nguyên tên thật (UI sẽ thêm badge "Deactivated")
 * - Active        → tên thật
 */
export function getDmMemberDisplayName(
  member: MemberLike,
  deletedLabel = "Deleted user",
) {
  if (isDeletedUser(member)) return deletedLabel;
  return getMemberBaseDisplayName(member);
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
  deletedLabel = "Deleted user",
) {
  const otherMembers = getOtherDmMembers(members, currentUserId);
  if (otherMembers.length === 0) return "You";

  return otherMembers
    .map((member) =>
      getDmMemberDisplayName(resolveMember?.(member) ?? member, deletedLabel),
    )
    .join(", ");
}

/**
 * True nếu đây là 1-1 DM với peer đã bị deactivate hoặc delete
 * (không còn active trong workspace).
 */
export function isOneToOneWithInactivePeer(
  conversation: Pick<DirectMessageConversation, "isGroup" | "members">,
  currentUserId: string | undefined | null,
  resolveMember?: ResolveMember<User>,
) {
  if (conversation.isGroup) return false;
  const otherMembers = getOtherDmMembers(conversation.members, currentUserId);
  if (otherMembers.length !== 1) return false;
  const peer = resolveMember?.(otherMembers[0]) ?? otherMembers[0];
  return isInactiveUser(peer);
}

/**
 * @deprecated Dùng `isOneToOneWithInactivePeer` thay thế (catch cả deleted).
 * Giữ lại cho backwards-compat với code cũ đang import.
 */
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
