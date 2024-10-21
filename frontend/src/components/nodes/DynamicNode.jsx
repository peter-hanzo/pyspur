import React from 'react';
import { Handle } from 'reactflow';
import { useSelector } from 'react-redux';
import BaseNode from './BaseNode';

const DynamicNode = ({ id, type }) => {
  const node = useSelector((state) => state.flow.nodes.find((n) => n.id === id));

  const renderHandles = () => {
    const inputs = node.data.inputs || 1;
    const outputs = node.data.outputs || 1;

    return (
      <>
        {[...Array(inputs)].map((_, index) => (
          <Handle
            key={`input-${index}`}
            type="target"
            position="left"
            id={`input-${index}`}
            style={{ top: `${(index + 1) * 100 / (inputs + 1)}%` }}
          />
        ))}
        {[...Array(outputs)].map((_, index) => (
          <Handle
            key={`output-${index}`}
            type="source"
            position="right"
            id={`output-${index}`}
            style={{ top: `${(index + 1) * 100 / (outputs + 1)}%` }}
          />
        ))}
      </>
    );
  };

  return (
    <BaseNode id={id}>
      {renderHandles()}
      <div className="p-2">
        <h3 className="text-lg font-semibold">{type}</h3>
        <p className="text-sm text-gray-500">ID: {id}</p>
      </div>
    </BaseNode>
  );
};

export default DynamicNode;
