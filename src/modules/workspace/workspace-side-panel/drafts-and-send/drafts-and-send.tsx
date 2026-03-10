"use client"

import Typography from '@/components/ui/typography'
import { VscSend } from 'react-icons/vsc'

const DratfsAndSend = () => {
  return (
    <div className="flex items-center gap-x-2 px-3 py-1 hover:bg-[#312235] cursor-pointer rounded-md">
      <VscSend size={20} className="text-workspace-side-panel-text" />
      <Typography text='Drafts and sent' variant='p' className="text-[15px]! text-workspace-side-panel-text" />
    </div>
  )
}

export default DratfsAndSend
