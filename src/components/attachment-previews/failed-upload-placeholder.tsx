"use client";

import { LuCircleAlert, LuRefreshCw } from "react-icons/lu";
import { cn } from "@/lib/utils";

interface FailedUploadPlaceholderProps {
  /** Loại file để render icon tương ứng (image/video/audio/file). */
  variant?: "image" | "video" | "audio" | "file";
  /** File name hiển thị cho file variants. */
  fileName?: string;
  /** Error message hiển thị dưới tên file. */
  error?: string;
  /** Callback khi user nhấn Retry. */
  onRetry?: () => void;
  /** Class bổ sung để khớp layout với preview component gốc. */
  className?: string;
  /** Width của placeholder (dùng cho image/video preview). */
  width?: number | string;
  /** Height của placeholder. */
  height?: number | string;
}

/**
 * Placeholder hiển thị khi attachment upload FAIL.
 *
 * Khác với UploadingPlaceholder (spinner vô hạn), component này render:
 * - Icon cảnh báo đỏ (LuCircleAlert)
 * - Tên file + error message
 * - Nút Retry để user thử upload lại
 *
 * Dùng cho cả preview component (image/video/audio/file) khi
 * `!attachment.url && attachment.uploadStatus === "failed"`.
 */
export function FailedUploadPlaceholder({
  variant = "file",
  fileName,
  error,
  onRetry,
  className,
  width,
  height,
}: FailedUploadPlaceholderProps) {
  const isMedia = variant === "image" || variant === "video"

  if (isMedia) {
    return (
      <div
        className={cn(
          "relative flex flex-col items-center justify-center gap-2 rounded-lg border border-red-500/40 bg-red-950/30",
          className,
        )}
        style={{
          width: width ?? 220,
          height: height ?? 140,
          minWidth: 120,
          minHeight: 80,
        }}
      >
        <LuCircleAlert className="h-6 w-6 text-red-400" />
        <div className="text-xs font-medium text-red-200">
          {variant === "image" ? "Tải ảnh lên thất bại" : "Tải video lên thất bại"}
        </div>
        {fileName ? (
          <div className="max-w-[180px] truncate px-2 text-[11px] text-red-200/80">
            {fileName}
          </div>
        ) : null}
        {onRetry ? (
          <button
            type="button"
            onClick={onRetry}
            className="mt-0.5 flex items-center gap-1 rounded-md bg-red-500/20 px-2 py-1 text-[11px] font-medium text-red-100 hover:bg-red-500/30"
          >
            <LuRefreshCw className="h-3 w-3" />
            Thử lại
          </button>
        ) : null}
      </div>
    )
  }

  return (
    <div
      className={cn(
        "group relative flex items-center max-w-[400px] gap-3 p-3 rounded-lg border border-red-500/40 bg-red-50 dark:bg-red-950/30",
        className,
      )}
    >
      <div className="shrink-0 w-10 h-10 flex items-center justify-center rounded bg-red-500/15 overflow-hidden">
        <LuCircleAlert className="w-5 h-5 text-red-500" />
      </div>
      <div className="flex-1 min-w-0">
        <p className="text-sm font-medium text-red-900 dark:text-red-100 truncate">
          {fileName ?? "Tải tệp lên thất bại"}
        </p>
        <p className="text-xs text-red-700/80 dark:text-red-300/80 truncate">
          {error ?? "Đã có lỗi xảy ra khi tải lên"}
        </p>
      </div>
      {onRetry ? (
        <button
          type="button"
          onClick={onRetry}
          className="shrink-0 flex items-center gap-1 rounded-md bg-red-500/15 px-2 py-1 text-xs font-medium text-red-700 hover:bg-red-500/25 dark:text-red-200 dark:bg-red-500/20 dark:hover:bg-red-500/30"
        >
          <LuRefreshCw className="h-3 w-3" />
          Thử lại
        </button>
      ) : null}
    </div>
  )
}
