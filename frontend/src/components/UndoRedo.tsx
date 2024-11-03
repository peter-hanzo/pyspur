import type { FC } from 'react'
import { memo, useState } from 'react'
import { Card } from '@nextui-org/react'
import { Icon } from "@iconify/react"
import TipPopup from './TipPopUp'

export type UndoRedoProps = { handleUndo: () => void; handleRedo: () => void }
const UndoRedo: FC<UndoRedoProps> = ({ handleUndo, handleRedo }) => {
  const [buttonsDisabled, setButtonsDisabled] = useState({ undo: true, redo: true })

  return (
    <Card className='h-12 flex items-center justify-center'>
      <div className='flex items-center text-gray-500'>
        <TipPopup title='Undo' shortcuts={['ctrl', 'z']}>
          <div
            data-tooltip-id='workflow.undo'
            className='flex items-center px-1.5 w-8 h-8 rounded-md text-[13px] font-medium hover:bg-black/5 hover:text-gray-700 cursor-pointer select-none'
          >
            <Icon icon="solar:undo-left-linear" width={16} className="text-default-500" />
          </div>
        </TipPopup>
        <TipPopup title='Redo' shortcuts={['ctrl', 'y']}>
          <div
            data-tooltip-id='workflow.redo'
            className='flex items-center px-1.5 w-8 h-8 rounded-md text-[13px] font-medium hover:bg-black/5 hover:text-gray-700 cursor-pointer select-none'
          >
            <Icon icon="solar:undo-right-linear" width={16} className="text-default-500" />
          </div>
        </TipPopup>
        <div className="mx-[3px] w-[1px] h-3.5 bg-gray-200"></div>
        <div className='flex items-center px-1.5 w-8 h-8 rounded-md text-[13px] font-medium hover:bg-black/5 hover:text-gray-700 cursor-pointer select-none'>
          <Icon icon="solar:history-linear" width={16} className="text-default-500" />
        </div>
      </div>
    </Card>
  )
}

export default memo(UndoRedo)
