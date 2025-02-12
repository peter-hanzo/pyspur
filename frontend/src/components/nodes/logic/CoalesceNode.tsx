import React, { useState, useRef, useEffect, useMemo } from 'react'
import { Handle, Position, useConnection, useUpdateNodeInternals } from '@xyflow/react'
import BaseNode from '../BaseNode'
import { Input, Card, Divider, Button, Select, SelectItem } from '@heroui/react'
import { useDispatch, useSelector } from 'react-redux'
import { updateNodeConfigOnly } from '../../../store/flowSlice'
import styles from '../DynamicNode.module.css'
import { Icon } from '@iconify/react'
import { RootState } from '../../../store/store'
import { FlowWorkflowNode } from '@/types/api_types/nodeTypeSchemas'
import NodeOutputModal from '../NodeOutputModal'


interface CoalesceNodeProps {
    id: string
    data: FlowWorkflowNode['data']
    selected?: boolean
}

/**
 * A node that displays multiple input handles (one for each upstream node),
 * and a preference list allowing the user to pick fields in a certain priority order.
 */
export const CoalesceNode: React.FC<CoalesceNodeProps> = ({ id, data }) => {
    const [isCollapsed, setIsCollapsed] = useState(false)
    const nodeRef = useRef<HTMLDivElement | null>(null)

    // We'll dynamically compute a width that fits the labels (handles).
    const [nodeWidth, setNodeWidth] = useState<string>('auto')

    const dispatch = useDispatch()
    const connection = useConnection()

    // Retrieve all nodes & edges from Redux so we can figure out which are predecessors
    const nodes = useSelector((state: RootState) => state.flow.nodes)
    const edges = useSelector((state: RootState) => state.flow.edges)
    const nodeConfigs = useSelector((state: RootState) => state.flow.nodeConfigs)

    const [isModalOpen, setIsModalOpen] = useState(false)

    // Node's output for display
    const nodeOutput = useSelector((state: RootState) => state.flow.nodes.find((node) => node.id === id)?.data?.run)

    // Node's config
    const nodeConfig = useSelector((state: RootState) => state.flow.nodeConfigs[id])
    // console.log('nodeConfig', nodeConfig)

    // The CoalesceNode might have multiple incoming edges. We'll track those predecessor nodes (if any).
    const finalPredecessors = useMemo(() => {
        const updatedPredecessorNodes = edges
            .filter((edge) => edge.target === id)
            .map((edge) => {
                const sourceNode = nodes.find((node) => node.id === edge.source)
                if (!sourceNode) {
                    return null
                }
                if (sourceNode.type === 'RouterNode' && edge.sourceHandle) {
                    return {
                        ...sourceNode,
                        handle_id: edge.sourceHandle,
                    }
                }
                return sourceNode
            })
            .filter(Boolean)

        let result = updatedPredecessorNodes

        // deduplicate
        result = result.filter((node, index, self) => self.findIndex((n) => n.id === node.id) === index)
        return result
    }, [edges, nodes, connection, id])

    /**
     * Extract schema from JSON schema string, handling various formats and errors
     */
    const extractSchemaFromJsonSchema = (
        jsonSchema: string
    ): { schema: Record<string, any> | null; error: string | null } => {
        if (!jsonSchema || !jsonSchema.trim()) {
            return { schema: null, error: null }
        }
        try {
            // Try to parse the schema
            let parsed: Record<string, any>
            try {
                parsed = JSON.parse(jsonSchema.trim())
            } catch (e: any) {
                // If the schema has escaped characters, clean it up first
                let cleaned = jsonSchema
                    .replace(/\"/g, '"') // Replace escaped quotes
                    .replace(/\\\[/g, '[') // Replace escaped brackets
                    .replace(/\\\]/g, ']')
                    .replace(/\\n/g, '') // Remove newlines
                    .replace(/\\t/g, '') // Remove tabs
                    .replace(/\\/g, '') // Remove remaining backslashes
                    .trim()
                try {
                    parsed = JSON.parse(cleaned)
                } catch (e: any) {
                    // Extract line and column info from the error message if available
                    const match = e.message.match(/at position (\d+)(?:\s*\(line (\d+) column (\d+)\))?/)
                    const errorMsg = match
                        ? `Invalid JSON: ${e.message.split('at position')[0].trim()} at line ${match[2] || '?'}, column ${match[3] || '?'}`
                        : `Invalid JSON: ${e.message}`
                    return { schema: null, error: errorMsg }
                }
            }

            // If the parsed schema has a properties field (i.e. full JSON Schema format),
            // return the nested properties so that nested objects are preserved.
            if (parsed.properties) {
                return { schema: parsed.properties, error: null }
            }
            return { schema: parsed, error: null }
        } catch (error: any) {
            return { schema: null, error: error.message || 'Invalid JSON Schema' }
        }
    }

    /**
     * Build an array of upstream node IDs for the dropdown.
     * (We're not currently using the node's output_schema to filter the keys.)
     */
    const inputVariables = useMemo(() => {
        if (!finalPredecessors.length) {
            return []
        }
        return finalPredecessors.flatMap((node) => {
            if (!node) {
                return []
            }

            const predNodeConfig = nodeConfigs[node.id]
            const nodeTitle = predNodeConfig?.title || node.id
            
            // Extract schema from output_json_schema instead of using output_schema directly
            if (predNodeConfig?.output_json_schema) {
                const { schema, error } = extractSchemaFromJsonSchema(predNodeConfig.output_json_schema)
                if (error) {
                    console.error('Error parsing output_json_schema:', error)
                    return []
                }
                if (schema && typeof schema === 'object') {
                    return Object.entries(schema).map(([key, type]) => ({
                        value: `${nodeTitle}.${key}`,
                        label: `${nodeTitle}.${key} (${(type as any).type || 'unknown'})`,
                    }))
                }
            }
            return []
        })
    }, [finalPredecessors, nodeConfigs])

    /**
     * Keep track of used variable preferences so we don't show duplicates in other slots.
     */
    const usedPreferences = nodeConfig?.preferences?.filter(Boolean)
    const availableVariablesForIndex = (index: number) => {
        return inputVariables.filter(
            (v) => !usedPreferences.includes(v.value) || v.value === nodeConfig.preferences[index]
        )
    }

    /** A helper to update the node's preference array in Redux */
    const updatePreferences = (newPreferences: string[]) => {
        dispatch(
            updateNodeConfigOnly({
                id,
                data: {
                    preferences: newPreferences,
                },
            })
        )
    }

    // Keep preference array in sync with number of input variables
    useEffect(() => {
        const desiredLength = inputVariables.length
        let updated = [...nodeConfig.preferences]

        if (updated.length > desiredLength) {
            updated = updated.slice(0, desiredLength)
        } else if (updated.length < desiredLength) {
            while (updated.length < desiredLength) {
                updated.push('')
            }
        }

        const changed =
            updated.length !== nodeConfig.preferences.length ||
            updated.some((val, i) => val !== nodeConfig.preferences[i])

        if (changed) {
            updatePreferences(updated)
        }
    }, [inputVariables])

    /** Update preference index i to a new variable name  */
    const handlePreferenceChange = (index: number, value: string) => {
        const updated = [...nodeConfig.preferences]
        updated[index] = value
        updatePreferences(updated)
    }

    /** Clear the preference at index i */
    const clearPreference = (index: number) => {
        const updated = [...nodeConfig.preferences]
        updated[index] = ''
        updatePreferences(updated)
    }

    /**
     *  Measure the lengths of input handle labels + output label
     *  and set an appropriate nodeWidth so that names are fully visible.
     */
    useEffect(() => {
        if (!nodeRef.current) return

        // We have multiple input handle labels
        const inputLabels = finalPredecessors.map(
            (pred) => pred?.data?.config?.title || pred?.data?.title || pred?.id || ''
        )

        // Output label is the node's title or fallback
        const outputLabels = [nodeConfig?.title || 'Coalesce']

        // Compute the max length among all input labels
        const maxInputLabelLength = inputLabels.reduce((max, label) => Math.max(max, label.length), 0)
        // Compute the max length among all output labels
        const maxOutputLabelLength = outputLabels.reduce((max, label) => Math.max(max, label.length), 0)

        // The node's own title (for the top of the node)
        const nodeTitle = nodeConfig?.title || 'Coalesce'
        const nodeTitleLength = nodeTitle.length

        // Some extra spacing
        const buffer = 5

        // Rough estimate: multiply the longest label length by ~10 for width in px.
        const minNodeWidth = 300
        const maxNodeWidth = 600

        const estimatedWidth = Math.max(
            (maxInputLabelLength + maxOutputLabelLength + buffer) * 10,
            nodeTitleLength * 10,
            minNodeWidth
        )
        const finalWidth = Math.min(estimatedWidth, maxNodeWidth)

        // If collapsed, show auto; otherwise the computed width
        if (nodeWidth !== `${finalWidth}px`) {
            setNodeWidth(isCollapsed ? 'auto' : `${finalWidth}px`)
        }
    }, [finalPredecessors, nodeConfig?.title, isCollapsed])

    const nodeData = {
        title: nodeConfig?.title || 'Coalesce',
        color: data.color || '#38B2AC',
        acronym: 'CL',
        run: data.run,
        config: nodeConfig,
        taskStatus: data.taskStatus,
    }

    interface HandleRowProps {
        id: string
        keyName: string
    }

    const OutputHandleRow: React.FC<HandleRowProps> = ({ keyName }) => {
        return (
            <div
                className={`${styles.handleRow} w-full justify-end`}
                key={`output-${keyName}`}
                id={`output-${keyName}-row`}
            >
                {!isCollapsed && (
                    <div
                        className="align-center flex flex-grow flex-shrink mr-[0.5rem] max-w-full overflow-hidden"
                        id={`output-${keyName}-label`}
                    >
                        <span
                            className={`${styles.handleLabel} text-sm font-medium cursor-pointer hover:text-primary
                                ml-auto overflow-hidden text-ellipsis whitespace-nowrap`}
                        >
                            {keyName}
                        </span>
                    </div>
                )}
                <div className="border-l border-gray-200 h-full mx-0" />
                <div className={`${styles.handleCell} ${styles.outputHandleCell}`} id={`output-${keyName}-handle`}>
                    <Handle
                        type="source"
                        position={Position.Right}
                        id={String(id)}
                        className={`${styles.handle} ${styles.handleRight} ${isCollapsed ? styles.collapsedHandleOutput : ''}`}
                        isConnectable={!isCollapsed}
                    />
                </div>
            </div>
        )
    }

    const renderOutputHandles = () => {
        return (
            <div className={`${styles.handlesColumn} ${styles.outputHandlesColumn}`} id="output-handle">
                {nodeData?.title && <OutputHandleRow id={id} keyName={String(nodeData?.title)} />}
            </div>
        )
    }

    

    return (
        <BaseNode
            id={id}
            isCollapsed={isCollapsed}
            setIsCollapsed={setIsCollapsed}
            data={nodeData}
            // Use the computed nodeWidth
            style={{ width: nodeWidth }}
            className="hover:!bg-background"
            renderOutputHandles={renderOutputHandles}
            handleOpenModal={setIsModalOpen}
        >
            <div className="p-3" ref={nodeRef}>
                {/* The main body, hidden if collapsed */}
                {!isCollapsed && (
                    <>
                        <Divider className="my-2" />
                        <div className="flex items-center gap-2 mb-4">
                            <span className="text-sm font-medium text-foreground">Preferences</span>
                            <Divider className="flex-grow" />
                        </div>

                        <div className="flex flex-col gap-4">
                            {nodeConfig?.preferences?.map((prefValue, i) => (
                                <Card key={i} classNames={{ base: 'bg-background border-default-200 p-2' }}>
                                    <div className="flex flex-wrap items-center gap-2">
                                        <Select
                                            aria-label="Select variable"
                                            size="sm"
                                            selectedKeys={prefValue ? [prefValue] : []}
                                            placeholder="Select variable"
                                            onChange={(e) => handlePreferenceChange(i, e.target.value)}
                                            className="min-w-[200px]"
                                            classNames={{
                                                trigger: 'bg-default-100 dark:bg-default-50 min-h-unit-12 h-auto',
                                                popoverContent: 'bg-background dark:bg-background',
                                            }}
                                            isMultiline
                                        >
                                            {availableVariablesForIndex(i).map((variable) => (
                                                <SelectItem
                                                    key={variable.value}
                                                    value={variable.value}
                                                    textValue={variable.label}
                                                >
                                                    <div className="whitespace-normal">
                                                        <span>{variable.label}</span>
                                                    </div>
                                                </SelectItem>
                                            ))}
                                        </Select>

                                        {prefValue && (
                                            <Button
                                                size="sm"
                                                color="danger"
                                                onClick={() => clearPreference(i)}
                                                isIconOnly
                                            >
                                                <Icon icon="solar:trash-bin-trash-linear" width={18} />
                                            </Button>
                                        )}
                                    </div>
                                </Card>
                            ))}
                        </div>
                    </>
                )}
            </div>
            <NodeOutputModal
                isOpen={isModalOpen}
                onOpenChange={setIsModalOpen}
                title={nodeData?.title || 'Node Output'}
                data={nodeData}
            />
        </BaseNode>
    )
}
