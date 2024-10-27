import { useEffect, useState } from 'react';
import { useSelector, useDispatch } from 'react-redux';
import { updateNodeData } from '../store/flowSlice';

/**
 * Custom hook to manage a specific field in a node's config.
 * @param {string} nodeID - The ID of the node.
 * @param {string} fieldName - The name of the field in the node's config to manage.
 * @returns {object} - The field value and a setter function to update it.
 */
export const useNodeField = (nodeID, fieldName) => {
    const dispatch = useDispatch();
    const node = useSelector((state) => state.flow.nodes.find((n) => n.id === nodeID));
    const [fieldValue, setFieldValue] = useState(node?.data?.config?.[fieldName] || '');

    useEffect(() => {
        if (fieldValue !== node?.data?.config?.[fieldName]) {
            dispatch(updateNodeData({ id: nodeID, data: { config: { ...node.data.config, [fieldName]: fieldValue } } }));
        }
    }, [fieldValue, node?.data?.config?.[fieldName], dispatch, nodeID, fieldName]);

    return { fieldValue, setFieldValue };
};
