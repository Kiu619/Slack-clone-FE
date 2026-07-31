"use client";

import Avatar from "@/components/avatar";
import { PiChatsTeardrop, PiChatsTeardropFill } from "react-icons/pi";
import { RiHome2Fill, RiHome2Line } from "react-icons/ri";
import { TfiBell } from "react-icons/tfi";

// import CreateWorkspace from '@/components/create-workspace'
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { Separator } from "@/components/ui/separator";
import Typography from "@/components/ui/typography";
import { BsThreeDots } from "react-icons/bs";
import { ImFilesEmpty } from "react-icons/im";
import { useRef, useState } from "react";
// import ProgressBar from './progress-bar'
import { Workspace } from "@/lib/types";
// import { useRouter } from 'next/navigation'
import ProgressBar from "./progress-bar";
import { FaPlus } from "react-icons/fa";
import Link from "next/link";
import { MdBookmark, MdBookmarkBorder } from "react-icons/md";
import { useThemeStore } from "@/stores/useThemeStore";
import { usePathname } from "next/navigation";
import { useRouter } from "next/navigation";
import { cn } from "@/lib/utils";
import { TbBell, TbBellFilled } from "react-icons/tb";
import { useLaterOverdueSummary } from "@/hooks/use-saved-items";
import { useUnreadNotificationsCount } from "@/hooks/use-notification-summary";
import { useDmUnreadSummary } from "@/hooks/use-conversations";
import { FiSettings } from "react-icons/fi";

interface WorkspaceSidebarProps {
  currentWorkspaceData: Workspace;
  userWorkspacesData: Workspace[];
}

const WorkspaceSidebar = ({
  currentWorkspaceData,
  userWorkspacesData,
}: WorkspaceSidebarProps) => {
  const router = useRouter();
  const pathname = usePathname();

  const isDmsPage = pathname.includes("/dms");
  const isFilesPage = pathname.includes("/files");
  const isActivityPage = pathname.includes("/activity");
  const isLaterPage = pathname.includes("/later");
  const isMorePage = pathname.includes("/more");
  const isThreadsPage = pathname.includes("/threads");
  const isHomePage = !isDmsPage && !isFilesPage && !isActivityPage && !isLaterPage && !isMorePage && !isThreadsPage;

  // const router = useRouter()
  const [open, setOpen] = useState(false);
  const [isClickedOpen, setIsClickedOpen] = useState(false);
  const timeoutRef = useRef<NodeJS.Timeout | null>(null);
  const [switchingWorkspace, setSwitchingWorkspace] = useState(false);

  const { theme } = useThemeStore();
  const { overdueCount } = useLaterOverdueSummary();
  const { unreadCount } = useUnreadNotificationsCount();
  const { count: dmUnreadCount } = useDmUnreadSummary(currentWorkspaceData.id);

  const switchWorkspace = (id: string) => {
    setSwitchingWorkspace(true);
    router.push(`/workspace/${id}`)
    setSwitchingWorkspace(true);
  };

  const handleMouseEnter = () => {
    // Chỉ hoạt động khi chưa được click mở
    if (!isClickedOpen) {
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
      }
      setOpen(true);
    }
  };

  const handleMouseLeave = () => {
    // Chỉ hoạt động khi chưa được click mở
    if (!isClickedOpen) {
      timeoutRef.current = setTimeout(() => {
        setOpen(false);
      }, 200);
    }
  };

  const handleClick = () => {
    if (isClickedOpen) {
      // Nếu đang mở bằng click, thì đóng và reset
      setOpen(false);
      setIsClickedOpen(false);
    } else {
      // Nếu chưa mở hoặc mở bằng hover, thì mở bằng click
      setOpen(true);
      setIsClickedOpen(true);
      // Clear timeout nếu có
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
      }
    }
  };
  return (
    <nav>
      <ul className="flex flex-col space-y-4 items-center mt-3 bg">
        <li>
          <div
            className="relative pb-2"
            onMouseEnter={handleMouseEnter}
            onMouseLeave={handleMouseLeave}
            onClick={handleClick}
          >
            <div className="flex cursor-pointer items-center w-9 h-9 rounded-lg overflow-hidden">
              <Popover
                open={open}
                onOpenChange={(newOpen) => {
                  setOpen(newOpen);
                  // Nếu popover đóng từ bên ngoài, reset isClickedOpen
                  if (!newOpen) {
                    setIsClickedOpen(false);
                  }
                }}
              >
                <PopoverTrigger asChild>
                  {currentWorkspaceData.imageUrl ? (
                    <div className="w-9 h-9 rounded-lg">
                      <Avatar
                        src={currentWorkspaceData.imageUrl}
                        className="w-9 h-9 rounded-lg"
                      />
                    </div>
                  ) : (
                    <div className="text-center place-content-center cursor-pointer items-center text-black w-9 h-9 rounded-lg overflow-hidden bg-[#ABABAD] font-bold text-xl">
                      {currentWorkspaceData.name.slice(0, 1).toUpperCase()}
                    </div>
                  )}
                </PopoverTrigger>

                <PopoverContent
                  className="p-0 ml-1 w-[350px]"
                  side="bottom"
                  sideOffset={5}
                  align="end"
                >
                  {/* bridge for popover content */}
                  <div className="h-2 w-full bg-transparent -mb-2" />

                  <div className="border-0 py-2">
                    <div className="flex p-0 flex-col">
                      <div className="px-2 mb-2">
                        <Typography
                          variant="p"
                          text={currentWorkspaceData.name}
                          className="text-md font-semibold"
                        />
                      </div>
                      <Separator />
                      {switchingWorkspace ? (
                        <div className="m-2 dark:hover:bg-[#2b2e35] cursor-pointer">
                          <ProgressBar />
                        </div>
                      ) : (
                        userWorkspacesData
                          .filter(
                            (workspace) =>
                              workspace.id !== currentWorkspaceData.id,
                          )
                          .map((workspace) => {
                            const isActive =
                              workspace.id === currentWorkspaceData.id;

                            return (
                              <div
                                key={workspace.id}
                                className={
                                  "flex items-center cursor-pointer px-2 py-1 flex gap-2 hover:bg-gray-200 dark:hover:bg-[#2b2e35] group transition-colors"
                                }
                                onClick={() =>
                                  !isActive && switchWorkspace(workspace.id)
                                }
                              >
                                {workspace.imageUrl ? (
                                  <Avatar
                                    src={workspace.imageUrl}
                                    className="w-9 h-9 rounded-lg group-hover:outline-2 dark:group-hover:outline-white group-hover:outline-offset-2"
                                  />
                                ) : (
                                  <div className="text-center place-content-center cursor-pointer items-center text-black w-9 h-9 rounded-lg  bg-[#ABABAD] font-bold text-xl group-hover:outline-2 dark:group-hover:outline-white group-hover:outline-offset-2">
                                    {workspace.name.slice(0, 1).toUpperCase()}
                                  </div>
                                )}

                                <div>
                                  <Typography
                                    variant="p"
                                    text={workspace.name}
                                    className="text-md font-semibold"
                                  />
                                </div>
                              </div>
                            );
                          })
                      )}
                      <Separator />

                      <Link
                        href="/create-workspace"
                        className="flex items-center gap-2 p-2 cursor-pointer hover:bg-gray-200 dark:hover:bg-[#2b2e35] transition-colors group"
                      >
                      <span className="flex items-center justify-center w-9 h-9 rounded-lg bg-gray-200 dark:bg-[#2b2e35] transition-colors group-hover:outline-2 dark:group-hover:outline-white group-hover:outline-offset-2">
                          <FaPlus />
                        </span>
                        <Typography variant="p" text="Add a Workspace" />
                      </Link>

                      {/* <CreateWorkspace /> */}
                    </div>
                  </div>
                </PopoverContent>
              </Popover>
            </div>
          </div>
        </li>
        <li
          onClick={() => router.push(`/workspace/${currentWorkspaceData.id}`)}
        >
          <div className="flex flex-col cursor-pointer items-center group">
            <div className="flex flex-col items-center cursor-pointer group">
              <div className={cn("p-2 rounded-lg hover:bg-[rgba(255,255,255,0.3)]", isHomePage ? "bg-[rgba(255,255,255,0.3)]" : "")}>
                {isHomePage ? (
                  <RiHome2Fill
                    size={20}
                    className="group-hover:scale-125 transition-all duration-300"
                  />
                ) : (
                  <RiHome2Line
                    size={20}
                    className="group-hover:scale-125 transition-all duration-300"
                  />
                )}
              </div>
              <Typography variant="p" text="Home" className="text-[11px]!" />
            </div>
          </div>
        </li>

        <li
          onClick={() => router.push(`/workspace/${currentWorkspaceData.id}/dms`)}
        >
          <div className="flex flex-col cursor-pointer items-center group">
            <div className="flex flex-col items-center cursor-pointer group">
              <div className={cn("relative p-2 rounded-lg hover:bg-[rgba(255,255,255,0.3)]", isDmsPage ? "bg-[rgba(255,255,255,0.3)]" : "")}>
                {dmUnreadCount > 0 && (
                  <span className="absolute -right-1 -top-1 min-w-5 h-5 px-1 rounded-full bg-[#e01e5a] text-white text-[11px] font-bold leading-5 text-center shadow-sm">
                    {dmUnreadCount > 99 ? "99+" : dmUnreadCount}
                  </span>
                )}
                {isDmsPage ? (
                  <PiChatsTeardropFill
                    size={20}
                    className="group-hover:scale-125 transition-all duration-300"
                  />
                ) : (
                  <PiChatsTeardrop
                    size={20}
                    className="group-hover:scale-125 transition-all duration-300"
                  />
                )}
              </div>
              <Typography variant="p" text="Dms" className="text-[11px]!" />
            </div>
          </div>
        </li>

        <li
          onClick={() => router.push(`/workspace/${currentWorkspaceData.id}/activity`)}
        >
          <div className="flex flex-col cursor-pointer items-center group">
            <div className="flex flex-col items-center cursor-pointer group">
            <div className={cn("relative p-2 rounded-lg hover:bg-[rgba(255,255,255,0.3)]", isActivityPage ? "bg-[rgba(255,255,255,0.3)]" : "")}>
                {unreadCount > 0 && (
                  <span className="absolute -right-1 -top-1 min-w-5 h-5 px-1 rounded-full bg-[#e01e5a] text-white text-[11px] font-bold leading-5 text-center shadow-sm">
                    {unreadCount > 99 ? "99+" : unreadCount}
                  </span>
                )}
                {isActivityPage ? (
                  <TbBellFilled
                    size={20}
                    className="group-hover:scale-125 transition-all duration-300"
                  />
                ) : (
                  <TbBell
                    size={20}
                    className="group-hover:scale-125 transition-all duration-300"
                  />
                )}
              </div>
              <Typography
                variant="p"
                text="Activity"
                className="text-[11px]!"
              />
            </div>
          </div>
        </li>

        <li
          onClick={() => router.push(`/workspace/${currentWorkspaceData.id}/files`)}
        >
          <div className="flex flex-col cursor-pointer items-center group">
            <div className="flex flex-col items-center cursor-pointer group">
              <div className={cn("p-2 rounded-lg hover:bg-[rgba(255,255,255,0.3)]", isFilesPage ? "bg-[rgba(255,255,255,0.3)]" : "")}>
                <ImFilesEmpty
                  size={20}
                  className="group-hover:scale-125 transition-all duration-300"
                />
              </div>
              <Typography variant="p" text="Files" className="text-[11px]!" />
            </div>
          </div>
        </li>

        <li
          onClick={() => router.push(`/workspace/${currentWorkspaceData.id}/later`)}
        >
          <div className="flex flex-col cursor-pointer items-center group">
            <div className="flex flex-col items-center cursor-pointer group">
              <div className={cn("relative p-2 rounded-lg hover:bg-[rgba(255,255,255,0.3)]", isLaterPage ? "bg-[rgba(255,255,255,0.3)]" : "")}>
                {overdueCount > 0 && (
                  <span className="absolute -right-1 -top-1 min-w-5 h-5 px-1 rounded-full bg-[#e01e5a] text-white text-[11px] font-bold leading-5 text-center shadow-sm">
                    {overdueCount > 99 ? "99+" : overdueCount}
                  </span>
                )}
                {isLaterPage ? (
                  <MdBookmark
                    size={20}
                    className="group-hover:scale-125 transition-all duration-300"
                  />
                ) : (
                  <MdBookmarkBorder
                    size={20}
                    className="group-hover:scale-125 transition-all duration-300"
                  />
                )}
              </div>
              <Typography variant="p" text="Later" className="text-[11px]!" />
            </div>
          </div>
        </li>

        <Separator className="w-8 border-gray-600" />

        <li
          onClick={() => router.push(`/workspace/${currentWorkspaceData.id}/settings`)}
        >
          <div className="flex flex-col cursor-pointer items-center group">
            <div className="flex flex-col items-center cursor-pointer group">
              <div className="p-2 rounded-lg hover:bg-[rgba(255,255,255,0.3)]">
                <FiSettings
                  size={20}
                  className="group-hover:scale-125 transition-all duration-300"
                />
              </div>
              <Typography variant="p" text="Settings" className="text-[11px]!" />
            </div>
          </div>
        </li>
      </ul>
    </nav>
  );
};

export default WorkspaceSidebar;
