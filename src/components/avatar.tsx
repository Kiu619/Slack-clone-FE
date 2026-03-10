import { Avatar as AvatarComponent, AvatarImage } from "@/components/ui/avatar"
import { cn } from "@/lib/utils"

const Avatar = ({ src, className }: { src: string, className?: string | undefined }) => {
  return (
    <div className={cn("flex flex-col space-y-3 items-center w-6 h-6 overflow-hidden", className)}>
      <AvatarComponent
        className='object-cover w-full h-full rounded-none!'
      >
        <AvatarImage src={src} alt="avatar" />
      </AvatarComponent>
    </div>
  )
}

export default Avatar
