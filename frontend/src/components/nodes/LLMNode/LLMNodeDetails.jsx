import React, { useEffect, useState } from 'react';
import { useSelector, useDispatch } from 'react-redux';
import Wrapper from '../../textEditor/Wrapper';
import Editor from '../../textEditor/Editor';
import { updateNodeData } from '../../../store/flowSlice';
import PromptEditor from './Utils/PromptEditor';
import FewShotEditor from './Utils/FewShotEditor';

const NodeDetails = ({ nodeID }) => {
    const dispatch = useDispatch();
    const node = useSelector((state) => state.flow.nodes.find((n) => n.id === nodeID));

    const [isEditing, setIsEditing] = useState({ prompt: false, fewShotIndex: null });
    const [isPromptEditing, setIsPromptEditing] = useState(false);
    const [fewShotIndex, setFewShotIndex] = useState(null);

    const promptEditor = Editor(node?.data?.prompt || '', null, false);

    useEffect(() => {
        setIsEditing({ prompt: false, fewShotIndex: null });
        setFewShotIndex(null);
        setIsPromptEditing(false);
        if (promptEditor && node?.data?.prompt !== promptEditor.getHTML()) {
            promptEditor.commands.setContent(node?.data?.prompt || '');
        }
    }, [nodeID, node?.data?.prompt, promptEditor]);

    const handleAddNewExample = () => {
        const updatedExamples = [...(node?.data?.fewShotExamples || []), ''];
        dispatch(updateNodeData({ id: nodeID, data: { fewShotExamples: updatedExamples } }));
    };

    const handleDeleteExample = (index) => {
        const updatedExamples = [...(node?.data?.fewShotExamples || [])];
        updatedExamples.splice(index, 1);
        dispatch(updateNodeData({ id: nodeID, data: { fewShotExamples: updatedExamples } }));
    };

    if (!node) {
        return <div>No node selected</div>;
    }

    return (
        <div className="p-4">
            {isPromptEditing && (
                <PromptEditor
                    nodeID={nodeID}
                    onSave={() => setIsPromptEditing(false)}
                    onDiscard={() => setIsPromptEditing(false)}
                />
            )}
            {fewShotIndex !== null && (
                <FewShotEditor
                    nodeID={nodeID}
                    exampleIndex={fewShotIndex}
                    onSave={() => setFewShotIndex(null)}
                    onDiscard={() => setFewShotIndex(null)}
                />
            )}
            {!isPromptEditing && fewShotIndex === null && (
                <div>
                    <h2 className="text-lg font-bold mb-2">Node Details</h2>
                    <p><strong>ID:</strong> {node.id}</p>

                    <h3 className="my-4 font-semibold">Prompt</h3>
                    <Wrapper editor={promptEditor} isEditable={false} />

                    <div className="mb-10">
                        <button
                            className="px-2 py-1 bg-purple-600 text-white rounded mr-2"
                            onClick={() => {
                                setIsEditing({ ...isEditing, prompt: true })
                                setIsPromptEditing(true);
                            }}
                        >
                            Edit Prompt
                        </button>
                    </div>

                    <h3 className="my-6 font-semibold">Few Shot Examples</h3>
                    <ul>
                        {node?.data?.fewShotExamples?.map((example, index) => (
                            <li key={index} className="flex items-center justify-between mb-2">
                                <div>Example {index + 1}</div>
                                <div className="ml-2">
                                    <button
                                        className="px-2 py-1 bg-purple-600 text-white rounded mr-2"
                                        onClick={() => {
                                            setFewShotIndex(index);
                                            setIsEditing({ prompt: false, fewShotIndex: index })
                                        }}
                                    >
                                        Edit
                                    </button>
                                    <button
                                        className="px-2 py-1 bg-purple-600 text-white rounded"
                                        onClick={() => handleDeleteExample(index)}
                                    >
                                        Delete
                                    </button>
                                </div>
                            </li>
                        ))}
                    </ul>

                    <div className="mt-4">
                        <button
                            className="mt-2 px-2 py-1 bg-purple-600 text-white rounded"
                            onClick={handleAddNewExample}
                        >
                            Add Example
                        </button>
                    </div>
                </div>
            )}
        </div>
    );
};

export default NodeDetails;
