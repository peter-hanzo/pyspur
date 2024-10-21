import React from 'react';
import { Handle } from 'reactflow';
import { useSelector, useDispatch } from 'react-redux';
import { Input, Textarea } from '@nextui-org/react';
import BaseNode from './BaseNode';
import { updateNodeData } from '../../store/flowSlice';
import JsonEditor from '../JsonEditor';
import CodeEditor from '../CodeEditor';

const DynamicNode = ({ id, type }) => {
  const dispatch = useDispatch();
  const node = useSelector((state) => state.flow.nodes.find((n) => n.id === id));
  const nodeTypes = useSelector((state) => state.flow.nodeTypes);
  const nodeSchema = nodeTypes.find((n) => n.name === type);

  const handleInputChange = (key, value) => {
    dispatch(updateNodeData({ id, data: { ...node.data, [key]: value } }));
  };

  const renderInputField = (key, field) => {
    const value = node.data[key];

    switch (field.type) {
      case 'string':
        return (
          <Input
            key={key}
            label={field.title || key}
            value={value || ''}
            onChange={(e) => handleInputChange(key, e.target.value)}
            fullWidth
            size="sm"
          />
        );
      case 'integer':
      case 'number':
        return (
          <Input
            key={key}
            type="number"
            label={field.title || key}
            value={value || 0}
            onChange={(e) => handleInputChange(key, parseFloat(e.target.value))}
            fullWidth
            size="sm"
          />
        );
      case 'boolean':
        return (
          <Input
            key={key}
            type="checkbox"
            label={field.title || key}
            checked={value || false}
            onChange={(e) => handleInputChange(key, e.target.checked)}
            size="sm"
          />
        );
      case 'object':
        return (
          <JsonEditor
            key={key}
            label={field.title || key}
            jsonValue={value || {}}
            onChange={(newValue) => handleInputChange(key, newValue)}
          />
        );
      case 'code':
        return (
          <CodeEditor
            key={key}
            label={field.title || key}
            code={value || ''}
            onChange={(newValue) => handleInputChange(key, newValue)}
          />
        );
      default:
        return null;
    }
  };

  const renderFields = () => {
    if (!nodeSchema || !nodeSchema.config || !nodeSchema.config.properties) return null;

    return Object.entries(nodeSchema.config.properties).map(([key, field]) => (
      <div key={key} className="mb-2">
        {renderInputField(key, field)}
      </div>
    ));
  };

  const renderHandles = () => {
    const inputs = node.data.inputs || 1;
    const outputs = node.data.outputs || 1;

    return (
      <>
        {[...Array(inputs)].map((_, index) => (
          <Handle
            key={`input-${index}`}
            type="target"
            position="top"
            id={`input-${index}`}
            style={{ left: `${(index + 1) * 100 / (inputs + 1)}%` }}
          />
        ))}
        {[...Array(outputs)].map((_, index) => (
          <Handle
            key={`output-${index}`}
            type="source"
            position="bottom"
            id={`output-${index}`}
            style={{ left: `${(index + 1) * 100 / (outputs + 1)}%` }}
          />
        ))}
      </>
    );
  };

  return (
    <BaseNode id={id}>
      <Handle type="target" position="top" />
      <div className="p-2">
        <h3 className="text-lg font-semibold mb-2">{type}</h3>
        {renderFields()}
      </div>
      <Handle type="source" position="bottom" />
    </BaseNode>
  );
};

export default DynamicNode;