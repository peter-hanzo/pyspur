import React from 'react';
import { RiAddCircleFill } from '@remixicon/react';
import { Card, Popover, PopoverTrigger, PopoverContent, Button } from '@nextui-org/react';
import { nodeTypes } from '../../../../constants/nodeTypes'; // Import nodeTypes
import { useDispatch } from 'react-redux';
import { addNodeWithoutConnection } from '../../AddNodePopoverCanvas';
import { useReactFlow } from 'reactflow';
import { Dropdown, DropdownTrigger, DropdownMenu, DropdownSection, DropdownItem } from '@nextui-org/react';

const AddNodePopoverFooter = () => {
  const reactFlowInstance = useReactFlow();
  const dispatch = useDispatch();

  return (
    <Card className='h-12 flex items-center justify-center'>
      <div className='flex items-center text-gray-500'>
        <Dropdown>
          <DropdownTrigger>
            <Button color='white'>
              <RiAddCircleFill />
            </Button>
          </DropdownTrigger>
          <DropdownMenu>
            {Object.keys(nodeTypes).map((category) => (
              <DropdownSection key={category} title={category} showDivider>
                {nodeTypes[category].map((node) => (
                  <DropdownItem key={node.name} onClick={() => addNodeWithoutConnection(node.name, reactFlowInstance, dispatch)}>
                    {node.name}
                  </DropdownItem>
                ))}
              </DropdownSection>
            ))}
          </DropdownMenu>
        </Dropdown>
      </div>
    </Card>
  );
};

export default AddNodePopoverFooter;
