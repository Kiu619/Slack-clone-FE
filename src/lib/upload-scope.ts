/**
 * UploadScope — module-level shared state cho upload files.
 *
 * Cho phép `useMessageComposer` (trong composer) và `UploadingAttachmentsProvider`
 * (trong MessageList) dùng CHUNG state mà không cần prop drilling.
 *
 * Mỗi instance useFileUpload có 1 scopeId duy nhất.
 * `registerComposerScope` ghi state vào Map.
 * `getComposerScopeState` đọc state từ Map.
 *
 * IMPORTANT: Chỉ dùng cho 1 composer tại 1 thời điểm (Slack-style: 1 composer mở tại 1 tab).
 */

import type { UploadingFile } from "@/hooks/use-file-upload"

type ScopeStateSetter = (files: UploadingFile[]) => void

const SCOPE_ID = "composer" // Dùng fixed ID vì chỉ có 1 composer active tại 1 thời điểm

const scopeState = new Map<string, UploadingFile[]>()
const scopeSetters = new Map<string, ScopeStateSetter>()

export function registerComposerScope(setState: ScopeStateSetter): void {
  scopeSetters.set(SCOPE_ID, setState)
  const current = scopeState.get(SCOPE_ID)
  if (current !== undefined) {
    setState(current)
  }
}

export function unregisterComposerScope(): void {
  scopeSetters.delete(SCOPE_ID)
}

export function setComposerScopeState(files: UploadingFile[]): void {
  scopeState.set(SCOPE_ID, files)
  const setter = scopeSetters.get(SCOPE_ID)
  if (setter) {
    setter(files)
  }
}

export function getComposerScopeState(): UploadingFile[] {
  return scopeState.get(SCOPE_ID) ?? []
}
