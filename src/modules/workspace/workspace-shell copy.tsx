// 'use client'

// import { useEffect, useMemo } from 'react'
// import { useUserStore } from '@/stores/useUserStore'
// import { useFileDetailStore } from '@/stores/useFileDetailStore'
// import Sidebar from '@/components/sidebar'
// import Toolbar from '@/components/toolbar'
// import {
//   ResizableHandle,
//   ResizablePanel,
//   ResizablePanelGroup,
// } from '@/components/ui/resizable'
// import WorkspaceSidePanel from '@/modules/workspace/workspace-side-panel/workspace-side-panel'
// import FileDetailPanel from '@/components/attachment-previews/file-detail-panel'
// import { useWorkspaces } from '@/hooks/use-workspace'
// import { useChannels } from '@/hooks/use-channel'
// import type { AccountUser, User, Workspace } from '@/lib/types'
// import { useQuery } from '@tanstack/react-query'
// import ProfilePanel from '@/modules/profile/profile-panel'
// import { useProfilePanelStore } from '@/stores/useProfilePanelStore'
// import { authKeys } from '@/lib/query-keys'
// import { getUserApi, getWorkspaceProfileApi } from '@/apis'
// import { mergeAccountWithWorkspaceProfile } from '@/lib/merge-user'
// import { PreferencesDialog } from '@/modules/preferences/preferences-dialog'
// import { useThemeStore, type Theme } from '@/stores/useThemeStore'
// import { useTheme } from 'next-themes'

// interface Props {
//   accountUser: AccountUser
//   initialSidebarUser: User
//   currentWorkspaceData: Workspace
//   workspaceProfileData: User | null
//   workspaceId: string
//   children: React.ReactNode
// }

// export default function WorkspaceShell({
//   accountUser,
//   initialSidebarUser,
//   currentWorkspaceData,
//   workspaceProfileData,
//   workspaceId,
//   children,
// }: Props) {
//   const { theme: storeTheme, setTheme, confirmTheme } = useThemeStore()
//   const { resolvedTheme } = useTheme()

//   const theme = useMemo(() => {
//     if (workspaceProfileData?.theme) {
//       try {
//         return JSON.parse(workspaceProfileData.theme) as Theme
//       } catch (e) {
//         return storeTheme
//       }
//     }
//     return storeTheme
//   }, [workspaceProfileData?.theme, storeTheme])

//   const getSysNavBackground = () => {
//     const baseColor = resolvedTheme === 'light'
//       ? `color-mix(in srgb, ${theme.systemNav}, white 30%)`
//       : `color-mix(in srgb, ${theme.systemNav}, black 65%)`;

//     if (theme.isGradient) {
//       const blendColor = resolvedTheme === 'light'
//         ? `color-mix(in srgb, ${theme.selectedItems}, white 30%)`
//         : `color-mix(in srgb, ${theme.selectedItems}, black 65%)`;
//       return `linear-gradient(to bottom, ${baseColor}, ${blendColor})`;
//     }
//     return baseColor;
//   };

//   const getWorkspaceSidePanelBackground = () => {
//     const baseColor = resolvedTheme === 'light'
//       ? `color-mix(in srgb, ${theme.systemNav}, white 50%)`
//       : `color-mix(in srgb, ${theme.systemNav}, black 75%)`;

//     if (theme.isGradient) {
//       const blendColor = resolvedTheme === 'light'
//         ? `color-mix(in srgb, ${theme.selectedItems}, white 50%)`
//         : `color-mix(in srgb, ${theme.selectedItems}, black 75%)`;
//       return `linear-gradient(to bottom, ${baseColor}, ${blendColor})`;
//     }
//     return baseColor;
//   };

//   const { data: allWorkspaces = [] } = useWorkspaces()
//   const { data: channels = [] } = useChannels(workspaceId)

//   const { data: account } = useQuery({
//     queryKey: authKeys.me,
//     queryFn: getUserApi,
//     initialData: accountUser,
//     staleTime: 5 * 60 * 1000,
//   })

//   const { data: workspaceProfile } = useQuery({
//     queryKey: authKeys.workspaceProfile(workspaceId),
//     queryFn: () => getWorkspaceProfileApi(workspaceId),
//     staleTime: 60 * 1000,
//   })


//   useEffect(() => {
//     if (workspaceProfileData?.theme) {
//       try {
//         const parsedTheme = JSON.parse(workspaceProfileData.theme)
//         setTheme(parsedTheme)
//         confirmTheme()
//       } catch (e) {
//         console.error('Failed to parse theme', e)
//       }
//     }
//   }, [workspaceProfileData?.theme, setTheme, confirmTheme])

//   const sidebarUser = useMemo(
//     () =>
//       mergeAccountWithWorkspaceProfile(account ?? accountUser, workspaceProfile),
//     [account, accountUser, workspaceProfile],
//   )

//   const setUser = useUserStore((s) => s.setUser)
//   const isFileDetailOpen = useFileDetailStore((s) => s.isOpen)
//   const isProfilePanelOpen = useProfilePanelStore((s) => s.isOpen)



//   useEffect(() => {
//     if (account) setUser(account)
//   }, [account, setUser])

//   const displayUser = sidebarUser ?? initialSidebarUser

//   return (
//     <>
//       <Toolbar
//         theme={theme}
//         currentWorkspaceData={currentWorkspaceData} />

//       <div className="flex h-full"
//         style={{ background: getSysNavBackground() }}
//       >
//         <Sidebar
//           userData={displayUser}
//           currentWorkspaceData={currentWorkspaceData}
//           userWorkspacesData={allWorkspaces}
//         />

//         <main className="flex-1 mr-1 mb-1"
//         >
//           <ResizablePanelGroup
//             orientation="horizontal"
//             className="h-full rounded-lg border border-[#462B4A] md:min-w-[450px] w-full"
//             key={`${isFileDetailOpen}-${isProfilePanelOpen}`} // Stabilize layout on panel changes
//           >
//             <ResizablePanel
//               defaultSize="320px"
//               minSize="320px"
//               maxSize="35%"
//               className="flex flex-col gap-2 h-full px-3 py-2 min-w-[320px]"
//               style={{ background: getWorkspaceSidePanelBackground() }}
//             >
//               <WorkspaceSidePanel
//                 theme={theme}
//                 userData={displayUser}
//                 currentWorkspaceData={currentWorkspaceData}
//                 userWorkspaceChannels={channels}
//               />
//             </ResizablePanel>

//             <ResizableHandle />

//             <ResizablePanel
//               defaultSize={isFileDetailOpen ? 54 : 77}
//               minSize={30}
//               groupResizeBehavior="preserve-relative-size"
//               className="h-full items-center justify-center py-2  bg-white dark:bg-[#1A1D21]"
//             >
//               {children}
//             </ResizablePanel>

//             {isFileDetailOpen && (
//               <>
//                 <ResizableHandle />
//                 <ResizablePanel
//                   defaultSize={23}
//                   minSize="20%"
//                   maxSize="35%"
//                   className="h-full border-l border-[#797c814d]"
//                 >
//                   <FileDetailPanel />
//                 </ResizablePanel>
//               </>
//             )}

//             {isProfilePanelOpen && (
//               <>
//                 <ResizableHandle />
//                 <ResizablePanel
//                   defaultSize={23}
//                   minSize="20%"
//                   maxSize="35%"
//                   className="h-full border-l border-[#797c814d]"
//                 >
//                   <ProfilePanel />
//                 </ResizablePanel>
//               </>
//             )}
//           </ResizablePanelGroup>
//         </main>
//       </div>
//       <PreferencesDialog />
//     </>
//   )
// }
