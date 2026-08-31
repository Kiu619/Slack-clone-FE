import { redirect } from 'next/navigation'
import { getServerUser } from '@/lib/server-fetch'

/**
 * Layout cho route group (app) — chỉ chạy cho các route không có layout riêng.
 *
 * Lý do cần:
 * - proxy.ts chỉ redirect khi cookie thực sự expired (sau khi đã verify exp).
 * - Nhưng JWT có thể bị revoke hoặc signature không hợp lệ — proxy sẽ cho vào,
 *   nhưng server fetch /auth/me sẽ trả 401.
 * - Layout này chạy SSR fetch đầu tiên trên server, nếu user null → redirect.
 *   Tránh flash "/auth" → "/" ở phía client.
 *
 * Lưu ý: (app)/workspace/layout.tsx và (app)/create-workspace/layout.tsx đã có
 * redirect riêng, nên layout này chỉ bảo vệ root route (/) và các route khác
 * trong group mà chưa có layout con.
 */
export default async function AppLayout({
  children,
}: Readonly<{
  children: React.ReactNode
}>) {
  const user = await getServerUser()

  if (!user) {
    // Path hiện tại là '/' (root) vì layout này match nhiều route, nhưng khi
    // được áp dụng (root (app)/page.tsx), window.location không có sẵn ở server.
    // Dùng '/' làm redirect query là đủ — khi login xong sẽ về home.
    redirect('/auth?redirect=%2F')
  }

  return <>{children}</>
}