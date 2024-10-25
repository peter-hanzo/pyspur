import React, { useState } from 'react';
import { RiAddCircleFill } from '@remixicon/react';
import { Card, Popover, PopoverTrigger, PopoverContent, Button } from '@nextui-org/react';
import { useSelector, useDispatch } from 'react-redux';
import { addNode } from '../../../../store/flowSlice';
import { nodeTypes } from '../../../../constants/nodeTypes'; // Import nodeTypes
import { useReactFlow } from 'reactflow';


const Control = () => {
  const reactFlowInstance = useReactFlow();
  const [visible, setVisible] = useState(false);
  const [selectedCategory, setSelectedCategory] = useState(null); // Track selected category
  const dispatch = useDispatch();
  const hoveredNode = useSelector((state) => state.hoveredNode);

  const handleSelectNode = (nodeType) => {
    const id = `${reactFlowInstance.getNodes().length + 1}`;
    const newNode = {
      id,
      type: nodeType,
      position: reactFlowInstance.project({ x: 250, y: 5 }),
      data: { label: `Node ${id}` },
    };

    dispatch(addNode({ node: newNode }));
    setVisible(false);
    setSelectedCategory(null); // Reset category selection
  };

  const handleCategorySelect = (category) => {
    setSelectedCategory(category);
  };

  return (
    <Card className='h-12 flex items-center justify-center'>
      <div className='flex items-center text-gray-500'>
        <Popover placement="bottom" showArrow={true} isOpen={visible} onOpenChange={setVisible}>
          <PopoverTrigger>
            <Button auto light>
              <RiAddCircleFill />
            </Button>
          </PopoverTrigger>
          <PopoverContent>
            <div className='p-4 flex flex-col space-y-2'>
              {!selectedCategory ? (
                // Display categories
                Object.keys(nodeTypes).map((category) => (
                  <Button key={category} auto light onClick={() => handleCategorySelect(category)}>
                    {category}
                  </Button>
                ))
              ) : (
                // Display nodes within the selected category
                <div className='flex flex-col space-y-2'>
                  <Button auto light onClick={() => setSelectedCategory(null)}>Back to Categories</Button>
                  {nodeTypes[selectedCategory].map((node) => (
                    <Button key={node.name} auto light onClick={() => handleSelectNode(node.name)}>
                      {node.name}
                    </Button>
                  ))}
                </div>
              )}
            </div>
          </PopoverContent>
        </Popover>
      </div>
    </Card>
  );
};

export default Control;
