import type { User, WorkspaceMember } from "@/lib/types";

export function formatDate(value: string) {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "—";
  return new Intl.DateTimeFormat("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  }).format(date);
}

export function memberLabel(member: WorkspaceMember) {
  return (
    member.displayName?.trim() ||
    member.name?.trim() ||
    member.email.split("@")[0] ||
    member.email
  );
}

export function memberStatus(member: WorkspaceMember) {
  if (member.membershipStatus === "deactivated") return "Deactivated";
}

export function accountTypeLabel(role: WorkspaceMember["role"]) {
  if (role === "primary_owner") return "Primary Workspace Owner";
  if (role === "owner") return "Workspace Owner";
  if (role === "admin") return "Workspace Admin";
  return "Regular Member";
}

export function memberToUser(member: WorkspaceMember): User {
  return {
    id: member.id,
    email: member.email,
    name: member.name,
    displayName: member.displayName ?? member.name,
    avatar: member.avatar,
    role: member.role,
    statusText: member.statusText,
    statusEmoji: member.statusEmoji,
    statusExpiration: member.statusExpiration,
    notificationsPausedUntil: member.notificationsPausedUntil,
    isAway: member.isAway,
  };
}

export function getDisplayName(
  name: string | null | undefined,
  email: string | null | undefined,
) {
  return name?.trim() || email?.split("@")[0]?.trim() || "there";
}
