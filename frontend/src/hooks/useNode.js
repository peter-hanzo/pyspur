// frontend/src/hooks/useNode.js
import { useDispatch, useSelector, shallowEqual } from 'react-redux';
import { useCallback, useMemo } from 'react';
import {
    updateNodeData as updateNodeDataAction,
    updateNodeDataPath,
    setHoveredNode,
    setSelectedNode,
    deleteNode as deleteNodeAction,
    updateEdgesOnHandleRename,
} from '../store/flowSlice';
import JSPydanticModel from '../utils/JSPydanticModel';

function useNode(nodeId) {
    const dispatch = useDispatch();

    // Get the node from the Redux store
    const node = useSelector(
        (state) => state.flow.nodes.find((n) => n.id === nodeId),
        shallowEqual
    );

    const nodeData = useSelector((state) => {
        const node = state.flow.nodes.find((n) => n.id === nodeId);
        if (node) {
            return node.data;
        }
        return null;
    });

    // Get hovered and selected node IDs from the store
    const hoveredNodeId = useSelector((state) => {
        return state.flow.hoveredNode;
    });
    const selectedNodeId = useSelector((state) => {
        return state.flow.selectedNode;
    });

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
        if (node?.data?.input) {
            return new JSPydanticModel(node.data.input);
        }
        return null;
    }, [node?.data?.input]);

    // Initialize output JSPydanticModel with node.output
    const output_model = useMemo(() => {
        if (node?.data?.output) {
            return new JSPydanticModel(node.data.output);
        }
        return null;
    }, [node?.data?.output]);

    // Initialize config JSPydanticModel with node.config
    const config_model = useMemo(() => {
        if (node?.data?.config) {
            return new JSPydanticModel(node.data.config);
        }
        return null;
    }, [node?.data?.config]);

    const updateConfigValue = useCallback(
        (nodeId, key, value) => {
            if (!node?.data) {
                return;
            }
            try{
                const oldValue = node.data.config_values[key];
                if (oldValue === value) {
                    return;
                }
            } catch (error) {
                console.log('Error:', error);
            }
            const updatedConfig = { ...node.data.config_values, [key]: value };
            dispatch(updateNodeDataPath({ id: nodeId, path: 'config_values', value: updatedConfig }));
        }, [dispatch, node?.data]
    );

    // Initialise config_values with the default values of the config_model
    const config_values = useMemo(() => {
        if (config_model) {
            const defaultValues = config_model.getDefaultValues();
            const previouslySetValues = node?.data?.config?.input_schema;
            const currentValues = node?.data?.config_values;
            if (currentValues) {
                return currentValues;
            }
            if (previouslySetValues) {
                return previouslySetValues;
            }
            return defaultValues;
        }
        return null;
    }, [config_model, node?.data?.config?.input_schema, node?.data.config_values]);

    const input_schema = useMemo(() => {
        if (config_values?.input_schema) {
            return config_values.input_schema;
        } else if (config_model?.input_schema) {
            return config_model.input_schema;
        } else if (input_model) {
            const kv_schema = input_model.getSchema();
            return Object.keys(kv_schema).map((key) => ({
                field_name: key,
                field_type: kv_schema[key],
            }));
        }
        return null;
    }, [config_values?.input_schema, config_model?.input_schema, input_model]);

    const output_schema = useMemo(() => {
        if (config_values?.output_schema) {
            return config_values.output_schema;
        } else if (config_model?.output_schema) {
            return config_model.output_schema;
        } else if (output_model) {
            const kv_schema = output_model.getSchema();
            return Object.keys(kv_schema).map((key) => ({
                field_name: key,
                field_type: kv_schema[key],
            }));
        }
        return null;
    }, [config_values?.output_schema, config_model?.output_schema, output_model]);

    const addSchemaField = useCallback(
        (key, type, schemaType) => {
            if (!key.trim() || !node?.data) {
                return;
            }

            const schemaFieldsSoFar = config_values?.[`${schemaType}_schema`] || [];
            const newSchemaField = { field_name: key, field_type: type };
            const updatedSchema = schemaFieldsSoFar.concat(newSchemaField);

            const updatedData = {
                ...node.data,
                config_values: {
                    ...node.data.config_values,
                    [`${schemaType}_schema`]: updatedSchema,
                },
            };

            updateNodeData(updatedData);
        },
        [updateNodeData]
    );

    const deleteSchemaField = useCallback(
        (key, schemaType) => {
            if (!node?.data) {
                return;
            }

            const updatedSchema = node.data.config_values?.[`${schemaType}_schema`].filter(
                (field) => field.field_name !== key
            );
            updateNodeData({
                config_values: {
                    ...node.data.config_values,
                    [`${schemaType}_schema`]: updatedSchema,
                },
            });
        },
        [node, updateNodeData]
    );

    const updateSchemaField = useCallback(
        (origKey, newKey, newType, schemaType) => {
            if (!node?.data) {
                return;
            }

            const updatedSchema = node.data.config_values?.[`${schemaType}_schema`].map((field) => {
                if (field.fieldName === origKey) {
                    return {
                        field_name: newKey,
                        field_type: newType ? newType : field.field_type,
                    };
                }
                return field;
            });
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

            dispatch(updateEdgesOnHandleRename({
                nodeId: node.id,
                oldHandleId: oldKey,
                newHandleId: newKey,
                schemaType,
            }));
        },
        [node, updateNodeData, dispatch]
    );

    return {
        node,
        nodeData,
        input_model,
        output_model,
        config_model,
        input_schema,
        output_schema,
        config_values,
        updateConfigValue,
        addSchemaField,
        deleteSchemaField,
        updateSchemaField,
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