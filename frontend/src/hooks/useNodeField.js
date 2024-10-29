import { useEffect, useState } from 'react';
import { useSelector, useDispatch } from 'react-redux';
import { updateNodeData, selectNodeById } from '../store/flowSlice';

/**
 * Custom hook to manage a specific field in a node's config.
 * @param {string} nodeID - The ID of the node.
 * @param {string} fieldName - The name of the field in the node's config to manage.
 * @returns {object} - The field value and a setter function to update it.
 */
export const useNodeField = (nodeID, fieldName) => {
  const dispatch = useDispatch();
  const node = useSelector((state) => selectNodeById(state, nodeID)); // Use the selector to get the node
  const [fieldValue, setFieldValue] = useState(node?.data?.userconfig?.[fieldName] || ''); // Read from userconfig

  useEffect(() => {
    if (fieldValue !== node?.data?.userconfig?.[fieldName]) { // Compare with userconfig
      dispatch(updateNodeData({
        id: nodeID,
        data: {
          userconfig: {
            ...node.data.userconfig,
            [fieldName]: fieldValue, // Write to userconfig
          },
        },
      }));
    }
  }, [fieldValue, node?.data?.userconfig?.[fieldName], dispatch, nodeID, fieldName]);

  return { fieldValue, setFieldValue };
};
