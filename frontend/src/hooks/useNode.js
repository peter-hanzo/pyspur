// frontend/src/hooks/useNode.js
import { useDispatch, useSelector } from 'react-redux';
import { useCallback, useMemo } from 'react';
import {
    updateNodeData as updateNodeDataAction,
    setHoveredNode,
    setSelectedNode,
    deleteNode as deleteNodeAction,
} from '../store/flowSlice';
import JSPydanticModel from '../utils/JSPydanticModel';

function useNode(nodeId) {
    const dispatch = useDispatch();

    // Get the node from the Redux store
    const node = useSelector((state) =>
        state.flow.nodes.find((n) => n.id === nodeId)
    );

    // Get hovered and selected node IDs from the store
    const hoveredNodeId = useSelector((state) => state.flow.hoveredNode);
    const selectedNodeId = useSelector((state) => state.flow.selectedNode);

    // Determine if the current node is hovered or selected
    const isHovered = String(nodeId) === String(hoveredNodeId);
    const isSelected = String(nodeId) === String(selectedNodeId);

    // Method to update node data
    const updateNodeData = useCallback(
        (newData) => {
            dispatch(updateNodeDataAction({ id: nodeId, data: newData }));
        },
        [dispatch, nodeId]
    );

    // Initialize input JSPydanticModel with node.input
    const input_model = useMemo(() => {
        if (node && node.data && node.data.input) {
            return new JSPydanticModel(node.data.input);
        }
        return null;
    }, [node]);

    // Initialize output JSPydanticModel with node.output
    const output_model = useMemo(() => {
        if (node && node.data && node.data.output) {
            return new JSPydanticModel(node.data.output);
        }
        return null;
    }, [node]);

    // Initialize config JSPydanticModel with node.config
    const config_model = useMemo(() => {
        if (node && node.data && node.data.config) {
            return new JSPydanticModel(node.data.config);
        }
        return null;
    }, [node]);

    // Initialise config_values with the default values of the config_model
    const config_values = useMemo(() => {
        if (config_model) {
            const defaultValues = config_model.getDefaultValues();
            if (node && node.data && !node.data.config_values) {
                updateNodeData({
                    config_values: defaultValues,
                });
            }
            return node.data.config_values || defaultValues;
        }
        return null;
    }, [config_model, node, updateNodeData]);

    const input_schema = useMemo(() => {
        if (config_model?.input_schema) {
            return config_model.input_schema;
        } else if (input_model) {
            return input_model.getSchema();
        }
        return null;
    }, [config_model, input_model]);

    const output_schema = useMemo(() => {
        if (config_model?.output_schema) {
            return config_model.output_schema;
        } else if (output_model) {
            return output_model.getSchema();
        }
        return null;
    }, [config_model, output_model]);

    const addSchemaKey = useCallback(
        // We store all values provided by the user in the config_values field
        (key, type, schemaType) => {
            if (!key.trim() || !node?.data) {
                return;
            }

            const updatedSchema = {
                ...(node.data.config_values?.[`${schemaType}_schema`] || {}),
                [key]: type,
            };

            updateNodeData({
                config_values: {
                    ...node.data.config_values,
                    [`${schemaType}_schema`]: updatedSchema,
                },
            });
        },
        [node, updateNodeData]
    );

    const deleteSchemaKey = useCallback(
        (key, schemaType) => {
            if (!node?.data) {
                return;
            }

            const updatedSchema = { ...(node.data.config_values?.[`${schemaType}_schema`] || {}) };
            delete updatedSchema[key];

            updateNodeData({
                config_values: {
                    ...node.data.config_values,
                    [`${schemaType}_schema`]: updatedSchema,
                },
            });
        },
        [node, updateNodeData]
    );

    // Method to set node as hovered
    const setHovered = useCallback(
        (hovered) => {
            dispatch(setHoveredNode({ nodeId: hovered ? nodeId : null }));
        },
        [dispatch, nodeId]
    );

    // Method to set node as selected
    const setSelected = useCallback(
        (selected) => {
            dispatch(setSelectedNode({ nodeId: selected ? nodeId : null }));
        },
        [dispatch, nodeId]
    );

    // Method to delete the node
    const deleteNode = useCallback(() => {
        dispatch(deleteNodeAction({ nodeId }));
        if (isSelected) {
            setSelected(false);
        }
    }, [dispatch, nodeId, isSelected, setSelected]);

    // Method to handle schema key editing
    const handleSchemaKeyEdit = useCallback(
        (oldKey, newKey, schemaType) => {
            if (oldKey === newKey || !newKey.trim() || !node?.data) {
                return;
            }

            const schema = node.data.config_values?.[`${schemaType}_schema`] || {};
            const updatedSchema = {
                ...schema,
                [newKey]: schema[oldKey],
            };
            delete updatedSchema[oldKey];

            updateNodeData({
                config_values: {
                    ...node.data.config_values,
                    [`${schemaType}_schema`]: updatedSchema,
                },
            });
        },
        [node, updateNodeData]
    );

    return {
        nodeData: node ? node.data : null,
        input_model,
        output_model,
        config_model,
        input_schema,
        output_schema,
        config_values,
        addSchemaKey,
        deleteSchemaKey,
        updateNodeData,
        setHovered,
        setSelected,
        deleteNode,
        handleSchemaKeyEdit,
        isHovered,
        isSelected,
    };
}

export default useNode;