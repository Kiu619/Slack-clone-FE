"use client";

import { useMemo, useState } from "react";
import { usePathname, useParams, useRouter } from "next/navigation";
import { useQuery } from "@tanstack/react-query";
import { Lock } from "lucide-react";

import { getWorkspaceProfileApi } from "@/apis";
import { useAuth } from "@/hooks/use-auth";
import { useWorkspace } from "@/hooks/use-workspace";
import { authKeys } from "@/lib/query-keys";
import { mergeAccountWithWorkspaceProfile } from "@/lib/merge-user";
import Typography from "@/components/ui/typography";

import { AccountSection } from "./account-section";
import { PeopleInvitationsSection } from "./invitations-section";
import { MembersSection } from "./members-section";
import { CustomizeEmojiSection } from "./customize-emoji-section";
import { RolesPermissionsSection } from "./roles-permisssions-section";
import { SettingsSidebar } from "./sidebar";
import { getDisplayName } from "./helpers";
import type { MainSection, PeopleTab, SettingsTab } from "./types";
import { hasWorkspacePermission, type WorkspaceRoleKey } from "@/lib/workspace-permissions";

export default function WorkspaceSettingsPage() {
  const params = useParams<{ workspaceId: string; tab?: string }>();
  const workspaceId =
    typeof params.workspaceId === "string" ? params.workspaceId : "";
  const tabParam = typeof params.tab === "string" ? params.tab : "";
  const pathname = usePathname();
  const router = useRouter();

  const { user: accountUser } = useAuth();
  const { data: workspace } = useWorkspace(workspaceId);
  const { data: workspaceProfile } = useQuery({
    queryKey: authKeys.workspaceProfile(workspaceId),
    queryFn: () => getWorkspaceProfileApi(workspaceId),
    enabled: !!workspaceId,
    staleTime: 60 * 1000,
  });

  const [openGroups, setOpenGroups] = useState<Record<string, boolean>>({
    People: true,
    Settings: true,
  });
  const [activeSection, setActiveSection] = useState<MainSection>("people");
  const [activeSettingsTab, setActiveSettingsTab] = useState<SettingsTab>(
    "settings-permissions",
  );

  const displayUser = useMemo(
    () => mergeAccountWithWorkspaceProfile(accountUser, workspaceProfile),
    [accountUser, workspaceProfile],
  );

  const greetingName = getDisplayName(
    displayUser?.displayName ?? displayUser?.name,
    displayUser?.email,
  );
  const activePeopleTab: PeopleTab = pathname.endsWith("/invitations")
    ? "invitations"
    : "members";
  const isSettingsTabParam = (value: string): value is SettingsTab =>
    value === "settings-permissions" ||
    value === "customize" ||
    value === "about";
  const isPeopleRoute =
    pathname.endsWith("/members") || pathname.endsWith("/invitations");
  const resolvedActiveSettingsTab: SettingsTab = isSettingsTabParam(tabParam)
    ? tabParam
    : activeSettingsTab;
  const resolvedSection: MainSection = isPeopleRoute
    ? "people"
    : tabParam === "roles"
      ? "roles"
      : isSettingsTabParam(tabParam)
        ? "settings"
        : activeSection;
  const workspaceName = workspace?.name ?? "Workspace";
  const workspaceInitial = workspaceName.slice(0, 1).toUpperCase() || "W";
  const workspaceAvatar = workspace?.imageUrl || null;
  const canViewPeople = hasWorkspacePermission(
    workspace,
    (displayUser?.role as WorkspaceRoleKey | null) ?? null,
    "manage_user_permissions",
  );
  const canViewRoles =
    displayUser?.role === "owner" || displayUser?.role === "primary_owner";
  const deniedPeopleAccess =
    Boolean(workspace) && isPeopleRoute && !canViewPeople;
  const deniedRolesAccess =
    Boolean(workspace) && tabParam === "roles" && !canViewRoles;

  const handleSelectSection = (section: MainSection) => {
    if (section === "roles") {
      router.push(`/workspace/${workspaceId}/settings/roles`);
      return;
    }

    setActiveSection(section);
  };

  const renderDenied = () => (
    <div className="flex flex-col gap-4">
      <div className="flex items-center gap-3 ">
        <Lock className="h-6 w-6" />
        <Typography
          as="h1"
          variant="h3"
          className="text-[28px] font-bold tracking-[-0.03em]  md:text-[32px]"
        >
          Only members with permission can view this page
        </Typography>
      </div>

      <div className="rounded-[4px] border border-[#d9d7da] bg-white px-7 py-8 shadow-[0_1px_2px_rgba(0,0,0,0.06)]">
        <Typography
          text="Apologies, but you can't view this page."
          className="text-[18px] font-semibold "
        />
        <Typography
          text="You may have ended up here if you have access to this page on another Slack workspace."
          className="mt-6 text-[16px] leading-7 "
        />
      </div>
    </div>
  );

  const renderContent = () => {
    const section = resolvedSection;

    if (deniedPeopleAccess) {
      return renderDenied();
    }

    if (deniedRolesAccess) {
      return renderDenied();
    }

    if (section === "people") {
      return activePeopleTab === "members" ? (
        <MembersSection workspaceId={workspaceId} />
      ) : (
        <PeopleInvitationsSection />
      );
    }

    if (section === "roles") {
      return <RolesPermissionsSection workspaceId={workspaceId} />;
    }

    if (section === "settings") {
      if (resolvedActiveSettingsTab === "customize") {
        return <CustomizeEmojiSection workspaceId={workspaceId} />;
      }
    }

    return (
      <AccountSection greetingName={greetingName} displayUser={displayUser} />
    );
  };

  return (
      <div className="flex min-h-screen w-full flex-col overflow-x-hidden bg-white dark:bg-[#1A1D21] xl:flex-row">
        <SettingsSidebar
          workspaceId={workspaceId}
          workspaceName={workspaceName}
          workspaceAvatar={workspaceAvatar}
          workspaceInitial={workspaceInitial}
          greetingName={greetingName}
          displayUserAvatar={displayUser?.avatar}
          activeSection={resolvedSection}
          canViewPeople={canViewPeople}
          canViewRoles={canViewRoles}
          activePeopleTab={activePeopleTab}
          activeSettingsTab={resolvedActiveSettingsTab}
          openGroups={openGroups}
          onToggleGroup={(label) =>
            setOpenGroups((prev) => ({
              ...prev,
              [label]: !prev[label],
            }))
          }
          onSelectSection={handleSelectSection}
          onSelectPeopleTab={(tab) =>
            router.push(`/workspace/${workspaceId}/settings/${tab}`)
          }
          onSelectSettingsTab={(tab) =>
            router.push(`/workspace/${workspaceId}/settings/${tab}`)
          }

          displayUser={displayUser}
        />

        <main className="min-w-0 flex-1 overflow-x-hidden px-4 py-6 md:px-6 xl:px-10 xl:py-8">
          <div className="flex min-h-0 h-full flex-col">{renderContent()}</div>
        </main>
      </div>
  );
}
