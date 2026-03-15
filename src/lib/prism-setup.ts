/**
 * prismjs components expect Prism on global — phải setup trước khi import components.
 * File này import đầu tiên trong code-preview.
 */
import Prism from 'prismjs'

if (typeof globalThis !== 'undefined') {
  ;(globalThis as Record<string, unknown>).Prism = Prism
}
