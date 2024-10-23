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


const NodeDetails = ({ nodeID }) => {
    const dispatch = useDispatch();

    

    // Initialize configData dynamically based on the selected node type
    const initializeConfigData = (configSchema) => {
        const config = {};
        if (!configSchema) return config;

        Object.keys(configSchema.properties).forEach((key) => {
            const field = configSchema.properties[key];
            if (field.default !== undefined) {
                config[key] = field.default;
            } else {
                switch (field.type) {
                    case 'string':
                        config[key] = '';
                        break;
                    case 'integer':
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

    const handleJsonChange = (updatedJson) => {
        dispatch(updateNodeData({ nodeID, data: updatedJson }));
      };
      const jsonOptions = ['str', 'float'];


    useEffect(() => {
        // console.log(nodeSchema)
        if (node?.data?.config) {
            setConfigData(node.data.config);
        } else {
            setConfigData(initializeConfigData(nodeSchema?.config));
        }
    }, [nodeID, node, nodeSchema]);

    // useEffect(() => {
        
    //     console.log('Node ID:', nodeID, 'Node Type:', nodeType);
    //     console.log('Node Schema:', nodeSchema);
        
    //     // Fetch node data from the redux store and update the local state
    //     // setConfigData(node?.data?.config);
    //     console.log(node?.data?.config);
    // }, [nodeID, node?.data?.config]);
    const nodes = useSelector((state) => state.flow.nodes);
    const node = useSelector((state) => state.flow.nodes.find((n) => n.id === nodeID));
    const nodeType_ = node?.data?.nodeType;
    const [nodeSchema, setNodeSchema] = useState(nodeTypes.find((n) => n.name === nodeType_));
    // const nodeSchema = nodeTypes.find((n) => n.name === nodeType);

    const [configData, setConfigData] = useState(initializeConfigData(nodeSchema?.config));
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
        console.log(nodes);
        // console.log(nodeType);
        console.log(nodeSchema);
        setIsEditing(false);
    };

    const renderEnumSelect = (key, label, enumValues) => (
        <div key={key}>
            <label className="font-semibold mb-2 block">{label}</label>
            <select
                value={configData[key] || ''}
                onChange={(e) => handleInputChange(key, e.target.value)}
                className="border p-2 w-full"
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
                                <label className="font-semibold mb-2 block">{field.title}</label>
                                <Wrapper editor={TextEditor(value, (newValue) => handleInputChange(key, newValue))} isEditable={true} />
                            </div>
                        );
                    }
                    return (
                        <TextInput
                            key={key}
                            label={field.title || key}
                            value={value}
                            onChange={(e) => handleInputChange(key, e.target.value)}
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
                        />
                    );
                case 'boolean':
                    return (
                        <BooleanInput
                            key={key}
                            label={field.title || key}
                            value={value}
                            onChange={(e) => handleInputChange(key, e.target.checked)}
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
                    return null;
            }
        });
    };
    

    return (
        <div className="p-4">
            <h2 className="text-lg font-bold mb-2">Node Details: {nodeType_}</h2>
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
