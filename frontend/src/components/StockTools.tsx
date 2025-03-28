import { Accordion, AccordionItem, Card, CardBody, CardHeader, Divider, Input } from '@heroui/react'
import { Icon } from '@iconify/react'
import React, { useEffect, useState } from 'react'
import { useSelector } from 'react-redux'

import { FlowWorkflowNodeType } from '../store/nodeTypesSlice'
import { RootState } from '../store/store'
import NodeOutputDisplay from './nodes/NodeOutputDisplay'

interface CategoryGroup {
    nodes: FlowWorkflowNodeType[]
}

interface GroupedNodes {
    [subcategory: string]: CategoryGroup
}

const StockTools: React.FC = () => {
    const nodeTypes = useSelector((state: RootState) => state.nodeTypes.data)
    const status = useSelector((state: RootState) => state.nodeTypes.status)
    const [searchTerm, setSearchTerm] = useState('')
    const [selectedCategory, setSelectedCategory] = useState<string[]>([])
    const [selectedSubcategory, setSelectedSubcategory] = useState<string[]>([])
    const [filteredNodeTypes, setFilteredNodeTypes] = useState<typeof nodeTypes>({})
    const [isClient, setIsClient] = useState(false)

    useEffect(() => {
        setIsClient(true)
    }, [])

    // Filter nodes based on search term
    useEffect(() => {
        if (!nodeTypes) return

        const newFilteredTypes = Object.keys(nodeTypes).reduce(
            (acc, category) => {
                if (searchTerm.trim().length === 0) {
                    return nodeTypes
                }
                const filteredNodes = nodeTypes[category].filter(
                    (node: FlowWorkflowNodeType) =>
                        node.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
                        (node.config.title || '').toLowerCase().includes(searchTerm.toLowerCase())
                )
                if (filteredNodes.length > 0) {
                    acc[category] = filteredNodes
                    // Update selected categories and subcategories through state updates
                    setSelectedCategory((prev) => Array.from(new Set([...prev, category])))
                    filteredNodes.forEach((node) => {
                        if (node.category) {
                            setSelectedSubcategory((prev) => Array.from(new Set([...prev, node.category || ''])))
                        }
                    })
                }
                return acc
            },
            {} as typeof nodeTypes
        )
        setFilteredNodeTypes(newFilteredTypes)
    }, [nodeTypes, searchTerm])

    // Group nodes by subcategory
    const groupNodesBySubcategory = (nodes: FlowWorkflowNodeType[]): GroupedNodes => {
        return nodes.reduce((acc: GroupedNodes, node) => {
            const subcategory = node.category || 'Other'
            if (!acc[subcategory]) {
                acc[subcategory] = {
                    nodes: [],
                }
            }
            acc[subcategory].nodes.push(node)
            return acc
        }, {})
    }

    // Filter out output-related fields from config
    const filterConfig = (config: any) => {
        const filteredConfig = { ...config }
        Object.keys(filteredConfig).forEach((key) => {
            if (key.toLowerCase().includes('output')) {
                delete filteredConfig[key]
            }
        })
        return filteredConfig
    }

    // Render node card
    const renderNodeCard = (node: FlowWorkflowNodeType) => {
        const filteredConfig = filterConfig(node.config)

        return (
            <Card key={node.name} className="my-2">
                <CardHeader className="pb-0 flex items-center justify-between">
                    <div className="flex items-center gap-2">
                        {node.logo ? (
                            <img src={node.logo} alt={`${node.name} Logo`} className="max-h-5 max-w-5" />
                        ) : node.visual_tag?.color && node.visual_tag?.acronym ? (
                            <div
                                className="node-acronym-tag float-left text-white px-2 py-1 rounded-full text-xs inline-block"
                                style={{ backgroundColor: node.visual_tag.color }}
                            >
                                {node.visual_tag.acronym}
                            </div>
                        ) : null}
                        <span className="font-semibold" title={node.config.title}>
                            {node.config.title || node.name}
                        </span>
                    </div>
                </CardHeader>
                <Divider className="my-2" />
                <CardBody className="py-2">
                    <NodeOutputDisplay
                        output={{
                            'Input Schema': {
                                ...filteredConfig,
                                ...(node.config.input_schema ? { schema: node.config.input_schema } : {}),
                            },
                            ...(node.config.output_schema ? { 'Output Schema': node.config.output_schema } : {}),
                        }}
                        maxHeight="24rem"
                    />
                </CardBody>
            </Card>
        )
    }

    if (!isClient) {
        return (
            <div className="w-full flex justify-center items-center py-8">
                <div className="text-default-500">Loading...</div>
            </div>
        )
    }

    if (status === 'loading') {
        return (
            <div className="w-full flex justify-center items-center py-8">
                <div className="text-default-500">Loading stock tools...</div>
            </div>
        )
    }

    if (status === 'failed') {
        return (
            <div className="w-full flex justify-center items-center py-8">
                <div className="text-danger">Failed to load stock tools. Please try again later.</div>
            </div>
        )
    }

    if (!nodeTypes || Object.keys(nodeTypes).length === 0) {
        return (
            <div className="w-full flex justify-center items-center py-8">
                <div className="text-default-500">No stock tools available.</div>
            </div>
        )
    }

    return (
        <div className="w-full">
            <Input
                type="search"
                placeholder="Search tools..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                fullWidth
                className="mb-4"
                startContent={<Icon icon="akar-icons:search" className="text-default-500" />}
            />

            <div className="max-h-[calc(100vh-16rem)] overflow-hidden">
                <Accordion
                    selectionMode="multiple"
                    selectedKeys={selectedCategory}
                    onSelectionChange={(keys) => setSelectedCategory(Array.from(keys) as string[])}
                >
                    {Object.keys(filteredNodeTypes)
                        .filter((category) => category !== 'Input/Output')
                        .map((category) => {
                            const nodes = filteredNodeTypes[category]
                            const hasSubcategories = nodes.some((node) => node.category)

                            return (
                                <AccordionItem key={category} title={category}>
                                    {hasSubcategories ? (
                                        <div className="max-h-[60vh] overflow-auto pr-2">
                                            <Accordion
                                                selectionMode="multiple"
                                                selectedKeys={selectedSubcategory}
                                                onSelectionChange={(keys) =>
                                                    setSelectedSubcategory(Array.from(keys) as string[])
                                                }
                                            >
                                                {Object.entries(groupNodesBySubcategory(nodes)).map(
                                                    ([subcategory, { nodes: subcategoryNodes }]) => (
                                                        <AccordionItem key={subcategory} title={subcategory}>
                                                            <div className="pl-4">
                                                                {subcategoryNodes.map(renderNodeCard)}
                                                            </div>
                                                        </AccordionItem>
                                                    )
                                                )}
                                            </Accordion>
                                        </div>
                                    ) : (
                                        <div className="max-h-[60vh] overflow-auto pl-4 pr-2">
                                            {nodes.map(renderNodeCard)}
                                        </div>
                                    )}
                                </AccordionItem>
                            )
                        })}
                </Accordion>
            </div>
        </div>
    )
}

export default StockTools
