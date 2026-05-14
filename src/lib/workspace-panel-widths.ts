/** Các cột side panel trái (cùng vùng resize) trong workspace shell. */
export const WORKSPACE_SIDE_PANEL_IDS = [
  'workspace',
  'dms',
  'later',
  'files',
  'activity',
] as const

export type WorkspaceSidePanelId = (typeof WORKSPACE_SIDE_PANEL_IDS)[number]

export type WorkspacePanelInitialWidths = {
  sidePanelWidths: Record<WorkspaceSidePanelId, number>
  fileDetailWidth: number
  profilePanelWidth: number
}

const DEFAULT_SIDE = 260
const DEFAULT_FILE = 410
const DEFAULT_PROFILE = 420

export const DEFAULT_SIDE_PANEL_WIDTHS: Record<WorkspaceSidePanelId, number> = {
  workspace: DEFAULT_SIDE,
  dms: DEFAULT_SIDE,
  later: DEFAULT_SIDE,
  files: DEFAULT_SIDE,
  activity: DEFAULT_SIDE,
}

export const DEFAULT_PANEL_WIDTHS: WorkspacePanelInitialWidths = {
  sidePanelWidths: { ...DEFAULT_SIDE_PANEL_WIDTHS },
  fileDetailWidth: DEFAULT_FILE,
  profilePanelWidth: DEFAULT_PROFILE,
}

/** Khớp thứ tự ưu tiên với `workspace-shell` (route cụ thể trước). */
export const getWorkspaceSidePanelIdFromPathname = (
  pathname: string,
): WorkspaceSidePanelId => {
  if (pathname.includes('/dms')) return 'dms'
  if (pathname.includes('/later')) return 'later'
  if (pathname.includes('/files')) return 'files'
  if (pathname.includes('/activity')) return 'activity'
  return 'workspace'
}

type LegacyCookieShape = {
  sidebarWidth?: unknown
  fileDetailWidth?: unknown
  profilePanelWidth?: unknown
}

type NewCookieShape = {
  sidePanelWidths?: unknown
  fileDetailWidth?: unknown
  profilePanelWidth?: unknown
}

function pickSidePanelWidths(v: unknown): Record<WorkspaceSidePanelId, number> {
  const out = { ...DEFAULT_SIDE_PANEL_WIDTHS }
  if (typeof v !== 'object' || v === null) return out
  const o = v as Record<string, unknown>
  for (const id of WORKSPACE_SIDE_PANEL_IDS) {
    const n = o[id]
    if (typeof n === 'number') out[id] = n
  }
  return out
}

export function parsePanelWidthsCookie(
  raw: string | undefined,
): WorkspacePanelInitialWidths {
  if (!raw) return DEFAULT_PANEL_WIDTHS
  try {
    const parsed = JSON.parse(raw) as unknown
    if (typeof parsed !== 'object' || parsed === null) return DEFAULT_PANEL_WIDTHS

    const p = parsed as NewCookieShape
    const fileDetailWidth =
      typeof p.fileDetailWidth === 'number' ? p.fileDetailWidth : DEFAULT_FILE
    const profilePanelWidth =
      typeof p.profilePanelWidth === 'number' ? p.profilePanelWidth : DEFAULT_PROFILE

    const legacy = parsed as LegacyCookieShape
    if (
      typeof legacy.sidebarWidth === 'number' &&
      !('sidePanelWidths' in (parsed as object))
    ) {
      const w = legacy.sidebarWidth
      return {
        sidePanelWidths: {
          workspace: w,
          dms: w,
          later: w,
          files: w,
          activity: w,
        },
        fileDetailWidth:
          typeof legacy.fileDetailWidth === 'number' ? legacy.fileDetailWidth : DEFAULT_FILE,
        profilePanelWidth:
          typeof legacy.profilePanelWidth === 'number'
            ? legacy.profilePanelWidth
            : DEFAULT_PROFILE,
      }
    }

    if ('sidePanelWidths' in parsed) {
      return {
        sidePanelWidths: pickSidePanelWidths((parsed as NewCookieShape).sidePanelWidths),
        fileDetailWidth,
        profilePanelWidth,
      }
    }
  } catch {
    // cookie hỏng
  }
  return DEFAULT_PANEL_WIDTHS
}
