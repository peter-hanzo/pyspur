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
  const [editingField, setEditingField] = useState(null);
  const [newFieldValue, setNewFieldValue] = useState('');

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
    if (!newFieldValue.trim()) return;

    const newFieldName = newFieldValue.trim();

    // Check if field already exists
    if (inputSchema[newFieldName]) {
      // Could add error handling here
      return;
    }

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

    // Clear the input
    setNewFieldValue('');
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

  const handleLabelEdit = (key, newLabel) => {
    if (newLabel === key || !newLabel.trim()) {
      setEditingField(null);
      return;
    }

    // Create new schema with updated key
    const updatedSchema = Object.entries(inputSchema).reduce((acc, [k, v]) => {
      if (k === key) {
        acc[newLabel] = v;
      } else {
        acc[k] = v;
      }
      return acc;
    }, {});

    // Update node data with new schema
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

    // Update input values with new key
    const updatedValues = { ...inputNodeValues };
    updatedValues[newLabel] = updatedValues[key];
    delete updatedValues[key];
    setInputNodeValues(updatedValues);
    dispatch(setInputNodeValue({
      [id]: updatedValues
    }));

    setEditingField(null);
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
          {editingField === key ? (
            <Input
              autoFocus
              defaultValue={key}
              size="sm"
              variant="faded"
              radius="lg"
              onBlur={(e) => handleLabelEdit(key, e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter') {
                  handleLabelEdit(key, e.target.value);
                } else if (e.key === 'Escape') {
                  setEditingField(null);
                }
              }}
              classNames={{
                input: "bg-default-100",
                inputWrapper: "shadow-none",
              }}
            />
          ) : (
            <div className="flex flex-col w-full gap-1">
              <div className="flex items-center justify-between">
                <span
                  className="text-sm font-medium text-default-600 cursor-pointer hover:text-primary"
                  onClick={() => setEditingField(key)}
                >
                  {key}
                </span>
                <Button
                  isIconOnly
                  size="sm"
                  variant="light"
                  color="danger"
                  onClick={() => handleDeleteField(key)}
                >
                  <Icon icon="solar:trash-bin-minimalistic-linear" width={16} />
                </Button>
              </div>
            </div>
          )}
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

  const renderAddField = () => (
    <div className="flex items-center gap-2 px-4 py-2">
      <Input
        placeholder="Enter new field name"
        value={newFieldValue}
        onChange={(e) => setNewFieldValue(e.target.value)}
        size="sm"
        variant="faded"
        radius="lg"
        onKeyDown={(e) => {
          if (e.key === 'Enter') {
            handleAddField();
          }
        }}
        classNames={{
          input: "bg-default-100",
          inputWrapper: "shadow-none",
        }}
        endContent={
          <Button
            isIconOnly
            size="sm"
            variant="light"
            onClick={handleAddField}
            className="text-default-400 hover:text-default-500"
          >
            <Icon icon="solar:add-circle-bold" width={16} className="text-default-500" />
          </Button>
        }
      />
    </div>
  );

  return (
    <div style={{ position: 'relative' }}>
      <BaseNode
        id={id}
        type="input"
        data={{
          ...nodeData,
          acronym: 'IN',
          color: '#2196F3',
        }}
        style={{ width: nodeWidth }}
        {...props}
      >
        <div className={styles.nodeWrapper} ref={nodeRef}>
          {renderInputFields()}
          {renderAddField()}
        </div>
      </BaseNode>
    </div>
  );
};

export default InputNode;
