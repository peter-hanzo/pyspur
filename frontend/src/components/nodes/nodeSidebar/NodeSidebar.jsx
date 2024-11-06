import React, { useState, useEffect, useCallback } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { updateNodeData, selectNodeById, setSidebarWidth, setSelectedNode } from '../../../store/flowSlice';
import DynamicModel from '../../../utils/DynamicModel'; // Import DynamicModel
import TextInput from '../../TextInput';
import NumberInput from '../../NumberInput';
import OutputSchemaEditor from './OutputSchemaEditor';
import InputSchemaEditor from './InputSchemaEditor';
import CodeEditor from '../../CodeEditor';
import { nodeTypes } from '../../../constants/nodeTypes';
import { jsonOptions } from '../../../constants/jsonOptions';
import FewShotEditor from '../utils/FewShotEditor';
import PromptEditor from '../utils/PromptEditor';
import { Button } from '@nextui-org/react';
import { Slider } from '@nextui-org/react';
import { Switch } from '@nextui-org/react';
import { Textarea } from '@nextui-org/react';
import { Select, SelectSection, SelectItem } from '@nextui-org/react';
import { Icon } from "@iconify/react";
import { Accordion, AccordionItem } from "@nextui-org/react";
import NodeStatus from "../NodeStatusDisplay";

const NodeSidebar = ({ nodeID }) => {
    const dispatch = useDispatch();
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
        dispatch(updateNodeData({ id: nodeID, data: { userconfig: updatedModel } }));
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
        const properties = nodeSchema.config.properties;

        return Object.keys(properties).map((key) => {
            const field = properties[key];
            const value = dynamicModel[key]; // Access value from DynamicModel

            if (field.$ref) {
                // Handle enums using $ref
                const refPath = field.$ref.replace('#/$defs/', '');
                const enumDef = nodeSchema.config.$defs[refPath];
                if (enumDef && enumDef.enum) {
                    return renderEnumSelect(key, enumDef.title || key, enumDef.enum);
                }
            }

            // Check if the field has "additionalProperties" and render SchemaEditor
            if (field.title === 'Output Schema') {
                return (
                    <div key={key} className="my-2">
                        <hr className="my-2" />
                        <label className="text-sm font-semibold mb-1 block">{field.title || key}</label>
                        <OutputSchemaEditor
                            jsonValue={value}
                            onChange={(newValue) => handleInputChange(key, newValue)}
                            options={jsonOptions}
                        />
                        <hr className="my-2" />
                    </div>
                );
            }
            else if (field.title === 'Input Schema') {
                return (
                    <div key={key} className="my-2">
                        <hr className="my-2" />
                        <label className="text-sm font-semibold mb-1 block">{field.title || key}</label>
                        <InputSchemaEditor
                            jsonValue={value}
                            onChange={(newValue) => handleInputChange(key, newValue)}
                            options={jsonOptions}
                        />
                        <hr className="my-2" />
                    </div>

                )
            }
            else if (field.title && field.title.toLowerCase().includes('prompt')) {
                return (
                    <div key={key} className="my-4 p-4 bg-gray-50 rounded-lg">
                        <label className="text-sm font-semibold mb-3 block text-gray-700">
                            {field.title}
                        </label>
                        <div className="border rounded-lg bg-white shadow-sm">
                            <PromptEditor
                                key={key}
                                nodeID={nodeID}
                                fieldName={key}
                                inputSchema={dynamicModel.input_schema || {}}
                            />
                        </div>
                    </div>
                );
            }


            switch (field.type) {
                case 'string':
                    console.log('string', key, value);
                    return (
                        <Textarea
                            fullWidth
                            key={key}
                            label={field.title || key}
                            value={value}
                            onChange={(e) => handleInputChange(key, e.target.value)}
                            placeholder="Enter your input"

                        />
                    );
                case 'integer':
                    return (
                        <NumberInput
                            key={key}
                            label={field.title || key}
                            value={value}
                            onChange={(e) => {
                                const newValue = parseFloat(e.target.value);
                                handleInputChange(key, isNaN(newValue) ? 0 : newValue);
                            }}
                        />
                    );
                case 'number':
                    if (field.minimum !== undefined && field.maximum !== undefined) {
                        return (

                            <Slider
                                fullWidth
                                label={field.title || key}
                                step={field.step || 0.1}
                                maxValue={field.maximum}
                                minValue={field.minimum}
                                value={value || field.value || field.minimum}
                                onChange={(newValue) => handleInputChange(key, newValue)}
                                className="my-4"
                            />

                        );
                    }
                    return (
                        <NumberInput
                            fullWidth
                            key={key}
                            label={field.title || key}
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
                                <label className="font-semibold">{field.title || key}</label>
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
                            <label className="text-sm font-semibold mb-1 block">{field.title || (key === 'input_schema' ? 'Input Schema' : 'Output Schema')}</label>
                            <OutputSchemaEditor
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
                                <li key={index} className="flex items-center justify-between mb-1">
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

                <Accordion selectionMode="multiple" defaultExpandedKeys={["title", "config", "examples"]}>
                    <AccordionItem key="title" aria-label="Node Title" title="Node Title">
                        <Textarea
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

                    {nodeSchema?.config?.properties?.few_shot_examples && (
                        <AccordionItem key="examples" aria-label="Few Shot Examples" title="Few Shot Examples">
                            {renderFewShotExamples()}
                        </AccordionItem>
                    )}

                    <AccordionItem key="output" aria-label='Output' title="Output">
                        <NodeStatus node={node} />
                    </AccordionItem>
                </Accordion>
            </div>
        </div>
    );
};

export default NodeSidebar;
