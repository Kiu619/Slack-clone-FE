import type { ComponentType } from "react";

export type SidebarGroupItem = {
  label: string;
  key: string;
};

export type SidebarEntry =
  | {
      kind: "item";
      label: string;
      key: string;
      icon: ComponentType<{ className?: string }>;
    }
  | {
      kind: "group";
      label: string;
      key: string;
      icon: ComponentType<{ className?: string }>;
      items: SidebarGroupItem[];
    };

export type SectionItem = {
  title: string;
  description: string;
  icon: ComponentType<{ className?: string }>;
  iconBg: string;
};

export type MainSection = "people" | "account" | "profiles" | "roles" | "security" | "settings";
export type PeopleTab = "members" | "invitations";
export type SettingsTab = "settings-permissions" | "customize" | "about";
