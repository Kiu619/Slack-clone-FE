import { useState, type Dispatch, type SetStateAction } from 'react'
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

function attachmentTypeFromMime(mimeType: string): 'image' | 'video' | 'audio' | 'file' {
  if (mimeType.startsWith('image/')) return 'image'
  if (mimeType.startsWith('video/')) return 'video'
  if (mimeType.startsWith('audio/')) return 'audio'
  return 'file'
}

/**
 * Helper để xác định file category ngay tại frontend
 */
function getFileCategoryFromFrontend(name: string, mimeType: string): string {
  const ext = name.split('.').pop()?.toLowerCase();

  if (ext) {
    if (['xlsx', 'xls', 'csv', 'ods'].includes(ext)) return 'spreadsheet';
    if (['pptx', 'ppt', 'odp'].includes(ext)) return 'presentation';
    if (['pdf'].includes(ext)) return 'pdf';
    if (['doc', 'docx', 'odt', 'rtf', 'txt'].includes(ext)) return 'document';
    if (['zip', 'rar', '7z', 'tar', 'gz'].includes(ext)) return 'archive';
    if (['jpg', 'jpeg', 'png', 'gif', 'webp', 'svg', 'bmp'].includes(ext)) return 'image';
    if (['mp4', 'mov', 'wmv', 'avi', 'webm', 'mkv'].includes(ext)) {
      if (ext === 'webm' && mimeType.includes('audio')) return 'audio';
      return 'video';
    }
    if (['mp3', 'wav', 'ogg', 'm4a', 'flac', 'aac'].includes(ext)) return 'audio';
    if (['js', 'ts', 'tsx', 'jsx', 'py', 'java', 'c', 'cpp', 'cs', 'html', 'css', 'json', 'md', 'php', 'sh', 'sql'].includes(ext)) return 'code';
  }

  if (mimeType.startsWith('image/')) return 'image';
  if (mimeType.startsWith('video/')) return 'video';
  if (mimeType.includes('audio')) return 'audio';
  if (mimeType.includes('pdf')) return 'pdf';
  if (mimeType.includes('spreadsheet') || mimeType.includes('excel') || mimeType.includes('sheet')) return 'spreadsheet';
  if (mimeType.includes('presentation') || mimeType.includes('powerpoint')) return 'presentation';
  if (mimeType.includes('word') || mimeType.includes('document')) return 'document';
  if (mimeType.includes('zip') || mimeType.includes('archive') || mimeType.includes('compressed')) return 'archive';

  return 'other';
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

type SetUploadingFiles = Dispatch<SetStateAction<UploadingFile[]>>

/**
 * Upload binary lên S3 hoặc Cloudinary (bước chung chat + folder).
 */
async function uploadBinaryToStorage(
  file: File,
  tempId: string,
  setUploadingFiles: SetUploadingFiles,
): Promise<{
  uploadedUrl: string
  width?: number
  height?: number
  duration?: number
  mimeType: string
}> {
  const mimeType = getResolvedFileType(file)
  const isImage = mimeType.startsWith('image/')
  const isVideo = mimeType.startsWith('video/')
  const useCloudinary = isImage || isVideo

  let uploadedUrl: string
  let width: number | undefined
  let height: number | undefined
  let duration: number | undefined

  if (useCloudinary) {
    const result = await uploadToCloudinary(file, (progress) => {
      setUploadingFiles((prev) =>
        prev.map((f) => (f.id === tempId ? { ...f, progress } : f)),
      )
    })
    uploadedUrl = result.url
    width = result.width
    height = result.height
    duration = result.duration
  } else {
    uploadedUrl = await uploadToS3(file, (progress) => {
      setUploadingFiles((prev) =>
        prev.map((f) => (f.id === tempId ? { ...f, progress } : f)),
      )
    })
  }

  return { uploadedUrl, width, height, duration, mimeType }
}

/**
 * useFileUpload — Hook để upload files lên S3/Cloudinary
 *
 * Flow chat: tạo message trước → uploadFile(file, messageId) → POST /attachments
 * Flow folder: uploadFileToFolder(file, channelId, folderId) → POST .../folders/:id/files
 *   (backend tạo message ẩn + attachment + folder link)
 */
export function useFileUpload() {
  const [uploadingFiles, setUploadingFiles] = useState<UploadingFile[]>([])

  const uploadFileBinary = async (file: File) => {
    const tempId = Math.random().toString(36).substring(7)

    setUploadingFiles((prev) => [
      ...prev,
      { id: tempId, file, progress: 0, status: 'uploading' },
    ])

    try {
      const { uploadedUrl, width, height, duration, mimeType } =
        await uploadBinaryToStorage(file, tempId, setUploadingFiles)

      const type = attachmentTypeFromMime(mimeType)
      const fileCategory = getFileCategoryFromFrontend(file.name, mimeType)

      const attachmentMetadata = {
        url: uploadedUrl,
        type,
        name: file.name,
        size: file.size,
        mimeType,
        width,
        height,
        duration,
        fileCategory,
      }

      setUploadingFiles((prev) =>
        prev.map((f) =>
          f.id === tempId
            ? { ...f, progress: 100, status: 'success' }
            : f,
        ),
      )

      return attachmentMetadata
    } catch (error) {
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

  const uploadFile = async (
    file: File,
    messageId: string,
    workspaceId: string,
    channelId?: string | null,
    conversationId?: string | null,
  ): Promise<MessageAttachment> => {
    const tempId = Math.random().toString(36).substring(7)

    setUploadingFiles((prev) => [
      ...prev,
      { id: tempId, file, progress: 0, status: 'uploading' },
    ])

    try {
      const { uploadedUrl, width, height, duration, mimeType } =
        await uploadBinaryToStorage(file, tempId, setUploadingFiles)

      const type = attachmentTypeFromMime(mimeType)

      const response = await apiClient.post<MessageAttachment>('/attachments', {
        messageId,
        workspaceId,
        channelId,
        conversationId,
        url: uploadedUrl,
        type,
        fileCategory: getFileCategoryFromFrontend(file.name, mimeType), // Gửi trực tiếp category từ frontend
        name: file.name,
        size: file.size,
        mimeType,
        width,
        height,
        duration,
      })

      const attachment = response.data

      setUploadingFiles((prev) =>
        prev.map((f) =>
          f.id === tempId
            ? { ...f, progress: 100, status: 'success', attachment }
            : f,
        ),
      )

      return attachment
    } catch (error) {
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

  const uploadFileToFolder = async (
    file: File,
    workspaceId: string,
    targetId: string,
    folderId: string,
    isDM = false,
  ): Promise<MessageAttachment> => {
    const tempId = Math.random().toString(36).substring(7)

    setUploadingFiles((prev) => [
      ...prev,
      { id: tempId, file, progress: 0, status: 'uploading' },
    ])

    try {
      const { uploadedUrl, width, height, duration, mimeType } =
        await uploadBinaryToStorage(file, tempId, setUploadingFiles)

      const type = attachmentTypeFromMime(mimeType)

      const prefix = isDM ? 'direct-messages' : 'channels'
      const response = await apiClient.post<MessageAttachment>(
        `/${prefix}/${targetId}/folders/${folderId}/files`,
        {
          workspaceId,
          url: uploadedUrl,
          type,
          fileCategory: getFileCategoryFromFrontend(file.name, mimeType), // Gửi trực tiếp category từ frontend
          name: file.name,
          size: file.size,
          mimeType,
          width,
          height,
          duration,
        },
      )

      const attachment = response.data

      setUploadingFiles((prev) =>
        prev.map((f) =>
          f.id === tempId
            ? { ...f, progress: 100, status: 'success', attachment }
            : f,
        ),
      )

      return attachment
    } catch (error) {
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

  const removeUploadingFile = (id: string) => {
    setUploadingFiles((prev) => prev.filter((f) => f.id !== id))
  }

  const clearUploadingFiles = () => {
    setUploadingFiles([])
  }

  return {
    uploadFileBinary,
    uploadFile,
    uploadFileToFolder,
    uploadingFiles,
    removeUploadingFile,
    clearUploadingFiles,
  }
}

/**
 * Upload file lên Cloudinary
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
  const { data: presignedData } = await apiClient.post<{
    url: string
    key: string
    publicUrl: string
  }>('/upload/presigned-url/s3', {
    fileName: file.name,
    fileType: getResolvedFileType(file),
    fileSize: file.size,
  })

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

  return presignedData.publicUrl
}
