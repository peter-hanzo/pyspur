import React, { useState } from 'react';
import { useSelector, useDispatch } from 'react-redux';
import PromptEditor from './PromptEditor';
import { updateNodeData } from '../../store/flowSlice';

import { Button, Tabs, Tab } from "@nextui-org/react";
const Tabs = ({ activeTab, setActiveTab }) => {
    return (
        <div className='mb-5'>
            <div className="flex w-full flex-col items-center">
                <Tabs
                    aria-label="Input/Output Options"
                    selectedKey={activeTab} // Manage active tab state
                    onSelectionChange={(key) => setActiveTab(key)} // Set active tab on click
                >
                    <Tab key="input" title="Input">
                        {/* Content for Input */}
                    </Tab>
                    <Tab key="output" title="Output">
                        {/* Content for Output */}
                    </Tab>
                </Tabs>
            </div>
        </div>
    );
};


const FewShotEditor = ({ nodeID, exampleIndex, onSave, onDiscard }) => {
    const dispatch = useDispatch();
    const node = useSelector((state) => state.flow.nodes.find((n) => n.id === nodeID));
    const [activeTab, setActiveTab] = useState('input');

    const handleSave = () => {
        onSave();
    };

    return (
        <div className="w-full px-4 py-10 my-10">
            <Tabs activeTab={activeTab} setActiveTab={setActiveTab} />

            {activeTab === 'input' ? (
                <PromptEditor
                    key={`input-${exampleIndex}`}
                    nodeID={nodeID}
                    fieldName={`few_shot_examples[${exampleIndex}].input`}
                    value={node?.data?.userconfig?.few_shot_examples?.[exampleIndex]?.input}
                />
            ) : (
                <PromptEditor
                    key={`output-${exampleIndex}`}
                    nodeID={nodeID}
                    fieldName={`few_shot_examples[${exampleIndex}].output`}
                    value={node?.data?.userconfig?.few_shot_examples?.[exampleIndex]?.output}
                />
            )}

            <div className="mt-4">
                <Button
                    onPress={handleSave}
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
