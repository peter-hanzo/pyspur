import React from 'react';
import { Handle } from 'reactflow';
import { useSelector } from 'react-redux';
import BaseNode from './BaseNode';

const DynamicNode = ({ id, type }) => {
  const node = useSelector((state) => state.flow.nodes.find((n) => n.id === id));

  const renderHandles = () => {
    const inputSchema = node.data.config.input_schema || {};
    const outputSchema = node.data.config.output_schema || {};
    
    const inputs = Object.keys(inputSchema).length || 1;
    const outputs = Object.keys(outputSchema).length || 1;

    return (
      <>
        {Object.entries(inputSchema).length > 0 ? (
          Object.entries(inputSchema).map(([key, value], index) => (
            <div key={`input-${index}`} className="flex items-center">
              <Handle
                type="target"
                position="left"
                id={`input-${key}`}
                style={{ top: `${(index + 1) * 100 / (inputs + 1)}%` }}
              />
              <span className="text-xs ml-2">{key}</span>
            </div>
          ))
        ) : (
          <Handle
            type="target"
            position="left"
            id="input-default"
            style={{ top: '50%' }}
          />
        )}
        
        {Object.entries(outputSchema).length > 0 ? (
          Object.entries(outputSchema).map(([key, value], index) => (
            <div key={`output-${index}`} className="flex items-center justify-end">
              <span className="text-xs mr-2">{key}</span>
              <Handle
                type="source"
                position="right"
                id={`output-${key}`}
                style={{ top: `${(index + 1) * 100 / (outputs + 1)}%` }}
              />
            </div>
          ))
        ) : (
          <Handle
            type="source"
            position="right"
            id="output-default"
            style={{ top: '50%' }}
          />
        )}
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
