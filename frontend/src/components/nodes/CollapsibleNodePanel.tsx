import React, { useState } from 'react';
import { Icon } from '@iconify/react';
import { Button, Accordion, AccordionItem, Divider } from '@nextui-org/react';
import { useSelector, useDispatch } from 'react-redux';
import { ReactFlowInstance, useReactFlow } from '@xyflow/react';
import TipPopup from '../TipPopUp';
import { AppDispatch, RootState } from '../../store/store';
import type { NodeType } from '../../store/nodeTypesSlice';
import { createNode } from '@/utils/nodeFactory';
import { addNode } from '@/store/flowSlice';

interface NodeTypesByCategory {
  [category: string]: NodeType[];
}

const CollapsibleNodePanel: React.FC = () => {
  const [isExpanded, setIsExpanded] = useState(false);
  const dispatch = useDispatch();
  const nodeTypes = useSelector((state: RootState) => state.nodeTypes.data as NodeTypesByCategory);
  const reactFlowInstance = useReactFlow();

  const addNodeWithoutConnection = (
    nodeTypes: Record<string, any>,
    nodeType: string,
    reactFlowInstance: ReactFlowInstance,
    dispatch: AppDispatch
  ): void => {
    const id = `node_${Date.now()}`;
    const center = reactFlowInstance.screenToFlowPosition({
      x: window.innerWidth / 2,
      y: window.innerHeight / 2,
    });
  
    const position = {
      x: center.x,
      y: center.y,
    };
  
    const newNode = createNode(nodeTypes, nodeType, id, position);
    dispatch(addNode({ node: newNode }));
  };

  const handleAddNode = (nodeName: string): void => {
    if (reactFlowInstance) {
      addNodeWithoutConnection(nodeTypes, nodeName, reactFlowInstance, dispatch);
    }
  };

  return (
    // className="fixed top-16 bottom-4 right-4 w-96 p-4 bg-white rounded-xl border border-solid border-gray-200 overflow-auto"
    <div className={`${!isExpanded ? 'w-24 h-24' : 'w-64 rounded-xl border border-solid border-gray-200'} transition-width duration-300 transition-height duration-300`}>
      <Button
        isIconOnly
        size="md"
        className="bg-white"
        onClick={() => setIsExpanded(!isExpanded)}
      >
        <Icon icon={isExpanded ? "solar:minus-square-linear" : "solar:widget-add-linear"} width={"80%"} className="text-default-500" />
      </Button>
      {isExpanded && (
        <>
          <Divider />
          <div className="mt-4 max-h-[calc(100vh-16rem)] overflow-auto" id="node-type-accordion">
            <Accordion selectionMode="multiple">
              {Object.keys(nodeTypes).map((category) => (
                <AccordionItem key={category} title={category}>
                  {nodeTypes[category].map((node: NodeType) => (
                    <div
                      key={node.name}
                      className="flex items-center cursor-pointer p-2 hover:bg-gray-100"
                      onClick={() => handleAddNode(node.name)}
                    >
                      <div className="w-16 flex-shrink-0">
                        <div
                          className={`node-acronym-tag float-left text-white px-2 py-1 rounded-full text-xs inline-block`}
                          style={{ backgroundColor: node.visual_tag.color }}
                        >
                          {node.visual_tag.acronym}
                        </div>
                      </div>
                      <span 
                        className="flex-grow overflow-hidden text-ellipsis whitespace-nowrap"
                        title={node.name}
                      >
                        {node.name}
                      </span>
                    </div>
                  ))}
                </AccordionItem>
              ))}
            </Accordion>
          </div>
        </>
      )}
    </div>
  );
};

export default CollapsibleNodePanel;

