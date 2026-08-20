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

export function memberStatus(member: WorkspaceMember, t?: (key: string) => string) {
  if (member.membershipStatus === "deactivated") {
    return t ? t("helpers.deactivated") : "Deactivated";
  }
}

export function accountTypeLabel(role: WorkspaceMember["role"], t?: (key: string) => string) {
  if (role === "primary_owner") return t ? t("helpers.primaryWorkspaceOwner") : "Primary Workspace Owner";
  if (role === "owner") return t ? t("helpers.workspaceOwner") : "Workspace Owner";
  if (role === "admin") return t ? t("helpers.workspaceAdmin") : "Workspace Admin";
  return t ? t("helpers.regularMember") : "Regular Member";
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
