'use client'

import FilePreview, { getFileIcon } from '@/components/attachment-previews/file-preview'
import FilterFilesSearchDialog, { type FilterValues } from '@/components/dialogs/filter-files-search-dialog'
import { Button } from '@/components/ui/button'
import {
  DropdownMenu,
  DropdownMenuCheckboxItem,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { Input } from '@/components/ui/input'
import { Skeleton } from '@/components/ui/skeleton'
import Typography from '@/components/ui/typography'
import { useSearchAttachments, type SearchAttachmentsFilters } from '@/hooks/use-attachments'
import { useDebouncedValue } from '@/hooks/use-debounce'
import { cn } from '@/lib/utils'
import { useFileDetailStore } from '@/stores/useFileDetailStore'
import { endOfDay, startOfDay, subDays } from 'date-fns'
import { useParams } from 'next/navigation'
import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { FiCheck, FiChevronDown, FiSearch } from 'react-icons/fi'
import { IoFilter } from "react-icons/io5"
import { LiaSlidersHSolid } from "react-icons/lia"
import { Virtuoso } from "react-virtuoso"

const DROPDOWN_MAX_ITEMS = 10;

const FILE_TYPES = [
  { id: 'spreadsheet', label: 'Spreadsheets' },
  { id: 'presentation', label: 'Presentations' },
  { id: 'pdf', label: 'PDFs' },
  { id: 'audio', label: 'Audio' },
  { id: 'image', label: 'Images' },
  { id: 'video', label: 'Videos' },
  { id: 'code', label: 'Snippets' },
]

const SORT_OPTIONS = [
  { id: 'recent_viewed', label: 'Recently viewed' },
  { id: 'last_updated', label: 'Last updated' },
]

export default function AllFilesPage() {
  const params = useParams()
  const workspaceId = params.workspaceId as string

  const [inputValue, setInputValue] = useState("");
  const [appliedQuery, setAppliedQuery] = useState("");
  const [searchFocused, setSearchFocused] = useState(false);
  const blurDismissRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const openFileDetail = useFileDetailStore((s) => s.open);

  const debouncedInput = useDebouncedValue(inputValue, 300);

  const [isFilterDialogOpen, setIsFilterDialogOpen] = useState(false)
  const [scope, setScope] = useState<'all' | 'created_by_me' | 'shared_with_me'>('all')
  const [selectedTypes, setSelectedTypes] = useState<string[]>([])
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
    const f: SearchAttachmentsFilters = {
      workspaceId,
      scope,
      categories: selectedTypes.length > 0 ? selectedTypes.join(',') : undefined,
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

  const activeFilterCount = useMemo(() => {
    let count = 0
    if (filterValues.userIds.length > 0) count++
    if (filterValues.channelIds.length > 0 || filterValues.conversationIds.length > 0) count++
    if (filterValues.dateRange !== 'all-time') count++
    return count
  }, [filterValues])

  return (
    <div className="flex h-full flex-col bg-white dark:bg-[#1A1D21]">
      {/* Header */}
      <div className="shrink-0 border-b border-[#dddddd] px-4 py-4 dark:border-[#35373B]">
        <Typography variant="h4" text="All files" className="mb-4 font-bold" />
        
        <div className="relative mb-4 z-20">
          <FiSearch className="absolute left-3 top-1/2 -translate-y-1/2 text-[#616061] dark:text-[#ababad]" size={18} />
          <Input
            placeholder="Search files"
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
              Clear
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
                    Show results for: <strong className="font-semibold">{debouncedInput.trim()}</strong>
                  </span>
                </span>
                <kbd className="shrink-0 rounded border border-[#c4c4c4] bg-[#f0f0f0] px-1.5 py-0.5 font-mono text-[11px] font-medium text-[#555] dark:border-[#555] dark:bg-[#2a2d31] dark:text-[#d1d2d3]">
                  Enter
                </kbd>
              </button>

              {previewMatches.length === 0 ? (
                <div className="px-3 py-4 text-center text-[13px] text-[#616061] dark:text-[#ababad]">
                  No files match this name.
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

        <div className="flex flex-wrap items-center justify-between gap-2">
          <div className="flex items-center gap-1">
            {['all', 'created_by_me', 'shared_with_me'].map((s) => (
              <Button 
                key={s}
                variant={scope === s ? 'default' : 'outline'} 
                size="sm" 
                onClick={() => setScope(s as 'all' | 'created_by_me' | 'shared_with_me')}
                className={cn("h-8 px-3 text-[13px] font-semibold", scope === s && "bg-selection-hover text-white")}
              >
                {s === 'all' ? 'All' : s === 'created_by_me' ? 'Created by you' : 'Shared with you'}
              </Button>
            ))}
          </div>

          <div className="flex items-center gap-2">
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="outline" size="sm" className="h-8 gap-2 bg-selection-hover hover:bg-selection-hover! hover:text-white! text-white font-semibold">
                  <IoFilter size={14} />
                  <span>{selectedTypes.length > 0 ? `${selectedTypes.length} Types` : 'All Types'}</span>
                  <FiChevronDown size={14} />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-56">
                {FILE_TYPES.map((type) => (
                  <DropdownMenuCheckboxItem
                    key={type.id}
                    // checked={selectedTypes.includes(type.id)}
                    onCheckedChange={() => toggleType(type.id)}
                    className={cn("justify-between hover:bg-selection-hover! hover:text-white", selectedTypes.includes(type.id) && "bg-selection-hover text-white")}
                  >
                    {type.label}
                    {selectedTypes.includes(type.id) && <FiCheck size={14} className="text-white" />}
                  </DropdownMenuCheckboxItem>
                ))}
                {selectedTypes.length > 0 && (
                  <>
                    <DropdownMenuSeparator />
                    <DropdownMenuItem 
                      className="justify-center text-red-500 focus:text-red-500"
                      onClick={() => setSelectedTypes([])}
                    >
                      Reset Filters
                    </DropdownMenuItem>
                  </>
                )}
              </DropdownMenuContent>
            </DropdownMenu>

            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="outline" size="sm" className="h-8 gap-2 bg-selection-hover hover:bg-selection-hover! hover:text-white! text-white font-semibold">
                  <span>{SORT_OPTIONS.find(s => s.id === sortBy)?.label}</span>
                  <FiChevronDown size={14} />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-48">
                {SORT_OPTIONS.map((option) => (
                  <DropdownMenuItem
                    key={option.id}
                    onClick={() => setSortBy(option.id as 'recent_viewed' | 'last_updated')}
                    className={cn("justify-between hover:bg-selection-hover! hover:text-white", sortBy === option.id && "bg-selection-hover text-white")}
                  >
                    {option.label}
                    {sortBy === option.id && <FiCheck size={14} className="text-white" />}
                  </DropdownMenuItem>
                ))}
              </DropdownMenuContent>
            </DropdownMenu>

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
              className={cn("h-8 gap-2 border-[#dddddd] dark:border-[#35373B]", activeFilterCount > 0 && "bg-selection-hover hover:bg-selection-hover! hover:text-white! text-white font-semibold")}
              onClick={() => setIsFilterDialogOpen(true)}
            >
              <LiaSlidersHSolid size={20} />
              {activeFilterCount > 0 && <span className="text-xs font-bold">{activeFilterCount}</span>}
            </Button>
          </div>
        </div>
      </div>

      {/* Content */}
      <div className="flex-1 overflow-y-auto p-4">
        {isLoading ? (
          <div className="space-y-4">
            {[1, 2, 3, 4, 5].map((i) => (
              <Skeleton key={i} className="h-16 w-full" />
            ))}
          </div>
        ) : !files || files.length === 0 ? (
          <div className="flex h-full flex-col items-center justify-center text-center opacity-60">
            <Typography variant="p" text="No files found" className="text-lg font-medium" />
            <Typography variant="p" text="Try adjusting your filters or search terms" />
          </div>
        ) : (
          <div className="flex flex-col h-full">
            {files.length > 0 && (
              <div className="flex-1 flex flex-col min-h-0">
                <div className="flex-1">
                  <Virtuoso
                    style={{ height: "100%" }}
                    data={files}
                    itemContent={(_, hit) => (
                      <div 
                        className="pb-2 cursor-pointer"
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
