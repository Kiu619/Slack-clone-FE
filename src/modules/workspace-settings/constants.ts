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

export const sidebarItems: SidebarEntry[] = [
  { kind: "item", label: "Home", key: "home", icon: Home },
  { kind: "item", label: "Account", key: "account", icon: CircleUserRound },
  {
    kind: "group",
    label: "People",
    key: "people",
    icon: Users,
    items: [
      { label: "Members", key: "members" },
      { label: "Invitations", key: "invitations" },
    ],
  },
  { kind: "item", label: "Profiles", key: "profiles", icon: PanelsTopLeft },
  { kind: "item", label: "Role & Permissions", key: "roles", icon: Fingerprint },
  { kind: "item", label: "Security", key: "security", icon: Shield },
  {
    kind: "group",
    label: "Settings",
    key: "settings",
    icon: Sparkles,
    items: [
      { label: "Settings & Permissions", key: "settings-permissions" },
      { label: "Customize", key: "customize" },
      { label: "About this workspace", key: "about" },
    ],
  },
];

export const accountSections: SectionItem[] = [
  {
    title: "Settings & Permissions",
    description:
      "Configure your workspace settings, permissions, and authentication preferences.",
    icon: Sparkles,
    iconBg: "bg-[#1d76b8]",
  },
  {
    title: "Manage Your Workspace",
    description: "Invite new members and manage user permissions.",
    icon: CircleUserRound,
    iconBg: "bg-[#e6512b]",
  },
  {
    title: "Customize Slack",
    description: "Use these settings to make Slack your own.",
    icon: Sparkles,
    iconBg: "bg-[#0b8f67]",
  },
  {
    title: "Analytics",
    description:
      "View stats for your workspace, including activity, files, and integrations.",
    icon: PanelsTopLeft,
    iconBg: "bg-[#5f4a68]",
  },
];

export const footerLinks = [
  "Tour",
  "Download Apps",
  "Brand Guidelines",
  "Help",
  "API",
  "Pricing",
  "Contact",
  "Policies",
  "Our Blog",
  "Sign Out",
];
