import Image from 'next/image'

export default function LaterPage() {
  return (
    <div className="flex h-full w-full items-center justify-center">
      <Image 
        src="/empty-later-bg.svg"
        alt="Later Background"
        width={360}
        height={360}
        className="opacity-80"
      />
    </div>
  )
}
