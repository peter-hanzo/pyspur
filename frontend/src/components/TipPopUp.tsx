import { memo } from 'react'
import { Tooltip } from '@nextui-org/react'

type TipPopupProps = {
  title: string
  children: React.ReactNode
  shortcuts?: string[]
}
const TipPopup = ({
  title,
  children,
  shortcuts,
}: TipPopupProps) => {
  return (
    <Tooltip
      content={
        <div className='flex items-center gap-1 px-2 h-6 text-xs font-medium text-gray-700 rounded-lg border-[0.5px] border-black/5'>
          {title}
        </div>
      }
    >
      {children}
    </Tooltip>
  )
}

export default memo(TipPopup)
