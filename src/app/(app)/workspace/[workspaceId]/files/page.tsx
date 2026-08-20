'use client'

import FilePreview, { getFileIcon } from '@/components/attachment-previews/file-preview'
import FilterFilesSearchDialog, { type FilterValues } from '@/components/dialogs/filter-files-search-dialog'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover'
import { Skeleton } from '@/components/ui/skeleton'
import Typography from '@/components/ui/typography'
import { useSearchAttachments, type SearchAttachmentsFilters } from '@/hooks/use-attachments'
import { useDebouncedValue } from '@/hooks/use-debounce'
import { FILE_TYPES, SORT_OPTIONS } from '@/lib/file-filter-options'
import { cn } from '@/lib/utils'
import { useFileDetailStore } from '@/stores/useFileDetailStore'
import { endOfDay, startOfDay, subDays } from 'date-fns'
import { ChevronDown } from 'lucide-react'
import { useParams } from 'next/navigation'
import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { FiCheck, FiSearch } from 'react-icons/fi'
import { IoFilter } from "react-icons/io5"
import { LiaSlidersHSolid } from "react-icons/lia"
import { Virtuoso } from "react-virtuoso"
import { useAppTranslation } from '@/hooks/use-translation'

const DROPDOWN_MAX_ITEMS = 10;

const ALL_FILE_TYPE_IDS = FILE_TYPES.map((type) => type.id)

export default function AllFilesPage() {
  const params = useParams()
  const workspaceId = params.workspaceId as string
  const t = useAppTranslation('files')

  const [inputValue, setInputValue] = useState("");
  const [appliedQuery, setAppliedQuery] = useState("");
  const [searchFocused, setSearchFocused] = useState(false);
  const blurDismissRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const openFileDetail = useFileDetailStore((s) => s.open);

  const debouncedInput = useDebouncedValue(inputValue, 300);

  const [isFilterDialogOpen, setIsFilterDialogOpen] = useState(false)
  const [scope, setScope] = useState<'all' | 'created_by_me' | 'shared_with_me'>('all')
  const [selectedTypes, setSelectedTypes] = useState<string[]>(ALL_FILE_TYPE_IDS)
  const [openTypeFilters, setOpenTypeFilters] = useState(false)
  const [openSortPopover, setOpenSortPopover] = useState(false)
  const [sortBy, setSortBy] = useState<'recent_viewed' | 'last_updated'>('recent_viewed')

  const [filterValues, setFilterValues] = useState<FilterValues>({
    userIds: [],
    channelIds: [],
    conversationIds: [],
    dateRange: 'all-time'
  })

  const clearBlurDismiss = useCallback(() => {
    if (blurDismissRef.current !== null) {
      clearTimeout(blurDismissRef.current);
      blurDismissRef.current = null;
    }
  }, []);

  useEffect(() => {
    return () => clearBlurDismiss();
  }, [clearBlurDismiss]);

  const commitSearch = useCallback((raw: string) => {
    const t = raw.trim();
    setAppliedQuery(t);
    setInputValue(t);
    setSearchFocused(false);
    clearBlurDismiss();
  }, [clearBlurDismiss]);

  const filters: SearchAttachmentsFilters = useMemo(() => {
    const isAllTypesSelected = selectedTypes.length === FILE_TYPES.length
    const f: SearchAttachmentsFilters = {
      workspaceId,
      scope,
      categories: !isAllTypesSelected && selectedTypes.length > 0
        ? selectedTypes.join(',')
        : undefined,
      sort: sortBy,
      userIds: filterValues.userIds.length > 0 ? filterValues.userIds.join(',') : undefined,
      channelIds: filterValues.channelIds.length > 0 ? filterValues.channelIds.join(',') : undefined,
      conversationIds: filterValues.conversationIds.length > 0 ? filterValues.conversationIds.join(',') : undefined,
      name: appliedQuery.trim() || undefined,
      limit: 50,
    }

    if (appliedQuery.trim()) {
      // Backend search logic might need a query param, assuming it's handled via name filter or similar if available
      // For now, we'll assume the searchAttachmentsApi handles a 'search' param if we add it, 
      // but based on previous context it might just be filtering. 
      // Let's assume we can pass 'name' or similar if the API supports it.
    }

    if (filterValues.dateRange !== 'all-time') {
      const now = new Date()
      let from: Date | undefined
      switch (filterValues.dateRange) {
        case 'today': from = startOfDay(now); break
        case 'yesterday': from = startOfDay(subDays(now, 1)); break
        case 'last-7-days': from = subDays(now, 7); break
        case 'last-30-days': from = subDays(now, 30); break
        case 'last-90-days': from = subDays(now, 90); break
        case 'last-180-days': from = subDays(now, 180); break
        case 'last-365-days': from = subDays(now, 365); break
      }
      if (from) {
        f.dateFrom = from.toISOString()
        if (filterValues.dateRange === 'yesterday') {
          f.dateTo = endOfDay(subDays(now, 1)).toISOString()
        }
      }
    }
    return f
  }, [workspaceId, scope, selectedTypes, sortBy, filterValues, appliedQuery])

  const { data: files, isLoading } = useSearchAttachments(filters)

  const previewMatches = useMemo(() => {
    if (!debouncedInput.trim() || !files) return [];
    return files
      .filter(f => f.attachment.name.toLowerCase().includes(debouncedInput.toLowerCase()))
      .slice(0, DROPDOWN_MAX_ITEMS);
  }, [debouncedInput, files]);

  const toggleType = (id: string) => {
    setSelectedTypes(prev =>
      prev.includes(id) ? prev.filter(t => t !== id) : [...prev, id]
    )
  }

  const clearAllTypes = () => {
    setSelectedTypes([])
  }

  const isAllTypesSelected = selectedTypes.length === FILE_TYPES.length

  const activeFilterCount = useMemo(() => {
    let count = 0
    if (filterValues.userIds.length > 0) count++
    if (filterValues.channelIds.length > 0 || filterValues.conversationIds.length > 0) count++
    if (filterValues.dateRange !== 'all-time') count++
    return count
  }, [filterValues])

  return (
    <div className="flex h-full min-w-0 flex-col bg-white dark:bg-[#1A1D21]">
      <div className="mx-auto flex h-full w-full max-w-330 min-w-0 flex-col xl:px-4">
        {/* Header */}
        <div className="shrink-0 border-b border-[#dddddd] px-3 py-3 sm:px-4 sm:py-4 dark:border-[#35373B]">
          <Typography
            variant="h4"
            text={t('allFiles')}
            className="mb-3 text-[22px] font-bold sm:mb-4 sm:text-[28px]"
          />

          <div className="relative mb-4 z-20">
            <FiSearch className="absolute left-3 top-1/2 -translate-y-1/2 text-[#616061] dark:text-[#ababad]" size={18} />
            <Input
              placeholder={t('searchFiles')}
              value={inputValue}
              onChange={(e) => {
                setInputValue(e.target.value);
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
              className="h-10 pl-10 bg-transparent border-[#dddddd] dark:border-[#35373B]"
              autoComplete="off"
            />
            {inputValue && (
              <button
                type="button"
                className="absolute right-3 top-1/2 -translate-y-1/2 text-[13px] font-semibold text-[#1264a3] hover:underline dark:text-[#1d9bd1]"
                onMouseDown={(e) => {
                  e.preventDefault();
                  clearBlurDismiss();
                  setInputValue("");
                  setAppliedQuery("");
                  setSearchFocused(false);
                }}
              >
                {t('clear')}
              </button>
            )}

            {searchFocused && debouncedInput.trim().length > 0 && (
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
                    <FiSearch className="shrink-0 text-[#616061] dark:text-[#ababad]" size={16} />
                    <span className="min-w-0 truncate">
                      {t('showResultsFor')} <strong className="font-semibold">{debouncedInput.trim()}</strong>
                    </span>
                  </span>
                  <kbd className="shrink-0 rounded border border-[#c4c4c4] bg-[#f0f0f0] px-1.5 py-0.5 font-mono text-[11px] font-medium text-[#555] dark:border-[#555] dark:bg-[#2a2d31] dark:text-[#d1d2d3]">
                    Enter
                  </kbd>
                </button>

                {previewMatches.length === 0 ? (
                  <div className="px-3 py-4 text-center text-[13px] text-[#616061] dark:text-[#ababad]">
                    {t('noFilesMatch')}
                  </div>
                ) : (
                  <ul className="max-h-[300px] overflow-y-auto py-1">
                    {previewMatches.map((hit) => (
                      <li key={hit.attachment.id}>
                        <button
                          type="button"
                          className="flex w-full cursor-pointer items-center gap-3 px-3 py-2 text-left hover:bg-[#f8f8f8] dark:hover:bg-[#222529]"
                          onClick={() => commitSearch(debouncedInput)}
                        >
                          <div className="flex size-9 shrink-0 items-center justify-center rounded bg-[#f0f0f0] dark:bg-[#2a2d31]">
                            {getFileIcon(hit.attachment.name)}
                          </div>
                          <span className="min-w-0 flex-1 truncate text-[14px] font-medium text-[#1d1c1d] dark:text-[#f9f8f9]">
                            {hit.attachment.name}
                          </span>
                        </button>
                      </li>
                    ))}
                  </ul>
                )}
              </div>
            )}
          </div>

          <div className="flex flex-col gap-3 min-[905px]:flex-row min-[905px]:items-center min-[905px]:justify-between">
            <div className="-mx-3 overflow-x-auto px-3 sm:mx-0 sm:px-0">
              <div className="flex min-w-max items-center gap-1">
                {(['all', 'created_by_me', 'shared_with_me'] as const).map((s) => (
                  <Button
                    key={s}
                    variant={scope === s ? 'default' : 'outline'}
                    size="sm"
                    onClick={() => setScope(s)}
                    className={cn(
                      "h-8 whitespace-nowrap px-3 text-[13px] font-semibold",
                      scope === s && "bg-selection-hover! text-white",
                    )}
                  >
                    {s === 'all' ? t('all') : s === 'created_by_me' ? t('createdByYou') : t('sharedWithYou')}
                  </Button>
                ))}
              </div>
            </div>

            <div className="flex w-full flex-col gap-2 sm:w-auto sm:self-end sm:flex-row sm:justify-end min-[905px]:ml-auto min-[905px]:w-auto min-[905px]:flex-nowrap min-[905px]:items-center min-[905px]:justify-end">
              <Popover open={openTypeFilters} onOpenChange={setOpenTypeFilters}>
                <PopoverTrigger asChild>
                  <Button
                    variant="outline"
                    size="sm"
                    className={cn(
                      "h-8 justify-center gap-2 font-semibold sm:justify-between sm:px-3",
                      selectedTypes.length > 0
                        ? "bg-selection-hover text-white hover:bg-selection-hover! hover:text-white!"
                        : "bg-transparent text-inherit",
                    )}
                  >
                    <IoFilter size={14} />
                    <span className="truncate">
                      {isAllTypesSelected ? t('allTypes') : t('types', { count: selectedTypes.length })}
                    </span>
                    <ChevronDown
                      size={14}
                      className={cn(
                        "transition-transform duration-200",
                        openTypeFilters ? "rotate-180" : "rotate-0",
                      )}
                    />
                  </Button>
                </PopoverTrigger>
                <PopoverContent
                  withOverlay={true}
                  side="bottom"
                  align="end"
                  sideOffset={8}
                  className="w-56 py-2"
                  onOpenAutoFocus={(e) => e.preventDefault()}
                >
                  {FILE_TYPES.map((type) => (
                    <div
                      className={cn(
                        "flex items-center gap-2 px-2 py-1 hover:bg-selection-hover! hover:text-white cursor-pointer",
                        selectedTypes.includes(type.id) && "text-selection-hover",
                      )}
                      key={type.id}
                      onClick={() => toggleType(type.id)}

                    >
                      <input
                        id={`file-type-${type.id}`}
                        name={type.id}
                        type="checkbox"
                        checked={selectedTypes.includes(type.id)}
                        onChange={() => toggleType(type.id)}
                        className="size-3 cursor-pointer accent-selection-hover"
                      />
                      <Typography variant="p" text={type.label} />
                    </div>
                  ))}
                  <div className="mt-2 flex items-center justify-between gap-2 px-2">
                    <Button
                      variant="ghost"
                      size="sm"
                      className="h-7 px-2 text-xs text-red-500 hover:text-red-500"
                      onClick={clearAllTypes}
                    >
                      {t('clearAll')}
                    </Button>
                  </div>
                </PopoverContent>
              </Popover>

              <Popover open={openSortPopover} onOpenChange={setOpenSortPopover}>
                <PopoverTrigger asChild>
                  <Button
                    variant="outline"
                    size="sm"
                    className="h-8 justify-center gap-2 bg-selection-hover font-semibold text-white hover:bg-selection-hover! hover:text-white! sm:justify-between sm:px-3"
                  >
                    <span className="truncate">{t(SORT_OPTIONS.find(s => s.id === sortBy)?.labelKey ?? 'recentViewed')}</span>
                    <ChevronDown
                      size={14}
                      className={cn(
                        "transition-transform duration-200",
                        openSortPopover ? "rotate-180" : "rotate-0",
                      )}
                    />
                  </Button>
                </PopoverTrigger>
                <PopoverContent
                  withOverlay={true}
                  side="bottom"
                  align="end"
                  sideOffset={8}
                  className="w-56 py-2"
                  onOpenAutoFocus={(e) => e.preventDefault()}
                >
                  {SORT_OPTIONS.map((option) => (
                    <div
                      key={option.id}
                      onClick={() => {
                        setSortBy(option.id as 'recent_viewed' | 'last_updated')
                        setOpenSortPopover(false)
                      }}
                      className={cn(
                        "flex cursor-pointer items-center justify-between px-2 py-1 hover:bg-selection-hover hover:text-white",
                        sortBy === option.id && "bg-selection-hover text-white",
                      )}
                    >
                      <span className="text-sm font-medium">{t(option.labelKey)}</span>
                      {sortBy === option.id && <FiCheck size={14} className="text-white" />}
                    </div>
                  ))}
                </PopoverContent>
              </Popover>

              {/* <CustomSelect
              options={SORT_OPTIONS.map(option => ({
                value: option.id,
                label: option.label,
              }))}
              value={sortBy}
              onChange={(value) => setSortBy(value as 'recent_viewed' | 'last_updated')}
            /> */}

              <Button
                variant="outline"
                size="sm"
                className={cn(
                  "h-8 w-full justify-center gap-2 border-[#dddddd] dark:border-[#35373B] sm:w-[52px]",
                  activeFilterCount > 0 && "bg-selection-hover hover:bg-selection-hover! hover:text-white! text-white font-semibold",
                )}
                onClick={() => setIsFilterDialogOpen(true)}
              >
                <LiaSlidersHSolid size={20} />
                {activeFilterCount > 0 && <span className="text-xs font-bold">{activeFilterCount}</span>}
              </Button>
            </div>
          </div>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-3 sm:p-4">
          {isLoading ? (
            <div className="space-y-4">
              {[1, 2, 3, 4, 5].map((i) => (
                <Skeleton key={i} className="h-16 w-full" />
              ))}
            </div>
          ) : !files || files.length === 0 ? (
            <div className="flex h-full flex-col items-center justify-center text-center opacity-60">
              <Typography variant="p" text={t('noFilesFound')} className="text-lg font-medium" />
              <Typography variant="p" text={t('adjustFilters')} />
            </div>
          ) : (
            <div className="flex h-full flex-col">
              {files.length > 0 && (
                <div className="flex min-h-0 flex-1 flex-col">
                  <div className="flex-1">
                    <Virtuoso
                      style={{ height: "100%" }}
                      data={files}
                      itemContent={(_, hit) => (
                        <div
                          className="cursor-pointer pb-2"
                          onClick={() => openFileDetail({ attachment: hit.attachment, message: hit.message })}
                        >
                          <FilePreview attachment={hit.attachment} message={hit.message} fromFilesTab={true} />
                        </div>
                      )}
                    />
                  </div>
                </div>
              )}
            </div>
          )}
        </div>
      </div>

      <FilterFilesSearchDialog
        open={isFilterDialogOpen}
        onOpenChange={setIsFilterDialogOpen}
        workspaceId={workspaceId}
        initialFilters={filterValues}
        onApply={(vals) => setFilterValues(vals)}
      />
    </div>
  )
}
