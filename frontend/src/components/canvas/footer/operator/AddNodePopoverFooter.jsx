import React from 'react';
import { Icon } from '@iconify/react';
import { Button, Dropdown, DropdownTrigger, DropdownMenu, DropdownSection, DropdownItem } from '@nextui-org/react';
import { useSelector, useDispatch } from 'react-redux';
import { addNodeWithoutConnection } from '../../AddNodePopoverCanvas';
import { useReactFlow } from '@xyflow/react';
import TipPopup from '../../../TipPopUp';

const AddNodePopoverFooter = () => {
  const dispatch = useDispatch();
  const nodeTypes = useSelector((state) => state.nodeTypes.data);
  
  const reactFlowInstance = useReactFlow();

  const handleAddNode = (nodeName) => {
    if (reactFlowInstance) {
      addNodeWithoutConnection(nodeTypes, nodeName, reactFlowInstance, dispatch);
    }
  };

  return (
    <TipPopup title='Add Node' shortcuts={['shift', 'a']}>
      <Dropdown>
        <DropdownTrigger>
          <Button
            isIconOnly
            size="sm"
            className="bg-white"
          >
            <Icon icon="solar:add-square-linear" width={"80%"} className="text-default-500" />
          </Button>
        </DropdownTrigger>
        <DropdownMenu aria-label="Add Node Options">
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
    </TipPopup>
  );
};

export default AddNodePopoverFooter;
