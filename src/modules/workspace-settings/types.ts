import type { ComponentType } from "react";

export type SidebarGroupItem = {
  label: string;
  key: string;
  labelKey?: string;
};

export type SidebarEntry =
  | {
      kind: "item";
      label: string;
      key: string;
      icon: ComponentType<{ className?: string }>;
      labelKey?: string;
    }
  | {
      kind: "group";
      label: string;
      key: string;
      icon: ComponentType<{ className?: string }>;
      items: SidebarGroupItem[];
      labelKey?: string;
    };

export type SectionItem = {
  title: string;
  description: string;
  icon: ComponentType<{ className?: string }>;
  iconBg: string;
  titleKey?: string;
};

export type MainSection = "people" | "account" | "profiles" | "roles" | "security" | "settings";
export type PeopleTab = "members" | "invitations";
export type SettingsTab = "settings-permissions" | "customize" | "about";
