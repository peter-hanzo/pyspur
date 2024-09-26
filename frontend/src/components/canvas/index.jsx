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
import { Button } from '@nextui-org/react';

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
      <div style={{ width: '100%', height: 'calc(100vh - 60px)' }}>
        <Button
          onClick={addTextFieldsNode}
          css={{
            position: 'fixed',
            top: '50%',
            left: '20px',
            transform: 'translateY(-50%)',
            padding: '10px 20px',
            backgroundColor: '#007bff',
            color: '#fff',
            borderRadius: '4px',
            cursor: 'pointer',
            zIndex: '1000', // Ensures the button stays above the canvas
          }}
        >
          Add TextFields Node
        </Button>
        <div style={{ width: '100%', height: '100%' }}>
          <ReactFlow
            nodes={nodes}
            edges={edges}
            onNodesChange={onNodesChange}
            onEdgesChange={onEdgesChange}
            onConnect={onConnect}
            nodeTypes={nodeTypes}
            fitView
            onInit={onInit}
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
