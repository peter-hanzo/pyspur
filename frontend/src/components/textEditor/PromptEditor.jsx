import React, { useEffect, useState } from 'react';
import TextEditor from './TextEditor';
import useNode from '../../hooks/useNode';

/**
 * A generic editor component for editing any field in a node's config.
 * @param {string} nodeID - The ID of the node.
 * @param {string} fieldName - The name of the field in the node's config to edit.
 * @param {object} [inputSchema={}] - The input schema containing variables to be inserted into the text (optional).
 * @param {string} [fieldTitle] - The title of the field to be displayed above the editor (optional).
 * @returns {JSX.Element} - The editor component.
 */
const PromptEditor = ({ nodeID, fieldName, inputSchema = {}, fieldTitle, setContent }) => {
  const { config_values, updateConfigValue  } = useNode(nodeID);
  const [fieldValue, setFieldValue] = useState(config_values[fieldName]);

  // Update the node's field value in the config_model when fieldValue changes
  useEffect(() => {
    updateConfigValue(nodeID, fieldName, fieldValue);
  }, [nodeID, fieldValue, fieldName, updateConfigValue]);

  return (
    <div className="w-full">
      <TextEditor
        content={fieldValue}
        setContent={setFieldValue}
        isEditable={true}
        inputSchema={inputSchema}
        fieldTitle={fieldTitle}
      />
    </div>
  );
};

export default PromptEditor;
