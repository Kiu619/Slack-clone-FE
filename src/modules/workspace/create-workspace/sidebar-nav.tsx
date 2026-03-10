"use client"

import { RiHome2Fill } from 'react-icons/ri'

import Typography from '@/components/ui/typography'
import { useCreateWorkspaceValues } from '@/stores/useCreateWorkspaceStore'
import { BsThreeDots } from 'react-icons/bs'
import Avatar from '@/components/avatar'

const SidebarNav = () => {

  const { name, imageUrl } = useCreateWorkspaceValues()
  return (
    <nav>
      <ul className='flex flex-col space-y-4 items-center mt-3'>
        <li>
          <div
            className='relative pb-2'
          >
            {imageUrl ? (
              <div className='w-9 h-9 rounded-lg'>
                <Avatar src={imageUrl} className='w-9 h-9 rounded-lg' />
              </div>
            ) : (
              <div className='text-center place-content-center cursor-pointer items-center text-black w-9 h-9 rounded-lg overflow-hidden bg-[#ABABAD] font-bold text-xl'>
                {name.slice(0, 1).toUpperCase()}
              </div>
            )}
          </div>
        </li>
        <li>
          <div className='flex flex-col cursor-pointer items-center group text-white'>
            <div className='flex flex-col items-center cursor-pointer group text-white  opacity-40'>
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
          <div className='flex flex-col cursor-pointer items-center group text-white  opacity-40'>
            <div className='flex flex-col items-center cursor-pointer group text-white'>
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

export default SidebarNav
