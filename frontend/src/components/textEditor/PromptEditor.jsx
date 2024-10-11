import React, { useEffect, useState } from 'react';
import { useSelector, useDispatch } from 'react-redux';
import Wrapper from './Wrapper';
import Editor from './Editor';
import { updateNodeData } from '../../store/flowSlice';

const PromptEditor = ({ nodeID, onSave, onDiscard }) => {
    const dispatch = useDispatch();
    const node = useSelector((state) => state.flow.nodes.find((n) => n.id === nodeID));
    const [prompt, setPrompt] = useState(node?.data?.prompt || '');

    const editor = Editor(prompt, setPrompt, true);

    useEffect(() => {
        if (editor) {
            editor.commands.setContent(node?.data?.prompt || '');
        }
    }, [nodeID, node?.data?.prompt, editor]);

    const handleSave = () => {
        dispatch(updateNodeData({ id: nodeID, data: { prompt } }));
        onSave();
    };

    return (
        <div className="w-full px-4 py-10 my-10">
            <Wrapper editor={editor} isEditable={true} />
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

export default PromptEditor;
