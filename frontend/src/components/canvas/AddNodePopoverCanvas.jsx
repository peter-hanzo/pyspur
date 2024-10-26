import React, { useState } from 'react';
import { Button } from '@nextui-org/react';
import { nodeTypes } from '../../constants/nodeTypes'; // Import nodeTypes
import { addNode, connect, deleteEdge } from '../../store/flowSlice';

// Refactored handleSelectNode function
export const addNodeWithoutConnection = (nodeType, reactFlowInstance, dispatch, setVisible) => {
  const id = `${reactFlowInstance.getNodes().length + 1}`;
  const newNode = {
    id,
    type: nodeType,
    position: reactFlowInstance.project({ x: 250, y: 5 }),
    data: { label: `Node ${id}` },
  };

  dispatch(addNode({ node: newNode }));
  setVisible(false);
};

// Function to add a node between two existing nodes and delete the existing edge
export const addNodeBetweenNodes = (nodeType, sourceNode, targetNode, edgeId, reactFlowInstance, dispatch, setVisible) => {
  const id = `${reactFlowInstance.getNodes().length + 1}`;

  // Calculate the position between the source and target nodes
  const newPosition = reactFlowInstance.project({
    x: (sourceNode.position.x + targetNode.position.x) / 2,
    y: (sourceNode.position.y + targetNode.position.y) / 2,
  });

  const newNode = {
    id,
    type: nodeType,
    position: newPosition,
    data: { label: `Node ${id}` },
  };

  // Delete the specific edge by its ID
  dispatch(deleteEdge({ edgeId }));

  // Dispatch the action to add the new node
  dispatch(addNode({ node: newNode }));

  // Use the connect action to add edges between the new node and the source/target nodes
  dispatch(connect({ connection: { source: sourceNode.id, target: newNode.id } }));
  dispatch(connect({ connection: { source: newNode.id, target: targetNode.id } }));

  setVisible(false);
};

const AddNodePopoverCanvasContent = ({ handleSelectNode }) => {
  const [selectedCategory, setSelectedCategory] = useState(null); // Track selected category

  const handleCategorySelect = (category) => {
    setSelectedCategory(category);
  };

  return (
    <div className='p-4 flex flex-col space-y-2'>
      <div className='flex flex-col space-y-2'>
        <h3 className='text-sm font-semibold'>Blocks</h3>
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
    </div>
  );
};

export default AddNodePopoverCanvasContent;
