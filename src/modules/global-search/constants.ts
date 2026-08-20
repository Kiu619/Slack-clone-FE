import type { ComponentType } from "react";
import { BiMessageRounded, BiMessageRoundedDetail } from "react-icons/bi";
import { HiOutlineFaceSmile } from "react-icons/hi2";
import { ImFilesEmpty } from "react-icons/im";
import { LuLink, LuPin } from "react-icons/lu";
import type { HasFilterType, IsFilterType, TypeFilterType } from "./types";

type IconType = ComponentType<{ size?: number; className?: string }>;

export const SEARCH_TOKEN_PREFIX = "from:";
export const WITH_TOKEN_PREFIX = "with:";
export const IN_TOKEN_PREFIX = "in:";
export const HAS_TOKEN_PREFIX = "has:";
export const IS_TOKEN_PREFIX = "is:";
export const TYPE_TOKEN_PREFIX = "type:";

export type HasFilterLabelKey = "link" | "reaction" | "file";
export type IsFilterLabelKey = "saved" | "thread" | "dm" | "pinned";
export type TypeFilterLabelKey =
  | "documents"
  | "spreadsheets"
  | "presentations"
  | "pdfs"
  | "audio"
  | "images"
  | "videos"
  | "snippets";

export const HAS_FILTER_OPTIONS: Array<{
  id: HasFilterType;
  labelKey: HasFilterLabelKey;
  icon: IconType;
}> = [
  { id: "link", labelKey: "link", icon: LuLink },
  { id: "reaction", labelKey: "reaction", icon: HiOutlineFaceSmile },
  { id: "file", labelKey: "file", icon: ImFilesEmpty },
];

export const IS_FILTER_OPTIONS: Array<{
  id: IsFilterType;
  labelKey: IsFilterLabelKey;
  icon: IconType;
}> = [
  { id: "saved", labelKey: "saved", icon: LuPin },
  { id: "thread", labelKey: "thread", icon: BiMessageRoundedDetail },
  { id: "dm", labelKey: "dm", icon: BiMessageRounded },
  { id: "pinned", labelKey: "pinned", icon: LuPin },
];

export const TYPE_FILTER_OPTIONS: Array<{
  id: TypeFilterType;
  labelKey: TypeFilterLabelKey;
  icon: IconType;
}> = [
  { id: "documents", labelKey: "documents", icon: ImFilesEmpty },
  { id: "spreadsheets", labelKey: "spreadsheets", icon: ImFilesEmpty },
  { id: "presentations", labelKey: "presentations", icon: ImFilesEmpty },
  { id: "pdfs", labelKey: "pdfs", icon: ImFilesEmpty },
  { id: "audio", labelKey: "audio", icon: ImFilesEmpty },
  { id: "images", labelKey: "images", icon: ImFilesEmpty },
  { id: "videos", labelKey: "videos", icon: ImFilesEmpty },
  { id: "snippets", labelKey: "snippets", icon: ImFilesEmpty },
];
