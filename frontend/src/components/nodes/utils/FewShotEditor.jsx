import React, { useEffect, useState } from 'react';
import { useSelector, useDispatch } from 'react-redux';
import TextEditor from '../../textEditor/TextEditor';
import { updateNodeData } from '../../../store/flowSlice';
import Tabs from './Tabs';
import { Button } from "@nextui-org/react";

const FewShotEditor = ({ nodeID, exampleIndex, onSave, onDiscard }) => {
    const dispatch = useDispatch();
    const node = useSelector((state) => state.flow.nodes.find((n) => n.id === nodeID));
    const [activeTab, setActiveTab] = useState('input'); // Track active tab (input or output)

    const [inputContent, setInputContent] = useState(node?.data?.userconfig?.few_shot_examples?.[exampleIndex]?.input || '');
    const [outputContent, setOutputContent] = useState(node?.data?.userconfig?.few_shot_examples?.[exampleIndex]?.output || '');

    useEffect(() => {
        setInputContent(node?.data?.userconfig?.few_shot_examples?.[exampleIndex]?.input || '');
        setOutputContent(node?.data?.userconfig?.few_shot_examples?.[exampleIndex]?.output || '');
    }, [nodeID, exampleIndex]);

    const handleSave = () => {
        const updatedExamples = [...(node?.data?.userconfig?.few_shot_examples || [])];
        updatedExamples[exampleIndex] = { input: inputContent, output: outputContent };
        dispatch(updateNodeData({ id: nodeID, data: { userconfig: { ...node?.data?.userconfig, few_shot_examples: updatedExamples } } }));
        onSave();
    };

    return (
        <div className="w-full px-4 py-10 my-10">
            <Tabs activeTab={activeTab} setActiveTab={setActiveTab} />

            {activeTab === 'input' ? (
                <TextEditor content={inputContent} setContent={setInputContent} isEditable={true} />
            ) : (
                <TextEditor content={outputContent} setContent={setOutputContent} isEditable={true} />
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
