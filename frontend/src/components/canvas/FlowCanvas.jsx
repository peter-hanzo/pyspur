import React, { useState, useCallback, useMemo } from 'react';
import ReactFlow, {
  Background,
  Controls,
  MiniMap,
} from 'reactflow';
import 'reactflow/dist/style.css';
import useFlowStore from '../../store/flowStore';
import TextFieldsNode from '../nodes/TextFieldsNode';
import Header from '../Header'; // Import the Header component

import { Button } from '@nextui-org/react';
import LLMNode from '../nodes/LLMNode';
import Operator from './footer/operator/Operator'; // Adjust the path based on your file structure

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
    hoveredNode, // Get hoveredNode from useFlowStore
  } = useFlowStore();

  const [reactFlowInstance, setReactFlowInstance] = useState(null);

  const styledEdges = useMemo(() => {
    return edges.map((edge) => {
      if (edge.source === hoveredNode || edge.target === hoveredNode) {
        return {
          ...edge,
          style: { stroke: 'red', strokeWidth: 2 }, // Highlighted edge style
        };
      }
      return edge;
    });
  }, [edges, hoveredNode]);

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
      position: reactFlowInstance.screenToFlowPosition({ x: 250, y: 5 }),
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
        {/* Remove existing floating buttons if replacing them with the footer bar */}
        {/* ... existing code ... */}
        <div style={{ width: '100%', height: '100%' }}>
          <ReactFlow
            nodes={nodes}
            edges={styledEdges}
            onNodesChange={onNodesChange}
            onEdgesChange={onEdgesChange}
            onConnect={onConnect}
            nodeTypes={nodeTypes}
            fitView
            onInit={onInit}
          >
            <Background />

            <Operator />
          </ReactFlow>
        </div>
      </div>
    </div>
  );
};

export default FlowCanvas;
