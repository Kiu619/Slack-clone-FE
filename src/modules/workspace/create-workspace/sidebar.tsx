'use client'

import Avatar from '@/components/avatar'
import SidebarNav from './sidebar-nav'
import { useUserStore } from '@/stores/useUserStore'

const Sidebar = () => {
  const { user } = useUserStore()

  const avatarSrc =
    user?.avatar ??
    'https://a.slack-edge.com/bv1-13-br/ava_0002-72-c702398.png'

  return (
    <aside className="flex h-full w-[70px] flex-col items-center justify-between bg-[var(--create-workspace-sidepanel-bg)]">
      <SidebarNav />
      <Avatar src={avatarSrc} className="opacity-40 w-9 h-9 mb-3" />
    </aside>
  )
}

export default Sidebar
