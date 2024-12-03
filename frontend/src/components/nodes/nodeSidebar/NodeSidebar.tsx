import React, { useState, useEffect, useCallback } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { updateNodeData, selectNodeById, setSidebarWidth, setSelectedNode } from '../../../store/flowSlice';
import NumberInput from '../../NumberInput';
import CodeEditor from '../../CodeEditor';
import { jsonOptions } from '../../../constants/jsonOptions';
import FewShotEditor from '../../textEditor/FewShotEditor';
import TextEditor from '../../textEditor/TextEditor';
import { Button, Slider, Switch, Textarea, Input, Select, SelectItem, Accordion, AccordionItem, Card } from '@nextui-org/react';
import { Icon } from "@iconify/react";
import NodeOutput from "../NodeOutputDisplay";
import SchemaEditor from './SchemaEditor';
import { selectPropertyMetadata } from '../../../store/nodeTypesSlice';
import { cloneDeep, set, debounce } from 'lodash';

interface NodeSidebarProps {
    nodeID: string;
}

interface Node {
    id: string;
    type: string;
    data: {
        config?: Record<string, any>;
        run?: Record<string, any>;
    };
}

interface NodeSchema {
    name: string;
    // Add other properties as needed
}

interface RootState {
    nodeTypes: {
        data: Record<string, NodeSchema[]>;
        metadata: Record<string, any>;
    };
    flow: {
        sidebarWidth: number;
    };
}

interface FieldMetadata {
    enum?: string[];
    title?: string;
    default?: string;
}

const NodeSidebar: React.FC<NodeSidebarProps> = ({ nodeID }) => {
    const dispatch = useDispatch();
    const nodeTypes = useSelector((state: RootState) => state.nodeTypes.data);
    const node = useSelector((state: any) => selectNodeById(state, nodeID));
    const storedWidth = useSelector((state: RootState) => state.flow.sidebarWidth);
    const hasRunOutput = node?.data?.run ? true : false;

    const metadata = useSelector((state: RootState) => state.nodeTypes.metadata);

    const [width, setWidth] = useState<number>(storedWidth);
    const [isResizing, setIsResizing] = useState<boolean>(false);
    const [nodeType, setNodeType] = useState<string>(node?.type || 'ExampleNode');

    const findNodeSchema = (nodeType: string): NodeSchema | null => {
        for (const category in nodeTypes) {
            const nodeSchema = nodeTypes[category].find((n) => n.name === nodeType);
            if (nodeSchema) {
                return nodeSchema;
            }
        }
        return null;
    };

    const [nodeSchema, setNodeSchema] = useState<NodeSchema | null>(findNodeSchema(node?.type));
    const [dynamicModel, setDynamicModel] = useState<Record<string, any>>(node?.data?.config || {});
    const [fewShotIndex, setFewShotIndex] = useState<number | null>(null);

    const debouncedDispatch = useCallback(
        debounce((id: string, updatedModel: Record<string, any>) => {
            dispatch(updateNodeData({ id, data: { config: updatedModel } }));
        }, 300),
        [dispatch]
    );

    useEffect(() => {
        if (node) {
            setNodeType(node.type || 'ExampleNode');
            setNodeSchema(findNodeSchema(node.type));
            setDynamicModel(node.data.config || {});
        }
    }, [nodeID, node, node.data.config]);

    const updateNestedModel = (obj: Record<string, any>, path: string, value: any): Record<string, any> => {
        const deepClone = cloneDeep(obj);
        set(deepClone, path, value);
        return deepClone;
    };

    const handleInputChange = (key: string, value: any, isSlider: boolean = false): void => {
        let updatedModel: Record<string, any>;

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
    ): JSX.Element => {
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

    const handleAddNewExample = (): void => {
        const updatedExamples = [...(dynamicModel?.few_shot_examples || []), { input: '', output: '' }];
        handleInputChange('few_shot_examples', updatedExamples);
        setFewShotIndex(updatedExamples.length - 1);
    };

    const handleDeleteExample = (index: number): void => {
        const updatedExamples = [...(dynamicModel?.few_shot_examples || [])];
        updatedExamples.splice(index, 1);
        handleInputChange('few_shot_examples', updatedExamples);
    };

    const getFieldMetadata = (fullPath: string): FieldMetadata | undefined => {
        return selectPropertyMetadata({ nodeTypes: { metadata } }, fullPath);
    };

    const renderField = (
        key: string,
        field: any,
        value: any,
        parentPath: string = '',
        isLast: boolean = false
    ): JSX.Element | null => {
        const fullPath = `${parentPath ? `${parentPath}.` : ''}${key}`;
        const fieldMetadata = getFieldMetadata(fullPath);

        if (fieldMetadata?.enum) {
            const defaultSelected = value || fieldMetadata.default;
            return renderEnumSelect(key, fieldMetadata.title || key, fieldMetadata.enum, fullPath, defaultSelected);
        }

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
                        setContent={(value) => handleInputChange(key, value)}
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
                    onChange={(newValue) => handleInputChange(key, newValue)}
                />
            );
        }

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
            // Add other cases as needed
            default:
                return null;
        }
    };

    const renderFewShotExamples = (): JSX.Element => {
        return (
            <div className="mt-4">
                <div className="flex justify-between items-center mb-2">
                    <h3 className="text-lg font-semibold">Few-Shot Examples</h3>
                    <Button
                        size="sm"
                        onClick={handleAddNewExample}
                        variant="light"
                    >
                        Add Example
                    </Button>
                </div>
                {dynamicModel?.few_shot_examples?.map((example: any, index: number) => (
                    <div key={index} className="mb-4">
                        <div className="flex justify-between items-center mb-2">
                            <h4 className="text-md font-medium">Example {index + 1}</h4>
                            <Button
                                size="sm"
                                color="danger"
                                variant="light"
                                onClick={() => handleDeleteExample(index)}
                            >
                                Delete
                            </Button>
                        </div>
                        <FewShotEditor
                            example={example}
                            index={index}
                            onUpdate={(updatedExample) => {
                                const updatedExamples = [...(dynamicModel.few_shot_examples || [])];
                                updatedExamples[index] = updatedExample;
                                handleInputChange('few_shot_examples', updatedExamples);
                            }}
                        />
                    </div>
                ))}
            </div>
        );
    };

    return (
        <div className="flex flex-col h-full">
            {/* Add your JSX for the sidebar layout */}
            {/* This part would depend on your specific implementation */}
        </div>
    );
};

export default NodeSidebar;