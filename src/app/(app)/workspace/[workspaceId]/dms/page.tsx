import { DmRouteResume } from '@/modules/direct-messages/dm-route-resume'
import Image from 'next/image'

export default function DMsPage() {
  return (
    <div className="flex h-full w-full items-center justify-center">
      <DmRouteResume />
      <Image
        src="/dms-bg.svg"
        alt="DM Background"
        width={360}
        height={360}
        className="opacity-80"
      />
    </div>
  )
}
