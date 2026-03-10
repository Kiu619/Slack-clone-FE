
import Typography from './ui/typography'
import Avatar from './avatar'

const Message = () => {
  return (
    <div className='flex items-center gap-x-2 m-2' key={"1"}>
      <Avatar src="https://ca.slack-edge.com/T0A8S4LT7PY-U0A8U5LCTPU-g39fcc9e8a40-48" className='cursor-pointer w-9 h-9 rounded-lg' />

      <div className='flex flex-col h-9 justify-between'>
        <Typography text={"kiuu"} variant='p' />
        <Typography text={"cố gắng lên Kiuu ơi"} variant='p' />
      </div>
    </div>
  )
}

export default Message
