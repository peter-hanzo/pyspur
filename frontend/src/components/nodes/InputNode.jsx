import React, { useEffect, useRef, useState } from 'react';
import { Handle } from '@xyflow/react';
import { useDispatch } from 'react-redux';
import BaseNode from './BaseNode';
import { updateNodeData } from '../../store/flowSlice';
import { Input } from "@nextui-org/react";
import styles from './DynamicNode.module.css';

const InputNode = ({ id, data, ...props }) => {
  const dispatch = useDispatch();
  const nodeData = data || {};
  const nodeRef = useRef(null);
  const [nodeWidth, setNodeWidth] = useState('auto');

  // Get input schema from node data
  const inputSchema = nodeData?.userconfig?.input_schema || {};

  // Calculate node width based on content
  useEffect(() => {
    if (nodeRef.current) {
      const inputLabels = Object.keys(inputSchema);
      const maxLabelLength = Math.max(
        ...inputLabels.map(label => label.length),
        (nodeData?.title || '').length / 1.5
      );

      const calculatedWidth = Math.max(300, maxLabelLength * 15);
      const finalWidth = Math.min(calculatedWidth, 600);
      console.log('finalWidth', finalWidth);
      setNodeWidth(`${finalWidth}px`);
    }
  }, [nodeData, inputSchema]);

  const handleInputChange = (key, value) => {
    const updatedConfig = {
      ...nodeData.userconfig,
      [key]: value
    };

    dispatch(updateNodeData({
      id,
      data: {
        ...nodeData,
        userconfig: updatedConfig
      }
    }));
  };

  const renderInputFields = () => {
    return Object.entries(inputSchema).map(([key, value], index) => (
      <div key={key} className="relative w-full px-4 py-2">
        <Input
          key={key}
          label={key}
          labelPlacement="outside"
          placeholder={`Enter ${key}`}
          value={nodeData.userconfig[key] || ''}
          onChange={(e) => handleInputChange(key, e.target.value)}
          size="sm"
          variant="faded"
          radius="lg"
          classNames={{
            label: "text-sm font-medium text-default-600",
            input: "bg-default-100",
            inputWrapper: "shadow-none", // Remove the black contour
          }}
        />
        {/* Position the handle to the right of each input */}
        <div className="absolute right-0 top-1/2 -translate-y-1/2">
          <Handle
            type="source"
            position="right"
            id={key}
            className="w-3 h-3 rounded-full bg-blue-500 border-2 border-white"
            style={{ right: -6 }}
            isConnectable={true}
          />
        </div>
      </div>
    ));
  };

  return (
    <div style={{
      position: 'relative',
    }}>
      <BaseNode
        id={id}
        type="InputNode"
        data={{
          ...nodeData,
          acronym: 'IN',
          color: '#2196F3',
          // Blue color for input nodes
        }}
        style={{ width: nodeWidth }}
        {...props}
      >
        <div className={styles.nodeWrapper} ref={nodeRef}>
          {renderInputFields()}
        </div>
      </BaseNode>
    </div>
  );
};

export default InputNode;
