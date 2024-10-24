import React, { useState, useEffect } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { updateNodeData } from '../../store/flowSlice';
import TextInput from '../TextInput';
import NumberInput from '../NumberInput';
import BooleanInput from '../BooleanInput';
import TextEditor from '../textEditor/Editor'; // Import existing text editor
import Wrapper from '../textEditor/Wrapper';
import JsonEditor from '../JsonEditor';
import CodeEditor from '../CodeEditor';
import { nodeTypes } from '../../constants/nodeTypes'; // Import nodeTypes
import { jsonOptions } from '../../constants/jsonOptions';
import FewShotEditor from './LLMNode/Utils/FewShotEditor'; // Import FewShotEditor
import PromptEditor from './LLMNode/Utils/PromptEditor'; // Import PromptEditor
import Editor from '../textEditor/Editor';

const NodeDetails = ({ nodeID }) => {
    const dispatch = useDispatch();
    const node = useSelector((state) => state.flow.nodes.find((n) => n.id === nodeID));

    const [fewShotIndex, setFewShotIndex] = useState(null); // Track which few-shot example is being edited
    const [isPromptEditing, setIsPromptEditing] = useState(false); // Track if prompt is being edited
    // Initialize configData dynamically based on the selected node type
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
        console.log("config", config);
        return config;
    };

    useEffect(() => {
        const schema = nodeTypes.find((n) => n.name === node?.type);
        setNodeSchema(schema);
        if (node?.data?.config) {
            setConfigData(node.data.config);
            // console.log("node.data.config", node.data.config);
        } else {
            setConfigData(initializeConfigData(schema));
            // console.log("initializeConfigData(nodeSchema)", initializeConfigData(nodeSchema));
        }
        if (promptEditor && node?.data?.config?.prompt !== promptEditor.getHTML()) {
            promptEditor.commands.setContent(node?.data?.config?.prompt || '');
        }
    }, [nodeID, node]);

    const promptEditor = Editor(node?.data?.config?.prompt || '', null, false);

    const [nodeType, setNodeType] = useState(node?.type || 'ExampleNode');
    const [nodeSchema, setNodeSchema] = useState(nodeTypes.find((n) => n.name === node?.type));
    // const nodeSchema = nodeTypes.find((n) => n.name === nodeType);

    const [configData, setConfigData] = useState(node?.data?.config || initializeConfigData(nodeSchema?.config));
    const [isEditing, setIsEditing] = useState(false);

    const handleInputChange = (key, value) => {
        setConfigData((prevConfig) => ({
            ...prevConfig,
            [key]: value,
        }));
    };

    const handleSave = () => {
        dispatch(updateNodeData({ id: nodeID, data: { config: configData } }));
        console.log(node);
        // console.log(nodes);
        // console.log(nodeType);
        // console.log(nodeSchema);
        setIsEditing(false);
    };

    const handleAddNewExample = () => {
        const updatedExamples = [...(node?.data?.config?.fewShotExamples || []), { input: '', output: '' }];
        dispatch(updateNodeData({ id: nodeID, data: { config: { ...node.data.config, fewShotExamples: updatedExamples } } }));
    };

    const handleDeleteExample = (index) => {
        const updatedExamples = [...(node?.data?.config?.fewShotExamples || [])];
        updatedExamples.splice(index, 1);
        dispatch(updateNodeData({ id: nodeID, data: { config: { ...node.data.config, fewShotExamples: updatedExamples } } }));
    };

    const renderEnumSelect = (key, label, enumValues) => (
        <div key={key}>
            <label className="font-semibold mb-2 block">{label}</label>
            <select
                value={configData[key] || ''}
                onChange={(e) => handleInputChange(key, e.target.value)}
                className="border p-2 w-full"
                disabled={!isEditing} // Disable when not editing
            >
                {enumValues.map((option) => (
                    <option key={option} value={option}>
                        {option}
                    </option>
                ))}
            </select>
        </div>
    );

    const renderConfigFields = () => {
        if (!nodeSchema || !nodeSchema.config) return null;
        const properties = nodeSchema.config.properties;

        return Object.keys(properties).map((key) => {
            const field = properties[key];
            const value = configData[key];

            if (field.$ref) {
                // Handle enums using $ref
                const refPath = field.$ref.replace('#/$defs/', '');
                const enumDef = nodeSchema.config.$defs[refPath];
                if (enumDef && enumDef.enum) {
                    return renderEnumSelect(key, enumDef.title || key, enumDef.enum);
                }
            }

            switch (field.type) {
                case 'string':
                    if (key === 'system_prompt') {
                        // Use TextEditor for system_prompt
                        return (
                            <div key={key} className="my-4">
                                {isPromptEditing && (
                                    <PromptEditor
                                        nodeID={nodeID}
                                        onSave={() => setIsPromptEditing(false)}
                                        onDiscard={() => setIsPromptEditing(false)}
                                    />
                                )}

                                {!isPromptEditing && (
                                    <div>
                                        <h3 className="my-4 font-semibold">Prompt</h3>
                                        <Wrapper editor={promptEditor} isEditable={false} />

                                        <div className="mb-10">
                                            {isEditing && (<button
                                                className="px-2 py-1 bg-purple-600 text-white rounded mr-2"
                                                onClick={() => setIsPromptEditing(true)}
                                            >
                                                Edit Prompt
                                            </button>
                                            )}
                                        </div>
                                    </div>
                                )}</div>
                        );
                    }
                    return (
                        <TextInput
                            key={key}
                            label={field.title || key}
                            value={value}
                            onChange={(e) => handleInputChange(key, e.target.value)}
                            disabled={!isEditing} // Disable when not editing
                        />
                    );
                case 'integer':
                case 'number':
                    return (
                        <NumberInput
                            key={key}
                            label={field.title || key}
                            value={value}
                            onChange={(e) => {
                                const newValue = parseFloat(e.target.value);
                                handleInputChange(key, isNaN(newValue) ? 0 : newValue);
                            }}
                            disabled={!isEditing} // Disable when not editing
                        />
                    );
                case 'boolean':
                    return (
                        <BooleanInput
                            key={key}
                            label={field.title || key}
                            value={value}
                            onChange={(e) => handleInputChange(key, e.target.checked)}
                            disabled={!isEditing} // Disable when not editing
                        />
                    );
                case 'object':
                    if (key === 'output_schema' || key === 'input_schema') {
                        // Use JsonEditor for output_schema and input_schema with correct labels
                        return (
                            <div key={key} className="my-4">
                                <label className="font-semibold mb-2 block">{field.title || (key === 'input_schema' ? 'Input Schema' : 'Output Schema')}</label>
                                <JsonEditor
                                    jsonValue={value}
                                    onChange={(newValue) => handleInputChange(key, newValue)}
                                    options={jsonOptions}
                                    disabled={!isEditing} // Disable when not editing
                                />
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
                            disabled={!isEditing} // Disable when not editing
                        />
                    );
                case 'code':
                    return (
                        <CodeEditor
                            key={key}
                            code={value}
                            onChange={(newValue) => handleInputChange(key, newValue)}
                            disabled={!isEditing} // Disable when not editing
                        />
                    );
                default: //TODO: Add support for other types
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

                                <h3 className="my-6 font-semibold">Few Shot Examples</h3>
                                <ul>
                                    {node?.data?.config?.fewShotExamples?.map((example, index) => (
                                        <li key={index} className="flex items-center justify-between mb-2">
                                            <div>Example {index + 1}</div>
                                            <div className="ml-2">
                                                {isEditing && (<button
                                                    className="px-2 py-1 bg-purple-600 text-white rounded mr-2"
                                                    onClick={() => setFewShotIndex(index)}
                                                >
                                                    Edit
                                                </button>
                                                )}
                                                {isEditing && (<button
                                                    className="px-2 py-1 bg-purple-600 text-white rounded"
                                                    onClick={() => handleDeleteExample(index)}
                                                >
                                                    Delete
                                                </button>
                                                )}
                                            </div>
                                        </li>
                                    ))}
                                </ul>

                                <div className="mt-4">
                                    {isEditing && (<button
                                        className="mt-2 px-2 py-1 bg-purple-600 text-white rounded"
                                        onClick={handleAddNewExample}
                                        disabled={!isEditing}
                                    >
                                        Add Example
                                    </button>
                                    )}
                                </div>
                            </div>
                        );
                    }
                // default:
                //     return null;
            }
        });
    };



    return (
        <div className="p-4">
            <h2 className="text-lg font-bold mb-2">Node Details: {nodeType}</h2>
            <p><strong>ID:</strong> {nodeID}</p>


            <h3 className="my-4 font-semibold">Configuration</h3>
            {renderConfigFields()}

            <div className="mt-4">
                {isEditing ? (
                    <>
                        <button
                            className="px-2 py-1 bg-purple-600 text-white rounded mr-2"
                            onClick={handleSave}
                        >
                            Save
                        </button>
                        <button
                            className="px-2 py-1 bg-gray-600 text-white rounded"
                            onClick={() => setIsEditing(false)}
                        >
                            Cancel
                        </button>
                    </>
                ) : (
                    <button
                        className="px-2 py-1 bg-purple-600 text-white rounded"
                        onClick={() => setIsEditing(true)}
                    >
                        Edit Config
                    </button>
                )}
            </div>
        </div>
    );
};

export default NodeDetails;
