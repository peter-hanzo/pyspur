import React, { useState, useEffect, useCallback } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { RootState } from '../../../store/store';
import {
  updateNodeData,
  selectNodeById,
  setSidebarWidth,
  setSelectedNode,
} from '../../../store/flowSlice';
import NumberInput from '../../NumberInput';
import CodeEditor from '../../CodeEditor';
import { jsonOptions } from '../../../constants/jsonOptions';
import FewShotEditor from '../../textEditor/FewShotEditor';
import TextEditor from '../../textEditor/TextEditor';
import {
  Button,
  Slider,
  Switch,
  Textarea,
  Input,
  Select,
  SelectItem,
  Accordion,
  AccordionItem,
  Card,
} from '@nextui-org/react';
import { Icon } from '@iconify/react';
import NodeOutput from '../NodeOutputDisplay';
import SchemaEditor from './SchemaEditor';
import { selectPropertyMetadata } from '../../../store/nodeTypesSlice';
import { cloneDeep, set, debounce } from 'lodash';

// Define types for props and state
interface NodeSidebarProps {
  nodeID: string;
}

interface NodeSchema {
  name: string;
  config: {
    [key: string]: any;
    title?: string;
    type?: string;
    input_schema?: Record<string, any>;
    output_schema?: Record<string, any>;
    system_message?: string;
    user_message?: string;
    few_shot_examples?: Array<{
      input: string;
      output: string;
    }>;
  };
}

interface DynamicModel {
  [key: string]: any;
  title?: string;
  type?: string;
  input_schema?: Record<string, any>;
  output_schema?: Record<string, any>;
  system_message?: string;
  user_message?: string;
  few_shot_examples?: Array<{
    input: string;
    output: string;
  }>;
}

interface FieldMetadata {
  enum?: string[];
  default?: any;
  title?: string;
  minimum?: number;
  maximum?: number;
  type?: string;
}

interface NodeType {
  name: string;
  config: Record<string, any>;
}

interface NodeData {
  config?: DynamicModel;
  run?: any;
  type?: string;
  id?: string;
}

interface Node {
  type: string;
  id: string;
  data: NodeData;
}

type NodeTypes = Record<string, NodeType[]>;

// Update the `findNodeSchema` function to resolve the "used before declaration" error
const findNodeSchema = (nodeType: string, nodeTypes: NodeTypes): NodeSchema | null => {
  if (!nodeTypes) return null;

  for (const category in nodeTypes) {
    const nodeSchema = nodeTypes[category]?.find((n: NodeType) => n.name === nodeType);
    if (nodeSchema) {
      return nodeSchema;
    }
  }
  return null;
};

const NodeSidebar: React.FC<NodeSidebarProps> = ({ nodeID }) => {
  const dispatch = useDispatch();
  const nodeTypes = useSelector((state: RootState) => state.nodeTypes.data);
  const node = useSelector((state: RootState) => selectNodeById(state, nodeID));
  const storedWidth = useSelector((state: RootState) => state.flow.sidebarWidth);
  const metadata = useSelector((state: RootState) => state.nodeTypes.metadata);

  const hasRunOutput = !!node?.data?.run;

  const [width, setWidth] = useState<number>(storedWidth);
  const [isResizing, setIsResizing] = useState<boolean>(false);

  const [nodeType, setNodeType] = useState<string>(node?.type || 'ExampleNode');
  const [nodeSchema, setNodeSchema] = useState<NodeSchema | null>(
    findNodeSchema(node?.type || 'ExampleNode', nodeTypes)
  );
  const [dynamicModel, setDynamicModel] = useState<DynamicModel>(node?.data?.config || {});
  const [fewShotIndex, setFewShotIndex] = useState<number | null>(null);

  // Create a debounced version of the dispatch update
  const debouncedDispatch = useCallback(
    debounce((id: string, updatedModel: DynamicModel) => {
      dispatch(updateNodeData({ id, data: { config: updatedModel } }));
    }, 300),
    [dispatch]
  );

  // Update dynamicModel when nodeID changes
  useEffect(() => {
    if (node) {
      setNodeType(node.type || 'ExampleNode');
      setNodeSchema(findNodeSchema(node.type || 'ExampleNode', nodeTypes));
      setDynamicModel(node.data?.config || {});
    }
  }, [nodeID, node, nodeTypes]);

  // Helper function to update nested object by path
  const updateNestedModel = (obj: DynamicModel, path: string, value: any): DynamicModel => {
    const deepClone = cloneDeep(obj);
    set(deepClone, path, value);
    return deepClone;
  };

  // Update the input change handler to use local state immediately but debounce Redux updates for Slider
  const handleInputChange = (key: string, value: any, isSlider: boolean = false) => {
    let updatedModel: DynamicModel;

    if (key.includes('.')) {
      updatedModel = updateNestedModel(dynamicModel, key, value);
    } else {
      updatedModel = { ...dynamicModel, [key]: value };
    }

    setDynamicModel(updatedModel);

    if (isSlider) {
      debouncedDispatch(nodeID, updatedModel);
    } else {
      dispatch(updateNodeData({ id: nodeID, data: { config: updatedModel } }));
    }
  };

  const renderEnumSelect = (
    key: string,
    label: string,
    enumValues: string[],
    fullPath: string,
    defaultSelected?: string
  ) => {
    const lastTwoDots = fullPath.split('.').slice(-2).join('.');
    return (
      <div key={key}>
        <Select
          label={label}
          defaultSelectedKeys={[defaultSelected || dynamicModel[key] || '']}
          onChange={(e) => handleInputChange(lastTwoDots, e.target.value)}
          fullWidth
        >
          {enumValues.map((option) => (
            <SelectItem key={option} value={option}>
              {option}
            </SelectItem>
          ))}
        </Select>
      </div>
    );
  };

  const handleAddNewExample = () => {
    const updatedExamples = [...(dynamicModel?.few_shot_examples || []), { input: '', output: '' }];
    handleInputChange('few_shot_examples', updatedExamples);
    setFewShotIndex(updatedExamples.length - 1);
  };

  const handleDeleteExample = (index: number) => {
    const updatedExamples = [...(dynamicModel?.few_shot_examples || [])];
    updatedExamples.splice(index, 1);
    handleInputChange('few_shot_examples', updatedExamples);
  };

  // Update the `getFieldMetadata` function
  const getFieldMetadata = (fullPath: string): FieldMetadata | undefined => {
    return selectPropertyMetadata({ nodeTypes: { metadata } }, fullPath);
  };

  // Update the `renderField` function to include missing cases
  const renderField = (
    key: string,
    field: any,
    value: any,
    parentPath: string = '',
    isLast: boolean = false
  ) => {
    const fullPath = `${parentPath ? `${parentPath}.` : ''}${key}`;
    const fieldMetadata = getFieldMetadata(fullPath);

    // Handle enum fields
    if (fieldMetadata?.enum) {
      const defaultSelected = value || fieldMetadata.default;
      return renderEnumSelect(key, fieldMetadata.title || key, fieldMetadata.enum, fullPath, defaultSelected);
    }

    // Handle specific cases for input_schema, output_schema, and system_prompt
    if (key === 'input_schema') {
      return (
        <div key={key} className="my-2">
          <label className="font-semibold mb-1 block">Input Schema</label>
          <SchemaEditor
            jsonValue={dynamicModel.input_schema || {}}
            onChange={(newValue) => {
              handleInputChange('input_schema', newValue);
            }}
            options={jsonOptions}
            schemaType="input_schema"
            nodeId={nodeID}
          />
          {!isLast && <hr className="my-2" />}
        </div>
      );
    }

    if (key === 'output_schema') {
      return (
        <div key={key} className="my-2">
          <label className="font-semibold mb-1 block">Output Schema</label>
          <SchemaEditor
            jsonValue={dynamicModel.output_schema || {}}
            onChange={(newValue) => {
              handleInputChange('output_schema', newValue);
            }}
            options={jsonOptions}
            schemaType="output_schema"
            nodeId={nodeID}
          />
          {!isLast && <hr className="my-2" />}
        </div>
      );
    }

    if (key === 'system_message') {
      return (
        <div key={key}>
          <TextEditor
            key={key}
            nodeID={nodeID}
            fieldName={key}
            inputSchema={dynamicModel.input_schema || {}}
            fieldTitle="System Message"
            content={dynamicModel[key] || ''}
            setContent={(value: string) => handleInputChange(key, value)}
          />
          {!isLast && <hr className="my-2" />}
        </div>
      );
    }

    if (key === 'user_message') {
      return (
        <div key={key}>
          <TextEditor
            key={key}
            nodeID={nodeID}
            fieldName={key}
            inputSchema={dynamicModel.input_schema || {}}
            fieldTitle="User Message"
            content={dynamicModel[key] || ''}
            setContent={(value) => handleInputChange(key, value)}
          />
          {renderFewShotExamples()}
          {!isLast && <hr className="my-2" />}
        </div>
      );
    }

    if (key.endsWith('_prompt') || key.endsWith('_message')) {
      return (
        <div key={key}>
          <TextEditor
            key={key}
            nodeID={nodeID}
            fieldName={key}
            inputSchema={dynamicModel.input_schema || {}}
            fieldTitle={key}
            content={dynamicModel[key] || ''}
            setContent={(value) => handleInputChange(key, value)}
          />
          {!isLast && <hr className="my-2" />}
        </div>
      );
    }

    if (key === 'code') {
      return (
        <CodeEditor
          key={key}
          code={value}
          onChange={(newValue: string) => handleInputChange(key, newValue)}
        />
      );
    }

    // Handle other types (string, number, boolean, object)
    switch (typeof field) {
      case 'string':
        return (
          <div key={key} className="my-4">
            <Textarea
              fullWidth
              label={fieldMetadata?.title || key}
              value={value}
              onChange={(e) => handleInputChange(key, e.target.value)}
              placeholder="Enter your input"
            />
            {!isLast && <hr className="my-2" />}
          </div>
        );
      case 'number':
        if (fieldMetadata && (fieldMetadata.minimum !== undefined || fieldMetadata.maximum !== undefined)) {
          const min = fieldMetadata.minimum ?? 0;
          const max = fieldMetadata.maximum ?? 100;

          return (
            <div key={key} className="my-4">
              <div className="flex justify-between items-center mb-2">
                <label className="font-semibold">{fieldMetadata.title || key}</label>
                <span className="text-sm">{value}</span>
              </div>
              <Slider
                aria-label={fieldMetadata.title || key}
                value={value}
                minValue={min}
                maxValue={max}
                step={fieldMetadata.type === 'integer' ? 1 : 0.1}
                className="w-full"
                onChange={(newValue) => {
                  const path = parentPath ? `${parentPath}.${key}` : key;
                  const lastTwoDots = path.split('.').slice(-2);
                  const finalPath = lastTwoDots[0] === 'config' ? lastTwoDots[1] : lastTwoDots.join('.');
                  handleInputChange(finalPath, newValue, true);
                }}
              />
              {!isLast && <hr className="my-2" />}
            </div>
          );
        }
        return (
          <NumberInput
            key={key}
            label={key}
            value={value}
            onChange={(e) => {
              const newValue = parseFloat(e.target.value);
              handleInputChange(key, isNaN(newValue) ? 0 : newValue);
            }}
          />
        );
      case 'boolean':
        return (
          <div key={key} className="my-4">
            <div className="flex justify-between items-center">
              <label className="font-semibold">{fieldMetadata?.title || key}</label>
              <Switch
                checked={value}
                onChange={(e) => handleInputChange(key, e.target.checked)}
              />
            </div>
            {!isLast && <hr className="my-2" />}
          </div>
        );
      case 'object':
        if (field && typeof field === 'object' && !Array.isArray(field)) {
          return (
            <div key={key} className="my-2">
              {Object.keys(field).map((subKey) => renderField(subKey, field[subKey], value?.[subKey], fullPath))}
              {!isLast && <hr className="my-2" />}
            </div>
          );
        }
        return null;
      default:
        return null;
    }
  };

  // Update the `renderConfigFields` function to include missing logic
  const renderConfigFields = () => {
    if (!nodeSchema || !nodeSchema.config || !dynamicModel) return null;
    const properties = nodeSchema.config;
    const keys = Object.keys(properties).filter((key) => key !== 'title' && key !== 'type');

    return keys.map((key, index) => {
      const field = properties[key];
      const value = dynamicModel[key];
      const isLast = index === keys.length - 1;
      return renderField(key, field, value, `${nodeType}.config`, isLast);
    });
  };

  // Update the `renderFewShotExamples` function
  const renderFewShotExamples = () => {
    const fewShotExamples = node?.data?.config?.few_shot_examples || [];

    return (
      <div>
        {fewShotIndex !== null ? (
          <FewShotEditor
            nodeID={nodeID}
            exampleIndex={fewShotIndex}
            onSave={() => setFewShotIndex(null)}
            onDiscard={() => setFewShotIndex(null)}
          />
        ) : (
          <div>
            <h3 className="my-2 font-semibold">Few Shot Examples</h3>
            <div className="flex flex-wrap gap-2">
              {fewShotExamples.map((example, index) => (
                <div
                  key={`few-shot-${index}`}
                  className="flex items-center space-x-2 p-2 bg-gray-100 rounded-full cursor-pointer"
                  onClick={() => setFewShotIndex(index)}
                >
                  <span>Example {index + 1}</span>
                  <Button
                    isIconOnly
                    radius="full"
                    variant="light"
                    onClick={(e) => {
                      e.stopPropagation();
                      handleDeleteExample(index);
                    }}
                    color="primary"
                  >
                    <Icon icon="solar:trash-bin-trash-linear" width={22} />
                  </Button>
                </div>
              ))}

              <Button
                isIconOnly
                radius="full"
                variant="light"
                onClick={handleAddNewExample}
                color="primary"
              >
                <Icon icon="solar:add-circle-linear" width={22} />
              </Button>
            </div>
          </div>
        )}
      </div>
    );
  };

  const handleMouseDown = useCallback((e: React.MouseEvent) => {
    setIsResizing(true);
    e.preventDefault();
  }, []);

  useEffect(() => {
    const handleMouseMove = (e: MouseEvent) => {
      if (!isResizing) return;

      const newWidth = window.innerWidth - e.clientX;
      const constrainedWidth = Math.min(Math.max(newWidth, 300), 800);
      setWidth(constrainedWidth);
    };

    const handleMouseUp = () => {
      setIsResizing(false);
      dispatch(setSidebarWidth(width));
    };

    if (isResizing) {
      window.addEventListener('mousemove', handleMouseMove);
      window.addEventListener('mouseup', handleMouseUp);
    }

    return () => {
      window.removeEventListener('mousemove', handleMouseMove);
      window.removeEventListener('mouseup', handleMouseUp);
    };
  }, [isResizing, dispatch, width]);

  return (
    <Card
      className="fixed top-16 bottom-4 right-4 w-96 p-4 bg-white rounded-xl border border-solid border-gray-200 overflow-auto"
    >
      <div
        className="absolute top-0 right-0 h-full bg-white border-l border-gray-200 flex"
        style={{
          width: `${width}px`,
          zIndex: 2,
          userSelect: isResizing ? 'none' : 'auto'
        }}
      >
        <div
          className="absolute left-0 top-0 h-full w-1 cursor-ew-resize hover:bg-blue-500 hover:opacity-100 opacity-0 transition-opacity"
          onMouseDown={handleMouseDown}
          style={{
            backgroundColor: isResizing ? 'rgb(59, 130, 246)' : 'transparent',
            opacity: isResizing ? '1' : undefined
          }}
        />

        <div className="flex-1 px-6 py-1 overflow-auto max-h-screen" id="node-details">
          <div className="flex justify-between items-center mb-2">
            <div>
              <h1 className="text-lg font-semibold">
                {node?.data?.config?.title || node?.id || 'Node Details'}
              </h1>
              <h2 className="text-xs font-semibold">{nodeType}</h2>
            </div>
            <Button
              isIconOnly
              radius="full"
              variant="light"
              onClick={() => dispatch(setSelectedNode({ nodeId: null }))}
            >
              <Icon
                className="text-default-500"
                icon="solar:close-circle-linear"
                width={24}
              />
            </Button>
          </div>

          <Accordion
            selectionMode="multiple"
            defaultExpandedKeys={hasRunOutput ? ['output'] : ['title', 'config']}
          >
            {nodeType !== 'InputNode' && (
              <AccordionItem key="output" aria-label="Output" title="Outputs">
                <NodeOutput node={node} />
              </AccordionItem>
            )}

            <AccordionItem key="title" aria-label="Node Title" title="Node Title">
              <Input
                value={node?.data?.config?.title || ''}
                onChange={(e) => handleInputChange('title', e.target.value)}
                placeholder="Enter node title"
                maxRows={1}
                label="Node Title"
                fullWidth
              />
            </AccordionItem>

            <AccordionItem key="config" aria-label="Node Configuration" title="Node Configuration">
              {renderConfigFields()}
            </AccordionItem>
          </Accordion>
        </div>
      </div>
    </Card>
  );
};

export default NodeSidebar;