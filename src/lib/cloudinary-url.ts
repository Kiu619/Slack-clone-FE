/**
 * Cloudinary URL transformations — tối ưu ảnh: kích thước, format, chất lượng
 * @see https://cloudinary.com/documentation/image_transformations
 */

const CLOUDINARY_UPLOAD_PREFIX = '/image/upload/'

export type CloudinaryTransform = {
  /** max width (px) — c_limit scale để giữ aspect ratio */
  w?: number
  /** max height (px) */
  h?: number
  /** crop: limit | fill | scale | thumb */
  c?: 'limit' | 'fill' | 'scale' | 'thumb'
  /** auto format (WebP/AVIF khi browser hỗ trợ) */
  fAuto?: boolean
  /** auto quality */
  qAuto?: boolean
  /** DPR cho màn hình retina */
  dpr?: 'auto' | number
}

/**
 * Chèn transformation vào Cloudinary URL
 * Chỉ xử lý URL từ res.cloudinary.com
 */
export function getCloudinaryUrl(
  url: string,
  transform: CloudinaryTransform = {},
): string {
  if (!url.includes('res.cloudinary.com') || !url.includes(CLOUDINARY_UPLOAD_PREFIX)) {
    return url
  }

  const parts: string[] = []
  if (transform.fAuto !== false) parts.push('f_auto')
  if (transform.qAuto !== false) parts.push('q_auto')
  if (transform.w) parts.push(`w_${transform.w}`)
  if (transform.h) parts.push(`h_${transform.h}`)
  if (transform.c) parts.push(`c_${transform.c}`)
  if (transform.dpr) parts.push(`dpr_${transform.dpr}`)

  if (parts.length === 0) return url

  const transformStr = parts.join(',')
  const idx = url.indexOf(CLOUDINARY_UPLOAD_PREFIX)
  const insertPos = idx + CLOUDINARY_UPLOAD_PREFIX.length
  return url.slice(0, insertPos) + transformStr + '/' + url.slice(insertPos)
}

/**
 * URL cho thumbnail trong list — 800px max, responsive
 */
export function getCloudinaryThumbnailUrl(url: string, maxW = 800): string {
  return getCloudinaryUrl(url, {
    w: maxW,
    c: 'limit',
    fAuto: true,
    qAuto: true,
  })
}

/**
 * URL cho lightbox — chất lượng cao, max 1920px (Full HD)
 */
export function getCloudinaryLightboxUrl(url: string, maxW = 1920): string {
  return getCloudinaryUrl(url, {
    w: maxW,
    c: 'limit',
    fAuto: true,
    qAuto: true,
    dpr: 'auto',
  })
}

function isCloudinaryUrl(url: string): boolean {
  return url.includes('res.cloudinary.com') && url.includes(CLOUDINARY_UPLOAD_PREFIX)
}

/**
 * Tạo srcset cho responsive — nhiều kích thước. Trả về '' nếu không phải Cloudinary.
 */
export function getCloudinarySrcSet(
  url: string,
  widths: number[] = [400, 800, 1200, 1600],
): string {
  if (!isCloudinaryUrl(url)) return ''
  return widths
    .map((w) => {
      const u = getCloudinaryUrl(url, { w, c: 'limit', fAuto: true, qAuto: true })
      return `${u} ${w}w`
    })
    .join(', ')
}
