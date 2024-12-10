import type { FC } from 'react'
import { memo, useEffect } from 'react'
import { Button } from '@nextui-org/react'
import { Icon } from "@iconify/react"
import { useDispatch, useSelector } from 'react-redux'
import { undo, redo } from '../../../store/flowSlice'
import { RootState } from '../../../store/store'
import TipPopup from './TipPopUp'

const useKeyboardShortcuts = (handleUndo: () => void, handleRedo: () => void) => {
  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      if ((event.ctrlKey || event.metaKey) && event.key === 'z') {
        event.preventDefault()
        if (event.shiftKey) {
          handleRedo()
        } else {
          handleUndo()
        }
      } else if ((event.ctrlKey || event.metaKey) && event.key === 'y') {
        event.preventDefault()
        handleRedo()
      }
    }

    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [handleUndo, handleRedo])
}

const UndoRedo: FC = () => {
  const dispatch = useDispatch()
  const history = useSelector((state: RootState) => state.flow.history)

  const handleUndo = () => {
    if (history.past.length > 0) {
      dispatch(undo())
    }
  }

  const handleRedo = () => {
    if (history.future.length > 0) {
      dispatch(redo())
    }
  }

  useKeyboardShortcuts(handleUndo, handleRedo)

  return (
    <>
      <TipPopup title='Undo' shortcuts={['ctrl', 'z']}>
        <Button
          size="sm"
          isIconOnly
          className="bg-background"
          data-tooltip-id='workflow.undo'
          onClick={handleUndo}
          isDisabled={history.past.length === 0}
        >
          <Icon icon="solar:undo-left-linear" width={16} className="text-default-600" />
        </Button>
      </TipPopup>
      <TipPopup title='Redo' shortcuts={['ctrl', 'y']}>
        <Button
          size="sm"
          isIconOnly
          className="bg-background"
          data-tooltip-id='workflow.redo'
          onClick={handleRedo}
          isDisabled={history.future.length === 0}
        >
          <Icon icon="solar:undo-right-linear" width={16} className="text-default-600" />
        </Button>
      </TipPopup>
    </>
  )
}

export default memo(UndoRedo)
