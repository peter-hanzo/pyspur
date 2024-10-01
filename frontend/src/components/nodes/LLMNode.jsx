import React from 'react';
import { Handle } from 'reactflow';
import BaseNode from './BaseNode';
import { useSelector, useDispatch } from 'react-redux';
import { Input } from '@nextui-org/react'; // Import NextUI Input component

function LLMNode({ id }) {
  const dispatch = useDispatch();

  // Find the node data from the Redux state
  const node = useSelector((state) => state.flow.nodes.find((n) => n.id === id));

  const updateNodeData = (data) => {
    dispatch({ type: 'UPDATE_NODE_DATA', payload: { id, data } });
  };

  // Handler for prompt text field change
  const handlePromptChange = (event) => {
    updateNodeData({ ...node.data, prompt: event.target.value });
  };

  return (
    <BaseNode id={id}>
      {/* Existing component logic */}
      <Handle type="target" position="top" />
      <Handle type="source" position="bottom" />

      {/* NextUI Text Field for Prompt */}
      <Input
        clearable
        underlined
        fullWidth
        label="Prompt"
        placeholder="Enter your prompt..."
        value={node.data.prompt || ''}
        onChange={handlePromptChange}
        css={{ marginTop: '10px' }} // Optional styling
      />
    </BaseNode>
  );
}

export default LLMNode;