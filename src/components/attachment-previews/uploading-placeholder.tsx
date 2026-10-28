"use client";

import { LuLoader } from "react-icons/lu";
import { cn } from "@/lib/utils";

export type UploadingPlaceholderVariant =
  | "image"
  | "video"
  | "audio"
  | "file"
  | "office"
  | "pdf"
  | "code";

interface UploadingPlaceholderProps {
  /**
   * Loại file để render kích thước/UI phù hợp với preview component tương ứng.
   * - "image"/"video"/"audio": kích thước media mặc định
   * - "office"/"pdf": card lớn (~320px) giống OfficeFilePreview/PdfPreview
   * - "code": card code-block (max-h-[400px])
   * - "file": card nhỏ gọn (icon + tên file) — dùng cho mixed files
   */
  variant?: UploadingPlaceholderVariant;
  /** File name hiển thị cho file variants. */
  fileName?: string;
  /** Class bổ sung để khớp layout với preview component gốc. */
  className?: string;
  /** Width của placeholder (dùng cho image/video preview). */
  width?: number | string;
  /** Height của placeholder. */
  height?: number | string;
}

/**
 * Placeholder hiển thị khi attachment đang pending upload (chưa có URL thật).
 * Tránh crash khi render preview component cần `attachment.url` để load resource.
 *
 * Thường được render trong các preview component (image/video/audio/file/office/pdf/code)
 * khi `!attachment.url && (uploadStatus === 'uploading' || pendingUploadId)`.
 *
 * Kích thước placeholder được chọn theo variant để khớp với preview component tương ứng
 * sau khi upload thành công — tránh layout shift khi upload 1 file đơn lẻ.
 */
export function UploadingPlaceholder({
  variant = "file",
  fileName,
  className,
  width,
  height,
}: UploadingPlaceholderProps) {
  // Variant "office" và "pdf" có cùng layout: header + preview area 260px.
  const isCardPreview = variant === "office" || variant === "pdf";

  if (variant === "image" || variant === "video") {
    return (
      <div
        className={cn(
          "relative flex items-center justify-center rounded-lg border border-[#797c814d] bg-black/30",
          className,
        )}
        style={{
          width: width ?? 220,
          height: height ?? 140,
          minWidth: 120,
          minHeight: 80,
        }}
      >
        <div className="absolute top-1.5 right-1.5 z-10 flex h-5 w-5 items-center justify-center rounded-full bg-black/60 backdrop-blur-sm">
          <LuLoader className="h-3 w-3 animate-spin text-white" />
        </div>
        <div className="text-xs font-medium text-white/70">
          {variant === "image" ? "Image đang tải lên…" : "Video đang tải lên…"}
        </div>
      </div>
    );
  }

  if (isCardPreview) {
    // Card lớn (Office/PDF): giữ nguyên cấu trúc card với header + preview area
    // để không gây layout shift khi upload 1 file đơn lẻ.
    return (
      <div
        className={cn(
          "group relative max-w-[400px] overflow-hidden rounded-lg border border-[#797c814d] bg-white dark:bg-[#1A1D21] w-full",
          className,
        )}
      >
        {/* Header — giống OfficeFilePreview/PdfPreview */}
        <div className="border-b border-[#797c814d] px-4 py-3">
          <p className="mb-0.5 truncate text-[15px] font-medium dark:text-[#d1d2d3]">
            {fileName ?? "Đang tải lên…"}
          </p>
          <p className="text-[13px] text-[#797c81]">
            {variant === "pdf" ? "PDF" : "Office"} · Đang upload…
          </p>
        </div>
        {/* Preview area — giữ 260px giống OfficeFilePreview/PdfPreview */}
        <div className="relative h-[260px] w-full overflow-hidden bg-gradient-to-br from-[#f3f3f4] to-[#e4e4e7] dark:from-[#2a2d31] dark:to-[#202327] flex items-center justify-center">
          <div className="flex flex-col items-center gap-3">
            <LuLoader className="h-10 w-10 animate-spin text-[#797c81]" />
            <p className="text-xs font-medium text-[#5e5d60] dark:text-white/55">
              {variant === "pdf"
                ? "PDF đang tải lên…"
                : "Office đang tải lên…"}
            </p>
          </div>
          <div className="absolute top-1.5 right-1.5 z-10 flex h-5 w-5 items-center justify-center rounded-full bg-black/60 backdrop-blur-sm">
            <LuLoader className="h-3 w-3 animate-spin text-white" />
          </div>
        </div>
      </div>
    );
  }

  if (variant === "code") {
    // Code block: header + code area (max-h-[400px] giống CodePreview collapsed)
    return (
      <div
        className={cn(
          "group relative rounded-lg border border-[#797c814d] bg-[#0d1117] overflow-hidden w-full",
          className,
        )}
      >
        {/* Header — giống CodePreview */}
        <div className="flex items-center justify-between px-3 py-2 border-b border-[#797c814d] bg-[#161b22]">
          <div className="flex items-center gap-2 min-w-0">
            <LuLoader className="w-4 h-4 text-[#8b949e] shrink-0 animate-spin" />
            <span className="text-sm text-[#c9d1d9] truncate">
              {fileName ?? "Đang tải lên…"}
            </span>
          </div>
        </div>
        {/* Code area placeholder */}
        <div className="p-4 space-y-3 min-h-[280px]">
          {[100, 95, 90, 85, 80].map((w, i) => (
            <div
              key={i}
              className="h-4 bg-white/10 rounded animate-pulse"
              style={{ width: `${w}%` }}
            />
          ))}
        </div>
      </div>
    );
  }

  if (variant === "audio") {
    // Audio: layout ngang giống AudioPreview (icon + name + waveform area)
    return (
      <div
        className={cn(
          "relative flex items-center gap-3 p-3 bg-white dark:bg-[#1A1D21] border border-[#797c814d] rounded-lg max-w-[400px] w-full group overflow-hidden",
          className,
        )}
      >
        <div className="shrink-0 w-10 h-10 flex items-center justify-center rounded dark:bg-[#2a2d31] bg-[#e8e8e8] overflow-hidden">
          <LuLoader className="w-5 h-5 animate-spin text-[#797c81]" />
        </div>
        <div className="flex-1 min-w-0">
          <p className="text-sm font-medium dark:text-[#d1d2d3] truncate">
            {fileName ?? "Đang tải lên…"}
          </p>
          <p className="text-xs text-[#797c81]">Đang upload…</p>
        </div>
        <div className="absolute top-1.5 right-1.5 z-10 flex h-5 w-5 items-center justify-center rounded-full bg-black/60 backdrop-blur-sm">
          <LuLoader className="h-3 w-3 animate-spin text-white" />
        </div>
      </div>
    );
  }

  // Default "file" — compact card (icon + name) — dùng cho mixed files
  return (
    <div
      className={cn(
        "group relative flex items-center max-w-[400px] gap-3 p-3 rounded-lg border border-[#797c814d] bg-white dark:bg-[#1A1D21]",
        className,
      )}
    >
      <div className="shrink-0 w-10 h-10 flex items-center justify-center rounded dark:bg-[#2a2d31] bg-[#e8e8e8] overflow-hidden">
        <LuLoader className="w-5 h-5 animate-spin text-[#797c81]" />
      </div>
      <div className="flex-1 min-w-0">
        <p className="text-sm font-medium dark:text-[#d1d2d3] truncate">
          {fileName ?? "Đang tải lên…"}
        </p>
        <p className="text-xs text-[#797c81]">Đang upload…</p>
      </div>
      <div className="absolute top-1.5 right-1.5 z-10 flex h-5 w-5 items-center justify-center rounded-full bg-black/60 backdrop-blur-sm">
        <LuLoader className="h-3 w-3 animate-spin text-white" />
      </div>
    </div>
  );
}
