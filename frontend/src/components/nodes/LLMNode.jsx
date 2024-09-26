import React from 'react';
import { Handle } from 'reactflow';

const LLMNode = ({ data }) => {
  const handleChange = (event) => {
    data.onChange(event.target.value);
  };

  return (
    <div
      className="llm-node"
      style={{
        padding: '10px',
        border: '1px solid #ddd',
        borderRadius: '4px',
        background: '#fff',
      }}
    >
      <textarea
        placeholder="Enter prompt"
        value={data.prompt || ''}
        onChange={handleChange}
        style={{ width: '200px', height: '100px' }}
      />
      <Handle type="target" position="left" style={{ background: '#555' }} />
      <Handle type="source" position="right" style={{ background: '#555' }} />
    </div>
  );
};

export default LLMNode;
