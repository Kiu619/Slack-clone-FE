"use client"

import Typography from "@/components/ui/typography"
import {
  SearchResultsSkeleton,
  WorkspacePanelSkeleton,
} from "@/components/loading-skeletons"
import { useGlobalSearchStore } from "@/stores/useGlobalSearchStore"
import { useMainPanelStore } from "@/stores/useMainPanelStore"
import { useThreadPanelStore } from "@/stores/useThreadPanelStore"
import dynamic from "next/dynamic"
import { useEffect, useMemo, useState } from "react"
import { SearchTypeSelect } from "./search-type-select"

type SearchType = "messages" | "dms" | "files" | "channels"

const DEFAULT_SPLIT_LEFT_WIDTH = 460

const WorkspaceMessageSearchPanel = dynamic(
  () =>
    import("./workspace-message-search-panel").then(
      (mod) => mod.WorkspaceMessageSearchPanel,
    ),
  {
    ssr: false,
    loading: () => <SearchResultsSkeleton titleWidth="w-40" resultCount={6} />,
  },
)

const WorkspaceDmSearchPanel = dynamic(
  () =>
    import("./workspace-dm-search-panel").then(
      (mod) => mod.WorkspaceDmSearchPanel,
    ),
  {
    ssr: false,
    loading: () => <SearchResultsSkeleton titleWidth="w-36" resultCount={6} />,
  },
)

const WorkspaceFilesSearchPanel = dynamic(
  () =>
    import("./workspace-files-search-panel").then(
      (mod) => mod.WorkspaceFilesSearchPanel,
    ),
  {
    ssr: false,
    loading: () => <SearchResultsSkeleton titleWidth="w-36" resultCount={6} />,
  },
)

const WorkspaceChannelSearchPanel = dynamic(
  () =>
    import("./workspace-channel-search-panel").then(
      (mod) => mod.WorkspaceChannelSearchPanel,
    ),
  {
    ssr: false,
    loading: () => <SearchResultsSkeleton titleWidth="w-40" resultCount={6} />,
  },
)

const ChannelView = dynamic(() => import("@/modules/channels/channel-view"), {
  ssr: false,
  loading: () => (
    <WorkspacePanelSkeleton titleWidth="w-44" rowCount={5} includeComposer />
  ),
})

const DMView = dynamic(() => import("@/modules/direct-messages/dm-view"), {
  ssr: false,
  loading: () => (
    <WorkspacePanelSkeleton titleWidth="w-44" rowCount={5} includeComposer />
  ),
})

export function WorkspaceGlobalSearch({ workspaceId }: { workspaceId: string }) {
  const query = useGlobalSearchStore((state) => state.query)
  const [searchTypeOpen, setSearchTypeOpen] = useState(false)
  const [searchBy, setSearchBy] = useState<SearchType>("messages")
  const [leftWidth, setLeftWidth] = useState(DEFAULT_SPLIT_LEFT_WIDTH)
  const [previewContext, setPreviewContext] = useState<string | null>(null)

  const mainPanelView = useMainPanelStore((state) => state.view)
  const mainActiveSearchResultId = useMainPanelStore(
    (state) => state.activeSearchResultId,
  )
  const setMainActiveSearchResultId = useMainPanelStore(
    (state) => state.setActiveSearchResultId,
  )

  const threadActiveSearchResultId = useThreadPanelStore(
    (state) => state.activeSearchResultId,
  )
  const setThreadActiveSearchResultId = useThreadPanelStore(
    (state) => state.setActiveSearchResultId,
  )
  const isThreadOpen = useThreadPanelStore((state) => state.isOpen)

  const activeResultId = threadActiveSearchResultId ?? mainActiveSearchResultId
  const hasMainPreview =
    mainPanelView.type === "channel" || mainPanelView.type === "dm"
  const currentSearchContext = `${searchBy}:${query.trim()}`
  const showSplitView =
    searchBy !== "files" && previewContext === currentSearchContext && hasMainPreview

  const searchTitle = useMemo(
    () => (query.trim() ? `Search: ${query.trim()}` : "Search:"),
    [query],
  )

  useEffect(() => {
    setMainActiveSearchResultId(null)
    setThreadActiveSearchResultId(null)
  }, [searchBy, query, setMainActiveSearchResultId, setThreadActiveSearchResultId])

  useEffect(() => {
    if (isThreadOpen) return
    if (!threadActiveSearchResultId) return
    setThreadActiveSearchResultId(null)
  }, [isThreadOpen, threadActiveSearchResultId, setThreadActiveSearchResultId])

  const startResize = (event: React.MouseEvent<HTMLDivElement>) => {
    event.preventDefault()
    const onMove = (moveEvent: MouseEvent) => {
      const next = Math.min(Math.max(moveEvent.clientX - 70, 360), 680)
      setLeftWidth(next)
    }
    const onUp = () => {
      window.removeEventListener("mousemove", onMove)
      window.removeEventListener("mouseup", onUp)
      document.body.style.cursor = "default"
      document.body.style.userSelect = "auto"
    }
    window.addEventListener("mousemove", onMove)
    window.addEventListener("mouseup", onUp)
    document.body.style.cursor = "col-resize"
    document.body.style.userSelect = "none"
  }

  const searchBody =
    searchBy === "messages" ? (
        <WorkspaceMessageSearchPanel
        workspaceId={workspaceId}
        activeResultId={activeResultId}
        onSelectMainResult={(id) => {
          setPreviewContext(currentSearchContext)
          setMainActiveSearchResultId(id)
          setThreadActiveSearchResultId(null)
        }}
        onSelectThreadResult={(id) => {
          setPreviewContext(currentSearchContext)
          setThreadActiveSearchResultId(id)
          setMainActiveSearchResultId(null)
        }}
        typeSelect={
          <SearchTypeSelect
            value={searchBy}
            open={searchTypeOpen}
            onOpenChange={setSearchTypeOpen}
            onChange={setSearchBy}
          />
        }
      />
    ) : searchBy === "dms" ? (
      <WorkspaceDmSearchPanel
        workspaceId={workspaceId}
        activeResultId={activeResultId}
        onSelectResult={(id) => {
          setPreviewContext(currentSearchContext)
          setMainActiveSearchResultId(id)
          setThreadActiveSearchResultId(null)
        }}
        typeSelect={
          <SearchTypeSelect
            value={searchBy}
            open={searchTypeOpen}
            onOpenChange={setSearchTypeOpen}
            onChange={setSearchBy}
          />
        }
      />
    ) : searchBy === "files" ? (
      <WorkspaceFilesSearchPanel
        workspaceId={workspaceId}
        typeSelect={
          <SearchTypeSelect
            value={searchBy}
            open={searchTypeOpen}
            onOpenChange={setSearchTypeOpen}
            onChange={setSearchBy}
          />
        }
      />
    ) : (
      <WorkspaceChannelSearchPanel
        workspaceId={workspaceId}
        activeResultId={activeResultId}
        onSelectResult={(id) => {
          setPreviewContext(currentSearchContext)
          setMainActiveSearchResultId(id)
          setThreadActiveSearchResultId(null)
        }}
        typeSelect={
          <SearchTypeSelect
            value={searchBy}
            open={searchTypeOpen}
            onOpenChange={setSearchTypeOpen}
            onChange={setSearchBy}
          />
        }
      />
    )

  if (!showSplitView) {
    return (
      <div className="flex h-full min-h-0 flex-1 min-w-0 flex-col overflow-hidden bg-white dark:bg-[#1A1D21]">
        <div className="mx-auto flex h-full min-h-0 w-full max-w-330 min-w-0 flex-col xl:px-4 px-3">
          <Typography text={searchTitle} />
          <div className="flex min-h-0 flex-1 flex-col overflow-hidden">{searchBody}</div>
        </div>
      </div>
    )
  }

  return (
    <div className="flex h-full min-h-0 min-w-0 overflow-hidden bg-white dark:bg-[#1A1D21]">
      <div
        className="flex min-h-0 shrink-0 flex-col overflow-hidden px-4 py-2"
        style={{ width: leftWidth }}
      >
        <div className="mx-auto flex h-full min-h-0 w-full max-w-330 min-w-0 flex-col">
          <Typography text={searchTitle} />
          <div className="flex min-h-0 flex-1 flex-col overflow-hidden">{searchBody}</div>
        </div>
      </div>
      <div
        className="w-0.5 hover:w-1 cursor-col-resize hover:bg-sky-500/50 transition-colors z-10"
        onMouseDown={startResize}
      />
      <div className="min-h-0 min-w-0 flex-1 overflow-hidden border-l border-[#797c814d] bg-white dark:bg-[#1A1D21]">
        <div className="h-full min-h-0">
          {mainPanelView.type === "channel" ? (
            <ChannelView channelId={mainPanelView.channelId} workspaceId={workspaceId} />
          ) : mainPanelView.type === "dm" ? (
            <DMView
              conversationId={mainPanelView.conversationId}
              workspaceId={workspaceId}
            />
          ) : null}
        </div>
      </div>
    </div>
  )
}
