import React, { useState } from 'react';
import { RiAddCircleFill } from '@remixicon/react';
import { Card, Popover, PopoverTrigger, PopoverContent, Button } from '@nextui-org/react';
import { useSelector, useDispatch } from 'react-redux';

import { useNodeSelector } from '../../../../hooks/useNodeSelector';
import AddNodePopoverCanvasContent, { addNodeWithoutConnection } from '../../AddNodePopoverCanvas'; // Import the refactored function


const AddNodePopoverFooter = () => {
  const reactFlowInstance = useSelector((state) => state.flow.reactFlowInstance); // Retrieve reactFlowInstance from the store
  const { visible, setVisible } = useNodeSelector(reactFlowInstance);
  const dispatch = useDispatch();

  return (
    <Card className='h-12 flex items-center justify-center'>
      <div className='flex items-center text-gray-500'>
        <Popover placement="bottom" showArrow={true} isOpen={visible} onOpenChange={setVisible}>
          <PopoverTrigger>
            <Button color='white'>
              <RiAddCircleFill />
            </Button>
          </PopoverTrigger>
          <PopoverContent>
            <AddNodePopoverCanvasContent
              handleSelectNode={(nodeType) => addNodeWithoutConnection(nodeType, reactFlowInstance, dispatch, setVisible)}
            />
          </PopoverContent>
        </Popover>
      </div>
    </Card>
  );
};

export default AddNodePopoverFooter;
