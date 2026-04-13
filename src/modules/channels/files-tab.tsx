"use client";

import { useQuery } from "@tanstack/react-query";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { FiSearch } from "react-icons/fi";
import { Virtuoso } from "react-virtuoso";
import { useChannelAttachments } from "@/hooks/use-channel-attachments";
import { useSocket } from "@/hooks/use-socket";
import { useDebouncedValue } from "@/hooks/use-debounce";
import { searchChannelFilesApi } from "@/apis";
import { messageKeys } from "@/lib/query-keys";
import FilePreview, {
  getFileIcon,
} from "@/components/attachment-previews/file-preview";
import ImagePreview from "@/components/attachment-previews/image-preview";
import VideoPreview from "@/components/attachment-previews/video-preview";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
import { cn } from "@/lib/utils";
import type { Channel, ChannelFileHit, MessageAttachment } from "@/lib/types";

const MEDIA_GRID_PAGE_SIZE = 6;
const SEARCH_DEBOUNCE_MS = 300;
const DROPDOWN_MAX_ITEMS = 10;

/** Full width mobile, max ~Slack desktop — đồng bộ với folder-tab */
const FILES_TAB_SHELL =
  "w-full min-w-0 max-w-[1050px] mx-auto px-3 sm:px-4 md:px-5";

export type FileWithMessage = ChannelFileHit;

function isMediaAttachment(a: MessageAttachment): boolean {
  const t = (a.type ?? "").toLowerCase();
  return t === "image" || t === "video";
}

interface FilesTabProps {
  currentChannelData: Channel;
}

export default function FilesTab({ currentChannelData }: FilesTabProps) {
  const { isConnected } = useSocket();
  const attachmentsQuery = useChannelAttachments(
    currentChannelData.id,
    isConnected,
  );
  const {
    isPending,
    isError,
    refetch,
    fetchNextPage,
    hasNextPage,
    isFetchingNextPage,
    data: attachmentsData,
  } = attachmentsQuery;

  /** Giá trị trong ô input (gõ tức thì) */
  const [inputValue, setInputValue] = useState("");
  /** Chỉ cập nhật khi Enter / chọn "Show results for…" — điều khiển layout bên dưới */
  const [appliedQuery, setAppliedQuery] = useState("");
  const [showAllMedia, setShowAllMedia] = useState(false);
  const [searchFocused, setSearchFocused] = useState(false);

  const blurDismissRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const debouncedInput = useDebouncedValue(inputValue, SEARCH_DEBOUNCE_MS);

  const clearBlurDismiss = useCallback(() => {
    if (blurDismissRef.current !== null) {
      clearTimeout(blurDismissRef.current);
      blurDismissRef.current = null;
    }
  }, []);

  useEffect(() => {
    return () => clearBlurDismiss();
  }, [clearBlurDismiss]);

  const allItems = useMemo((): ChannelFileHit[] => {
    if (!attachmentsData?.pages?.length) return [];
    return attachmentsData.pages.flatMap((p) => p.results);
  }, [attachmentsData]);

  const searchEnabledBase = !!currentChannelData.id;

  const { data: previewSearch, isFetching: previewSearchFetching } = useQuery({
    queryKey: messageKeys.channelFilesSearch(
      currentChannelData.id,
      debouncedInput.trim(),
    ),
    queryFn: () =>
      searchChannelFilesApi(currentChannelData.id, debouncedInput.trim()),
    enabled:
      searchEnabledBase &&
      searchFocused &&
      debouncedInput.trim().length > 0,
    staleTime: 20_000,
  });

  const { data: appliedSearch, isPending: appliedSearchPending } = useQuery({
    queryKey: messageKeys.channelFilesSearch(
      currentChannelData.id,
      appliedQuery.trim(),
    ),
    queryFn: () =>
      searchChannelFilesApi(currentChannelData.id, appliedQuery.trim()),
    enabled: searchEnabledBase && appliedQuery.trim().length > 0,
    staleTime: 30_000,
  });

  const layoutItems = useMemo((): ChannelFileHit[] => {
    if (appliedQuery.trim()) {
      return appliedSearch?.results ?? [];
    }
    return allItems;
  }, [appliedQuery, appliedSearch, allItems]);

  const previewMatches = useMemo(() => {
    return (previewSearch?.results ?? []).slice(0, DROPDOWN_MAX_ITEMS);
  }, [previewSearch]);

  const showSearchDropdown =
    searchFocused && debouncedInput.trim().length > 0 && searchEnabledBase;

  const commitSearch = useCallback((raw: string) => {
    const t = raw.trim();
    setAppliedQuery(t);
    setInputValue(t);
    setShowAllMedia(false);
    setSearchFocused(false);
    clearBlurDismiss();
  }, [clearBlurDismiss]);

  const mediaItems = useMemo(
    () => layoutItems.filter((x) => isMediaAttachment(x.attachment)),
    [layoutItems],
  );
  const documentItems = useMemo(
    () => layoutItems.filter((x) => !isMediaAttachment(x.attachment)),
    [layoutItems],
  );

  const hasMoreMediaThanGrid = mediaItems.length > MEDIA_GRID_PAGE_SIZE;

  const displayedMedia = useMemo(
    () =>
      showAllMedia ? mediaItems : mediaItems.slice(0, MEDIA_GRID_PAGE_SIZE),
    [mediaItems, showAllMedia],
  );

  const handleEndReached = useCallback(() => {
    if (appliedQuery.trim()) return;
    if (hasNextPage && !isFetchingNextPage) {
      void fetchNextPage();
    }
  }, [appliedQuery, fetchNextPage, hasNextPage, isFetchingNextPage]);

  const virtuosoComponents = useMemo(
    () => ({
      Footer: () => (
        <div className="min-h-4">
          {isFetchingNextPage && !appliedQuery.trim() ? (
            <p className="py-3 text-center text-xs text-[#616061] dark:text-[#ababad] sm:text-[13px]">
              Loading more…
            </p>
          ) : null}
        </div>
      ),
    }),
    [appliedQuery, isFetchingNextPage],
  );

  if (isError) {
    return (
      <div
        className={cn(
          FILES_TAB_SHELL,
          "flex min-h-0 flex-1 flex-col items-center justify-center gap-2 py-8 text-center bg-white dark:bg-[#1A1D21]",
        )}
      >
        <p className="text-sm font-semibold text-[#1d1c1d] dark:text-[#f9f8f9]">
          Could not load files
        </p>
        <button
          type="button"
          onClick={() => void refetch()}
          className="text-sm text-[#1264a3] hover:underline dark:text-[#1d9bd1]"
        >
          Try again
        </button>
      </div>
    );
  }

  if (isPending) {
    return (
      <div
        className={cn(
          FILES_TAB_SHELL,
          "flex h-full min-h-0 flex-1 flex-col bg-white dark:bg-[#1A1D21]",
        )}
      >
        <div className="shrink-0 py-3 sm:py-4 sm:pb-3">
          <Skeleton className="h-10 w-full rounded-lg bg-[#e8e8e8] dark:bg-[#2a2d31]" />
        </div>
        <div className="flex flex-1 flex-col space-y-5 pb-6 sm:space-y-6">
          <Skeleton className="h-4 w-32 bg-[#e8e8e8] dark:bg-[#2a2d31] sm:w-40" />
          <div className="grid grid-cols-3 gap-2 sm:grid-cols-4 md:grid-cols-5 lg:grid-cols-6">
            {[1, 2, 3, 4, 5, 6].map((i) => (
              <Skeleton
                key={i}
                className="aspect-square min-h-18 w-full rounded-lg bg-[#e8e8e8] dark:bg-[#2a2d31]"
              />
            ))}
          </div>
          <Skeleton className="h-4 w-28 bg-[#e8e8e8] dark:bg-[#2a2d31] sm:w-32" />
          {[1, 2, 3].map((i) => (
            <Skeleton
              key={`row-${i}`}
              className="h-14 w-full rounded-md bg-[#e8e8e8] dark:bg-[#2a2d31]"
            />
          ))}
        </div>
      </div>
    );
  }

  return (
    <div
      className={cn(
        FILES_TAB_SHELL,
        "flex h-full min-h-0 flex-1 flex-col bg-white dark:bg-[#1A1D21]",
      )}
    >
      <div className="shrink-0 py-3 sm:py-4 sm:pb-3">
        <div className="relative z-20">
          <FiSearch
            className="pointer-events-none absolute left-2.5 top-1/2 -translate-y-1/2 text-[#616061] sm:left-3 dark:text-[#ababad]"
            size={18}
          />
          <Input
            value={inputValue}
            onChange={(e) => {
              setInputValue(e.target.value);
              setShowAllMedia(false);
            }}
            onFocus={() => {
              clearBlurDismiss();
              setSearchFocused(true);
            }}
            onBlur={() => {
              blurDismissRef.current = setTimeout(() => {
                setSearchFocused(false);
                blurDismissRef.current = null;
              }, 180);
            }}
            onKeyDown={(e) => {
              if (e.key === "Enter") {
                e.preventDefault();
                commitSearch(inputValue);
              }
              if (e.key === "Escape") {
                e.preventDefault();
                clearBlurDismiss();
                setSearchFocused(false);
              }
            }}
            placeholder="Search files"
            className={cn(
              "h-10 rounded-lg border-[#dddddd] bg-white pl-9 text-[14px] placeholder:text-[#616061] sm:pl-10 sm:text-[15px] dark:border-[#35373B] dark:bg-[#1A1D21] dark:placeholder:text-[#ababad]",
              inputValue ? "pr-[4.5rem]" : "pr-3",
            )}
            autoComplete="off"
          />
          {inputValue ? (
            <button
              type="button"
              className="absolute right-2 top-1/2 -translate-y-1/2 text-[13px] font-semibold text-[#1264a3] hover:underline dark:text-[#1d9bd1]"
              onMouseDown={(e) => {
                e.preventDefault();
                clearBlurDismiss();
                setInputValue("");
                setAppliedQuery("");
                setShowAllMedia(false);
                setSearchFocused(false);
              }}
            >
              Clear
            </button>
          ) : null}

          {showSearchDropdown ? (
            <div
              className="absolute left-0 right-0 top-[calc(100%+4px)] z-30 overflow-hidden rounded-lg border border-[#dddddd] bg-white shadow-lg dark:border-[#35373B] dark:bg-[#1A1D21]"
              onMouseDown={(e) => {
                e.preventDefault();
                clearBlurDismiss();
              }}
            >
              <button
                type="button"
                className="flex w-full cursor-pointer items-center justify-between gap-2 border-b border-[#eeeeee] px-3 py-2.5 text-left text-[14px] text-[#1d1c1d] hover:bg-[#f8f8f8] dark:border-[#35373B] dark:text-[#f9f8f9] dark:hover:bg-[#222529]"
                onClick={() => commitSearch(debouncedInput)}
              >
                <span className="flex min-w-0 items-center gap-2">
                  <FiSearch
                    className="shrink-0 text-[#616061] dark:text-[#ababad]"
                    size={16}
                  />
                  <span className="min-w-0 truncate">
                    Show results for:{" "}
                    <strong className="font-semibold">{debouncedInput.trim()}</strong>
                  </span>
                </span>
                <kbd className="shrink-0 rounded border border-[#c4c4c4] bg-[#f0f0f0] px-1.5 py-0.5 font-mono text-[11px] font-medium text-[#555] dark:border-[#555] dark:bg-[#2a2d31] dark:text-[#d1d2d3]">
                  Enter
                </kbd>
              </button>

              {previewSearchFetching && previewMatches.length === 0 ? (
                <div className="animate-pulse px-3 py-4 text-center text-[13px] text-[#616061] dark:text-[#ababad]">
                  Searching…
                </div>
              ) : previewMatches.length === 0 ? (
                <div className="px-3 py-4 text-center text-[13px] text-[#616061] dark:text-[#ababad]">
                  No files match this name in this channel.
                </div>
              ) : (
                <ul className="max-h-[min(280px,55vh)] overflow-y-auto py-1 sm:max-h-[min(320px,50vh)]">
                  {previewMatches.map(({ attachment }) => (
                    <li key={attachment.id}>
                      <button
                        type="button"
                        className="flex w-full cursor-pointer items-center gap-2 px-2 py-2 text-left hover:bg-[#f8f8f8] sm:gap-3 sm:px-3 dark:hover:bg-[#222529]"
                        onClick={() => commitSearch(debouncedInput)}
                      >
                        <div className="flex size-8 shrink-0 items-center justify-center rounded bg-[#f0f0f0] sm:size-9 dark:bg-[#2a2d31]">
                          {getFileIcon(attachment.name)}
                        </div>
                        <span className="min-w-0 flex-1 break-all text-left text-[13px] font-medium text-[#1d1c1d] sm:truncate sm:text-[14px] dark:text-[#f9f8f9]">
                          {attachment.name}
                        </span>
                      </button>
                    </li>
                  ))}
                </ul>
              )}
            </div>
          ) : null}
        </div>
      </div>

      <div className="flex min-h-0 min-w-0 flex-1 flex-col overflow-hidden pb-6">
        {allItems.length === 0 && !appliedQuery.trim() ? (
          <p className="px-1 py-8 text-center text-sm text-[#616061] dark:text-[#ababad] sm:text-[15px]">
            No files have been shared in this channel yet.
          </p>
        ) : appliedQuery.trim() && appliedSearchPending ? (
          <p className="animate-pulse px-1 py-8 text-center text-sm text-[#616061] dark:text-[#ababad] sm:text-[15px]">
            Searching…
          </p>
        ) : appliedQuery.trim() && layoutItems.length === 0 ? (
          <p className="px-1 py-8 text-center text-sm text-[#616061] dark:text-[#ababad] sm:text-[15px]">
            No files match your search.
          </p>
        ) : (
          <div className="flex min-h-0 min-w-0 flex-1 flex-col overflow-hidden">
            {mediaItems.length > 0 ? (
              <section className="mb-6 min-w-0 shrink-0 overflow-x-hidden sm:mb-8">
                <div className="mb-2 flex min-w-0 flex-col gap-2 sm:mb-3 sm:flex-row sm:flex-wrap sm:items-center sm:justify-between">
                  <h2 className="text-[12px] font-bold text-[#616061] dark:text-[#ababad] sm:text-[13px]">
                    Photos and videos
                  </h2>
                  {hasMoreMediaThanGrid ? (
                    <button
                      type="button"
                      onClick={() => setShowAllMedia((v) => !v)}
                      className="w-fit shrink-0 text-left text-[12px] font-semibold text-selection-hover hover:underline sm:text-[13px] dark:text-selection-hover! dark:hover:bg-transparent! dark:hover:text-selection-hover! hover:bg-transparent! hover:text-selection-hover!"
                    >
                      {showAllMedia ? "Show less" : "See all"}
                    </button>
                  ) : null}
                </div>
                <div className="grid w-full min-w-0 grid-cols-2 gap-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6">
                  {displayedMedia.map(({ attachment, message }) => {
                    const isVideo =
                      (attachment.type ?? "").toLowerCase() === "video";
                    return (
                      <div
                        key={attachment.id}
                        className="aspect-square min-h-[64px] min-w-0"
                      >
                        {isVideo ? (
                          <VideoPreview
                            message={message}
                            attachment={attachment}
                            compact
                          />
                        ) : (
                          <ImagePreview
                            message={message}
                            attachment={attachment}
                            compact
                          />
                        )}
                      </div>
                    );
                  })}
                </div>
              </section>
            ) : null}

            {documentItems.length > 0 ? (
              <h2 className="mb-1 shrink-0 text-[12px] font-bold text-[#616061] dark:text-[#ababad] sm:text-[13px]">
                Documents
              </h2>
            ) : null}

            <div className="min-h-0 min-w-0 flex-1">
              <Virtuoso
                style={{ height: "100%" }}
                className="min-w-0"
                data={documentItems}
                components={virtuosoComponents}
                defaultItemHeight={92}
                increaseViewportBy={{ top: 120, bottom: 240 }}
                atBottomThreshold={120}
                endReached={handleEndReached}
                computeItemKey={(_, item) => item.attachment.id}
                itemContent={(_, item) => (
                  <div className="min-w-0 w-full max-w-full pb-2">
                    <FilePreview
                      message={item.message}
                      attachment={item.attachment}
                      fromFilesTab={true}
                    />
                  </div>
                )}
              />
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
