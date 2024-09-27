import React from 'react';
import BaseNode from './BaseNode';

const TextFieldsNode = ({ data }) => {
  return (
    <BaseNode data={{ ...data, showTargetHandle: true, showSourceHandle: true }}>
      <div>{data.label}</div>
      {/* Add your text fields or other UI elements here */}
    </BaseNode>
  );
};

export default TextFieldsNode;