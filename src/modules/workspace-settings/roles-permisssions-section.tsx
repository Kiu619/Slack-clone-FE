"use client";

import { useMemo, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Check, MoreHorizontal, Search } from "lucide-react";

import PermissionsDialog, {
  type PermissionRoleOption,
} from "@/components/dialogs/permissions-dialog";
import { Button } from "@/components/ui/button";
import Typography from "@/components/ui/typography";
import { fetchWorkspacePermissionsApi, updateWorkspacePermissionApi } from "@/apis";
import { workspaceKeys } from "@/lib/query-keys";
import {
  WORKSPACE_PERMISSION_CATALOG,
  WORKSPACE_ROLE_KEYS,
  type WorkspacePermissionKey,
  type WorkspacePermissionRow,
  type WorkspaceRoleKey,
} from "@/lib/workspace-permissions";
import { cn } from "@/lib/utils";
import { useAppTranslation } from "@/hooks/use-translation";

type PermissionRow = {
  permissionKey: WorkspacePermissionKey;
  label: string;
  editable: boolean;
  lockedRoleKeys: WorkspaceRoleKey[];
  permission?: WorkspacePermissionRow | null;
};

function CheckCell({ enabled }: { enabled: boolean }) {
  if (!enabled) return null;

  return (
    <span className="inline-flex h-5 w-5 items-center justify-center rounded-full bg-[#148567] text-white shadow-[0_0_0_1px_rgba(20,133,103,0.08)]">
      <Check className="h-3.5 w-3.5 stroke-[3.2]" />
    </span>
  );
}

export function RolesPermissionsSection({ workspaceId }: { workspaceId: string }) {
  const t = useAppTranslation("workspaceSettings");
  const queryClient = useQueryClient();
  const [search, setSearch] = useState("");
  const [activePermissionKey, setActivePermissionKey] = useState<WorkspacePermissionKey | null>(null);

  const { data: permissionRows = [] } = useQuery({
    queryKey: workspaceKeys.permissions(workspaceId),
    queryFn: () => fetchWorkspacePermissionsApi(workspaceId),
    enabled: !!workspaceId,
    staleTime: 30_000,
  });

  const permissionsByKey = useMemo(
    () =>
      new Map<WorkspacePermissionKey, WorkspacePermissionRow>(
        permissionRows.map((row) => [row.permissionKey, row]),
      ),
    [permissionRows],
  );

  const permissionRowsView = useMemo<PermissionRow[]>(
    () =>
      WORKSPACE_PERMISSION_CATALOG.map((item) => ({
        permissionKey: item.key,
        label: item.label,
        editable: item.editable ?? false,
        lockedRoleKeys: item.lockedRoleKeys ?? [],
        permission: permissionsByKey.get(item.key) ?? null,
      })),
    [permissionsByKey],
  );

  const filteredPermissions = useMemo(() => {
    const query = search.trim().toLowerCase();
    if (!query) return permissionRowsView;
    return permissionRowsView.filter((permission) =>
      [permission.label, permission.permissionKey].some((value) =>
        value.toLowerCase().includes(query),
      ),
    );
  }, [permissionRowsView, search]);

  const activePermission = useMemo(
    () =>
      activePermissionKey
        ? permissionRowsView.find((row) => row.permissionKey === activePermissionKey) ?? null
        : null,
    [activePermissionKey, permissionRowsView],
  );

  const updateMutation = useMutation({
    mutationFn: ({
      permissionKey,
      roles,
    }: {
      permissionKey: WorkspacePermissionKey;
      roles: Record<WorkspaceRoleKey, boolean>;
    }) => updateWorkspacePermissionApi(workspaceId, permissionKey, roles),
    onSuccess: (updated) => {
      queryClient.setQueryData<WorkspacePermissionRow[]>(
        workspaceKeys.permissions(workspaceId),
        (current) =>
          current
            ? current.map((row) =>
                row.permissionKey === updated.permissionKey ? updated : row,
              )
            : [updated],
      );
      void queryClient.invalidateQueries({
        queryKey: workspaceKeys.detail(workspaceId),
      });
      setActivePermissionKey(null);
    },
  });

  const dialogRoles = useMemo<PermissionRoleOption[]>(() => {
    if (!activePermission) return [];

    const row = activePermission.permission;
    return WORKSPACE_ROLE_KEYS.map((roleKey) => ({
      key: roleKey,
      label: t(`rolesPermissionsSection.${roleKey === "primary_owner" ? "workspacePrimaryOwner" : roleKey === "owner" ? "workspaceOwner" : roleKey === "admin" ? "workspaceAdmin" : "member"}`),
      checked: row
        ? roleKey === "member"
          ? row.memberAllowed
          : roleKey === "admin"
            ? row.adminAllowed
            : roleKey === "owner"
              ? row.ownerAllowed
              : row.primaryOwnerAllowed
        : false,
      locked: activePermission.lockedRoleKeys.includes(roleKey),
    }));
  }, [activePermission, t]);

  const handleSave = async (nextRoles: PermissionRoleOption[]) => {
    if (!activePermissionKey) return;

    const roles = nextRoles.reduce<Record<WorkspaceRoleKey, boolean>>(
      (acc, role) => {
        acc[role.key as WorkspaceRoleKey] = role.checked;
        return acc;
      },
      {
        member: false,
        admin: false,
        owner: false,
        primary_owner: false,
      },
    );

    await updateMutation.mutateAsync({
      permissionKey: activePermissionKey,
      roles,
    });
  };

  return (
    <section className="flex min-h-0 flex-1 flex-col space-y-4 bg-white text-[#1d1c1d] dark:bg-[#1A1D21] dark:text-[#f2f2f2]">
      <div className="px-4 py-4 md:px-6">
        <Typography
          as="h1"
          variant="h3"
          className="text-[28px] font-bold tracking-[-0.03em] text-[#1d1c1d] dark:text-[#f2f2f2] md:text-[32px]"
        >
          {t("rolesPermissionsSection.accountTypes")}
        </Typography>
        <Typography
          variant="muted"
          className="mt-2 max-w-[860px] text-[14px] leading-6 text-[#616061] dark:text-[#b4b8be]"
        >
          {t.rich("rolesPermissionsSection.accountTypesDescription", {
            learnMore: (chunks) => (
              <a href="#" className="text-[#1264a3] hover:underline">
                {chunks}{t("rolesPermissionsSection.learnMore")}
              </a>
            ),
          })}
        </Typography>
      </div>

      <div className="flex flex-col gap-3 py-3 text-[13px] md:flex-row md:items-center md:justify-between">
        <Typography
          variant="small"
          className="px-4 text-[13px] font-medium text-[#1d1c1d] md:px-6 dark:text-[#f2f2f2]"
        >
          {t("rolesPermissionsSection.permissionsCount", { count: filteredPermissions.length })}
        </Typography>

        <label className="relative px-4 md:ml-auto md:w-full md:max-w-[260px] md:px-0">
          <Search className="pointer-events-none absolute left-2.5 top-1/2 h-4 w-4 -translate-y-1/2 text-[#616061]" />
          <input
            type="text"
            value={search}
            onChange={(event) => setSearch(event.target.value)}
            placeholder={t("rolesPermissionsSection.filterByNameOrKeyword")}
            className="h-10 w-full rounded-[6px] border border-[#dddddd] bg-transparent pl-8 pr-3 text-[13px] text-[#1d1c1d] outline-none placeholder:text-[#616061] focus:border-[#1264a3] focus:ring-1 focus:ring-[#1264a3]/20 dark:border-[#35373B] dark:text-[#f2f2f2] dark:placeholder:text-[#8e8d93]"
            aria-label="Filter permissions"
          />
        </label>
      </div>

      <div className="min-h-0 flex-1 overflow-auto rounded-[4px] border border-[#ece8ec] bg-white dark:border-[#35373B] dark:bg-[#1A1D21]">
        <div className="min-w-[1120px]">
          <div className="sticky top-0 z-10 grid grid-cols-[1.9fr_repeat(4,minmax(150px,1fr))] border-b border-[#ece8ec] bg-white text-[13px] font-semibold text-[#1d1c1d] dark:border-[#35373B] dark:bg-[#1A1D21] dark:text-[#d1d2d3]">
            <div className="px-4 py-4 md:px-6">{t("rolesPermissionsSection.permission")}</div>
            {WORKSPACE_ROLE_KEYS.map((column) => (
              <div
                key={column}
                className="border-l border-[#ece8ec] px-4 py-4 text-center md:px-6 dark:border-[#35373B]"
              >
                {t(`rolesPermissionsSection.${column === "primary_owner" ? "workspacePrimaryOwner" : column === "owner" ? "workspaceOwner" : column === "admin" ? "workspaceAdmin" : "member"}`)}
              </div>
            ))}
          </div>

          <div className="divide-y divide-[#ece8ec] dark:divide-[#35373B]">
            {filteredPermissions.map((row, index) => {
              const isBand = index % 2 === 0;
              const permission = row.permission;

              return (
                <div
                  key={row.permissionKey}
                  className={cn(
                    "grid grid-cols-[1.9fr_repeat(4,minmax(150px,1fr))] items-stretch",
                    isBand
                      ? "bg-white dark:bg-[#1A1D21]"
                      : "bg-[#fafafa] dark:bg-[#1D2125]",
                  )}
                >
                  <div className="flex items-center justify-between gap-3 px-4 py-3 md:px-6">
                    <Typography className="text-[14px] font-medium leading-6 text-[#1d1c1d] dark:text-[#f2f2f2]">
                      {row.label}
                    </Typography>

                    {row.editable ? (
                      <Button
                        type="button"
                        variant="ghost"
                        className="h-8 rounded-md px-2 text-[#616061] hover:bg-selection-hover hover:text-[#1d1c1d] dark:text-[#b4b8be] dark:hover:text-[#f2f2f2]"
                        onClick={() => setActivePermissionKey(row.permissionKey)}
                        aria-label={t("rolesPermissionsSection.editPermissionsFor", { name: row.label })}
                      >
                        <MoreHorizontal className="h-4 w-4" />
                      </Button>
                    ) : null}
                  </div>

                  {WORKSPACE_ROLE_KEYS.map((roleKey) => {
                    const enabled =
                      permission &&
                      (roleKey === "member"
                        ? permission.memberAllowed
                        : roleKey === "admin"
                          ? permission.adminAllowed
                          : roleKey === "owner"
                            ? permission.ownerAllowed
                            : permission.primaryOwnerAllowed);

                    return (
                      <div
                        key={`${row.permissionKey}-${roleKey}`}
                        className={cn(
                          "flex items-center justify-center border-l border-[#ece8ec] px-4 py-3 md:px-6 dark:border-[#35373B]",
                          isBand
                            ? "bg-white dark:bg-[#1A1D21]"
                            : "bg-[#fafafa] dark:bg-[#1D2125]",
                        )}
                      >
                        <CheckCell enabled={Boolean(enabled)} />
                      </div>
                    );
                  })}
                </div>
              );
            })}
          </div>
        </div>
      </div>

      {activePermission ? (
        <PermissionsDialog
          key={activePermission.permissionKey}
          open={Boolean(activePermission)}
          onOpenChange={(open) => {
            if (!open) setActivePermissionKey(null);
          }}
          permissionName={activePermission.label}
          roles={dialogRoles}
          saving={updateMutation.isPending}
          onSave={handleSave}
        />
      ) : null}
    </section>
  );
}
