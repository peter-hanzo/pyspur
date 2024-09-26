import React, { useState, useCallback } from 'react';
import ReactFlow, {
  Background,
  Controls,
  MiniMap,
} from 'reactflow';
import 'reactflow/dist/style.css';
import useFlowStore from '../../store';
import TextFieldsNode from '../nodes/TextFieldsNode';
import Header from '../Header'; // Import the Header component
// Import other custom nodes as needed

const nodeTypes = {
  textfields: TextFieldsNode,
  // Add other node types here
};

const FlowCanvas = () => {
  const {
    nodes,
    edges,
    addNode,
    onNodesChange,
    onEdgesChange,
    onConnect,
  } = useFlowStore();

  const [reactFlowInstance, setReactFlowInstance] = useState(null);

  const onInit = useCallback((instance) => {
    setReactFlowInstance(instance);
  }, []);

  const addTextFieldsNode = useCallback(() => {
    if (!reactFlowInstance) return;

    const id = `${nodes.length + 1}`;
    const newNode = {
      id,
      type: 'textfields',
      position: reactFlowInstance.screenToFlowPosition({ x: 250, y: 5 }),
      data: { label: `TextFields Node ${id}` },
    };
    addNode(newNode);
  }, [addNode, nodes.length, reactFlowInstance]);

  return (
    <div style={{ width: '100%', height: '100vh' }}>

      <div style={{ paddingTop: '60px', width: '100%', height: 'calc(100vh - 60px)' }}> {/* Adjust padding and set width/height */}
        <button
          onClick={addTextFieldsNode}
          style={{ position: 'fixed', bottom: '20px', right: '20px' }}
        >
          Add TextFields Node
        </button>
        {/* Add buttons for other node types */}
        <div style={{ width: '100%', height: '100%' }}> {/* Ensure ReactFlow parent container has width and height */}
          <ReactFlow
            nodes={nodes}
            edges={edges}
            onNodesChange={onNodesChange}
            onEdgesChange={onEdgesChange}
            onConnect={onConnect}
            nodeTypes={nodeTypes}
            fitView
            onInit={onInit} // Pass onInit callback to ReactFlow
          >
            <Background />
            <Controls />
            <MiniMap />
          </ReactFlow>
        </div>
      </div>
    </div>
  );
};

export default FlowCanvas;
