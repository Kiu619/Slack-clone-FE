"use client"

import { LuLoader, LuRefreshCw } from "react-icons/lu"

interface UploadStatusOverlayProps {
  status?: "uploading" | "failed" | "pending" | null
  onRetry?: () => void
}

/**
 * UploadStatusOverlay — hiển thị spinner hoặc Retry overlay trên attachment bubble.
 *
 * - uploading: spinner xoay ở góc trên-phải.
 * - failed: overlay đỏ mờ + nút Retry.
 * - pending / undefined / null: không render gì.
 *
 * Đặt bên trong container có `position: relative`.
 */
export function UploadStatusOverlay({
  status,
  onRetry,
}: UploadStatusOverlayProps) {
  if (status === "uploading") {
    return (
      <div className="absolute top-1.5 right-1.5 z-10 flex h-5 w-5 items-center justify-center rounded-full bg-black/60 backdrop-blur-sm">
        <LuLoader className="h-3 w-3 animate-spin text-white" />
      </div>
    )
  }

  if (status === "failed") {
    return (
      <button
        type="button"
        onClick={onRetry}
        className="absolute inset-0 z-10 flex flex-col items-center justify-center gap-1 rounded-lg bg-red-500/20 backdrop-blur-sm transition-colors hover:bg-red-500/30"
        title="Retry upload"
      >
        <LuRefreshCw className="h-4 w-4 text-red-400" />
        <span className="text-[10px] font-medium text-red-400">Retry</span>
      </button>
    )
  }

  return null
}
