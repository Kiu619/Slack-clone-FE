export const WORKSPACE_ROLE_KEYS = [
  "member",
  "admin",
  "owner",
  "primary_owner",
] as const;

export type WorkspaceRoleKey = (typeof WORKSPACE_ROLE_KEYS)[number];

export type WorkspacePermissionKey =
  | "add_and_edit_custom_emoji"
  | "allow_profile_photo_edits"
  | "archive_channels"
  | "convert_private_channels_to_public"
  | "convert_public_channels_to_private"
  | "create_private_channels"
  | "create_public_channels"
  | "delete_channels"
  | "delete_custom_emoji"
  | "delete_messages_from_apps_bots"
  | "delete_own_messages"
  | "edit_channel_posting_permissions"
  | "manage_user_permissions"
  | "remove_users_from_private_channels"
  | "remove_users_from_public_channels"
  | "unarchive_channels"
  | "update_display_name"
  | "update_name"
  | "use_channel_and_here_in_channels"

export type WorkspacePermissionMatrix = Record<WorkspaceRoleKey, boolean>;

export type WorkspacePermissionRow = {
  permissionKey: WorkspacePermissionKey;
  memberAllowed: boolean;
  adminAllowed: boolean;
  ownerAllowed: boolean;
  primaryOwnerAllowed: boolean;
};

export type WorkspacePermissionCatalogItem = {
  key: WorkspacePermissionKey;
  label: string;
  editable?: boolean;
  lockedRoleKeys?: WorkspaceRoleKey[];
};

export const WORKSPACE_PERMISSION_CATALOG: WorkspacePermissionCatalogItem[] = [
  {
    key: "add_and_edit_custom_emoji",
    label: "Add and edit custom emoji",
    editable: true,
    lockedRoleKeys: ["admin", "owner", "primary_owner"],
  },
  {
    key: "allow_profile_photo_edits",
    label: "Allow profile photo edits",
  },
  {
    key: "archive_channels",
    label: "Archive channels",
    editable: true,
    lockedRoleKeys: ["owner", "primary_owner"],
  },
  {
    key: "convert_private_channels_to_public",
    label: "Convert private channels to public",
    editable: true,
    lockedRoleKeys: ["owner", "primary_owner"],
  },
  {
    key: "convert_public_channels_to_private",
    label: "Convert public channels to private",
    editable: true,
    lockedRoleKeys: ["owner", "primary_owner"],
  },
  {
    key: "create_private_channels",
    label: "Create private channels",
    editable: true,
    lockedRoleKeys: ["owner", "primary_owner"],
  },
  {
    key: "create_public_channels",
    label: "Create public channels",
    editable: true,
    lockedRoleKeys: ["owner", "primary_owner"],
  },
  {
    key: "delete_channels",
    label: "Delete channels",
    editable: true,
    lockedRoleKeys: ["member", "owner", "primary_owner"],
  },
  {
    key: "delete_custom_emoji",
    label: "Delete custom emoji",
    editable: true,
    lockedRoleKeys: ["owner", "primary_owner"],
  },
  {
    key: "delete_messages_from_apps_bots",
    label: "Delete messages from apps/bots",
    editable: true,
    lockedRoleKeys: ["member", "owner", "primary_owner"],
  },
  {
    key: "delete_own_messages",
    label: "Delete own messages",
    lockedRoleKeys: [],
  },
  {
    key: "edit_channel_posting_permissions",
    label: "Edit channel posting permissions",
    editable: true,
    lockedRoleKeys: ["member", "owner", "primary_owner"],
  },
  {
    key: "manage_user_permissions",
    label: "Manage user permissions",
    editable: true,
    lockedRoleKeys: ["member", "owner", "primary_owner"],
  },
  {
    key: "remove_users_from_private_channels",
    label: "Remove users from private channels",
    editable: true,
    lockedRoleKeys: ["owner", "primary_owner"],
  },
  {
    key: "remove_users_from_public_channels",
    label: "Remove users from public channels",
    editable: true,
    lockedRoleKeys: ["member", "owner", "primary_owner"],
  },
  {
    key: "unarchive_channels",
    label: "Unarchive channels",
    editable: true,
    lockedRoleKeys: ["owner", "primary_owner"],
  },
  {
    key: "update_display_name",
    label: "Update display name",
    lockedRoleKeys: [],
  },
  {
    key: "update_name",
    label: "Update name",
    lockedRoleKeys: [],
  },
  {
    key: "use_channel_and_here_in_channels",
    label: "Use @channel and @here in channels",
    editable: true,
    lockedRoleKeys: ["owner", "primary_owner"],
  }
];

export function getPermissionRow(
  permissions: WorkspacePermissionRow[] | undefined | null,
  permissionKey: WorkspacePermissionKey,
) {
  return permissions?.find((permission) => permission.permissionKey === permissionKey) ?? null;
}

export function hasWorkspacePermission(
  workspace:
    | { permissions?: WorkspacePermissionRow[] | null }
    | null
    | undefined,
  role: WorkspaceRoleKey | null | undefined,
  permissionKey: WorkspacePermissionKey,
) {
  const row = getPermissionRow(workspace?.permissions, permissionKey);
  if (!row) {
    return role === "primary_owner" || role === "owner" || role === "admin";
  }

  if (role === "primary_owner") return row.primaryOwnerAllowed;
  if (role === "owner") return row.ownerAllowed;
  if (role === "admin") return row.adminAllowed;
  return row.memberAllowed;
}
