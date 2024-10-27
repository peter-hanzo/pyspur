import React, { useState, useEffect } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { updateNodeData } from '../../store/flowSlice';
import TextInput from '../TextInput';
import NumberInput from '../NumberInput';
import JsonEditor from '../JsonEditor';
import CodeEditor from '../CodeEditor';
import { nodeTypes } from '../../constants/nodeTypes'; // Import nodeTypes
import { jsonOptions } from '../../constants/jsonOptions';
import FewShotEditor from './LLMNode/Utils/FewShotEditor';
import NodeFieldEditor from './LLMNode/Utils/NodeFieldEditor';
import { Button } from '@nextui-org/react';
import { Slider } from '@nextui-org/react'; // Import Slider component
import { Switch } from '@nextui-org/react'; // Import Switch component
import { Textarea } from '@nextui-org/react'; // Import Textarea component
import { useDebouncedCallback } from 'use-debounce'; // Import debounce utility

const NodeDetails = ({ nodeID }) => {
    const dispatch = useDispatch();
    const node = useSelector((state) => state.flow.nodes.find((n) => n.id === nodeID));

    const [fewShotIndex, setFewShotIndex] = useState(null);

    // Function to find the node schema based on the new structure
    const findNodeSchema = (nodeType) => {
        for (const category in nodeTypes) {
            const nodeSchema = nodeTypes[category].find((n) => n.name === nodeType);
            if (nodeSchema) return nodeSchema;
        }
        return null;
    };

    const initializeConfigData = (nodeSchema) => {
        const configSchema = nodeSchema?.config;
        const config = {};
        if (!configSchema) return config;

        Object.keys(configSchema.properties).forEach((key) => {
            const field = configSchema.properties[key];

            if (field.default !== undefined) {
                config[key] = field.default;
            } else if (field.$ref) {
                const refPath = field.$ref.replace('#/$defs/', '');
                const enumDef = configSchema.$defs[refPath];
                if (enumDef && enumDef.enum) {
                    config[key] = enumDef.enum[0];
                }
            } else {
                switch (field.type) {
                    case 'string':
                        config[key] = '';
                        break;
                    case 'integer':
                        config[key] = 0;
                        break;
                    case 'number':
                        config[key] = 0;
                        break;
                    case 'boolean':
                        config[key] = false;
                        break;
                    case 'array':
                        config[key] = [];
                        break;
                    case 'object':
                        config[key] = {};
                        break;
                    case 'code':
                        config[key] = '';
                        break;
                    default:
                        config[key] = null;
                }
            }
        });
        return config;
    };

    // Debounce the handleInputChange function to prevent too many updates
    const debouncedHandleInputChange = useDebouncedCallback((key, value) => {
        setConfigData((prevConfig) => {
            const updatedConfig = {
                ...prevConfig,
                [key]: value,
            };
            // Automatically save the updated config
            dispatch(updateNodeData({ id: nodeID, data: { ...node.data, config: updatedConfig } }));
            return updatedConfig;
        });
    }, 300); // 300ms debounce delay

    // Modify the useEffect to avoid unnecessary updates
    useEffect(() => {
        const schema = findNodeSchema(node?.type);
        setNodeSchema(schema);

        // Initialize configData and ensure the title is set
        if (node?.data?.config && JSON.stringify(node.data.config) !== JSON.stringify(configData)) {
            setConfigData(node.data.config);
        } else {
            const initialConfig = initializeConfigData(schema);
            setConfigData({
                ...initialConfig,
                title: node?.data?.title || '', // Ensure title is initialized
            });
        }
    }, [nodeID, node]);

    const [nodeType, setNodeType] = useState(node?.type || 'ExampleNode');
    const [nodeSchema, setNodeSchema] = useState(findNodeSchema(node?.type));

    const [configData, setConfigData] = useState(node?.data?.config || initializeConfigData(nodeSchema?.config));

    // Update the input change handler to use the debounced version
    const handleInputChange = (key, value) => {
        debouncedHandleInputChange(key, value);
    };

    const handleAddNewExample = () => {
        const updatedExamples = [...(node?.data?.config?.few_shot_examples || []), { input: '', output: '' }];
        dispatch(updateNodeData({ id: nodeID, data: { config: { ...node.data.config, few_shot_examples: updatedExamples } } }));
    };

    const handleDeleteExample = (index) => {
        const updatedExamples = [...(node?.data?.config?.few_shot_examples || [])];
        updatedExamples.splice(index, 1);
        dispatch(updateNodeData({ id: nodeID, data: { config: { ...node.data.config, few_shot_examples: updatedExamples } } }));
    };

    const renderEnumSelect = (key, label, enumValues) => (
        <div key={key}>
            <label className="text-sm font-semibold mb-2 block">{label}</label>
            <select
                value={configData[key] || ''}
                onChange={(e) => handleInputChange(key, e.target.value)}
                className="border p-1 w-full"
            >
                {enumValues.map((option) => (
                    <option key={option} value={option}>
                        {option}
                    </option>
                ))}
            </select>
        </div>
    );

    const handleTitleChange = (e) => {
        const newTitle = e.target.value;
        dispatch(updateNodeData({ id: nodeID, data: { ...node.data, title: newTitle } }));
    };

    const renderConfigFields = () => {
        if (!nodeSchema || !nodeSchema.config) return null;
        const properties = nodeSchema.config.properties;

        return Object.keys(properties).map((key) => {
            const field = properties[key];
            const value = configData[key];

            switch (field.type) {
                case 'string':
                    if (key === 'system_prompt') {
                        return (
                            <div key={key} className="my-2">
                                <h3 className="my-2 text-sm font-semibold">Prompt</h3>
                                <NodeFieldEditor nodeID={nodeID} fieldName="system_prompt" /> {/* Use NodeFieldEditor */}
                            </div>
                        );
                    }
                    return (
                        <Textarea
                            key={key}
                            label={field.title || key}
                            value={value}
                            onChange={(e) => handleInputChange(key, e.target.value)}
                            placeholder="Enter your input"
                            className="max-w-xs"
                        />
                    );
                case 'integer':
                case 'number':
                    // Check if the field has a range (minimum and maximum)
                    if (field.minimum !== undefined && field.maximum !== undefined) {
                        return (
                            <div key={key} className="my-4">
                                <Slider
                                    label={field.title || key}
                                    step={field.step || 0.1} // Use step if defined, otherwise default to 0.01
                                    maxValue={field.maximum}
                                    minValue={field.minimum}
                                    defaultValue={value || field.default || field.minimum}
                                    onChange={(newValue) => handleInputChange(key, newValue)}
                                    className="max-w-md"
                                />
                            </div>
                        );
                    }

                    // Fallback to NumberInput if no range is defined
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
                    if (key === 'output_schema' || key === 'input_schema') {
                        return (
                            <div key={key} className="my-2">
                                <hr className="my-2" />
                                <label className="text-sm font-semibold mb-1 block">{field.title || (key === 'input_schema' ? 'Input Schema' : 'Output Schema')}</label>
                                <JsonEditor
                                    jsonValue={value}
                                    onChange={(newValue) => handleInputChange(key, newValue)}
                                    options={jsonOptions}
                                />
                                <hr className="my-2" />
                            </div>
                        );
                    }
                    return (
                        <TextInput
                            key={key}
                            label={field.title || key}
                            value={value}
                            onChange={(e) => handleInputChange(key, e.target.value)}
                            placeholder="Enter key-value pairs as JSON"
                        />
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
                    if (key === 'few_shot_examples') {
                        return (
                            <div>
                                {fewShotIndex !== null && (
                                    <FewShotEditor
                                        nodeID={nodeID}
                                        exampleIndex={fewShotIndex}
                                        onSave={() => setFewShotIndex(null)}
                                        onDiscard={() => setFewShotIndex(null)}
                                    />
                                )}

                                <h3 className="my-2 text-sm font-semibold">Few Shot Examples</h3>
                                <ul>
                                    {node?.data?.config?.few_shot_examples?.map((example, index) => (
                                        <li key={index} className="flex items-center justify-between mb-1">
                                            <div>Example {index + 1}</div>
                                            <div className="ml-2">
                                                <Button
                                                    onClick={() => setFewShotIndex(index)}
                                                >
                                                    Edit
                                                </Button>
                                                <Button

                                                    onClick={() => handleDeleteExample(index)}
                                                >
                                                    Delete
                                                </Button>
                                            </div>
                                        </li>
                                    ))}
                                </ul>

                                <div className="mt-2">
                                    <Button
                                        onClick={handleAddNewExample}
                                    >
                                        Add Example
                                    </Button>
                                </div>
                            </div>
                        );
                    }
            }
        }).concat(<hr key="divider" className="my-2" />);
    };

    return (
        <div className="px-4 py-1 overflow-auto max-h-screen" id="node-details">
            <h1 className="text-lg font-semibold">{node?.id || 'Node Details'}</h1>
            <h2 className="text-sm font-semibold">{nodeType}</h2>
            <hr className="my-4" />

            <div className="mb-4 flex justify-between">
                <div className='flex items-center'>
                    <h3 className="text-lg font-semibold">Node Config</h3>
                </div>
            </div>

            {/* Add an input field for the node title */}
            <div className="my-4">
                <label className="text-sm font-semibold mb-2 block">Node Title</label>
                <input
                    type="text"
                    value={node?.data?.title || ''}
                    onChange={handleTitleChange}
                    className="border p-1 w-full"
                    placeholder="Enter node title"
                />
            </div>

            {renderConfigFields()}

            <hr className="my-2" />
        </div>
    );
};

export default NodeDetails;
