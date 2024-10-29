import React, { useEffect } from 'react';
import Wrapper from '../../../textEditor/Wrapper';
import Editor from '../../../textEditor/Editor';
import { useNodeField } from '../../../../hooks/useNodeField';

/**
 * A generic editor component for editing any field in a node's config.
 * @param {string} nodeID - The ID of the node.
 * @param {string} fieldName - The name of the field in the node's config to edit.
 * @returns {JSX.Element} - The editor component.
 */
const NodeFieldEditor = ({ nodeID, fieldName }) => {
  const { fieldValue, setFieldValue } = useNodeField(nodeID, fieldName);
  const editor = Editor(fieldValue, setFieldValue, true);

  useEffect(() => {
    if (editor) {
      editor.commands.setContent(fieldValue);
    }
  }, [fieldValue, editor]);

  return (
    <div className="w-full">
      <Wrapper editor={editor} isEditable={true} />
    </div>
  );
};

export default NodeFieldEditor;
