import React from 'react';
import { Handle } from 'reactflow';

const BaseNode = ({ data, children, style }) => {
  return (
    <div
      className="base-node"
      style={{
        padding: '10px',
        border: '1px solid #ddd',
        borderRadius: '4px',
        background: '#fff',
        ...style,
      }}
    >
      {children}
      {data.showTargetHandle && (
        <Handle type="target" position="left" style={{ background: '#555' }} />
      )}
      {data.showSourceHandle && (
        <Handle type="source" position="right" style={{ background: '#555' }} />
      )}
    </div>
  );
};

export default BaseNode;