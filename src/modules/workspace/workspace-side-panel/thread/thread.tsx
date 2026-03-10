"use client"

import Typography from '@/components/ui/typography'
import { BiMessageSquareDetail } from 'react-icons/bi'

const Thread = () => {
  return (
    <div className="flex items-center gap-x-2 px-3 py-1 hover:bg-[#312235] cursor-pointer rounded-md">
      <BiMessageSquareDetail size={20} className="text-workspace-side-panel-text" />
      <Typography text='Threads' variant='p' className="text-[15px]! text-workspace-side-panel-text" />
    </div>
  )
}

export default Thread
