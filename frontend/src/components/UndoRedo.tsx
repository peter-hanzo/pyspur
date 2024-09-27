import type { FC } from 'react'
import { memo, useEffect, useState } from 'react'

import {
  RiArrowGoBackLine,
  RiArrowGoForwardFill,
  RiHistoryLine, // Add this import
} from '@remixicon/react'
import TipPopup from './TipPopUp'

export type UndoRedoProps = { handleUndo: () => void; handleRedo: () => void }
const UndoRedo: FC<UndoRedoProps> = ({ handleUndo, handleRedo }) => {

  const [buttonsDisabled, setButtonsDisabled] = useState({ undo: true, redo: true })


  return (
    <div className='flex items-center p-0.5 rounded-lg border-[0.5px] border-gray-100 bg-white shadow-lg text-gray-500'>
      <TipPopup title='Undo' shortcuts={['ctrl', 'z']}>
        <div
          data-tooltip-id='workflow.undo'
          className='flex items-center px-1.5 w-8 h-8 rounded-md text-[13px] font-medium hover:bg-black/5 hover:text-gray-700 cursor-pointer select-none'
        >
          <RiArrowGoBackLine className='h-4 w-4' />
        </div>
      </TipPopup>
      <TipPopup title='Redo' shortcuts={['ctrl', 'y']}>
        <div
          data-tooltip-id='workflow.redo'
          className='flex items-center px-1.5 w-8 h-8 rounded-md text-[13px] font-medium hover:bg-black/5 hover:text-gray-700 cursor-pointer select-none'
        >
          <RiArrowGoForwardFill className='h-4 w-4' />
        </div>
      </TipPopup>
      <div className="mx-[3px] w-[1px] h-3.5 bg-gray-200"></div>
      <div className='flex items-center px-1.5 w-8 h-8 rounded-md text-[13px] font-medium hover:bg-black/5 hover:text-gray-700 cursor-pointer select-none'>
        <RiHistoryLine className='h-4 w-4' /> {/* Updated to use the icon */}
      </div>
    </div>
  )
}

export default memo(UndoRedo)
