import React from 'react';
import { Icon } from '@iconify/react';
import { Button, Dropdown, DropdownTrigger, DropdownMenu, DropdownSection, DropdownItem } from '@nextui-org/react';
import { useSelector, useDispatch } from 'react-redux';
import { addNodeWithoutConnection } from '../../AddNodePopoverCanvas';
import { useReactFlow } from '@xyflow/react';
import TipPopup from '../../../TipPopUp';
import { RootState } from '../../../../store/store';
import type { NodeType } from '../../../../store/nodeTypesSlice';

interface NodeTypesByCategory {
  [category: string]: NodeType[];
}

const AddNodePopoverFooter: React.FC = () => {
  const dispatch = useDispatch();
  const nodeTypes = useSelector((state: RootState) => state.nodeTypes.data as NodeTypesByCategory);

  const reactFlowInstance = useReactFlow();

  const handleAddNode = (nodeName: string): void => {
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
            <Icon icon="solar:add-circle-linear" width={16} className="text-default-500" />
          </Button>
        </DropdownTrigger>
        <DropdownMenu aria-label="Add Node Options">
          {Object.keys(nodeTypes).map((category) => (
            <DropdownSection key={category} title={category} showDivider>
              {nodeTypes[category].map((node: NodeType) => (
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