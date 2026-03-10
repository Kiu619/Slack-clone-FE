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
    <aside className="flex flex-col justify-between items-center w-[70px] h-full">
      <SidebarNav />
      <Avatar src={avatarSrc} className="opacity-40 w-9 h-9 mb-3" />
    </aside>
  )
}

export default Sidebar
