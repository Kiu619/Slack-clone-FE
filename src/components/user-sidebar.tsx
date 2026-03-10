"use client"

import Avatar from '@/components/avatar'

// import CreateWorkspace from '@/components/create-workspace'
import {
  Popover,
  PopoverContent,
  PopoverTrigger
} from '@/components/ui/popover'
import Typography from '@/components/ui/typography'
import { cn } from '@/lib/utils'
import { useState } from 'react'
// import ProgressBar from './progress-bar'

import { FaPencil } from 'react-icons/fa6'
import { FiHash, FiPlus } from 'react-icons/fi'
import { GiNightSleep } from 'react-icons/gi'
import { GoDot, GoDotFill } from 'react-icons/go'
import { IoMdHeadset } from 'react-icons/io'
import { IoDiamondOutline } from 'react-icons/io5'

import {
  Tooltip,
  TooltipContent,
  TooltipTrigger
} from '@/components/ui/tooltip'
import { motion } from 'framer-motion'
import { LucideFilePlus2 } from 'lucide-react'
import Image from 'next/image'
import { BsCardChecklist } from 'react-icons/bs'
import { FaRegCalendarCheck } from 'react-icons/fa'
import { HiOutlinePencilAlt } from 'react-icons/hi'
import { MdOutlinePersonAddAlt } from 'react-icons/md'
import { User, Workspace } from '@/lib/types'
import { Separator } from './ui/separator'

const UserSidebar = ({ userData, currentWorkspaceData }: { userData: User, currentWorkspaceData: Workspace }) => {
  const [open, setOpen] = useState(false)
  return (
    <div className='flex flex-col space-y-3 items-center mb-3'>
      <div
        className={`
          bg-[rgba(139,132,132,0.3)] cursor-pointer transition-all duration-300
          hover:scale-110 text-white grid place-content-center rounded-full w-9 h-9
          `}
      >
        <Tooltip>

          <TooltipTrigger asChild>

            <div className="">
              <Popover open={open} onOpenChange={setOpen}>
                <PopoverTrigger asChild>
                  <motion.div
                    animate={{
                      rotate: open ? 45 : 0
                    }}
                    transition={{
                      type: 'spring',
                      stiffness: 300,
                      damping: 10,
                      mass: 1
                    }}
                    className="flex items-center justify-center"
                  >
                    <FiPlus size={26} />
                  </motion.div>
                </PopoverTrigger>

                <PopoverContent
                  side='right'
                  className='w-90 p-0 mb-2'
                  sideOffset={20}
                  align='center'
                  withOverlay={true}
                >
                  <div className=' text-white rounded-lg'>
                    <div className='px-4 py-2'>
                      <Typography text='Create' variant='h5' className='text-white font-semibold' />
                    </div>

                    <div className=''>
                      {/* Message */}
                      <div className='flex items-center gap-3 py-1 px-4 hover:bg-gray-700 cursor-pointer'>
                        <div className='w-10 h-10 bg-[#5F2568] rounded-full flex items-center justify-center'>
                          <HiOutlinePencilAlt size={20} className='text-white' />
                        </div>
                        <div>
                          <Typography text='Message' variant='p' />
                          <Typography text='Start a conversation in a DM or channel' variant='p' className='text-gray-400 text-sm' />
                        </div>
                      </div>

                      {/* Channel */}
                      <div className='flex items-center gap-3 py-1 px-4 hover:bg-gray-700 cursor-pointer'>
                        <div className='w-10 h-10 bg-[#323538] rounded-full flex items-center justify-center'>
                          <FiHash size={20} className='text-white' />
                        </div>
                        <div>
                          <Typography text='Channel' variant='p' />
                          <Typography text='Start a group conversation by topic' variant='p' className='text-gray-400 text-sm' />
                        </div>
                      </div>

                      {/* Huddle */}
                      <div className='flex items-center gap-3 py-1 px-4 hover:bg-gray-700 cursor-pointer'>
                        <div className='w-10 h-10 bg-[#00553D] rounded-full flex items-center justify-center'>
                          <IoMdHeadset size={20} className='text-white' />
                        </div>
                        <div>
                          <Typography text='Huddle' variant='p' />
                          <Typography text='Start a video or audio chat' variant='p' className='text-gray-400 text-sm' />
                        </div>
                      </div>

                      {/* Canvas */}
                      <div className='flex items-center gap-3 py-1 px-4 hover:bg-gray-700 cursor-pointer'>
                        <div className='w-10 h-10 bg-[#0B4379] rounded-full flex items-center justify-center'>
                          <LucideFilePlus2 size={20} className='text-white' />
                        </div>
                        <div className="flex justify-between flex-1 items-center">
                          <div>
                            <Typography text='Canvas' variant='p' />
                            <Typography text='Create and share content' variant='p' className='text-gray-400 text-sm' />
                          </div>
                          <span className='bg-[#bc80ce] text-black text-xs font-bold rounded px-1'>PRO</span>
                        </div>
                      </div>

                      {/* List */}
                      <div className='flex items-center gap-3 py-1 px-4 hover:bg-gray-700 cursor-pointer'>
                        <div className='w-10 h-10 bg-[#7C4C00] rounded-full flex items-center justify-center'>
                          <BsCardChecklist size={20} className='text-white' />
                        </div>
                        <div className="flex justify-between flex-1 items-center">
                          <div>
                            <Typography text='List' variant='p' />
                            <Typography text='Track and manage projects' variant='p' className='text-gray-400 text-sm' />
                          </div>
                          <span className='bg-[#bc80ce] text-black text-xs font-bold rounded px-1'>PRO</span>
                        </div>
                      </div>

                      {/* Separator */}
                      <hr className='border-gray-700' />

                      {/* Invite people */}
                      <div className='flex items-center gap-3 py-2 px-4 hover:bg-gray-700 cursor-pointer'>
                        <div className='w-10 h-10 flex items-center justify-center'>
                          <MdOutlinePersonAddAlt size={20} />
                        </div>
                        <div>
                          <Typography text='Invite people' variant='p' />
                        </div>
                      </div>
                    </div>
                  </div>
                </PopoverContent>
              </Popover>
            </div>

          </TooltipTrigger>

          <TooltipContent
            side='right'
            sideOffset={10}
          >
            <Typography text='Create new' variant='p' />
          </TooltipContent>
        </Tooltip>
      </div>
      <Tooltip>
        <TooltipTrigger asChild>
          <div>
            <Popover>
              <PopoverTrigger asChild>
                <div className='h-9 w-9 relative cursor-pointer'>
                  <div className='h-full w-full rounded-lg overflow-hidden'>
                    <Image
                      className='object-cover w-full h-full'
                      src={userData?.avatar || "https://a.slack-edge.com/bv1-13-br/ava_0002-72-c702398.png"}
                      alt={userData?.name || 'user'}
                      width={300}
                      height={300}
                    />
                    <div
                      className={cn(
                        'absolute z-10 rounded-full -right-[5%] -bottom-0.5',
                        userData?.isAway ? 'bg-red-500' : 'bg-green-500'
                      )}
                    >
                      {userData?.isAway ? (
                        <GoDot className='text-white text-xl' />
                      ) : (
                        <GoDotFill className='text-green-600' size={10} />
                      )}
                    </div>
                  </div>
                </div>
              </PopoverTrigger>
              <PopoverContent side='right' withOverlay={true}>
                <div className='py-2'>
                  <div className='flex space-x-3 px-5 py-2'>
                    <Avatar src={userData?.avatar || "https://a.slack-edge.com/bv1-13-br/ava_0002-72-c702398.png"} className='cursor-pointer w-9 h-9 rounded-lg' />
                    <div className='flex flex-col'>
                      <Typography
                        text={userData?.name || userData?.email || ''}
                        variant='p'
                        className='font-bold! text-sm!'
                      />
                      <div className='flex items-center space-x-1'>
                        {userData?.isAway ? (
                          <GiNightSleep size='12' />
                        ) : (
                          <GoDotFill className='text-green-600' size='17' />
                        )}
                        <span className='text-xs'>
                          {userData?.isAway ? 'Away' : 'Active'}
                        </span>
                      </div>
                    </div>
                  </div>

                  <div className='border group cursor-pointer px-2 py-1 mx-5 rounded flex items-center space-x-2'>
                    <FaRegCalendarCheck className='group-hover:hidden' />
                    <FaPencil className='hidden group-hover:block' />
                    <Typography
                      text={'In a meeting'}
                      variant='p'
                      className='text-xs text-gray-600'
                    />
                  </div>

                  <div className='flex flex-col space-y-1'>
                    <div className='hover:text-white hover:bg-blue-700 px-5 py-1 rounded cursor-pointer'>
                      <Typography
                        variant='p'
                        text={
                          userData?.isAway
                            ? 'Set yourself as active'
                            : 'Set yourself as away'
                        }
                      />
                    </div>
                    <Separator />
                    <div className='hover:text-white hover:bg-blue-700 px-5 py-1 rounded cursor-pointer'>
                      <Typography
                        variant='p'
                        text={'Profile'}
                      />
                    </div>

                    <div className='hover:text-white hover:bg-blue-700 px-5 py-1 rounded cursor-pointer'>
                      <Typography
                        variant='p'
                        text={'Preferences'}
                      />
                    </div>

                    <Separator />
                    <div className='flex gap-2 items-center hover:text-white hover:bg-blue-700 px-5 py-1 rounded cursor-pointer'>
                      <IoDiamondOutline className='text-orange-400' />
                      <Typography
                        variant='p'
                        text={`Upgrade ${currentWorkspaceData.name || ''}`}
                      />
                    </div>
                    <Typography
                      variant='p'
                      text={`Sign out of ${currentWorkspaceData.name || ''}`}
                      className='hover:text-white hover:bg-blue-700 px-5 py-1 rounded cursor-pointer'
                    />
                  </div>
                </div>
              </PopoverContent>
            </Popover>
          </div>
        </TooltipTrigger>
        <TooltipContent
          side='right'
        >
          <Typography text={userData?.name || userData?.email || ''} variant='p' />
        </TooltipContent>
      </Tooltip>
    </div>
  )
}

export default UserSidebar
