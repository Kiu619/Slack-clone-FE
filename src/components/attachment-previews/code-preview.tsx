"use client";

import { useCallback, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Highlight, themes } from "prism-react-renderer";
import {
  LuChevronDown,
  LuChevronUp,
  LuDownload,
  LuExternalLink,
  LuFileCode,
} from "react-icons/lu";
import type { Message, MessageAttachment } from "@/lib/types";
import { attachmentContentKeys } from "@/lib/query-keys";
import { apiClient } from "@/lib/axios";
import { openSafeUrl } from "@/lib/open-safe-url";

// Setup global Prism TRƯỚC — prismjs components cần Prism trên global
import "@/lib/prism-setup";
// Import Prism languages (chỉ những cái cần thiết để giảm bundle)
import "prismjs/components/prism-javascript";
import "prismjs/components/prism-typescript";
import "prismjs/components/prism-jsx";
import "prismjs/components/prism-tsx";
import "prismjs/components/prism-json";
import "prismjs/components/prism-css";
import "prismjs/components/prism-scss";
import "prismjs/components/prism-markdown";
import "prismjs/components/prism-bash";
import "prismjs/components/prism-sql";
import "prismjs/components/prism-python";
import "prismjs/components/prism-yaml";
import "prismjs/components/prism-markup";
import FileToolbar from "./file-toolbar";
import { useTheme } from "next-themes";

import { useTrackAttachmentView } from "@/hooks/use-attachments";
import { Skeleton } from "@/components/ui/skeleton";
import { useAppTranslation } from "@/hooks/use-translation";

interface CodePreviewProps {
  message: Message;
  attachment: MessageAttachment;
  onDownload?: (url: string, name: string) => void;
  formDetailPanel?: boolean;
}

const EXT_TO_LANG: Record<string, string> = {
  js: "javascript",
  mjs: "javascript",
  cjs: "javascript",
  ts: "typescript",
  jsx: "jsx",
  tsx: "tsx",
  json: "json",
  css: "css",
  scss: "scss",
  sass: "scss",
  md: "markdown",
  mdx: "markdown",
  sh: "bash",
  bash: "bash",
  zsh: "bash",
  sql: "sql",
  py: "python",
  yaml: "yaml",
  yml: "yaml",
  xml: "markup",
  html: "markup",
  htm: "markup",
  svg: "markup",
  txt: "plaintext",
  csv: "plaintext",
  env: "bash",
};

function getLanguage(fileName: string): string {
  const ext = fileName.toLowerCase().split(".").pop() ?? "txt";
  return EXT_TO_LANG[ext] ?? "plaintext";
}

function formatFileSize(bytes: number): string {
  if (bytes === 0) return "0 B";
  const k = 1024;
  const sizes = ["B", "KB", "MB", "GB"];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return `${(bytes / Math.pow(k, i)).toFixed(1)} ${sizes[i]}`;
}
const DEFAULT_VISIBLE_LINES = 10;

export default function CodePreview({
  message,
  attachment,
  onDownload,
  formDetailPanel = false,
}: CodePreviewProps) {
  const { trackView } = useTrackAttachmentView();
  const t = useAppTranslation("attachments")
  const { resolvedTheme } = useTheme();
  const [isExpanded, setIsExpanded] = useState(false);
  const [isHovered, setIsHovered] = useState(false);
  const lang = getLanguage(attachment.name);

  const {
    data: content,
    isLoading: loading,
    error: fetchError,
  } = useQuery({
    queryKey: attachmentContentKeys.detail(attachment.id),
    queryFn: async () => {
      const res = await apiClient.get<string>(attachment.url);
      return res.data;
    },
    staleTime: 24 * 60 * 60 * 1000,
    gcTime: 24 * 60 * 60 * 1000,
  });

  const error = fetchError
    ? fetchError instanceof Error
      ? fetchError.message
      : t("preview.cantLoad")
    : null;

  const handleDownload = useCallback(() => {
    if (content) {
      // Có content cache → Blob URL → download đúng tên file (S3 cross-origin ignore a.download)
      const blob = new Blob([content], { type: "text/plain;charset=utf-8" });
      const blobUrl = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = blobUrl;
      a.download = attachment.name;
      a.click();
      URL.revokeObjectURL(blobUrl);
    } else if (onDownload) {
      onDownload(attachment.url, attachment.name);
    } else {
      openSafeUrl(attachment.url);
    }
  }, [content, attachment.url, attachment.name, onDownload]);

  const handleOpenInNewTab = useCallback(() => {
    openSafeUrl(attachment.url);
  }, [attachment.url]);

  if (loading) {
    return (
      <div className="rounded-lg border border-[#797c814d] bg-[#0d1117] overflow-hidden w-full">
        <div className="flex items-center justify-between px-3 py-2 border-b border-[#797c814d] bg-[#161b22]">
          <div className="flex items-center gap-2">
            <LuFileCode className="w-4 h-4 text-[#8b949e]" />
            <Skeleton className="h-4 w-40 bg-white/10" />
          </div>
        </div>
        <div className="space-y-3 p-4">
          {Array.from({ length: 5 }, (_, i) => (
            <Skeleton key={i} className="h-4 w-full bg-white/10" />
          ))}
        </div>
      </div>
    );
  }

  if (error || !content) {
    return (
      <div className="rounded-lg border border-[#797c814d] bg-[#161b22] p-4 max-w-[400px]">
        <div className="flex items-center gap-2 text-[#8b949e] mb-2">
          <LuFileCode className="w-4 h-4 shrink-0" />
          <span className="text-sm truncate">{attachment.name}</span>
        </div>
        <p className="text-xs text-[#f85149] mb-3">
          {error || t("preview.cantDisplay")}
        </p>
        <div className="flex gap-2">
          <button
            type="button"
            onClick={handleOpenInNewTab}
            className="flex items-center gap-1.5 px-2 py-1.5 rounded text-xs bg-[#21262d] text-[#c9d1d9] hover:bg-[#30363d] transition-colors"
          >
            <LuExternalLink size={14} />
            {t("preview.openFile")}
          </button>
          <button
            type="button"
            onClick={handleDownload}
            className="flex items-center gap-1.5 px-2 py-1.5 rounded text-xs bg-[#21262d] text-[#c9d1d9] hover:bg-[#30363d] transition-colors"
          >
            <LuDownload size={14} />
            {t("toolbar.download")}
          </button>
        </div>
      </div>
    );
  }

  const lineCount = content.split("\n").length;
  const shouldShowExpandCollapse = lineCount > DEFAULT_VISIBLE_LINES;
  const isCollapsed = shouldShowExpandCollapse && !isExpanded;
  const visibleLineCount = isCollapsed ? DEFAULT_VISIBLE_LINES : lineCount;
  const displayContent = content
    .split("\n")
    .slice(0, visibleLineCount)
    .join("\n");

  return (
    <div
      className="group relative rounded-lg border dark:border-[#797c814d] dark:bg-[#0d1117] overflow-hidden w-full"
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
    >
      {!formDetailPanel ? (
        <FileToolbar
          isHovered={isHovered}
          message={message}
          attachment={attachment}
          onDownload={handleDownload}
          onOpen={handleOpenInNewTab}
        />
      ) : null}
      {/* Header */}
      <div className="flex items-center justify-between px-3 py-2 border-b dark:border-[#797c814d] dark:bg-[#161b22]">
        <div className="flex items-center gap-2 min-w-0">
          <LuFileCode className="w-4 h-4 dark:text-[#8b949e] shrink-0" />
          <span className="text-sm dark:text-[#c9d1d9] truncate">
            {attachment.name}
          </span>
          <span className="text-xs dark:text-[#8b949e] shrink-0">
            {formatFileSize(attachment.size)}
          </span>
        </div>
      </div>
      {/* Code block — IDE style, full height khi expanded */}
      <div
        className={`overflow-x-auto overflow-y-auto ${
          isCollapsed ? "max-h-[400px]" : "max-h-[70vh]"
        }`}
      >
        <Highlight theme={resolvedTheme === "light" ? themes.vsLight : themes.vsDark} code={displayContent} language={lang}>
          {({ className, style, tokens, getLineProps, getTokenProps }) => (
            <pre
              className={`${className} text-[12px] sm:text-[13px] leading-relaxed m-0 p-3 sm:p-4 whitespace-pre-wrap wrap-break-word!`}
              style={{ ...style}}
            >
              {tokens.map((line, i) => (
                <div key={i} {...getLineProps({ line })} className="table-row">
                  <span className="table-cell pr-2 sm:pr-4 text-right text-[#484f58] select-none w-6 sm:w-8 align-top">
                    {i + 1}
                  </span>
                  <span className="table-cell wrap-break-word">
                    {line.map((token, key) => (
                      <span key={key} {...getTokenProps({ token })} />
                    ))}
                  </span>
                </div>
              ))}
              {/* Expand / Collapse button — bên trong code block */}
              {shouldShowExpandCollapse && (
                <div className="flex items-center justify-center ">
                  {/* <span className="table-cell pr-4 text-right text-[#484f58] select-none w-8" /> */}
                  <button
                    type="button"
                    onClick={() => {
                      if (!isExpanded) {
                        trackView({ id: attachment.id, workspaceId: attachment.workspaceId });
                      }
                      setIsExpanded(!isExpanded)
                    }}
                    className="cursor-pointer flex items-center gap-1.5 px-2 py-1 rounded text-xs text-[#0000FF] hover:bg-[#0000FF]/10 dark:text-[#58a6ff] dark:hover:bg-[#21262d] transition-colors font-medium"
                  >
                    {isCollapsed ? (
                      <>
                        <LuChevronDown size={14} />
                        {t("preview.clickToExpand", { count: lineCount - DEFAULT_VISIBLE_LINES })}
                      </>
                    ) : (
                      <>
                        <LuChevronUp size={14} />
                        {t("preview.collapse")}
                      </>
                    )}
                  </button>
                </div>
              )}
            </pre>
          )}
        </Highlight>
      </div>
    </div>
  );
}
