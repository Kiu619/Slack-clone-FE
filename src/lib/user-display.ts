import type { User } from "@/lib/types";

import { isDeletedUser, isDeactivatedUser, isInactiveUser } from "./dm-members";

/**
 * Resolved display info cho một user trong bất kỳ UI surface nào.
 *
 * - `name`: tên hiển thị ưu tiên (Deleted user / Deactivated user nếu cần, hoặc tên thật)
 * - `avatar`: avatar URL hoặc null (null = fallback default avatar)
 * - `isDeleted`: user đã bị hard-delete khỏi workspace_members
 * - `isDeactivated`: user bị deactivate (row vẫn còn, status = 'deactivated')
 * - `isInactive`: deactivated HOẶC deleted — dùng để ẩn/vô hiệu actions
 * - `membershipStatus`: status gốc từ API
 *
 * Dùng helper này ở mọi UI surface (message timeline, profile panel, DM list, search result, ...)
 * để đảm bảo consistent logic.
 */
export type ResolvedUserDisplay = {
  name: string;
  avatar: string | null;
  initials: string;
  email: string | null;
  isDeleted: boolean;
  isDeactivated: boolean;
  isInactive: boolean;
  membershipStatus: User["membershipStatus"];
};

/**
 * Label fallback cho user đã bị xoá.
 *
 * Mặc định English string; nếu component dùng i18n, hãy truyền label đã translate vào
 * `resolveUserDisplayInfo(user, { deletedLabel: t('common.deletedUser') })`.
 */
export const DEFAULT_DELETED_USER_LABEL = "Deleted user";

type ResolveOptions = {
  deletedLabel?: string;
};

export function resolveUserDisplayInfo(
  user: Partial<User> | null | undefined,
  options: ResolveOptions = {},
): ResolvedUserDisplay {
  const deletedLabel = options.deletedLabel ?? DEFAULT_DELETED_USER_LABEL;
  const membershipStatus = user?.membershipStatus ?? null;
  const isDeleted = isDeletedUser(user);
  const isDeactivated = isDeactivatedUser(user);

  const name = isDeleted
    ? deletedLabel
    : (user?.displayName?.trim() ||
        user?.name?.trim() ||
        // Email chỉ fallback khi user không bị deleted (vì backend đã set email='' cho deleted user)
        (!isDeleted ? user?.email?.trim() : null) ||
        (user?.id ? user.id : "User"));

  // Avatar: chỉ dùng khi user không bị deleted (backend trả NULL cho deleted user)
  const avatar = isDeleted ? null : (user?.avatar?.trim() || null);

  // Initials cho AvatarFallback
  let initials = "U";
  if (isDeleted) {
    initials = "D";
  } else {
    const source = user?.displayName?.trim() || user?.name?.trim();
    if (source) {
      // Lấy 2 chữ cái đầu của từng từ (VD: "Nguyen Van A" -> "NV")
      const words = source.split(/\s+/).filter(Boolean);
      if (words.length === 1) {
        initials = words[0].slice(0, 2).toUpperCase();
      } else {
        initials = (words[0][0] + (words[words.length - 1][0] ?? "")).toUpperCase();
      }
    } else if (user?.email) {
      initials = user.email[0].toUpperCase();
    } else if (user?.id) {
      initials = user.id.slice(0, 1).toUpperCase();
    }
  }

  return {
    name,
    avatar,
    initials,
    email: isDeleted ? null : (user?.email ?? null),
    isDeleted,
    isDeactivated,
    isInactive: isInactiveUser(user),
    membershipStatus,
  };
}
