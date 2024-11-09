import React, { useEffect, useState } from 'react';
import { useSelector, useDispatch } from 'react-redux';
import TextEditor from './TextEditor';
import { updateNodeData, selectNodeById } from '../../store/flowSlice';

/**
 * A generic editor component for editing any field in a node's config.
 * @param {string} nodeID - The ID of the node.
 * @param {string} fieldName - The name of the field in the node's config to edit.
 * @param {object} [inputSchema={}] - The input schema containing variables to be inserted into the text (optional).
 * @param {string} [fieldTitle] - The title of the field to be displayed above the editor (optional).
 * @returns {JSX.Element} - The editor component.
 */
const PromptEditor = ({ nodeID, fieldName, inputSchema = {}, fieldTitle }) => { // Accept fieldTitle as a prop
  const dispatch = useDispatch();
  const node = useSelector((state) => selectNodeById(state, nodeID)); // Use the selector to get the node
  const [fieldValue, setFieldValue] = useState(
    // First try to read from userconfig, fall back to config.properties
    node?.data?.userconfig?.[fieldName] ||
    node?.data?.config?.properties?.[fieldName]?.value ||
    ''
  );

  // Update the node's field value in the Redux store when fieldValue changes
  useEffect(() => {
    if (!node) return; // Add early return if node is undefined

    // Compare with userconfig instead of config.properties
    if (fieldValue !== node?.data?.userconfig?.[fieldName]) {
      dispatch(updateNodeData({
        id: nodeID,
        data: {
          ...node?.data,
          userconfig: {
            ...node?.data?.userconfig || {}, // Add fallback empty object
            [fieldName]: fieldValue,
          },
        },
      }));
    }
  }, [fieldValue, node, node?.data?.userconfig?.[fieldName], dispatch, nodeID, fieldName]);

  return (
    <div className="w-full">
      <TextEditor
        content={fieldValue}
        setContent={setFieldValue}
        isEditable={true}
        inputSchema={inputSchema}
        fieldTitle={fieldTitle}  // Ensure fieldTitle is passed here
      />
    </div>
  );
};

export default PromptEditor;
