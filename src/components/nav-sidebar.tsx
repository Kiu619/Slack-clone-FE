"use client"

import Avatar from '@/components/avatar'
import { PiChatsTeardrop } from 'react-icons/pi'
import { RiHome2Fill } from 'react-icons/ri'
import { TfiBell } from 'react-icons/tfi'

// import CreateWorkspace from '@/components/create-workspace'
import {
  Popover,
  PopoverContent,
  PopoverTrigger
} from '@/components/ui/popover'
import { Separator } from '@/components/ui/separator'
import Typography from '@/components/ui/typography'
import { BsThreeDots } from 'react-icons/bs'
import { ImFilesEmpty } from 'react-icons/im'
import { useRef, useState } from 'react'
// import ProgressBar from './progress-bar'
import { Workspace } from '@/lib/types'
// import { useRouter } from 'next/navigation'
import ProgressBar from './progress-bar'
import { toast } from 'sonner'
import { Copy } from 'lucide-react'
import { FaPlus } from 'react-icons/fa'
import Link from 'next/link'

interface WorkspaceSidebarProps {
  currentWorkspaceData: Workspace
  userWorkspacesData: Workspace[]
}

const WorkspaceSidebar = ({ currentWorkspaceData, userWorkspacesData }: WorkspaceSidebarProps) => {

  // const router = useRouter()
  const [open, setOpen] = useState(false)
  const [isClickedOpen, setIsClickedOpen] = useState(false)
  const timeoutRef = useRef<NodeJS.Timeout | null>(null)
  const [switchingWorkspace, setSwitchingWorkspace] = useState(false)

  const switchWorkspace = (id: string) => {
    setSwitchingWorkspace(true)
    // router.push(`/workspace/${id}`)
    setSwitchingWorkspace(true)
  }

  const copyInviteLink = (inviteCode: string) => {
    const currentDomain = window.location.origin

    navigator.clipboard.writeText(
      `${currentDomain}/create-workspace/${inviteCode}`
    )

    toast.success('Invite link copied to clipboard')
  }

  const handleMouseEnter = () => {
    // Chỉ hoạt động khi chưa được click mở
    if (!isClickedOpen) {
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current)
      }
      setOpen(true)
    }
  }

  const handleMouseLeave = () => {
    // Chỉ hoạt động khi chưa được click mở
    if (!isClickedOpen) {
      timeoutRef.current = setTimeout(() => {
        setOpen(false)
      }, 200)
    }
  }

  const handleClick = () => {
    if (isClickedOpen) {
      // Nếu đang mở bằng click, thì đóng và reset
      setOpen(false)
      setIsClickedOpen(false)
    } else {
      // Nếu chưa mở hoặc mở bằng hover, thì mở bằng click
      setOpen(true)
      setIsClickedOpen(true)
      // Clear timeout nếu có
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current)
      }
    }
  }
  return (
    <nav>
      <ul className='flex flex-col space-y-4 items-center mt-3'>
        <li>
          <div
            className='relative pb-2'
            onMouseEnter={handleMouseEnter}
            onMouseLeave={handleMouseLeave}
            onClick={handleClick}
          >
            <div className='flex cursor-pointer items-center w-9 h-9 rounded-lg overflow-hidden'>
              <Popover
                open={open}
                onOpenChange={(newOpen) => {
                  setOpen(newOpen)
                  // Nếu popover đóng từ bên ngoài, reset isClickedOpen
                  if (!newOpen) {
                    setIsClickedOpen(false)
                  }
                }}
              >
                <PopoverTrigger asChild>
                  {currentWorkspaceData.imageUrl ? (
                    <div className='w-9 h-9 rounded-lg'>
                      <Avatar src={currentWorkspaceData.imageUrl} className='w-9 h-9 rounded-lg' />
                    </div>
                  ) : (
                    <div className='text-center place-content-center cursor-pointer items-center text-black w-9 h-9 rounded-lg overflow-hidden bg-[#ABABAD] font-bold text-xl'>
                      {currentWorkspaceData.name.slice(0, 1).toUpperCase()}
                    </div>
                  )}
                </PopoverTrigger>

                <PopoverContent
                  className='p-0 ml-1 w-[350px]'
                  side='bottom'
                  sideOffset={5}
                  align='end'

                >
                  {/* bridge for popover content */}
                  <div className='h-2 w-full bg-transparent -mb-2' />

                  <div className='border-0 py-2'>
                    <div className='flex p-0 flex-col'>

                      <div className='px-2 mb-2 hover:bg-[#323539] cursor-pointer'>
                        <Typography
                          variant='p'
                          text={currentWorkspaceData.name}
                          className='text-sm'
                        />
                        <div className='flex items-center gap-x-2'>
                          <Typography
                            variant='p'
                            text='Copy Invite Link'
                            className='text-xs lg:text-xs'
                          />
                          <Copy
                            onClick={(e: React.MouseEvent<SVGSVGElement>) => {
                              e.stopPropagation()
                              copyInviteLink(currentWorkspaceData.inviteCode!)
                            }}
                            size={18}
                            className='text-white'
                          />
                        </div>
                      </div>
                      <Separator />
                      {switchingWorkspace ? (
                        <div className='m-2 hover:bg-[#323539] cursor-pointer'>
                          <ProgressBar />
                        </div>
                      ) : (
                        userWorkspacesData
                          .filter(
                            workspace => workspace.id !== currentWorkspaceData.id
                          )
                          .map(workspace => {
                            const isActive =
                              workspace.id === currentWorkspaceData.id

                            return (
                              <div
                                key={workspace.id}
                                className={
                                  'cursor-pointer px-2 py-1 flex gap-2 hover:bg-[#323539] group transition-colors'
                                }
                                onClick={() =>
                                  !isActive && switchWorkspace(workspace.id)
                                }
                              >
                                {workspace.imageUrl ? (
                                  <Avatar
                                    src={workspace.imageUrl}
                                    className='w-9 h-9 rounded-lg group-hover:outline-2 group-hover:outline-white group-hover:outline-offset-2'
                                  />
                                ) : (
                                  <div className='text-center place-content-center cursor-pointer items-center text-black w-9 h-9 rounded-lg  bg-[#ABABAD] font-bold text-xl group-hover:outline-2 group-hover:outline-white group-hover:outline-offset-2'>
                                    {workspace.name.slice(0, 1).toUpperCase()}
                                  </div>
                                )}

                                <div>
                                  <Typography
                                    variant='p'
                                    text={workspace.name}
                                    className='text-sm'
                                  />
                                  <div className='flex items-center gap-x-2'>
                                    <Typography
                                      variant='p'
                                      text='Copy Invite Link'
                                      className='text-xs lg:text-xs'
                                    />
                                    <Copy
                                      onClick={(
                                        e: React.MouseEvent<SVGSVGElement>
                                      ) => {
                                        e.stopPropagation()
                                        copyInviteLink(workspace.inviteCode!)
                                      }}
                                      size={18}
                                    />
                                  </div>
                                </div>
                              </div>
                            )
                          })
                      )}
                      <Separator />

                      <Link href="/create-workspace" className="flex items-center gap-2 p-2 cursor-pointer hover:bg-[#2b2e35] transition-colors group">
                        <span className='flex items-center justify-center w-9 h-9 rounded-lg bg-[#2b2e35] transition-colors group-hover:outline-2 group-hover:outline-white group-hover:outline-offset-2'>
                          <FaPlus />
                        </span>
                        <Typography variant='p' text='Add a Workspace' />
                      </Link>

                      {/* <CreateWorkspace /> */}

                    </div>
                  </div>
                </PopoverContent>
              </Popover>
            </div>
          </div>
        </li>
        <li>
          <div className='flex flex-col cursor-pointer items-center group'>
            <div className='flex flex-col items-center cursor-pointer group'>
              <div className='p-2 rounded-lg bg-[rgba(255,255,255,0.3)]'>
                <RiHome2Fill
                  size={20}
                  className='group-hover:scale-125 transition-all duration-300'
                />
              </div>
              <Typography
                variant='p'
                text='Home'
                className='text-[11px]!'
              />
            </div>
          </div>
        </li>

        <li>
          <div className='flex flex-col cursor-pointer items-center group'>
            <div className='flex flex-col items-center cursor-pointer group'>
              <div className='p-2 rounded-lg hover:bg-[rgba(255,255,255,0.3)]'>
                <PiChatsTeardrop
                  size={20}
                  className='group-hover:scale-125 transition-all duration-300'
                />
              </div>
              <Typography
                variant='p'
                text='Dms'
                className='text-[11px]!'
              />
            </div>
          </div>
        </li>

        <li>
          <div className='flex flex-col cursor-pointer items-center group'>
            <div className='flex flex-col items-center cursor-pointer group'>
              <div className='p-2 rounded-lg hover:bg-[rgba(255,255,255,0.3)]'>
                <TfiBell
                  size={20}
                  className='group-hover:scale-125 transition-all duration-300'
                />
              </div>
              <Typography
                variant='p'
                text='Activity'
                className='text-[11px]!'
              />

            </div>
          </div>
        </li>

        <li>
          <div className='flex flex-col cursor-pointer items-center group'>
            <div className='flex flex-col items-center cursor-pointer group'>
              <div className='p-2 rounded-lg hover:bg-[rgba(255,255,255,0.3)]'>
                <ImFilesEmpty
                  size={20}
                  className='group-hover:scale-125 transition-all duration-300'
                />
              </div>
              <Typography
                variant='p'
                text='Files'
                className='text-[11px]!'
              />

            </div>
          </div>
        </li>

        <li>
          <div className='flex flex-col cursor-pointer items-center group'>
            <div className='flex flex-col items-center cursor-pointer group'>
              <div className='p-2 rounded-lg hover:bg-[rgba(255,255,255,0.3)]'>
                <BsThreeDots
                  size={20}
                  className='group-hover:scale-125 transition-all duration-300'
                />
              </div>
              <Typography
                variant='p'
                text='More'
                className='text-[11px]!'
              />

            </div>
          </div>
        </li>
      </ul>
    </nav>
  )
}

export default WorkspaceSidebar
