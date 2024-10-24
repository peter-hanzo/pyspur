import React, { useEffect, useState } from 'react';
import { useSelector, useDispatch } from 'react-redux';
import Wrapper from '../../../textEditor/Wrapper';
import Editor from '../../../textEditor/Editor';
import { updateNodeData } from '../../../../store/flowSlice';
import Tabs from './Tabs';

const FewShotEditor = ({ nodeID, exampleIndex, onSave, onDiscard }) => {
    const dispatch = useDispatch();
    const node = useSelector((state) => state.flow.nodes.find((n) => n.id === nodeID));
    const [activeTab, setActiveTab] = useState('input'); // Track active tab (input or output)

    const [inputContent, setInputContent] = useState(node?.data?.config?.fewShotExamples?.[exampleIndex]?.input || '');
    const [outputContent, setOutputContent] = useState(node?.data?.config?.fewShotExamples?.[exampleIndex]?.output || '');

    const inputEditor = Editor(inputContent, setInputContent, true);
    const outputEditor = Editor(outputContent, setOutputContent, true);

    useEffect(() => {
        if (inputEditor) {
            inputEditor.commands.setContent(node?.data?.config?.fewShotExamples?.[exampleIndex]?.input || '');
        }
        if (outputEditor) {
            outputEditor.commands.setContent(node?.data?.config?.fewShotExamples?.[exampleIndex]?.output || '');
        }
    }, [nodeID, exampleIndex, inputEditor, outputEditor]);

    const handleSave = () => {
        const updatedExamples = [...(node?.data?.config?.fewShotExamples || [])];
        updatedExamples[exampleIndex] = { input: inputContent, output: outputContent };
        dispatch(updateNodeData({ id: nodeID, data: { config: { ...node?.data?.config, fewShotExamples: updatedExamples } } }));
        onSave();
    };

    return (
        <div className="w-full px-4 py-10 my-10">
            <Tabs activeTab={activeTab} setActiveTab={setActiveTab} />

            {activeTab === 'input' ? (
                <Wrapper editor={inputEditor} isEditable={true} />
            ) : (
                <Wrapper editor={outputEditor} isEditable={true} />
            )}

            <div className="mt-4">
                <button className="px-4 py-2 bg-purple-600 text-white rounded mr-2" onClick={handleSave}>
                    Save
                </button>
                <button className="px-4 py-2 bg-purple-600 text-white rounded" onClick={onDiscard}>
                    Discard
                </button>
            </div>
        </div>
    );
};

export default FewShotEditor;
