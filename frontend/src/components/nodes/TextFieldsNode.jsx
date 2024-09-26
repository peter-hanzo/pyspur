import React from 'react';
import { Handle } from 'reactflow';

const TextFieldsNode = ({ data }) => {
  return (
    <div className="text-fields-node">
      <Handle type="target" position="top" />
      <div>{data.label}</div>
      {/* Add your text fields or other UI elements here */}
      <Handle type="source" position="bottom" />
    </div>
  );
};

export default TextFieldsNode;