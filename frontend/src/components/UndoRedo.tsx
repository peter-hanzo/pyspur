import type { FC } from 'react'
import { memo, useState } from 'react'
import { Button } from '@nextui-org/react'
import { Icon } from "@iconify/react"
import TipPopup from './TipPopUp'

export type UndoRedoProps = { handleUndo: () => void; handleRedo: () => void }
const UndoRedo: FC<UndoRedoProps> = ({ handleUndo, handleRedo }) => {
  const [buttonsDisabled, setButtonsDisabled] = useState({ undo: true, redo: true })

  return (
    <>
      <TipPopup title='Undo' shortcuts={['ctrl', 'z']}>
        <Button
          size="sm"
          isIconOnly
          className="bg-white"
          data-tooltip-id='workflow.undo'
        >
          <Icon icon="solar:undo-left-linear" width={16} className="text-default-500" />
        </Button>
      </TipPopup>
      <TipPopup title='Redo' shortcuts={['ctrl', 'y']}>
        <Button
          size="sm"
          isIconOnly
          className="bg-white"
          data-tooltip-id='workflow.redo'
        >
          <Icon icon="solar:undo-right-linear" width={16} className="text-default-500" />
        </Button>
      </TipPopup>
    </>
  )
}

export default memo(UndoRedo)
