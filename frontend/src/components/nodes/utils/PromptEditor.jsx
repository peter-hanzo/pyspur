import React, { useEffect, useState, useRef } from 'react';
import { useSelector, useDispatch } from 'react-redux';
import TextEditor from '../../textEditor/TextEditor';
import { updateNodeData, selectNodeById } from '../../../store/flowSlice';

/**
 * A generic editor component for editing any field in a node's config.
 * @param {string} nodeID - The ID of the node.
 * @param {string} fieldName - The name of the field in the node's config to edit.
 * @param {object} inputSchema - The input schema containing variables to be inserted into the text.
 * @returns {JSX.Element} - The editor component.
 */
const PromptEditor = ({ nodeID, fieldName, inputSchema }) => {
  const dispatch = useDispatch();
  const node = useSelector((state) => selectNodeById(state, nodeID)); // Use the selector to get the node
  const [fieldValue, setFieldValue] = useState(node?.data?.config?.properties?.[fieldName]?.value || ''); // Read from config
  const textEditorRef = useRef(null); // Reference to the TextEditor

  // Update the node's field value in the Redux store when fieldValue changes
  useEffect(() => {
    if (fieldValue !== node?.data?.config?.properties?.[fieldName]?.value) { // Compare with config
      dispatch(updateNodeData({
        id: nodeID,
        data: {
          config: {
            ...node.data?.config,
            properties: {
              ...node.data?.config?.properties,
              [fieldName]: {
                ...node.data.config.properties[fieldName],
                value: fieldValue, // Write to node.data.config[fieldName].value
              },
            },
          },
        },
      }));
    }
  }, [fieldValue, node?.data?.config?.properties?.[fieldName]?.value, dispatch, nodeID, fieldName]);

  // Handle variable insertion
  const handleVariableClick = (variable) => {
    // Insert the variable at the current cursor position in the text editor
    if (textEditorRef.current) {
      textEditorRef.current.insertAtCursor(`{${variable}}`);
    }
  };

  return (
    <div className="w-full">
      <div className="flex flex-wrap gap-2 mb-4">
        {Object.keys(inputSchema).map((variable) => (
          <button
            key={variable}
            className="px-3 py-1 rounded bg-gray-200"
            onClick={() => handleVariableClick(variable)}
          >
            {variable}
          </button>
        ))}
      </div>
      <TextEditor
        ref={textEditorRef} // Pass the ref to the TextEditor
        content={fieldValue}
        setContent={setFieldValue}
        isEditable={true}
      />
    </div>
  );
};

export default PromptEditor;
