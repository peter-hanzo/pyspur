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
import LLMNode from '../nodes/LLMNode';

const nodeTypes = {
  textfields: TextFieldsNode,
  llmnode: LLMNode,
  // Add other node types here
};

const FlowCanvas = () => {
  const {
    nodes,
    edges,
    addNode,
    updateNodeData, // Add this line
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

  const onPromptChange = useCallback(
    (id, prompt) => {
      updateNodeData(id, { prompt });
    },
    [updateNodeData]
  );

  const addLLMNode = useCallback(() => {
    if (!reactFlowInstance) return;

    const id = `${nodes.length + 1}`;
    const newNode = {
      id,
      type: 'llmnode',
      position: reactFlowInstance.project({ x: 250, y: 5 }),
      data: {
        prompt: '',
        onChange: (prompt) => onPromptChange(id, prompt), // Ensure correct id
      },
    };
    addNode(newNode);
  }, [addNode, nodes.length, reactFlowInstance, onPromptChange]);

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
        <Button
          onClick={addLLMNode}
          css={{
            position: 'fixed',
            top: '60%',
            left: '20px',
            transform: 'translateY(-50%)',
            padding: '10px 20px',
            backgroundColor: '#28a745',
            color: '#fff',
            borderRadius: '4px',
            cursor: 'pointer',
            zIndex: '1000',
          }}
        >
          Add LLM Node
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
