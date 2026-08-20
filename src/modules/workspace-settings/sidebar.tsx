"use client";

import Link from "next/link";
import { ChevronDown, ChevronUp, MessageSquareMore } from "lucide-react";

import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import Typography from "@/components/ui/typography";
import { cn } from "@/lib/utils";

import { sidebarItems } from "./constants";
import type { MainSection, PeopleTab, SettingsTab } from "./types";
import { Theme, useThemeStore } from "@/stores/useThemeStore";
import { useEffect, useMemo, useState } from "react";
import { User } from "@/lib/types";
import { useAppTranslation } from "@/hooks/use-translation";

export function SettingsSidebar({
  workspaceId,
  workspaceName,
  workspaceAvatar,
  workspaceInitial,
  greetingName,
  displayUserAvatar,
  activeSection,
  canViewPeople = true,
  canViewRoles = true,
  activePeopleTab,
  activeSettingsTab,
  openGroups,
  onToggleGroup,
  onSelectSection,
  onSelectPeopleTab,
  onSelectSettingsTab,
  displayUser
}: {
  workspaceId: string;
  workspaceName: string;
  workspaceAvatar: string | null;
  workspaceInitial: string;
  greetingName: string;
  displayUserAvatar: string | null | undefined;
  activeSection: MainSection;
  canViewPeople?: boolean;
  canViewRoles?: boolean;
  activePeopleTab: PeopleTab;
  activeSettingsTab: SettingsTab;
  openGroups: Record<string, boolean>;
  onToggleGroup: (label: string) => void;
  onSelectSection: (section: MainSection) => void;
  onSelectPeopleTab: (tab: PeopleTab) => void;
  onSelectSettingsTab: (tab: SettingsTab) => void;

  displayUser: User | null;
}) {
  const t = useAppTranslation("workspaceSettings");
  const { theme: storeTheme, setTheme, confirmTheme } = useThemeStore()
    const [hasSynced, setHasSynced] = useState(false)
    const [mobileOpen, setMobileOpen] = useState(false)
    const theme = useMemo(() => {
      if (hasSynced) return storeTheme
  
      if (displayUser?.theme) {
        try {
          return JSON.parse(displayUser.theme) as Theme
        } catch (e) {
          return storeTheme
        }
      }
      return storeTheme
    }, [displayUser, storeTheme, hasSynced])
  
    const getSysNavBackground = () => {
      const baseColor = `color-mix(in srgb, ${theme.systemNav}, var(--theme-mix-base) var(--theme-mix-sysnav))`;
  
      if (theme.isGradient) {
        const blendColor = `color-mix(in srgb, ${theme.selectedItems}, var(--theme-mix-base) var(--theme-mix-sysnav))`;
        return `linear-gradient(to bottom right, ${baseColor}, ${blendColor})`;
      }
      return baseColor;
    };

    useEffect(() => {
        if (displayUser?.theme) {
          try {
            const parsedTheme = JSON.parse(displayUser.theme)
            setTheme(parsedTheme)
            confirmTheme()
            // eslint-disable-next-line react-hooks/set-state-in-effect
            setHasSynced(true)
          } catch (e) {
            console.error('Failed to parse theme', e)
          }
        }
      }, [displayUser?.theme, setTheme, confirmTheme])
  return (
    <aside className="flex w-full max-w-full shrink-0 flex-col overflow-hidden rounded-xl shadow-[0_1px_2px_rgba(0,0,0,0.05)] xl:sticky xl:top-0 xl:h-screen xl:w-[260px] xl:rounded-none xl:shadow-none"
      style={{ background: getSysNavBackground() }}
    >
      <div className="flex items-center justify-between border-b border-black/5 px-4 py-3 xl:hidden dark:border-white/10">
        <div className="flex min-w-0 items-center gap-3">
          <Avatar className="h-10 w-10 rounded-[4px] bg-[#63c15b]">
            <AvatarImage src={workspaceAvatar ?? ""} alt={workspaceName} />
            <AvatarFallback className="rounded-[4px] bg-[#63c15b] text-[15px] font-semibold">
              {workspaceInitial}
            </AvatarFallback>
          </Avatar>
          <div className="min-w-0">
            <Typography
              as="h2"
              variant="h5"
              className="truncate text-[15px] font-bold leading-none"
            >
              {workspaceName}
            </Typography>
            <Link
              href={`/workspace/${workspaceId}`}
              className="mt-1 inline-flex items-center gap-1 text-[12px] font-medium text-[#1d1c1d] dark:text-inherit"
            >
              <span>{t("sidebar.openInSlack")}</span>
              <MessageSquareMore className="h-3 w-3" />
            </Link>
          </div>
        </div>

        <button
          type="button"
          onClick={() => setMobileOpen((value) => !value)}
          className="inline-flex h-9 w-9 items-center justify-center rounded-md border border-black/10 text-[#1d1c1d] dark:border-white/10 dark:text-[#f2f2f2]"
          aria-expanded={mobileOpen}
          aria-label={mobileOpen ? t("sidebar.collapseSidebar") : t("sidebar.expandSidebar")}
        >
          {mobileOpen ? (
            <ChevronUp className="h-4 w-4" />
          ) : (
            <ChevronDown className="h-4 w-4" />
          )}
        </button>
      </div>

      <div className="flex-1">
        <div className="hidden flex-col items-center px-4 py-5 md:px-5 md:py-6 xl:flex">
          <Avatar className="h-16 w-16 rounded-[4px] bg-[#63c15b] md:h-[74px] md:w-[74px]">
            <AvatarImage src={workspaceAvatar ?? ""} alt={workspaceName} />
            <AvatarFallback className="rounded-[4px] bg-[#63c15b] text-xl font-semibold md:text-2xl">
              {workspaceInitial}
            </AvatarFallback>
          </Avatar>
          <Typography
            as="h2"
            variant="h5"
            className="mt-3 text-[18px] font-bold leading-none md:mt-4 md:text-[20px]"
          >
            {workspaceName}
          </Typography>
          <Link
            href={`/workspace/${workspaceId}`}
            className="mt-2 inline-flex items-center gap-1 text-[12px] font-medium text-[#1d1c1d] dark:text-inherit"
          >
            <span>{t("sidebar.openInSlack")}</span>
            <MessageSquareMore className="h-3 w-3" />
          </Link>
        </div>

        <nav className={cn("px-3 py-3 md:px-3", mobileOpen ? "block" : "hidden xl:block")}>
          <ul className="space-y-1">
            {sidebarItems.map((item) => {
              const Icon = item.icon;

              if (item.key === "people" && !canViewPeople) {
                return null;
              }

              if (item.key === "roles" && !canViewRoles) {
                return null;
              }

              if (item.kind === "item") {
                const isActive = activeSection === item.key;

                return (
                  <li key={item.key}>
                    <div
                      role="button"
                      onClick={() => onSelectSection(item.key as MainSection)}
                      className={cn(
                        "flex group w-full items-center gap-3 rounded-lg px-3 py-2 text-left transition-colors hover:text-white cursor-pointer",
                        isActive
                          ? "bg-selection-hover text-white"
                          : "text-[#616061] hover:bg-selection-hover",
                      )}
                    >
                      <Icon
                        className={cn(
                          "h-4 w-4 shrink-0 group-hover:text-white",
                          isActive ? "text-white" : "text-[#696969]",
                        )}
                      />
                      <span className="text-[15px] font-medium leading-none">
                        {item.labelKey ? t(`sidebar.${item.labelKey}`) : item.label}
                      </span>
                    </div>
                  </li>
                );
              }

              const groupOpen = openGroups[item.label] ?? true;
              const groupActive =
                (item.key === "people" && activeSection === "people") ||
                (item.key === "settings" && activeSection === "settings");

              return (
                <li key={item.key}>
                  <div
                    role="button"
                    onClick={() => onToggleGroup(item.label)}
                    className={cn(
                      "flex group w-full items-center gap-3 rounded-lg px-3 py-2 text-left transition-colors hover:text-white cursor-pointer",
                      groupActive
                        ? "bg-selection-hover text-white"
                        : "text-[#616061] hover:bg-selection-hover",
                    )}
                  >
                    <Icon
                      className={cn(
                        "h-4 w-4 shrink-0 group-hover:text-white",
                        groupActive ? "text-white" : "text-[#696969]",
                      )}
                    />
                    <span className="flex-1 text-[15px] font-medium leading-none">
                      {item.labelKey ? t(`sidebar.${item.labelKey}`) : item.label}
                    </span>
                    <ChevronDown
                      className={cn(
                        "h-4 w-4 shrink-0 transition-transform",
                        groupOpen ? "rotate-180" : "rotate-0",
                      )}
                    />
                  </div>

                  {groupOpen ? (
                    <ul className="mt-1 space-y-1 pl-9">
                      {item.items.map((subItem) => {
                        const isActiveSubItem =
                          (item.key === "people" &&
                            subItem.key === "members" &&
                            activeSection === "people" &&
                            activePeopleTab === "members") ||
                          (item.key === "people" &&
                            subItem.key === "invitations" &&
                            activeSection === "people" &&
                            activePeopleTab === "invitations") ||
                          (item.key === "settings" &&
                            subItem.key === "settings-permissions" &&
                            activeSection === "settings" &&
                            activeSettingsTab === "settings-permissions") ||
                          (item.key === "settings" &&
                            subItem.key === "customize" &&
                            activeSection === "settings" &&
                            activeSettingsTab === "customize") ||
                          (item.key === "settings" &&
                            subItem.key === "about" &&
                            activeSection === "settings" &&
                            activeSettingsTab === "about");

                        return (
                          <li key={subItem.key}>
                            <div
                              role="button"
                              onClick={() => {
                                if (item.key === "people") {
                                  onSelectSection("people");
                                  onSelectPeopleTab(
                                    subItem.key === "invitations"
                                      ? "invitations"
                                      : "members",
                                  );
                                  return;
                                }

                                onSelectSection("settings");
                                onSelectSettingsTab(
                                  subItem.key === "customize"
                                    ? "customize"
                                    : subItem.key === "about"
                                      ? "about"
                                      : "settings-permissions",
                                );
                              }}
                              className={cn(
                                "w-full rounded-lg px-3 py-2 text-left text-[14px] leading-none transition-colors hover:text-white cursor-pointer",
                                isActiveSubItem
                                  ? "bg-selection-hover font-medium text-white"
                                  : "text-[#616061] hover:bg-selection-hover",
                              )}
                            >
                              {subItem.labelKey ? t(`sidebar.${subItem.labelKey}`) : subItem.label}
                            </div>
                          </li>
                        );
                      })}
                    </ul>
                  ) : null}
                </li>
              );
            })}
          </ul>
        </nav>
      </div>

      <div className="hidden p-4 xl:block">
        <div className="flex items-center gap-3">
          <Avatar className="h-8 w-8 rounded-sm bg-[#f7d71e]">
            <AvatarImage src={displayUserAvatar ?? ""} alt={greetingName} />
            <AvatarFallback className="rounded-sm bg-[#f7d71e] text-[13px] font-semibold text-[#1d1c1d]">
              {greetingName.slice(0, 1).toUpperCase()}
            </AvatarFallback>
          </Avatar>
          <Typography
            variant="small"
            className="text-[14px] font-semibold text-[#1d1c1d]"
          >
            {greetingName}
          </Typography>
        </div>
      </div>
    </aside>
  );
}
