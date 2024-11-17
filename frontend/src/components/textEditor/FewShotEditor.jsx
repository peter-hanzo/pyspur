import React, { useState } from 'react';
import { useSelector, useDispatch } from 'react-redux';
import TextEditor from './TextEditor';
import { updateNodeData } from '../../store/flowSlice';
import { Button, Tabs, Tab } from "@nextui-org/react";

const InputOutputTabs = ({ activeTab, setActiveTab }) => {
    return (
        <div className='mb-5'>
            <div className="flex w-full flex-col items-center">
                <Tabs
                    aria-label="Input/Output Options"
                    selectedKey={activeTab}
                    onSelectionChange={(key) => setActiveTab(key)}
                >
                    <Tab key="input" title="Input" />
                    <Tab key="output" title="Output" />
                </Tabs>
            </div>
        </div>
    );
};

const FewShotEditor = ({ nodeID, exampleIndex, onSave, onDiscard }) => {
    const dispatch = useDispatch();
    const node = useSelector((state) => state.flow.nodes.find((n) => n.id === nodeID));
    const [activeTab, setActiveTab] = useState('input');

    const handleContentChange = (content) => {
        const fieldName = `few_shot_examples[${exampleIndex}].${activeTab}`;
        const updatedExamples = [...(node?.data?.config?.few_shot_examples || [])];

        if (!updatedExamples[exampleIndex]) {
            updatedExamples[exampleIndex] = {};
        }
        updatedExamples[exampleIndex][activeTab] = content;

        dispatch(updateNodeData({
            id: nodeID,
            data: {
                ...node?.data,
                config: {
                    ...node?.data?.config,
                    few_shot_examples: updatedExamples
                }
            }
        }));
    };

    return (
        <div className="w-full px-4 py-10 my-10">
            <InputOutputTabs activeTab={activeTab} setActiveTab={setActiveTab} />

            <TextEditor
                key={`${activeTab}-${exampleIndex}`}
                content={node?.data?.config?.few_shot_examples?.[exampleIndex]?.[activeTab] || ''}
                setContent={handleContentChange}
                isEditable={true}
                fieldTitle={`Example ${exampleIndex + 1} ${activeTab}`}
            />

            <div className="mt-4">
                <Button
                    onPress={onSave}
                    color="primary"
                    variant="solid"
                    auto
                >
                    Save
                </Button>
                <Button
                    onPress={onDiscard}
                    color="primary"
                    variant="flat"
                    auto
                >
                    Discard
                </Button>
            </div>
        </div>
    );
};

export default FewShotEditor;
