import { User, Workspace } from '@/lib/types'
import UserSidebar from './user-sidebar'
import WorkspaceSidebar from './nav-sidebar'
interface SidebarProps {
  userData: User
  currentWorkspaceData: Workspace
  userWorkspacesData: Workspace[]
}

const Sidebar = ({ userData, currentWorkspaceData, userWorkspacesData }: SidebarProps) => {
  return (
    <aside
      className="flex flex-col justify-between items-center w-[70px] h-full"
    >
      <WorkspaceSidebar currentWorkspaceData={currentWorkspaceData} userWorkspacesData={userWorkspacesData} />
      <UserSidebar userData={userData!} currentWorkspaceData={currentWorkspaceData} />
    </aside>
  )
}

export default Sidebar
