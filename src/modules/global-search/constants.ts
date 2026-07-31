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

export const HAS_FILTER_OPTIONS: Array<{
  id: HasFilterType;
  label: string;
  icon: IconType;
}> = [
  { id: "link", label: "Link", icon: LuLink },
  { id: "reaction", label: "Reaction", icon: HiOutlineFaceSmile },
  { id: "file", label: "File", icon: ImFilesEmpty },
];

export const IS_FILTER_OPTIONS: Array<{
  id: IsFilterType;
  label: string;
  icon: IconType;
}> = [
  { id: "saved", label: "Saved", icon: LuPin },
  { id: "thread", label: "Thread", icon: BiMessageRoundedDetail },
  { id: "dm", label: "DM", icon: BiMessageRounded },
  { id: "pinned", label: "Pinned", icon: LuPin },
];

export const TYPE_FILTER_OPTIONS: Array<{
  id: TypeFilterType;
  label: string;
  icon: IconType;
}> = [
  { id: "documents", label: "Documents", icon: ImFilesEmpty },
  { id: "spreadsheets", label: "Spreadsheets", icon: ImFilesEmpty },
  { id: "presentations", label: "Presentations", icon: ImFilesEmpty },
  { id: "pdfs", label: "PDFs", icon: ImFilesEmpty },
  { id: "audio", label: "Audio", icon: ImFilesEmpty },
  { id: "images", label: "Images", icon: ImFilesEmpty },
  { id: "videos", label: "Videos", icon: ImFilesEmpty },
  { id: "snippets", label: "Snippets", icon: ImFilesEmpty },
];
