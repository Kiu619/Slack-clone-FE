'use client'

import Cookies from 'js-cookie'
import { flushSync } from 'react-dom'
import type { RefObject } from 'react'
import { useCallback, useLayoutEffect, useRef, useState } from 'react'
import type {
  WorkspacePanelInitialWidths,
  WorkspaceSidePanelId,
} from '@/lib/workspace-panel-widths'

export type WorkspacePanelResizeType = 'sidebar' | 'file-detail' | 'profile'

export type { WorkspacePanelInitialWidths, WorkspaceSidePanelId } from '@/lib/workspace-panel-widths'

export type WorkspacePanelResizeRefs = {
  sidebar: RefObject<HTMLElement | null>
  fileDetail: RefObject<HTMLElement | null>
  profile: RefObject<HTMLElement | null>
}

type UseWorkspacePanelResizeParams = {
  workspaceId: string
  initialWidths: WorkspacePanelInitialWidths
  activeSidePanelId: WorkspaceSidePanelId
  panelRefs: WorkspacePanelResizeRefs
}

type WidthsMirror = {
  side: Record<WorkspaceSidePanelId, number>
  file: number
  profile: number
}

export const useWorkspacePanelResize = ({
  workspaceId,
  initialWidths,
  activeSidePanelId,
  panelRefs,
}: UseWorkspacePanelResizeParams) => {
  const [sidePanelWidths, setSidePanelWidths] = useState(
    initialWidths.sidePanelWidths,
  )
  const [fileDetailWidth, setFileDetailWidth] = useState(initialWidths.fileDetailWidth)
  const [profilePanelWidth, setProfilePanelWidth] = useState(
    initialWidths.profilePanelWidth,
  )

  /** Khi true: mirror chỉ do pointer, không đồng bộ ngược từ state (tránh ghi đè giữa chừng). */
  const isPointerDraggingRef = useRef(false)

  const widthsMirrorRef = useRef<WidthsMirror>({
    side: initialWidths.sidePanelWidths,
    file: initialWidths.fileDetailWidth,
    profile: initialWidths.profilePanelWidth,
  })

  useLayoutEffect(() => {
    if (isPointerDraggingRef.current) return
    widthsMirrorRef.current = {
      side: sidePanelWidths,
      file: fileDetailWidth,
      profile: profilePanelWidth,
    }
  }, [sidePanelWidths, fileDetailWidth, profilePanelWidth])

  const activeSidePanelIdRef = useRef(activeSidePanelId)
  useLayoutEffect(() => {
    activeSidePanelIdRef.current = activeSidePanelId
  }, [activeSidePanelId])

  const [dragResizeKind, setDragResizeKind] = useState<WorkspacePanelResizeType | null>(
    null,
  )

  const saveWidthsToCookie = useCallback(
    (
      nextSide: Record<WorkspaceSidePanelId, number>,
      file: number,
      profile: number,
    ) => {
      Cookies.set(
        `panel-widths-${workspaceId}`,
        JSON.stringify({
          sidePanelWidths: nextSide,
          fileDetailWidth: file,
          profilePanelWidth: profile,
        }),
        { expires: 365, path: '/' },
      )
    },
    [workspaceId],
  )

  const isResizing = useRef<WorkspacePanelResizeType | null>(null)
  const moveRafRef = useRef(0)
  const pendingMoveRef = useRef<MouseEvent | null>(null)

  const panelRefsPropRef = useRef(panelRefs)
  useLayoutEffect(() => {
    panelRefsPropRef.current = panelRefs
  }, [panelRefs])

  const handleMouseMoveRef = useRef<(e: MouseEvent) => void>(() => {})
  const handleMouseMove = useCallback(
    (e: MouseEvent) => {
      if (!isResizing.current) return

      const refs = panelRefsPropRef.current

      if (isResizing.current === 'sidebar') {
        const newWidth = e.clientX - 70
        if (newWidth > 320 && newWidth < 500) {
          const id = activeSidePanelIdRef.current
          const next = { ...widthsMirrorRef.current.side, [id]: newWidth }
          widthsMirrorRef.current = { ...widthsMirrorRef.current, side: next }
          const el = refs.sidebar.current
          if (el) el.style.width = `${newWidth}px`
        }
      } else if (isResizing.current === 'file-detail') {
        const newWidth = window.innerWidth / window.devicePixelRatio - e.clientX
        if (newWidth > 310 && newWidth < 400) {
          widthsMirrorRef.current = { ...widthsMirrorRef.current, file: newWidth }
          const el = refs.fileDetail.current
          if (el) el.style.width = `${newWidth}px`
        }
      } else if (isResizing.current === 'profile') {
        const newWidth = window.innerWidth / window.devicePixelRatio - e.clientX
        if (newWidth > 410 && newWidth < 500) {
          widthsMirrorRef.current = { ...widthsMirrorRef.current, profile: newWidth }
          const el = refs.profile.current
          if (el) el.style.width = `${newWidth}px`
        }
      }
    },
    [],
  )

  useLayoutEffect(() => {
    handleMouseMoveRef.current = handleMouseMove
  }, [handleMouseMove])

  const scheduleMove = useCallback((e: MouseEvent) => {
    pendingMoveRef.current = e
    if (moveRafRef.current !== 0) return
    moveRafRef.current = requestAnimationFrame(() => {
      moveRafRef.current = 0
      const ev = pendingMoveRef.current
      if (ev) handleMouseMoveRef.current(ev)
    })
  }, [])

  const flushPendingMove = useCallback(() => {
    if (moveRafRef.current !== 0) {
      cancelAnimationFrame(moveRafRef.current)
      moveRafRef.current = 0
    }
    const ev = pendingMoveRef.current
    if (ev) handleMouseMoveRef.current(ev)
    pendingMoveRef.current = null
  }, [])

  const stableMouseMove = useCallback(
    (e: MouseEvent) => {
      scheduleMove(e)
    },
    [scheduleMove],
  )

  const stopResizingRef = useRef<(() => void) | null>(null)
  const stopResizing = useCallback(() => {
    flushPendingMove()
    const type = isResizing.current
    isResizing.current = null
    document.removeEventListener('mousemove', stableMouseMove)
    const onUp = stopResizingRef.current
    if (onUp) document.removeEventListener('mouseup', onUp)
    document.body.style.cursor = 'default'
    document.body.style.userSelect = 'auto'

    if (type) {
      const { side, file, profile } = widthsMirrorRef.current
      isPointerDraggingRef.current = false
      setDragResizeKind(null)
      setSidePanelWidths(side)
      setFileDetailWidth(file)
      setProfilePanelWidth(profile)
      saveWidthsToCookie(side, file, profile)
    } else {
      isPointerDraggingRef.current = false
      setDragResizeKind(null)
    }
  }, [stableMouseMove, flushPendingMove, saveWidthsToCookie])

  useLayoutEffect(() => {
    stopResizingRef.current = stopResizing
  }, [stopResizing])

  const seedDomWidth = useCallback((type: WorkspacePanelResizeType) => {
    const refs = panelRefsPropRef.current
    const m = widthsMirrorRef.current
    if (type === 'sidebar') {
      const el = refs.sidebar.current
      const id = activeSidePanelIdRef.current
      if (el) el.style.width = `${m.side[id]}px`
    } else if (type === 'file-detail') {
      const el = refs.fileDetail.current
      if (el) el.style.width = `${m.file}px`
    } else {
      const el = refs.profile.current
      if (el) el.style.width = `${m.profile}px`
    }
  }, [])

  const startResizing = useCallback(
    (type: WorkspacePanelResizeType) => {
      isPointerDraggingRef.current = true
      flushSync(() => {
        setDragResizeKind(type)
      })
      isResizing.current = type
      pendingMoveRef.current = null
      seedDomWidth(type)
      document.addEventListener('mousemove', stableMouseMove)
      document.addEventListener('mouseup', stopResizing)
      document.body.style.cursor = 'col-resize'
      document.body.style.userSelect = 'none'
    },
    [stableMouseMove, stopResizing, seedDomWidth],
  )

  const sidebarWidth = sidePanelWidths[activeSidePanelId]

  return {
    sidebarWidth,
    fileDetailWidth,
    profilePanelWidth,
    startResizing,
    dragResizeKind,
  }
}
