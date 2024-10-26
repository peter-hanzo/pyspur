import React from 'react';
import { RiAddCircleFill } from '@remixicon/react';
import { Card, Popover, PopoverTrigger, PopoverContent, Button } from '@nextui-org/react';
import { useSelector, useDispatch } from 'react-redux';
import { useNodeSelector } from '../../../../hooks/useNodeSelector';
import AddNodePopoverCanvasContent, { addNodeWithoutConnection } from '../../AddNodePopoverCanvas';
import { useReactFlow } from 'reactflow';

const AddNodePopoverFooter = () => {
  const reactFlowInstance = useReactFlow();


  const dispatch = useDispatch();

  return (
    <Card className='h-12 flex items-center justify-center'>
      <div className='flex items-center text-gray-500'>
        <Popover placement="bottom" showArrow={true}>
          <PopoverTrigger>
            <Button color='white'>
              <RiAddCircleFill />
            </Button>
          </PopoverTrigger>
          <PopoverContent>
            <AddNodePopoverCanvasContent
              handleSelectNode={(nodeType) => addNodeWithoutConnection(nodeType, reactFlowInstance, dispatch)}
            />
          </PopoverContent>
        </Popover>
      </div>
    </Card>
  );
};

export default AddNodePopoverFooter;
