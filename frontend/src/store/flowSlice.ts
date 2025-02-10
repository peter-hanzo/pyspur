import { FlowState } from '@/types/api_types/flowStateSchema'
import {
    CreateNodeResult,
    FlowWorkflowEdge,
    FlowWorkflowNode,
    NodeTypesConfig,
    Position,
} from '@/types/api_types/nodeTypeSchemas'
import { TestInput, WorkflowDefinition } from '@/types/api_types/workflowSchemas'
import { isTargetAncestorOfSource } from '@/utils/cyclicEdgeUtils'
import { createSlice, PayloadAction } from '@reduxjs/toolkit'
import { addEdge, applyEdgeChanges, applyNodeChanges, Connection, EdgeChange, NodeChange } from '@xyflow/react'
import { isEqual } from 'lodash'
import { v4 as uuidv4 } from 'uuid'
import { createNode } from '../utils/nodeFactory'

const initialState: FlowState = {
    nodeTypes: {},
    nodes: [],
    edges: [],
    nodeConfigs: {},
    workflowID: null,
    selectedNode: null,
    selectedEdgeId: null,
    sidebarWidth: 400,
    projectName: 'Untitled Project',
    workflowInputVariables: {},
    testInputs: [],
    inputNodeValues: {},
    history: {
        past: [],
        future: [],
    },
}

const saveToHistory = (state: FlowState) => {
    state.history.past.push({
        nodes: JSON.parse(JSON.stringify(state.nodes)),
        edges: JSON.parse(JSON.stringify(state.edges)),
    })
    state.history.future = []
}

function rebuildRouterNodeSchema(state: FlowState, routerNode: FlowWorkflowNode) {
    const incomingEdges = state.edges.filter((edge) => edge.target === routerNode.id)

    // Build new output schema by combining all source nodes
    const newOutputSchema = incomingEdges.reduce(
        (schema, edge) => {
            const sourceNode = state.nodes.find((n) => n.id === edge.source)
            const sourceNodeConfig = sourceNode ? state.nodeConfigs[sourceNode.id] : undefined
            if (sourceNodeConfig?.output_schema) {
                const nodeTitle = sourceNodeConfig.title || sourceNode?.id
                const sourceSchema = sourceNodeConfig.output_schema

                // Add prefixed entries from the source schema
                Object.entries(sourceSchema).forEach(([key, value]) => {
                    schema[`${nodeTitle}.${key}`] = value
                })
            }
            return schema
        },
        {} as Record<string, any>
    )

    const routerNodeConfig = state.nodeConfigs[routerNode.id] || {}
    const currentSchema = routerNodeConfig.output_schema || {}
    const hasChanges = !isEqual(currentSchema, newOutputSchema)

    // Only update if there are actual changes
    if (hasChanges) {
        state.nodeConfigs[routerNode.id] = {
            ...routerNodeConfig,
            output_schema: newOutputSchema,
        }
    }
}

function rebuildCoalesceNodeSchema(state: FlowState, coalesceNode: FlowWorkflowNode) {
    const incomingEdges = state.edges.filter((edge) => edge.target === coalesceNode.id)

    // Collect all source schemas
    const schemas: Record<string, any>[] = incomingEdges.map((ed) => {
        const sourceNode = state.nodes.find((n) => n.id === ed.source)
        return sourceNode ? state.nodeConfigs[sourceNode.id]?.output_schema || {} : {}
    })

    // Intersection
    let intersection: Record<string, any> = {}
    if (schemas.length > 0) {
        const firstSchema = schemas[0]
        const commonKeys = Object.keys(firstSchema).filter((key) =>
            schemas.every((sch) => sch.hasOwnProperty(key) && sch[key] === firstSchema[key])
        )
        commonKeys.forEach((key) => {
            intersection[key] = firstSchema[key]
        })
    }

    const coalesceNodeConfig = state.nodeConfigs[coalesceNode.id] || {}
    state.nodeConfigs[coalesceNode.id] = {
        ...coalesceNodeConfig,
        output_schema: intersection,
    }
}

const generateJsonSchema = (schema: Record<string, any>): string => {
    const jsonSchema = {
        type: 'object',
        properties: Object.fromEntries(
            Object.entries(schema).map(([key, type]) => [key, { type }])
        ),
        required: Object.keys(schema)
    }
    return JSON.stringify(jsonSchema, null, 2)
}

const flowSlice = createSlice({
    name: 'flow',
    initialState,
    reducers: {
        initializeFlow: (
            state,
            action: PayloadAction<{
                workflowID: string
                definition: WorkflowDefinition
                name: string
                nodeTypes: NodeTypesConfig
            }>
        ) => {
            const { workflowID, definition, name } = action.payload
            state.workflowID = workflowID
            state.projectName = name
            state.nodeTypes = action.payload.nodeTypes
            const { nodes, links } = definition
            state.nodes = nodes.map((node) => {
                const { node: nodeObj } = createNode(
                    state.nodeTypes,
                    node.node_type,
                    node.id,
                    {
                        x: node.coordinates.x,
                        y: node.coordinates.y,
                    },
                    node.parent_id,
                    node.dimensions,
                    node.title
                )
                // Load the config directly from the definition instead of creating fresh
                state.nodeConfigs[node.id] = node.config
                return nodeObj
            })

            let edges = links.map((link) => ({
                id: uuidv4(),
                key: uuidv4(),
                selected: false,
                source: link.source_id,
                target: link.target_id,
                sourceHandle: link.source_handle || link.source_id,
                targetHandle: link.target_handle || link.source_id,
            }))
            // deduplicate edges
            edges = edges.filter(
                (edge, index, self) =>
                    index === self.findIndex((t) => t.source === edge.source && t.target === edge.target)
            )
            state.edges = edges
        },

        nodesChange: (state, action: PayloadAction<{ changes: NodeChange[] }>) => {
            state.nodes = applyNodeChanges(action.payload.changes, state.nodes) as FlowWorkflowNode[]
        },

        edgesChange: (state, action: PayloadAction<{ changes: EdgeChange[] }>) => {
            state.edges = applyEdgeChanges(action.payload.changes, state.edges) as FlowWorkflowEdge[]
        },

        connect: (state, action: PayloadAction<{ connection: Connection }>) => {
            if (
                isTargetAncestorOfSource(
                    action.payload.connection.source,
                    action.payload.connection.target,
                    state.nodes,
                    state.edges
                )
            ) {
                return
            }
            saveToHistory(state)
            const { connection } = action.payload

            // Avoid duplicates
            if (state.edges.find((edge) => edge.source === connection.source && edge.target === connection.target)) {
                return
            }
            state.edges = addEdge(connection, state.edges)

            const targetNode = state.nodes.find((node) => node.id === connection.target)
            if (!targetNode) return

            // allow only if source and target node have the same parentId
            const sourceNode = state.nodes.find((node) => node.id === connection.source)
            if (sourceNode && sourceNode.parentId !== targetNode.parentId) {
                state.edges = state.edges.filter(
                    (edge) => !(edge.source === connection.source && edge.target === connection.target)
                )
                return
            }

            // If it's a RouterNode, rebuild schema
            if (targetNode.type === 'RouterNode') {
                rebuildRouterNodeSchema(state, targetNode)
            }
            // If it's a CoalesceNode, rebuild intersection
            if (targetNode.type === 'CoalesceNode') {
                rebuildCoalesceNodeSchema(state, targetNode)
            }
        },

        addNode: (state, action: PayloadAction<{ node: FlowWorkflowNode }>) => {
            if (action.payload.node) {
                saveToHistory(state)
                state.nodes = [...state.nodes, action.payload.node]
            }
        },

        setNodes: (state, action: PayloadAction<{ nodes: FlowWorkflowNode[] }>) => {
            state.nodes = action.payload.nodes
        },

        updateNodeDataOnly: (state, action: PayloadAction<{ id: string; data: any }>) => {
            const { id, data } = action.payload

            // Update node data only
            const node = state.nodes.find((n) => n.id === id)
            if (node) {
                node.data = {
                    ...node.data,
                    ...data,
                    // Preserve taskStatus if it exists in the current data and isn't being updated
                    taskStatus: data.taskStatus !== undefined ? data.taskStatus : node.data?.taskStatus,
                }
            }
        },

        updateNodeConfigOnly: (state, action: PayloadAction<{ id: string; data: any }>) => {
            const { id, data } = action.payload

            // Only update nodeConfigs
            state.nodeConfigs[id] = {
                ...state.nodeConfigs[id],
                ...data,
            }

            // If output_schema changed, rebuild connected RouterNode/CoalesceNode schemas
            if (data?.output_schema) {
                const connectedRouterNodes = state.nodes.filter(
                    (targetNode) =>
                        targetNode.type === 'RouterNode' &&
                        state.edges.some((edge) => edge.source === id && edge.target === targetNode.id)
                )
                connectedRouterNodes.forEach((routerNode) => {
                    rebuildRouterNodeSchema(state, routerNode)
                })

                const connectedCoalesceNodes = state.nodes.filter(
                    (targetNode) =>
                        targetNode.type === 'CoalesceNode' &&
                        state.edges.some((edge) => edge.source === id && edge.target === targetNode.id)
                )
                connectedCoalesceNodes.forEach((coalesceNode) => {
                    rebuildCoalesceNodeSchema(state, coalesceNode)
                })
            }
        },

        setSelectedNode: (state, action: PayloadAction<{ nodeId: string | null }>) => {
            state.selectedNode = action.payload.nodeId
        },

        setSelectedEdgeId: (state, action: PayloadAction<{ edgeId: string | null }>) => {
            state.selectedEdgeId = action.payload.edgeId
        },

        deleteNode: (state, action: PayloadAction<{ nodeId: string }>) => {
            const nodeId = action.payload.nodeId
            saveToHistory(state)
            state.nodes = state.nodes.filter((node) => node.id !== nodeId)
            state.edges = state.edges.filter((edge) => edge.source !== nodeId && edge.target !== nodeId)

            // Remove node from nodeConfigs and selectedNode if it was selected
            delete state.nodeConfigs[nodeId]
            if (state.selectedNode === nodeId) {
                state.selectedNode = null
            }

            // Delete nodes whose parent is the deleted node
            const children = state.nodes.filter((node) => node.parentId === nodeId)
            children.forEach((child) => {
                delete state.nodeConfigs[child.id]
            })
            state.nodes = state.nodes.filter((node) => node.parentId !== nodeId)
            state.edges = state.edges.filter((edge) => !children.find((child) => child.id === edge.source))
            state.edges = state.edges.filter((edge) => !children.find((child) => child.id === edge.target))
        },

        deleteEdge: (state, action: PayloadAction<{ edgeId: string }>) => {
            saveToHistory(state)
            const edgeId = action.payload.edgeId
            const edge = state.edges.find((e) => e.id === edgeId)

            if (edge) {
                // Find the target node
                const targetNode = state.nodes.find((node) => node.id === edge.target)
                const sourceNode = state.nodes.find((node) => node.id === edge.source)
                const targetNodeConfig = targetNode ? state.nodeConfigs[targetNode.id] : undefined
                const sourceNodeConfig = sourceNode ? state.nodeConfigs[sourceNode.id] : undefined

                // If target is a RouterNode and source has output schema, update target's schema
                if (targetNode?.type === 'RouterNode' && sourceNodeConfig?.output_schema) {
                    const sourceTitle = sourceNodeConfig.title || sourceNode?.id
                    const currentSchema = { ...(targetNodeConfig?.output_schema || {}) }

                    // Remove fields that start with this source's prefix
                    const prefix = `${sourceTitle}.`
                    Object.keys(currentSchema).forEach((key) => {
                        if (key.startsWith(prefix)) {
                            delete currentSchema[key]
                        }
                    })

                    // Update the target node's schema
                    state.nodeConfigs[targetNode.id] = {
                        ...targetNodeConfig,
                        output_schema: currentSchema,
                    }
                }

                if (targetNode?.type === 'CoalesceNode') {
                    // Filter out the edge we're deleting so it doesn't appear in the intersection
                    const incomingEdges = state.edges.filter((e) => e.target === targetNode.id && e.id !== edgeId)

                    // Collect all source schemas from remaining edges
                    const schemas: Record<string, any>[] = []
                    incomingEdges.forEach((ed) => {
                        const sourceNode = state.nodes.find((n) => n.id === ed.source)
                        const sourceNodeConfig = sourceNode ? state.nodeConfigs[sourceNode.id] : undefined
                        if (sourceNodeConfig?.output_schema) {
                            schemas.push(sourceNodeConfig.output_schema)
                        }
                    })

                    // Compute intersection
                    let intersection: Record<string, any> = {}
                    if (schemas.length > 0) {
                        const firstSchema = schemas[0]
                        const commonKeys = Object.keys(firstSchema).filter((key) =>
                            schemas.every((sch) => sch.hasOwnProperty(key) && sch[key] === firstSchema[key])
                        )
                        commonKeys.forEach((key) => {
                            intersection[key] = firstSchema[key]
                        })
                    }

                    state.nodeConfigs[targetNode.id] = {
                        ...targetNodeConfig,
                        output_schema: intersection,
                    }
                }

                // Remove the edge
                state.edges = state.edges.filter((e) => e.id !== edgeId)
            }
        },

        deleteEdgeByHandle: (state, action: PayloadAction<{ nodeId: string; handleKey: string }>) => {
            const { nodeId, handleKey } = action.payload
            state.edges = state.edges.filter((edge) => {
                if (edge.source === nodeId && edge.sourceHandle === handleKey) {
                    return false
                }
                if (edge.target === nodeId && edge.targetHandle === handleKey) {
                    return false
                }
                return true
            })
        },

        deleteEdgesBySource: (state, action: PayloadAction<{ sourceId: string }>) => {
            const { sourceId } = action.payload
            state.edges = state.edges.filter((edge) => edge.source !== sourceId)
        },

        setSidebarWidth: (state, action: PayloadAction<number>) => {
            state.sidebarWidth = action.payload
        },

        setProjectName: (state, action: PayloadAction<string>) => {
            state.projectName = action.payload
        },

        setWorkflowInputVariable: (
            state,
            action: PayloadAction<{
                key: string
                value: any
            }>
        ) => {
            const { key, value } = action.payload
            state.workflowInputVariables[key] = value

            // Set the output schema for the input node
            const inputNode = state.nodes.find((node) => node.type === 'InputNode')
            if (inputNode) {
                const currentConfig = state.nodeConfigs[inputNode.id] || {}
                const updatedSchema = {
                    ...(currentConfig.output_schema || {}),
                    [key]: value,
                }

                state.nodeConfigs[inputNode.id] = {
                    ...currentConfig,
                    output_schema: updatedSchema,
                    output_json_schema: generateJsonSchema(updatedSchema)
                }
            }

            if (inputNode?.id) {
                // Update RouterNodes directly connected
                const connectedRouterNodes = state.nodes.filter(
                    (targetNode) =>
                        targetNode.type === 'RouterNode' &&
                        state.edges.some((edge) => edge.source === inputNode.id && edge.target === targetNode.id)
                )
                connectedRouterNodes.forEach((routerNode) => {
                    rebuildRouterNodeSchema(state, routerNode)
                })

                // Update CoalesceNodes directly connected
                const connectedCoalesceNodes = state.nodes.filter(
                    (targetNode) =>
                        targetNode.type === 'CoalesceNode' &&
                        state.edges.some((edge) => edge.source === inputNode.id && edge.target === targetNode.id)
                )
                connectedCoalesceNodes.forEach((coalesceNode) => {
                    rebuildCoalesceNodeSchema(state, coalesceNode)
                })
            }
        },

        deleteWorkflowInputVariable: (
            state,
            action: PayloadAction<{
                key: string
            }>
        ) => {
            const { key } = action.payload

            // Remove from input node output schema
            const inputNode = state.nodes.find((node) => node.type === 'InputNode')
            if (inputNode) {
                const currentConfig = state.nodeConfigs[inputNode.id] || {}
                const updatedSchema = { ...(currentConfig.output_schema || {}) }
                delete updatedSchema[key]

                state.nodeConfigs[inputNode.id] = {
                    ...currentConfig,
                    output_schema: updatedSchema,
                    output_json_schema: generateJsonSchema(updatedSchema)
                }
            }
            // Remove from global workflowInputVariables
            delete state.workflowInputVariables[key]

            // Remove edges whose sourceHandle === key
            state.edges = state.edges.filter((edge) => edge.sourceHandle !== key)

            if (inputNode?.id) {
                // Update RouterNodes
                const connectedRouterNodes = state.nodes.filter(
                    (targetNode) =>
                        targetNode.type === 'RouterNode' &&
                        state.edges.some((edge) => edge.source === inputNode.id && edge.target === targetNode.id)
                )
                connectedRouterNodes.forEach((routerNode) => {
                    rebuildRouterNodeSchema(state, routerNode)
                })

                // Update CoalesceNodes
                const connectedCoalesceNodes = state.nodes.filter(
                    (targetNode) =>
                        targetNode.type === 'CoalesceNode' &&
                        state.edges.some((edge) => edge.source === inputNode.id && edge.target === targetNode.id)
                )
                connectedCoalesceNodes.forEach((coalesceNode) => {
                    rebuildCoalesceNodeSchema(state, coalesceNode)
                })
            }
        },

        updateWorkflowInputVariableKey: (
            state,
            action: PayloadAction<{
                oldKey: string
                newKey: string
            }>
        ) => {
            const { oldKey, newKey } = action.payload

            // Only proceed if keys differ
            if (oldKey === newKey) return

            // 1. Rename in `workflowInputVariables` map
            state.workflowInputVariables[newKey] = state.workflowInputVariables[oldKey]
            delete state.workflowInputVariables[oldKey]

            // 2. Rename in the input node's output_schema
            const inputNode = state.nodes.find((node) => node.type === 'InputNode')
            if (inputNode) {
                const currentConfig = state.nodeConfigs[inputNode.id] || {}
                const updatedSchema = { ...(currentConfig.output_schema || {}) }
                if (updatedSchema.hasOwnProperty(oldKey)) {
                    updatedSchema[newKey] = updatedSchema[oldKey]
                    delete updatedSchema[oldKey]
                }

                state.nodeConfigs[inputNode.id] = {
                    ...currentConfig,
                    output_schema: updatedSchema,
                    output_json_schema: generateJsonSchema(updatedSchema)
                }
            }

            // 3. Rename in any edges referencing oldKey
            state.edges = state.edges.map((edge) => {
                if (edge.sourceHandle === oldKey) {
                    return { ...edge, sourceHandle: newKey }
                }
                return edge
            })

            // 4. Rebuild RouterNode/CoalesceNode schemas connected to the input node
            if (inputNode?.id) {
                const connectedRouterNodes = state.nodes.filter(
                    (targetNode) =>
                        targetNode.type === 'RouterNode' &&
                        state.edges.some((edge) => edge.source === inputNode.id && edge.target === targetNode.id)
                )
                connectedRouterNodes.forEach((routerNode) => {
                    rebuildRouterNodeSchema(state, routerNode)
                })

                const connectedCoalesceNodes = state.nodes.filter(
                    (targetNode) =>
                        targetNode.type === 'CoalesceNode' &&
                        state.edges.some((edge) => edge.source === inputNode.id && edge.target === targetNode.id)
                )
                connectedCoalesceNodes.forEach((coalesceNode) => {
                    rebuildCoalesceNodeSchema(state, coalesceNode)
                })
            }
        },

        resetFlow: (state, action: PayloadAction<{ definition: WorkflowDefinition }>) => {
            const { nodes, links } = action.payload.definition

            // Map over nodes and use createNode to generate both node and config
            const createdNodes = nodes.map((node) => {
                const result = createNode(state.nodeTypes, node.node_type, node.id, {
                    x: node.coordinates.x,
                    y: node.coordinates.y,
                })

                if (!result) {
                    throw new Error(`Failed to create node with type: ${node.node_type}`)
                }

                const { node: createdNode, config } = result

                // Store the config in nodeConfigs
                state.nodeConfigs[node.id] = config

                return createdNode
            })

            state.nodes = createdNodes

            // Map over links to create edges
            state.edges = links.map((link) => ({
                id: uuidv4(),
                key: uuidv4(),
                selected: false,
                source: link.source_id,
                target: link.target_id,
                sourceHandle: link.source_handle || state.nodes.find((node) => node.id === link.source_id)?.data?.title,
                targetHandle: link.target_handle || state.nodes.find((node) => node.id === link.target_id)?.data?.title,
            }))
        },

        resetRun: (state) => {
            state.nodes = state.nodes.map((node) => ({
                ...node,
                data: { ...node.data, run: undefined, taskStatus: undefined, error: undefined },
            }))
        },

        clearCanvas: (state) => {
            state.nodes = []
            state.edges = []
            state.selectedNode = null
            state.workflowInputVariables = {}
            state.testInputs = []
            state.inputNodeValues = {}
        },

        setTestInputs: (state, action: PayloadAction<TestInput[]>) => {
            state.testInputs = action.payload
        },
        setNodeOutputs: (state, action) => {
            const nodeOutputs = action.payload

            state.nodes = state.nodes.map((node) => {
                if (node && nodeOutputs[node.id]) {
                    return {
                        ...node,
                        data: {
                            ...node.data,
                            run: nodeOutputs[node.id],
                            taskStatus: nodeOutputs[node.id].status,
                        },
                    }
                }
                return node
            })
        },
        addTestInput: (state, action) => {
            state.testInputs = [...state.testInputs, action.payload]
        },

        updateTestInput: (state, action: PayloadAction<TestInput>) => {
            const updatedInput = action.payload
            state.testInputs = state.testInputs.map((input) => (input.id === updatedInput.id ? updatedInput : input))
        },

        deleteTestInput: (state, action: PayloadAction<{ id: number }>) => {
            const { id } = action.payload
            state.testInputs = state.testInputs.filter((input) => input.id !== id)
        },

        setEdges: (state, action) => {
            state.edges = action.payload.edges
        },

        undo: (state) => {
            const previous = state.history.past.pop()
            if (previous) {
                state.history.future.push({
                    nodes: JSON.parse(JSON.stringify(state.nodes)),
                    edges: JSON.parse(JSON.stringify(state.edges)),
                })
                state.nodes = previous.nodes
                state.edges = previous.edges
            }
        },

        redo: (state) => {
            const next = state.history.future.pop()
            if (next) {
                state.history.past.push({
                    nodes: JSON.parse(JSON.stringify(state.nodes)),
                    edges: JSON.parse(JSON.stringify(state.edges)),
                })
                state.nodes = next.nodes
                state.edges = next.edges
            }
        },

        updateNodeTitle: (state, action: PayloadAction<{ nodeId: string; newTitle: string }>) => {
            const { nodeId, newTitle } = action.payload

            // Update the node title
            const node = state.nodes.find((node) => node.id === nodeId)
            if (node) {
                node.data = {
                    ...node.data,
                    title: newTitle,
                }
            }

            // Update nodeConfigs with the new title
            if (state.nodeConfigs[nodeId]) {
                state.nodeConfigs[nodeId] = {
                    ...state.nodeConfigs[nodeId],
                    title: newTitle,
                }
            }
        },

        addNodeWithConfig: (state, action: PayloadAction<CreateNodeResult>) => {
            const { node, config } = action.payload
            // Add the node
            state.nodes.push(node)
            // Store the config
            state.nodeConfigs[node.id] = config
        },

        updateNodeParentAndCoordinates: (
            state,
            action: PayloadAction<{
                nodeId: string
                parentId: string
                position: Position
            }>
        ) => {
            const { nodeId, parentId, position } = action.payload
            const node = state.nodes.find((n) => n.id === nodeId)
            if (node) {
                node.parentId = parentId
                node.position = position
                node.extent = 'parent'
                node.expandParent = true
            }
        },

        updateNodesFromPartialRun: (state, action: PayloadAction<Record<string, any>>) => {
            const outputs = action.payload

            state.nodes = state.nodes.map((node) => {
                // Try to find output by node ID first
                let nodeOutput = outputs[node.id]

                // If not found, try to find by node title
                if (!nodeOutput && node.data?.title) {
                    nodeOutput = outputs[node.data.title]
                }

                if (nodeOutput) {
                    return {
                        ...node,
                        data: {
                            ...node.data,
                            run: nodeOutput,
                            taskStatus: 'COMPLETED', // Always set to COMPLETED if we have output
                            error: undefined,
                        },
                    }
                }
                return node // Return unchanged node if no output found
            })
        },
    },
})

export const {
    initializeFlow,
    nodesChange,
    edgesChange,
    connect,
    addNode,
    setNodes,
    setEdges,
    updateNodeDataOnly,
    updateNodeConfigOnly,
    setSelectedNode,
    setSelectedEdgeId,
    deleteNode,
    deleteEdge,
    deleteEdgeByHandle,
    deleteEdgesBySource,
    setSidebarWidth,
    setProjectName,
    setWorkflowInputVariable,
    deleteWorkflowInputVariable,
    updateWorkflowInputVariableKey,
    resetFlow,
    resetRun,
    clearCanvas,
    setTestInputs,
    setNodeOutputs,
    addTestInput,
    updateTestInput,
    deleteTestInput,
    undo,
    redo,
    updateNodeTitle,
    addNodeWithConfig,
    updateNodeParentAndCoordinates,
    updateNodesFromPartialRun,
} = flowSlice.actions

export default flowSlice.reducer

export const selectNodeById = (state: { flow: FlowState }, nodeId: string): FlowWorkflowNode | undefined => {
    return state.flow.nodes.find((node) => node.id === nodeId)
}
