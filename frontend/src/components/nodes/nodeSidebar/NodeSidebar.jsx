import React, { useState, useEffect, useCallback } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { updateNodeData, selectNodeById, setSidebarWidth, setSelectedNode } from '../../../store/flowSlice';
import NumberInput from '../../NumberInput';
import CodeEditor from '../../CodeEditor';
import { jsonOptions } from '../../../constants/jsonOptions';
import FewShotEditor from '../../textEditor/FewShotEditor';
import PromptEditor from '../../textEditor/PromptEditor';
import { Button, Slider, Switch, Textarea, Input, Select, SelectItem, Accordion, AccordionItem } from '@nextui-org/react';
import { Icon } from "@iconify/react";
import NodeStatus from "../NodeStatusDisplay";
import SchemaEditor from './SchemaEditor';
const NodeSidebar = ({ nodeID }) => {
    const dispatch = useDispatch();
    const nodeTypes = useSelector((state) => state.nodeTypes.data);
    const node = useSelector((state) => selectNodeById(state, nodeID));
    // Get the width from Redux store
    const storedWidth = useSelector((state) => state.flow.sidebarWidth);

    // Initialize width state with the stored value
    const [width, setWidth] = useState(storedWidth);
    const [isResizing, setIsResizing] = useState(false);

    const [nodeType, setNodeType] = useState(node?.type || 'ExampleNode');
    const findNodeSchema = (nodeType) => {
        for (const category in nodeTypes) {
            const nodeSchema = nodeTypes[category].find((n) => n.name === nodeType);
            if (nodeSchema) return nodeSchema;
        }
        return null;
    };

    const [nodeSchema, setNodeSchema] = useState(findNodeSchema(node?.type));
    const [dynamicModel, setDynamicModel] = useState(node?.data?.userconfig || {});
    const [fewShotIndex, setFewShotIndex] = useState(null); // Track the index of the few-shot example being edited

    // Update dynamicModel when nodeID changes
    useEffect(() => {
        if (node) {
            setNodeType(node.type || 'ExampleNode');
            setNodeSchema(findNodeSchema(node.type));
            setDynamicModel(node.data.userconfig || {});
        }
    }, [nodeID, node]);

    // Update the input change handler to use DynamicModel
    const handleInputChange = (key, value) => {
        const updatedModel = { ...dynamicModel, [key]: value };
        dispatch(updateNodeData({ id: nodeID, data: { input: { properties: updatedModel } } }));
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

    const renderConfigFields = () => {
        if (!nodeSchema || !nodeSchema.config || !dynamicModel) return null;
        const properties = nodeSchema.config;
        console.log('properties', properties);
        return Object.keys(properties).map((key) => {
            const field = properties[key];
            const value = dynamicModel[key]; // Access value from DynamicModel
            console.log('field', field);

            // Check for input_schema key
            if (key === 'input_schema') {
                return (
                    <div key={key} className="my-2">
                        <hr className="my-2" />
                        <label className="text-sm font-semibold mb-1 block">Input Schema</label>
                        <SchemaEditor
                            jsonValue={node?.data?.input?.properties || {}}
                            onChange={(newValue) => handleInputChange('input', { properties: newValue })}
                            options={jsonOptions}
                            schemaType="input" // Specify schema type
                        />
                        <hr className="my-2" />
                    </div>
                );
            }

            // Check for output_schema key
            else if (key === 'output_schema') {
                return (
                    <div key={key} className="my-2">
                        <hr className="my-2" />
                        <label className="text-sm font-semibold mb-1 block">Output Schema</label>
                        <SchemaEditor
                            jsonValue={node?.data?.output?.properties || {}}
                            onChange={(newValue) => handleInputChange('output', { properties: newValue })}
                            options={jsonOptions}
                            schemaType="output" // Specify schema type
                        />
                        <hr className="my-2" />
                    </div>
                );
            }

            // Check for system_prompt key
            else if (key === 'system_prompt') {
                return (
                    <div key={key} className="my-4 p-4 bg-gray-50 rounded-lg">
                        <div>
                            <PromptEditor
                                key={key}
                                nodeID={nodeID}
                                fieldName={key}
                                inputSchema={dynamicModel.input_schema || {}}
                                fieldTitle="System Prompt"
                                setContent={(value) => handleInputChange(key, value)}
                            />
                        </div>

                        {/* Render Few Shot Examples right after the System Prompt */}
                        {renderFewShotExamples()}
                    </div>
                );
            }

            // Check for few_shot_examples key
            else if (key === 'few_shot_examples') {
                return (
                    <div key={key} className="my-4 p-4 bg-gray-50 rounded-lg">
                        <label className="text-sm font-semibold mb-1 block">Few Shot Examples</label>
                        <Textarea
                            fullWidth
                            value={value || ''}
                            onChange={(e) => handleInputChange(key, e.target.value)}
                            placeholder="Enter few shot examples"
                        />
                    </div>
                );
            }

            // Handle other types (string, integer, number, boolean, object, code)
            switch (typeof field) {
                case 'string':
                    console.log('string', key, value);
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
                    return (
                        <div key={key} className="my-2">
                            <hr className="my-2" />
                            <label className="text-sm font-semibold mb-1 block">{key}</label>
                            <SchemaEditor
                                jsonValue={value}
                                onChange={(newValue) => handleInputChange(key, newValue)}
                                options={jsonOptions}
                            />
                            <hr className="my-2" />
                        </div>
                    );
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
        }).concat(<hr key="divider" className="my-2" />);
    };

    const renderFewShotExamples = () => {
        const fewShotExamples = node?.data?.userconfig?.few_shot_examples || [];

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
                            <NodeStatus node={node} />
                        </AccordionItem>
                    )}

                    <AccordionItem key="title" aria-label="Node Title" title="Node Title">
                        <Input
                            value={node?.data?.userconfig?.title || ''}
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
