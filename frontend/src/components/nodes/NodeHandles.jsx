import React, { memo, useCallback, useEffect, useState } from 'react';
import { Handle, Position } from 'reactflow';
export const NodeTargetHandle = memo(({ id, data, handleId, handleClassName, nodeSelectorClassName }) => {

  return (
    <Handle
      id={handleId}
      type="target"
      position={Position.Left}
      className={handleClassName}
      isConnectable={true}
      style={{ width: '10px', height: '10px' }}
    >

    </Handle>
  );
});

export const NodeSourceHandle = memo(({ id, data, handleId, handleClassName, nodeSelectorClassName }) => {

  return (
    <Handle
      id={handleId}
      type="source"
      position={Position.Right}
      className={handleClassName}
      isConnectable={true}
      style={{ width: '10px', height: '10px' }}
    >
    </Handle>
  );
});