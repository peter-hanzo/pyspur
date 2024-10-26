import React, { useEffect, useState } from 'react';
import { useSelector, useDispatch } from 'react-redux';
import Wrapper from '../../../textEditor/Wrapper';
import Editor from '../../../textEditor/Editor';
import { updateNodeData } from '../../../../store/flowSlice';

const PromptEditor = ({ nodeID }) => {
    const dispatch = useDispatch();
    const node = useSelector((state) => state.flow.nodes.find((n) => n.id === nodeID));
    const [system_prompt, setPrompt] = useState(node?.data?.config?.system_prompt || '');

    const editor = Editor(system_prompt, setPrompt, true);

    useEffect(() => {
        if (editor) {
            editor.commands.setContent(node?.data?.config?.system_prompt || '');
        }
    }, [nodeID, node?.data?.config?.system_prompt, editor]);

    // Automatically dispatch changes to the store whenever system_prompt changes
    useEffect(() => {
        if (system_prompt !== node?.data?.config?.system_prompt) {
            dispatch(updateNodeData({ id: nodeID, data: { config: { ...node.data.config, system_prompt } } }));
        }
    }, [system_prompt, node?.data?.config?.system_prompt, dispatch, nodeID]);

    return (
        <div className="w-full px-4 py-10 my-10">
            <Wrapper editor={editor} isEditable={true} />
        </div>
    );
};

export default PromptEditor;
