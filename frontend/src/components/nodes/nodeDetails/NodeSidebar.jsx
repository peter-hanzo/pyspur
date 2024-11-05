import React, { useState, useEffect } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { updateNodeData, selectNodeById } from '../../../store/flowSlice';
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

const NodeDetails = ({ nodeID }) => {
    const dispatch = useDispatch();
    const node = useSelector((state) => selectNodeById(state, nodeID));
    // console.log('NodeDetails', nodeID, node);

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
        if (dynamicModel) {
            console.log('dynamicModel', dynamicModel);

            // Create a new object with updated key-value
            const updatedModel = { ...dynamicModel, [key]: value };

            console.log('updatedModel', updatedModel);
            console.log(updatedModel[key], value);

            // Convert updatedModel to a plain object
            const plainObject = { ...updatedModel };

            dispatch(updateNodeData({ id: nodeID, data: { userconfig: { ...node.data.userconfig, ...plainObject } } }));
            console.log('updated node', node);
        }
    };

    const renderEnumSelect = (key, label, enumValues) => (
        <div key={key}>
            <Select
                label={label}
                value={dynamicModel[key] || ''}
                onChange={(e) => handleInputChange(key, e)}
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
                <Textarea
                    value={node?.data?.userconfig?.title || ''}
                    onChange={(e) => handleInputChange('title', e.target.value)}
                    placeholder="Enter node title"
                    maxRows={1}
                    label="Node Title"
                    fullWidth
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
