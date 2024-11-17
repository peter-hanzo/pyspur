import React, { useState, useEffect, useCallback } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { updateNodeData, selectNodeById, setSidebarWidth, setSelectedNode } from '../../../store/flowSlice';
import NumberInput from '../../NumberInput';
import CodeEditor from '../../CodeEditor';
import { jsonOptions } from '../../../constants/jsonOptions';
import FewShotEditor from '../../textEditor/FewShotEditor';
import TextEditor from '../../textEditor/TextEditor';
import { Button, Slider, Switch, Textarea, Input, Select, SelectItem, Accordion, AccordionItem } from '@nextui-org/react';
import { Icon } from "@iconify/react";
import NodeOutput from "../NodeOutputDisplay";
import SchemaEditor from './SchemaEditor';
import { selectPropertyMetadata } from '../../../store/nodeTypesSlice';
import { cloneDeep, set, debounce } from 'lodash';

const NodeSidebar = ({ nodeID }) => {
    const dispatch = useDispatch();
    const nodeTypes = useSelector((state) => state.nodeTypes.data);
    const node = useSelector((state) => selectNodeById(state, nodeID));
    const storedWidth = useSelector((state) => state.flow.sidebarWidth);

    // Fetch all metadata once at the top level
    const metadata = useSelector((state) => state.nodeTypes.metadata);

    // Initialize width state with the stored value
    const [width, setWidth] = useState(storedWidth);
    const [isResizing, setIsResizing] = useState(false);

    const [nodeType, setNodeType] = useState(node?.type || 'ExampleNode');
    const findNodeSchema = (nodeType) => {
        for (const category in nodeTypes) {
            const nodeSchema = nodeTypes[category].find((n) => n.name === nodeType);
            if (nodeSchema) {
                return nodeSchema;
            }
        }
        return null;
    };

    const [nodeSchema, setNodeSchema] = useState(findNodeSchema(node?.type));
    const [dynamicModel, setDynamicModel] = useState(node?.data?.config || {});
    const [fewShotIndex, setFewShotIndex] = useState(null); // Track the index of the few-shot example being edited

    // Create a debounced version of the dispatch update
    const debouncedDispatch = useCallback(
        debounce((id, updatedModel) => {
            dispatch(updateNodeData({ id, data: { config: updatedModel } }));
        }, 300), // Adjust the delay (in ms) as needed
        [dispatch]
    );

    // Update dynamicModel when nodeID changes
    useEffect(() => {
        if (node) {
            setNodeType(node.type || 'ExampleNode');
            setNodeSchema(findNodeSchema(node.type));
            setDynamicModel(node.data.config || {});
        }
    }, [nodeID, node, node.data.config]);

    // Helper function to update nested object by path
    const updateNestedModel = (obj, path, value) => {
        const deepClone = cloneDeep(obj); // Use lodash's cloneDeep for deep cloning
        set(deepClone, path, value); // Use lodash's set to update the nested value
        return deepClone;
    };

    // Update the input change handler to use local state immediately but debounce Redux updates for Slider
    const handleInputChange = (key, value, isSlider = false) => {
        let updatedModel;

        if (key.includes('.')) {
            updatedModel = updateNestedModel(dynamicModel, key, value);
        } else {
            updatedModel = { ...dynamicModel, [key]: value };
        }

        // Update local state immediately
        setDynamicModel(updatedModel);

        // Conditionally debounce the Redux update for Slider inputs
        if (isSlider) {
            debouncedDispatch(nodeID, updatedModel);
        } else {
            dispatch(updateNodeData({ id: nodeID, data: { config: updatedModel } }));
        }
    };


    const renderEnumSelect = (key, label, enumValues) => (
        <div key={key}>
            <Select
                label={label}
                value={dynamicModel[key] || ''}
                onChange={(e) => handleInputChange(key, e.target.value)}
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

    // Handle adding a new few-shot example
    const handleAddNewExample = () => {
        const updatedExamples = [...(dynamicModel?.few_shot_examples || []), { input: '', output: '' }];
        handleInputChange('few_shot_examples', updatedExamples);
    };

    // Handle deleting a few-shot example
    const handleDeleteExample = (index) => {
        const updatedExamples = [...(dynamicModel?.few_shot_examples || [])];
        updatedExamples.splice(index, 1);
        handleInputChange('few_shot_examples', updatedExamples);
    };

    // Helper function to get field metadata
    const getFieldMetadata = (fullPath) => {
        return selectPropertyMetadata({ nodeTypes: { metadata } }, fullPath);
    };

    // Helper function to render fields based on their type
    const renderField = (key, field, value, parentPath = '') => {
        const fullPath = `${parentPath ? `${parentPath}.` : ''}${key}`;
        const fieldMetadata = getFieldMetadata(fullPath);

        // Handle enum fields
        if (fieldMetadata?.enum) {
            return renderEnumSelect(key, fieldMetadata.title || key, fieldMetadata.enum);
        }

        // Handle specific cases for input_schema, output_schema, and system_prompt
        if (key === 'input_schema') {

            return (
                <div key={key} className="my-2">
                    <hr className="my-2" />
                    <label className="text-sm font-semibold mb-1 block">Input Schema</label>
                    <SchemaEditor
                        jsonValue={dynamicModel.input_schema || {}}
                        onChange={(newValue) => {
                            handleInputChange('input_schema', { ...field, ...newValue });
                        }}
                        options={jsonOptions}
                        schemaType="input_schema" // Specify schema type
                    />
                    <hr className="my-2" />
                </div>
            );
        }

        if (key === 'output_schema') {
            return (
                <div key={key} className="my-2">
                    <hr className="my-2" />
                    <label className="text-sm font-semibold mb-1 block">Output Schema</label>
                    <SchemaEditor
                        jsonValue={dynamicModel.output_schema || {}}
                        onChange={(newValue) => {
                            handleInputChange('output_schema', newValue);
                        }}
                        options={jsonOptions}
                        schemaType="output_schema" // Specify schema type
                    />
                    <hr className="my-2" />
                </div>
            );
        }

        if (key === 'system_prompt') {
            return (
                <div key={key} className="my-4 p-4 bg-gray-50 rounded-lg">
                    <TextEditor
                        key={key}
                        nodeID={nodeID}
                        fieldName={key}
                        inputSchema={dynamicModel.input_schema || {}}
                        fieldTitle="System Prompt"
                        content={dynamicModel[key] || ''}
                        setContent={(value) => handleInputChange(key, value)}
                    />
                    {/* Render Few Shot Examples right after the System Prompt */}
                    {renderFewShotExamples()}
                </div>
            );
        }

        // Handle other types (string, number, boolean, object, code)
        switch (typeof field) {
            case 'string':
                return (
                    <Textarea
                        fullWidth
                        key={key}
                        label={key}
                        value={value}
                        onChange={(e) => handleInputChange(key, e.target.value)}
                        placeholder="Enter your input"
                    />
                );
            case 'number':
                // Check if we have constraints that would make this suitable for a slider
                if (fieldMetadata &&
                    (fieldMetadata.minimum !== undefined || fieldMetadata.maximum !== undefined)) {
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
                                    const lastTwoDots = path.split('.').slice(-2).join('.');
                                    handleInputChange(lastTwoDots, newValue, true); // Pass true for isSlider
                                }}
                            />
                        </div>
                    );
                }
                // Fall back to number input if no suitable constraints
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
                            <label className="font-semibold">{key}</label>
                            <Switch
                                checked={value}
                                onChange={(e) => handleInputChange(key, e.target.checked)}
                            />
                        </div>
                    </div>
                );
            case 'object':
                // Ensure field is a valid object before traversing
                if (field && typeof field === 'object' && !Array.isArray(field)) {
                    return (
                        <div key={key} className="my-2">
                            <hr className="my-2" />
                            <label className="text-sm font-semibold mb-1 block">{key}</label>
                            {Object.keys(field).map((subKey) => renderField(subKey, field[subKey], value?.[subKey], fullPath))}
                            <hr className="my-2" />
                        </div>
                    );
                }
                return null; // Return null if field is not a valid object
            case 'code':
                return (
                    <CodeEditor
                        key={key}
                        code={value}
                        onChange={(newValue) => handleInputChange(key, newValue)}
                    />
                );
            default:
                return null;
        }
    };

    // Updated renderConfigFields function
    const renderConfigFields = () => {
        if (!nodeSchema || !nodeSchema.config || !dynamicModel) return null;
        const properties = nodeSchema.config;

        return Object.keys(properties)
            .filter((key) => key !== 'title' && key !== 'type') // Skip "title" and "type"
            .map((key) => {
                const field = properties[key];
                const value = dynamicModel[key]; // Access value from DynamicModel
                return renderField(key, field, value, `${nodeType}.config`); // Pass the full path
            })
            .concat(<hr key="divider" className="my-2" />);
    };

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
                        <h3 className="my-2 text-sm font-semibold">Few Shot Examples</h3>
                        <ul>
                            {fewShotExamples.map((example, index) => (
                                <li key={`few-shot-${index}`} className="flex items-center justify-between mb-1">
                                    <div>Example {index + 1}</div>
                                    <div className="ml-2">
                                        <Button onClick={() => setFewShotIndex(index)}>Edit</Button>
                                        <Button onClick={() => handleDeleteExample(index)}>Delete</Button>
                                    </div>
                                </li>
                            ))}
                        </ul>

                        <div className="mt-2">
                            <Button onClick={handleAddNewExample}>Add Example</Button>
                        </div>
                    </div>
                )}
            </div>
        );
    };


    // Add resize handler
    const handleMouseDown = useCallback((e) => {
        setIsResizing(true);
        e.preventDefault();
    }, []);

    // Add mouse move and mouse up handlers
    useEffect(() => {
        const handleMouseMove = (e) => {
            if (!isResizing) return;

            // Calculate new width based on mouse position
            const newWidth = window.innerWidth - e.clientX;
            // Set minimum and maximum width constraints
            const constrainedWidth = Math.min(Math.max(newWidth, 300), 800);
            setWidth(constrainedWidth);
        };

        const handleMouseUp = () => {
            setIsResizing(false);
            // Persist the final width to Redux when mouse is released
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
        <div
            className="absolute top-0 right-0 h-full bg-white border-l border-gray-200 flex"
            style={{
                width: `${width}px`,
                zIndex: 2,
                userSelect: isResizing ? 'none' : 'auto'
            }}
        >
            {/* Add resize handle */}
            <div
                className="absolute left-0 top-0 h-full w-1 cursor-ew-resize hover:bg-blue-500 hover:opacity-100 opacity-0 transition-opacity"
                onMouseDown={handleMouseDown}
                style={{
                    backgroundColor: isResizing ? 'rgb(59, 130, 246)' : 'transparent',
                    opacity: isResizing ? '1' : undefined
                }}
            />

            {/* Updated sidebar content */}
            <div className="flex-1 px-4 py-1 overflow-auto max-h-screen" id="node-details">
                <div className="flex justify-between items-center mb-2">
                    <div>
                        <h1 className="text-lg font-semibold">{node?.id || 'Node Details'}</h1>
                        <h2 className="text-sm font-semibold">{nodeType}</h2>
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

                <Accordion selectionMode="multiple" defaultExpandedKeys={["title", "config", "examples", "testInputs"]}>

                    {nodeType !== 'InputNode' && (
                        <AccordionItem key="output" aria-label='Output' title="Outputs">
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
    );
};

export default NodeSidebar;
