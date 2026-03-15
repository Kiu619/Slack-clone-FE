/**
 * File type detection — dùng để chọn preview component phù hợp
 */

const CODE_EXTENSIONS = new Set([
  'js', 'mjs', 'cjs', 'ts', 'jsx', 'tsx',
  'json', 'css', 'scss', 'sass', 'less',
  'md', 'mdx', 'sh', 'bash', 'zsh',
  'sql', 'py', 'yaml', 'yml', 'xml', 'html', 'htm', 'svg',
  'txt', 'csv', 'env', 'config', 'conf', 'ini', 'log',
  'java', 'kt', 'swift', 'go', 'rs', 'rb', 'php', 'c', 'cpp', 'h', 'hpp',
])

const OFFICE_EXTENSIONS = new Set([
  'doc', 'docx', 'xls', 'xlsx', 'ppt', 'pptx',
])

const PDF_EXTENSIONS = new Set(['pdf'])

export function isCodeOrTextFile(fileName: string, mimeType?: string | null): boolean {
  const ext = fileName.toLowerCase().split('.').pop() ?? ''
  if (CODE_EXTENSIONS.has(ext)) return true
  // Fallback theo MIME
  if (mimeType?.startsWith('text/')) return true
  if (mimeType === 'application/json') return true
  return false
}

export function isOfficeFile(fileName: string): boolean {
  const ext = fileName.toLowerCase().split('.').pop() ?? ''
  return OFFICE_EXTENSIONS.has(ext)
}

export function isPdfFile(fileName: string, mimeType?: string | null): boolean {
  const ext = fileName.toLowerCase().split('.').pop() ?? ''
  if (PDF_EXTENSIONS.has(ext)) return true
  if (mimeType === 'application/pdf') return true
  return false
}
