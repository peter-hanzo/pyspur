import React, { useEffect, useRef, useState } from 'react';
import { Handle } from '@xyflow/react';
import { useDispatch, useSelector } from 'react-redux';
import BaseNode from './BaseNode';
import { updateNodeData, setInputNodeValue } from '../../store/flowSlice';
import { Input, Button } from "@nextui-org/react";
import { Icon } from '@iconify/react';
import styles from './DynamicNode.module.css';

const InputNode = ({ id, data, ...props }) => {
  const dispatch = useDispatch();
  const [inputNodeValues, setInputNodeValues] = useState({});
  const nodeRef = useRef(null);
  const [nodeWidth, setNodeWidth] = useState('auto');

  // Get the latest node data from Redux store
  const currentNode = useSelector(state =>
    state.flow.nodes.find(node => node.id === id)
  );
  const nodeData = currentNode?.data || data || {};
  const inputSchema = nodeData?.userconfig?.input_schema || {};
  const hasInputSchema = Object.keys(inputSchema).length > 0;
  const [handlePosition, setHandlePosition] = useState('-12px');

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

      // Further increase padding to push handles completely to edge
      const nodePadding = 26; // Increased from 20
      const borderWidth = 2;
      setHandlePosition(`-${nodePadding + borderWidth}px`);

      setNodeWidth(`${finalWidth}px`);
    }
  }, [nodeData, inputSchema]);

  const handleInputChange = (key, value) => {
    setInputNodeValues({
      ...inputNodeValues,
      [key]: value
    });
    dispatch(setInputNodeValue({
      [id]: {
        ...inputNodeValues,
        [key]: value
      }
    }));
  };

  const handleAddField = () => {
    // Find the highest existing field number
    const existingFields = Object.keys(inputSchema)
      .filter(key => key.startsWith('field_'))
      .map(key => parseInt(key.replace('field_', '')))
      .filter(num => !isNaN(num));

    const highestNumber = Math.max(0, ...existingFields);
    const newFieldName = `field_${highestNumber + 1}`;

    const updatedSchema = {
      ...inputSchema,
      [newFieldName]: { type: 'string' }
    };

    // Create complete node data update
    const updatedData = {
      ...nodeData,
      userconfig: {
        ...nodeData.userconfig,
        input_schema: updatedSchema
      }
    };

    // Dispatch update
    dispatch(updateNodeData({
      id,
      data: updatedData
    }));

    // Initialize the input value for the new field
    const updatedValues = {
      ...inputNodeValues,
      [newFieldName]: ''
    };
    setInputNodeValues(updatedValues);
    dispatch(setInputNodeValue({
      [id]: updatedValues
    }));
  };

  const handleDeleteField = (keyToDelete) => {
    const { [keyToDelete]: _, ...updatedSchema } = inputSchema;

    dispatch(updateNodeData({
      id,
      data: {
        ...nodeData,
        userconfig: {
          ...nodeData.userconfig,
          input_schema: updatedSchema
        }
      }
    }));

    // Also clean up the input value for the deleted field
    const { [keyToDelete]: __, ...updatedValues } = inputNodeValues;
    setInputNodeValues(updatedValues);
    dispatch(setInputNodeValue({
      [id]: updatedValues
    }));
  };

  const renderEmptyState = () => (
    <div className="relative w-full px-4 py-2">
      <Input
        label="Configuration"
        labelPlacement="outside"
        placeholder="No input schema defined. Configure the node to add input fields."
        isReadOnly
        size="sm"
        variant="faded"
        radius="lg"
        classNames={{
          label: "text-sm font-medium text-default-600",
          input: "bg-default-100",
          inputWrapper: "shadow-none",
        }}
      />
      <div className={styles.outputHandleWrapper} style={{ right: handlePosition }}>
        <Handle
          type="source"
          position="right"
          id="default"
          className={`${styles.handle} ${styles.handleRight}`}
          isConnectable={true}
        />
      </div>
    </div>
  );

  const renderInputFields = () => {
    if (!hasInputSchema) {
      return renderEmptyState();
    }

    return Object.entries(inputSchema).map(([key, value], index) => (
      <div key={key} className="relative w-full px-4 py-2">
        <div className="flex items-center gap-2">
          <Input
            key={key}
            label={key}
            labelPlacement="outside"
            placeholder={`Enter ${key}`}
            value={inputNodeValues[key] || ''}
            onChange={(e) => handleInputChange(key, e.target.value)}
            size="sm"
            variant="faded"
            radius="lg"
            classNames={{
              label: "text-sm font-medium text-default-600",
              input: "bg-default-100",
              inputWrapper: "shadow-none",
            }}
          />
          <Button
            isIconOnly
            size="sm"
            variant="light"
            color="danger"
            onClick={() => handleDeleteField(key)}
            className="self-end mb-[2px]"
          >
            <Icon icon="solar:trash-bin-minimalistic-linear" width={16} />
          </Button>
        </div>
        <div className={styles.outputHandleWrapper} style={{ right: handlePosition }}>
          <Handle
            type="source"
            position="right"
            id={key}
            className={`${styles.handle} ${styles.handleRight}`}
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
        type="input"
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
          <div className="flex justify-center p-2">
            <Button
              isIconOnly
              size="sm"
              variant="light"
              onClick={handleAddField}
              className="text-default-400 hover:text-default-500"
            >
              <Icon icon="solar:add-circle-bold" width={16} className="text-default-500" />
            </Button>
          </div>
        </div>
      </BaseNode>
    </div>
  );
};

export default InputNode;
