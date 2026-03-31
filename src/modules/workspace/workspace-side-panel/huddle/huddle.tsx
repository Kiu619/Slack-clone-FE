"use client"

import Typography from '@/components/ui/typography'
import { RiHeadphoneLine } from 'react-icons/ri'

const Huddle = () => {
  return (
    <div className="flex items-center gap-x-2 px-3 py-1 hover:bg-[rgba(255,255,255,0.1)] cursor-pointer rounded-md">
      <RiHeadphoneLine size={20} className="text-workspace-side-panel-text" />
      <Typography text='Huddle' variant='p' className="text-[15px]! text-workspace-side-panel-text" />
    </div>
  )
}

export default Huddle
