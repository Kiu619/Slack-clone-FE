import { useState } from 'react'
import axios from 'axios'
import { apiClient } from '@/lib/axios'
import type { MessageAttachment } from '@/lib/types'

/**
 * Resolve MIME type — file.type thường rỗng với .drawio, .sketch, .fig... (browser không biết)
 * Fallback: suy từ extension → application/octet-stream
 */
function getResolvedFileType(file: File): string {
  if (file.type && file.type.length > 0) return file.type

  const ext = file.name.split('.').pop()?.toLowerCase()
  const mimeByExt: Record<string, string> = {
    drawio: 'application/vnd.jgraph.mxfile',
    'draw.io': 'application/vnd.jgraph.mxfile',
    xml: 'application/xml',
    sketch: 'application/octet-stream',
    fig: 'application/octet-stream',
    psd: 'image/vnd.adobe.photoshop',
    ai: 'application/postscript',
    eps: 'application/postscript',
  }
  return mimeByExt[ext ?? ''] ?? 'application/octet-stream'
}

/**
 * File đang upload với progress
 */
export interface UploadingFile {
  id: string // temporary ID
  file: File
  progress: number
  status: 'uploading' | 'success' | 'error'
  error?: string
  attachment?: MessageAttachment
}

/**
 * useFileUpload — Hook để upload files lên S3/Cloudinary
 *
 * Flow:
 * 1. Detect file type (image/video → Cloudinary, others → S3)
 * 2. Request presigned URL từ backend
 * 3. Upload trực tiếp lên S3/Cloudinary với progress tracking
 * 4. Tạo attachment record trong DB
 * 5. Return attachment object
 *
 * Usage:
 * ```tsx
 * const { uploadFile, uploadingFiles } = useFileUpload()
 * const attachment = await uploadFile(file, messageId)
 * ```
 */
export function useFileUpload() {
  const [uploadingFiles, setUploadingFiles] = useState<UploadingFile[]>([])

  /**
   * Upload một file lên S3 hoặc Cloudinary
   */
  const uploadFile = async (
    file: File,
    messageId: string,
  ): Promise<MessageAttachment> => {
    const tempId = Math.random().toString(36).substring(7)

    // Add vào uploading list
    setUploadingFiles((prev) => [
      ...prev,
      { id: tempId, file, progress: 0, status: 'uploading' },
    ])

    try {
      const mimeType = getResolvedFileType(file)
      const isImage = mimeType.startsWith('image/')
      const isVideo = mimeType.startsWith('video/')
      const useCloudinary = isImage || isVideo

      let uploadedUrl: string
      let width: number | undefined
      let height: number | undefined
      let duration: number | undefined

      if (useCloudinary) {
        // Upload lên Cloudinary
        const result = await uploadToCloudinary(file, (progress) => {
          setUploadingFiles((prev) =>
            prev.map((f) =>
              f.id === tempId ? { ...f, progress } : f,
            ),
          )
        })
        uploadedUrl = result.url
        width = result.width
        height = result.height
        duration = result.duration
      } else {
        // Upload lên S3
        uploadedUrl = await uploadToS3(file, (progress) => {
          setUploadingFiles((prev) =>
            prev.map((f) =>
              f.id === tempId ? { ...f, progress } : f,
            ),
          )
        })
      }

      const response = await apiClient.post<MessageAttachment>('/attachments', {
        messageId,
        url: uploadedUrl,
        type: isImage ? 'image' : isVideo ? 'video' : mimeType.startsWith('audio/') ? 'audio' : 'file',
        name: file.name,
        size: file.size,
        mimeType: mimeType,
        width,
        height,
        duration,
      })

      const attachment = response.data

      // Update status
      setUploadingFiles((prev) =>
        prev.map((f) =>
          f.id === tempId
            ? { ...f, progress: 100, status: 'success', attachment }
            : f,
        ),
      )

      return attachment
    } catch (error) {
      // Update error status
      setUploadingFiles((prev) =>
        prev.map((f) =>
          f.id === tempId
            ? {
                ...f,
                status: 'error',
                error: error instanceof Error ? error.message : 'Upload failed',
              }
            : f,
        ),
      )
      throw error
    }
  }

  /**
   * Remove file khỏi uploading list (sau khi upload xong hoặc cancel)
   */
  const removeUploadingFile = (id: string) => {
    setUploadingFiles((prev) => prev.filter((f) => f.id !== id))
  }

  /**
   * Clear tất cả uploading files
   */
  const clearUploadingFiles = () => {
    setUploadingFiles([])
  }

  return {
    uploadFile,
    uploadingFiles,
    removeUploadingFile,
    clearUploadingFiles,
  }
}

/**
 * Upload file lên Cloudinary
 *
 * QUAN TRỌNG: FormData phải gửi ĐÚNG params đã được backend sign.
 * Cloudinary so sánh signature với params nhận được — sai 1 ký tự → 401.
 */
async function uploadToCloudinary(
  file: File,
  onProgress: (progress: number) => void,
): Promise<{
  url: string
  width?: number
  height?: number
  duration?: number
}> {
  // 1. Request signature từ backend
  const { data: sig } = await apiClient.post<{
    signature: string
    timestamp: number
    cloudName: string
    apiKey: string
    folder: string
    publicId: string
    uploadUrl: string
  }>('/upload/presigned-url/cloudinary', {
    fileName: file.name,
    fileType: getResolvedFileType(file),
    fileSize: file.size,
  })

  // 2. FormData — CHỈ gửi params đã sign (folder, public_id, timestamp)
  const formData = new FormData()
  formData.append('file', file)
  formData.append('api_key', sig.apiKey)
  formData.append('signature', sig.signature)
  formData.append('timestamp', sig.timestamp.toString())
  formData.append('folder', sig.folder)
  formData.append('public_id', sig.publicId)

  const { data } = await axios.post(sig.uploadUrl, formData, {
    onUploadProgress: (progressEvent) => {
      if (progressEvent.total) {
        const percent = Math.round(
          (progressEvent.loaded * 100) / progressEvent.total,
        )
        onProgress(percent)
      }
    },
  })

  return {
    url: data.secure_url,
    width: data.width,
    height: data.height,
    duration: data.duration,
  }
}

/**
 * Upload file lên S3
 */
async function uploadToS3(
  file: File,
  onProgress: (progress: number) => void,
): Promise<string> {
  // 1. Request presigned URL từ backend
  const { data: presignedData } = await apiClient.post<{
    url: string
    key: string
    publicUrl: string
  }>('/upload/presigned-url/s3', {
    fileName: file.name,
    fileType: getResolvedFileType(file),
    fileSize: file.size,
  })

  // 2. Upload lên S3 qua presigned URL
  await axios.put(presignedData.url, file, {
    headers: {
      'Content-Type': getResolvedFileType(file),
    },
    onUploadProgress: (progressEvent) => {
      if (progressEvent.total) {
        const percent = Math.round(
          (progressEvent.loaded * 100) / progressEvent.total,
        )
        onProgress(percent)
      }
    },
  })

  // 3. Return public URL
  return presignedData.publicUrl
}
