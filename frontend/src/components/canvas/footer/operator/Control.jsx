import React from 'react';
import { RiAddCircleFill } from '@remixicon/react';
import { useReactFlow } from 'reactflow';

const Control = () => {
  const reactFlowInstance = useReactFlow();

  const handleAddNode = () => {
    const id = `${reactFlowInstance.getNodes().length + 1}`;
    const newNode = {
      id,
      type: 'textfields', // Replace with your node type
      position: reactFlowInstance.project({ x: 250, y: 5 }),
      data: { label: `Node ${id}` },
    };
    reactFlowInstance.addNodes(newNode);
  };

  return (

    <div className='flex items-center p-0.5 rounded-lg border-[0.5px] border-gray-100 bg-white shadow-lg text-gray-500'>
      <button onClick={handleAddNode}>
        <RiAddCircleFill />
        Add Node
      </button>
    </div>
  );
};

export default Control;