import React, { memo } from 'react';
import ZoomInOut from './ZoomInOut';
import AddNodePopoverFooter from './AddNodePopoverFooter';
import { MiniMap } from '@xyflow/react';
import UndoRedo from '../../../UndoRedo';
import { Button, ButtonGroup } from '@nextui-org/react';
import { useSelector } from 'react-redux';
import { useGroupNodes } from '../../../../hooks/useGroupNodes';
import { Icon } from "@iconify/react";
import { useModeStore } from '../../../../store/modeStore';

function Operator() {
  const nodes = useSelector(state => state.flow.nodes);
  const { onGroup } = useGroupNodes();
  const mode = useModeStore((state) => state.mode);
  const setMode = useModeStore((state) => state.setMode);

  return (
    <>
      <MiniMap
        style={{
          width: 102,
          height: 72,
        }}
        className='!absolute !left-4 !bottom-14 z-[9] !m-0 !w-[102px] !h-[72px] !border-[0.5px] !border-black/8 !rounded-lg !shadow-lg'
      />
      <div className='flex items-center mt-1 gap-2 absolute left-4 bottom-4 z-[9]'>
        <ButtonGroup>
          <Button
            size="sm"
            isIconOnly
            onClick={() => setMode('pointer')}
            className={mode === 'pointer' ? 'bg-default-100' : ''}
          >
            <Icon
              className="text-default-500"
              icon="solar:cursor-bold"
              width={16}
            />
          </Button>
          <Button
            size="sm"
            isIconOnly
            onClick={() => setMode('hand')}
            className={mode === 'hand' ? 'bg-default-100' : ''}
          >
            <Icon
              className="text-default-500"
              icon="solar:hand-shake-linear"
              width={16}
            />
          </Button>
        </ButtonGroup>
        <ZoomInOut />
        <UndoRedo handleUndo={null} handleRedo={null} />
        <AddNodePopoverFooter />
        <Button
          size="sm"
          onClick={onGroup}
          disabled={nodes.filter(node => node.selected && !node.parentId).length <= 1}
          className="bg-default-100 min-w-unit-16"
        >
          Group
        </Button>
      </div>
    </>
  );
}

export default memo(Operator);