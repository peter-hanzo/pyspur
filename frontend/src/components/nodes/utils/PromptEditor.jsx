import React, { useEffect, useState } from 'react';
import { useSelector, useDispatch } from 'react-redux';
import TextEditor from '../../textEditor/TextEditor';
import { updateNodeData, selectNodeById } from '../../../store/flowSlice';

/**
 * A generic editor component for editing any field in a node's config.
 * @param {string} nodeID - The ID of the node.
 * @param {string} fieldName - The name of the field in the node's config to edit.
 * @returns {JSX.Element} - The editor component.
 */
const PromptEditor = ({ nodeID, fieldName }) => {
  const dispatch = useDispatch();
  const node = useSelector((state) => selectNodeById(state, nodeID)); // Use the selector to get the node
  const [fieldValue, setFieldValue] = useState(node?.data?.config?.properties?.[fieldName]?.value || ''); // Read from config

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

  return (
    <div className="w-full">
      <TextEditor content={fieldValue} setContent={setFieldValue} isEditable={true} />
    </div>
  );
};

export default PromptEditor;
