import React, { useState, useCallback } from 'react';
import ReactFlow, {
  Background,
  Controls,
  MiniMap,
} from 'reactflow';
import 'reactflow/dist/style.css';
import useFlowStore from '../../store';
import TextFieldsNode from '../nodes/TextFieldsNode';
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
      position: reactFlowInstance.project({ x: 250, y: 5 }),
      data: { label: `TextFields Node ${id}` },
    };
    addNode(newNode);
  }, [addNode, nodes.length, reactFlowInstance]);

  return (
    <div style={{ width: '100%', height: '100vh' }}>
      <button onClick={addTextFieldsNode}>Add TextFields Node</button>
      {/* Add buttons for other node types */}
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
  );
};

export default FlowCanvas;
