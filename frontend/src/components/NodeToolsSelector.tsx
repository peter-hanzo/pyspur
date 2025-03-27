import { Accordion, AccordionItem, Card, CardBody, CardHeader, Checkbox, Divider, Input } from '@heroui/react'
import { Icon } from '@iconify/react'
import React, { useEffect, useState } from 'react'

import { FlowWorkflowNodeType, FlowWorkflowNodeTypesByCategory } from '../store/nodeTypesSlice'

interface NodeToolsSelectorProps {
    nodeTypes: FlowWorkflowNodeTypesByCategory
    onSelectionChange: (selectedNodes: FlowWorkflowNodeType[]) => void
    initialSelection?: FlowWorkflowNodeType[]
}

/**
 * Component to display nodes as tools with checkboxes for selection
 */
const NodeToolsSelector: React.FC<NodeToolsSelectorProps> = ({
    nodeTypes,
    onSelectionChange,
    initialSelection = [],
}) => {
    const [searchTerm, setSearchTerm] = useState('')
    const [selectedCategory, setSelectedCategory] = useState<Set<string>>(new Set())
    const [filteredNodeTypes, setFilteredNodeTypes] = useState<FlowWorkflowNodeTypesByCategory>({})
    const [selectedNodes, setSelectedNodes] = useState<Record<string, boolean>>({})

    // Initialize selected nodes from initial selection
    useEffect(() => {
        if (initialSelection.length > 0) {
            const selected = initialSelection.reduce(
                (acc, node) => {
                    acc[node.name] = true
                    return acc
                },
                {} as Record<string, boolean>
            )
            setSelectedNodes(selected)
        }
    }, [initialSelection])

    // Filter nodes based on search term
    useEffect(() => {
        setFilteredNodeTypes(
            Object.keys(nodeTypes).reduce((acc, category) => {
                if (searchTerm.trim().length === 0) {
                    return nodeTypes
                }
                const filteredNodes = nodeTypes[category].filter((node: FlowWorkflowNodeType) =>
                    node.name.toLowerCase().includes(searchTerm.toLowerCase())
                )
                if (filteredNodes.length > 0) {
                    acc[category] = filteredNodes
                    setSelectedCategory((prev) => {
                        const newSet = new Set(prev)
                        if (!newSet.has(category)) {
                            newSet.add(category)
                        }
                        return newSet
                    })
                }
                return acc
            }, {} as FlowWorkflowNodeTypesByCategory)
        )
    }, [nodeTypes, searchTerm])

    // Notify parent component of selection changes
    useEffect(() => {
        const selected = Object.entries(selectedNodes)
            .filter(([_, isSelected]) => isSelected)
            .map(([nodeName]) => {
                // Find the node in the nodeTypes
                for (const category in nodeTypes) {
                    const node = nodeTypes[category].find((n) => n.name === nodeName)
                    if (node) {
                        return node
                    }
                }
                return null
            })
            .filter(Boolean) as FlowWorkflowNodeType[]

        onSelectionChange(selected)
    }, [selectedNodes, nodeTypes, onSelectionChange])

    // Handle node selection
    const handleNodeSelect = (node: FlowWorkflowNodeType) => {
        setSelectedNodes((prev) => ({
            ...prev,
            [node.name]: !prev[node.name],
        }))
    }

    // Group nodes by subcategory
    const groupNodesBySubcategory = (nodes: FlowWorkflowNodeType[]) => {
        return nodes.reduce((acc: Record<string, FlowWorkflowNodeType[]>, node) => {
            // Use node.category as subcategory if available, otherwise put in 'Other'
            const subcategory = node.category || 'Other'

            if (!acc[subcategory]) {
                acc[subcategory] = []
            }
            acc[subcategory].push(node)
            return acc
        }, {})
    }

    // Render node card
    const renderNodeCard = (node: FlowWorkflowNodeType) => {
        const isSelected = !!selectedNodes[node.name]

        return (
            <Card
                key={node.name}
                className="my-2 hover:shadow-md transition-shadow cursor-pointer"
                onClick={() => handleNodeSelect(node)}
            >
                <CardHeader className="pb-0 flex justify-between items-center">
                    <div className="flex items-center gap-2">
                        {node.logo ? (
                            <img src={node.logo} alt="Node Logo" className="max-h-7 max-w-7" />
                        ) : (
                            <div
                                className="node-acronym-tag float-left text-white px-2 py-1 rounded-full text-xs inline-block"
                                style={{ backgroundColor: node.visual_tag.color }}
                            >
                                {node.visual_tag.acronym}
                            </div>
                        )}
                        <span className="font-semibold" title={node.config.title}>
                            {node.config.title || node.name}
                        </span>
                    </div>
                    <Checkbox isSelected={isSelected} />
                </CardHeader>
                <Divider className="my-2" />
                <CardBody className="py-2">
                    {node.config.input_schema && (
                        <div className="mb-2">
                            <div className="text-sm font-medium mb-1">Input Schema:</div>
                            <div className="text-xs bg-default-100 p-2 rounded">
                                <pre className="whitespace-pre-wrap overflow-auto max-h-24">
                                    {JSON.stringify(node.config.input_schema, null, 2)}
                                </pre>
                            </div>
                        </div>
                    )}
                    {node.config.output_schema && (
                        <div>
                            <div className="text-sm font-medium mb-1">Output Schema:</div>
                            <div className="text-xs bg-default-100 p-2 rounded">
                                <pre className="whitespace-pre-wrap overflow-auto max-h-24">
                                    {JSON.stringify(node.config.output_schema, null, 2)}
                                </pre>
                            </div>
                        </div>
                    )}
                </CardBody>
            </Card>
        )
    }

    return (
        <div className="w-full">
            <Input
                type="search"
                placeholder="Search nodes..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                fullWidth
                className="mb-4"
                startContent={<Icon icon="akar-icons:search" className="text-default-500" />}
            />

            <div className="max-h-[60vh] overflow-auto">
                <Accordion
                    selectionMode="multiple"
                    selectedKeys={Array.from(selectedCategory)}
                    onSelectionChange={(keys) => setSelectedCategory(new Set(Array.from(keys) as string[]))}
                >
                    {Object.keys(filteredNodeTypes)
                        .filter((category) => category !== 'Input/Output')
                        .map((category) => {
                            const nodes = filteredNodeTypes[category]
                            const hasSubcategories = nodes.some((node) => node.category)

                            return (
                                <AccordionItem key={category} title={category} textValue={category}>
                                    {hasSubcategories ? (
                                        <Accordion selectionMode="multiple">
                                            {Object.entries(groupNodesBySubcategory(nodes)).map(
                                                ([subcategory, subcategoryNodes]) => (
                                                    <AccordionItem
                                                        key={subcategory}
                                                        textValue={subcategory}
                                                        title={
                                                            <div className="flex items-center gap-2">
                                                                <span>{subcategory}</span>
                                                            </div>
                                                        }
                                                    >
                                                        <div className="pl-4">
                                                            {subcategoryNodes.map(renderNodeCard)}
                                                        </div>
                                                    </AccordionItem>
                                                )
                                            )}
                                        </Accordion>
                                    ) : (
                                        <div className="pl-4">{filteredNodeTypes[category].map(renderNodeCard)}</div>
                                    )}
                                </AccordionItem>
                            )
                        })}
                </Accordion>
            </div>
        </div>
    )
}

export default NodeToolsSelector
