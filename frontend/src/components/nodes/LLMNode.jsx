import React from 'react';
import { Handle } from 'reactflow';
import BaseNode from './BaseNode';

const LLMNode = ({ data }) => {
  const handleChange = (event) => {
    data.onChange(event.target.value);
  };

  return (
    <BaseNode data={{ ...data, showTargetHandle: true, showSourceHandle: true }}>
      <textarea
        placeholder="Enter prompt"
        value={data.prompt || ''}
        onChange={handleChange}
        style={{ width: '200px', height: '100px' }}
      />
    </BaseNode>
  );
};

export default LLMNode;
