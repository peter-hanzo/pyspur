import React, { useState, useEffect } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { updateNodeData, selectNodeById } from '../../store/flowSlice';
import DynamicModel from '../../utils/DynamicModel'; // Import DynamicModel
import TextInput from '../TextInput';
import NumberInput from '../NumberInput';
import JsonEditor from '../JsonEditor';
import CodeEditor from '../CodeEditor';
import { nodeTypes } from '../../constants/nodeTypes';
import { jsonOptions } from '../../constants/jsonOptions';
import FewShotEditor from './LLMNode/Utils/FewShotEditor';
import NodeFieldEditor from './LLMNode/Utils/NodeFieldEditor';
import { Button } from '@nextui-org/react';
import { Slider } from '@nextui-org/react';
import { Switch } from '@nextui-org/react';
import { Textarea } from '@nextui-org/react';
import { Select, SelectSection, SelectItem } from '@nextui-org/react';

const NodeDetails = ({ nodeID }) => {
    const dispatch = useDispatch();
    const node = useSelector((state) => selectNodeById(state, nodeID));
    console.log('NodeDetails', nodeID, node);

    const [nodeType, setNodeType] = useState(node?.type || 'ExampleNode');
    const findNodeSchema = (nodeType) => {
        for (const category in nodeTypes) {
            const nodeSchema = nodeTypes[category].find((n) => n.name === nodeType);
            if (nodeSchema) return nodeSchema;
        }
        return null;
    };

    const [nodeSchema, setNodeSchema] = useState(findNodeSchema(node?.type));
    const [dynamicModel, setDynamicModel] = useState(null);
    const [fewShotIndex, setFewShotIndex] = useState(null); // Track the index of the few-shot example being edited

    // Initialize DynamicModel when nodeSchema is available
    useEffect(() => {
        if (nodeSchema) {
            const model = new DynamicModel(nodeSchema.config);
            setDynamicModel(model);
        }
    }, [nodeSchema]);

    // Update the input change handler to use DynamicModel
    const handleInputChange = (key, value) => {
        if (dynamicModel) {
            dynamicModel[key] = value; // Update the DynamicModel instance
            dispatch(updateNodeData({ id: nodeID, data: { ...node.data, config: dynamicModel } }));
        }
    };

    // Modify the useEffect to avoid unnecessary updates
    useEffect(() => {
        const schema = findNodeSchema(node?.type);
        setNodeSchema(schema);
        if (schema) {
            const model = new DynamicModel(schema.config);
            setDynamicModel(model);
        }
    }, [nodeID, node]);

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

            switch (field.type) {
                case 'string':
                    return (
                        <Textarea
                            fullWidth
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
                    if (field.minimum !== undefined && field.maximum !== undefined) {
                        return (
                            <div key={key} className="my-4">
                                <Slider
                                    label={field.title || key}
                                    step={field.step || 0.1}
                                    maxValue={field.maximum}
                                    minValue={field.minimum}
                                    defaultValue={value || field.value || field.minimum}
                                    onChange={(newValue) => handleInputChange(key, newValue)}
                                    className="max-w-md"
                                />
                            </div>
                        );
                    }
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
        const fewShotExamples = dynamicModel?.few_shot_examples || [];

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
        );
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
                <Textarea
                    value={node?.data?.title || ''}
                    onChange={(e) => handleInputChange('title', e.target.value)}
                    placeholder="Enter node title"
                    maxRows={1}
                />
            </div>

            {renderConfigFields()}

            {/* Render Few Shot Examples */}
            {renderFewShotExamples()}

            <hr className="my-2" />
        </div>
    );
};

export default NodeDetails;
