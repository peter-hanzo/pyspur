import React from 'react';
import { Icon } from '@iconify/react';
import { Button, Dropdown, DropdownTrigger, DropdownMenu, DropdownSection, DropdownItem } from '@nextui-org/react';
import { nodeTypes } from '../../../../constants/nodeTypes';
import { useDispatch } from 'react-redux';
import { addNodeWithoutConnection } from '../../AddNodePopoverCanvas';
import { useReactFlow } from '@xyflow/react';

const AddNodePopoverFooter = () => {
  const reactFlowInstance = useReactFlow();
  const dispatch = useDispatch();

  const handleAddNode = (nodeName) => {
    if (reactFlowInstance) {
      addNodeWithoutConnection(nodeName, reactFlowInstance, dispatch);
    }
  };

  return (
    <Dropdown>
      <DropdownTrigger>
        <Button
          isIconOnly
          size="sm"
          className="bg-white"
        >
          <Icon icon="solar:add-circle-bold" width={16} className="text-default-500" />
        </Button>
      </DropdownTrigger>
      <DropdownMenu>
        {Object.keys(nodeTypes).map((category) => (
          <DropdownSection key={category} title={category} showDivider>
            {nodeTypes[category].map((node) => (
              <DropdownItem
                key={node.name}
                onClick={() => handleAddNode(node.name)}
              >
                {node.name}
              </DropdownItem>
            ))}
          </DropdownSection>
        ))}
      </DropdownMenu>
    </Dropdown>
  );
};

export default AddNodePopoverFooter;
