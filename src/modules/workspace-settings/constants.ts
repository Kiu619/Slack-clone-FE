import {
  CircleUserRound,
  Fingerprint,
  Home,
  PanelsTopLeft,
  Shield,
  Sparkles,
  Users,
} from "lucide-react";

import type { SectionItem, SidebarEntry } from "./types";

export type SidebarLabelKey =
  | "home"
  | "account"
  | "people"
  | "members"
  | "invitations"
  | "profiles"
  | "roleAndPermissions"
  | "security"
  | "settings"
  | "settingsAndPermissions"
  | "customize"
  | "aboutThisWorkspace";

export const sidebarItems: Array<SidebarEntry & { labelKey?: SidebarLabelKey }> = [
  { kind: "item", label: "Home", key: "home", icon: Home, labelKey: "home" },
  { kind: "item", label: "Account", key: "account", icon: CircleUserRound, labelKey: "account" },
  {
    kind: "group",
    label: "People",
    key: "people",
    icon: Users,
    labelKey: "people",
    items: [
      { label: "Members", key: "members", labelKey: "members" },
      { label: "Invitations", key: "invitations", labelKey: "invitations" },
    ],
  },
  { kind: "item", label: "Profiles", key: "profiles", icon: PanelsTopLeft, labelKey: "profiles" },
  { kind: "item", label: "Role & Permissions", key: "roles", icon: Fingerprint, labelKey: "roleAndPermissions" },
  { kind: "item", label: "Security", key: "security", icon: Shield, labelKey: "security" },
  {
    kind: "group",
    label: "Settings",
    key: "settings",
    icon: Sparkles,
    labelKey: "settings",
    items: [
      { label: "Settings & Permissions", key: "settings-permissions", labelKey: "settingsAndPermissions" },
      { label: "Customize", key: "customize", labelKey: "customize" },
      { label: "About this workspace", key: "about", labelKey: "aboutThisWorkspace" },
    ],
  },
];

export type AccountSectionTitleKey =
  | "settingsAndPermissions"
  | "manageYourWorkspace"
  | "customizeSlack"
  | "analytics";

export const accountSections: Array<SectionItem & { titleKey: AccountSectionTitleKey }> = [
  {
    title: "Settings & Permissions",
    titleKey: "settingsAndPermissions",
    description:
      "Configure your workspace settings, permissions, and authentication preferences.",
    icon: Sparkles,
    iconBg: "bg-[#1d76b8]",
  },
  {
    title: "Manage Your Workspace",
    titleKey: "manageYourWorkspace",
    description: "Invite new members and manage user permissions.",
    icon: CircleUserRound,
    iconBg: "bg-[#e6512b]",
  },
  {
    title: "Customize Slack",
    titleKey: "customizeSlack",
    description: "Use these settings to make Slack your own.",
    icon: Sparkles,
    iconBg: "bg-[#0b8f67]",
  },
  {
    title: "Analytics",
    titleKey: "analytics",
    description:
      "View stats for your workspace, including activity, files, and integrations.",
    icon: PanelsTopLeft,
    iconBg: "bg-[#5f4a68]",
  },
];

export type FooterLinkKey =
  | "tour"
  | "downloadApps"
  | "brandGuidelines"
  | "help"
  | "api"
  | "pricing"
  | "contact"
  | "policies"
  | "ourBlog"
  | "signOut";

export const footerLinks: Array<{ label: string; key: FooterLinkKey }> = [
  { label: "Tour", key: "tour" },
  { label: "Download Apps", key: "downloadApps" },
  { label: "Brand Guidelines", key: "brandGuidelines" },
  { label: "Help", key: "help" },
  { label: "API", key: "api" },
  { label: "Pricing", key: "pricing" },
  { label: "Contact", key: "contact" },
  { label: "Policies", key: "policies" },
  { label: "Our Blog", key: "ourBlog" },
  { label: "Sign Out", key: "signOut" },
];
