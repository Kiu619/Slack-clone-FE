/**
 * inferAttachmentTypeFromMime — suy ra attachment.type từ MIME type khi tạo optimistic attachment.
 *
 * MessageAttachment.type chỉ nhận: 'image' | 'video' | 'audio' | 'file'.
 * Tra cứu MIME → trả về đúng nhóm.
 */
export function inferAttachmentTypeFromMime(
  mimeType: string | undefined,
): "image" | "video" | "audio" | "file" {
  if (!mimeType) return "file"
  const m = mimeType.toLowerCase()
  if (m.startsWith("image/")) return "image"
  if (m.startsWith("video/")) return "video"
  if (m.startsWith("audio/")) return "audio"
  return "file"
}
