import { memo, useState } from 'react'
import { useSelector, useDispatch } from 'react-redux'
import { NodeProps, NodeToolbar, useReactFlow, useStore, useStoreApi, NodeResizer } from '@xyflow/react'
import { Card, CardHeader, CardBody, Button, Input, Alert } from '@nextui-org/react'

import useDetachNodes from './useDetachNodes'
import { getRelativeNodesBounds } from './groupNodeUtils'
import { RootState } from '@/store/store'
import { getNodeTitle } from '@/utils/flowUtils'
import { updateNodeTitle } from '@/store/flowSlice'

const lineStyle = { borderColor: 'rgb(148 163 184)' } // Tailwind slate-400
const handleStyle = {
    backgroundColor: 'white',
    width: 8,
    height: 8,
    borderRadius: 2,
    border: '1.5px solid rgb(148 163 184)', // Tailwind slate-400
}

export interface DynamicGroupNodeProps {
    id: string
}

const convertToPythonVariableName = (str: string): string => {
    if (!str) return ''
    str = str.replace(/[\s-]/g, '_')
    str = str.replace(/[^a-zA-Z0-9_]/g, '')
    if (/^[0-9]/.test(str)) {
        str = '_' + str
    }
    return str
}

const DynamicGroupNode: React.FC<DynamicGroupNodeProps> = ({ id }) => {
    const dispatch = useDispatch()
    const [editingTitle, setEditingTitle] = useState(false)
    const [titleInputValue, setTitleInputValue] = useState('')
    const [showTitleError, setShowTitleError] = useState(false)

    const store = useStoreApi()
    const { deleteElements } = useReactFlow()
    const detachNodes = useDetachNodes()

    const node = useSelector((state: RootState) => state.flow.nodes.find((n) => n.id === id))
    const nodes = useSelector((state: RootState) => state.flow.nodes)
    const nodeConfig = useSelector((state: RootState) => state.flow.nodeConfigs[id])

    const { minWidth, minHeight, hasChildNodes } = useStore((store) => {
        const childNodes = Array.from(store.nodeLookup.values()).filter((n) => n.parentId === id)
        const rect = getRelativeNodesBounds(childNodes)

        return {
            minWidth: rect.x + rect.width,
            minHeight: rect.y + rect.height,
            hasChildNodes: childNodes.length > 0,
        }
    }, isEqual)

    // Add selected node selector
    const selectedNodeId = useSelector((state: RootState) => state.flow.selectedNode)
    const isSelected = String(id) === String(selectedNodeId)

    const onDelete = () => {
        deleteElements({ nodes: [{ id }] })
    }

    const onDetach = () => {
        const childNodeIds = Array.from(store.getState().nodeLookup.values())
            .filter((n) => n.parentId === id)
            .map((n) => n.id)

        detachNodes(childNodeIds, id)
    }

    const handleTitleChange = (newTitle: string) => {
        const validTitle = convertToPythonVariableName(newTitle)
        if (validTitle && validTitle !== getNodeTitle(node['data'])) {
            dispatch(updateNodeTitle({ nodeId: id, newTitle: validTitle }))
        }
    }

    return (
        <>
            {showTitleError && (
                <Alert
                    key={`alert-${id}`}
                    className="absolute -top-16 left-0 right-0 z-50"
                    color="danger"
                    onClose={() => setShowTitleError(false)}
                >
                    Title cannot contain whitespace. Use underscores instead.
                </Alert>
            )}
            <NodeToolbar className="absolute top-2 right-2 z-10">
                {hasChildNodes && (
                    <button className="p-1 text-xs text-slate-600 hover:text-slate-900" onClick={onDetach}>
                        Detach
                    </button>
                )}
                <button className="p-1 text-xs text-red-600 hover:text-red-900" onClick={onDelete}>
                    Delete
                </button>
            </NodeToolbar>
            <NodeResizer
                nodeId={id}
                isVisible={true}
                lineStyle={lineStyle}
                minHeight={Math.max(100, minHeight)}
                minWidth={Math.max(200, minWidth)}
                handleStyle={handleStyle}
            />
            <Card
                className={`w-full h-full transition-colors duration-200 ${
                    node?.data?.className === 'active' ? 'border-blue-500 bg-blue-50/50' : ''
                }`}
                classNames={{
                    base: `bg-slate-50/50 backdrop-blur-sm outline-offset-0 outline-solid-200
                        ${isSelected ? 'outline-[3px]' : 'outline-[1px]'} 
                        outline-default-200 group-hover:outline-[3px]`,
                }}
            >
                <CardHeader className="relative pt-2 pb-4">
                    <div className="flex items-center">
                        {nodeConfig?.logo && (
                            <img src={nodeConfig.logo} alt="Node Logo" className="mr-2 max-h-8 max-w-8 mb-3" />
                        )}
                        {editingTitle ? (
                            <Input
                                autoFocus
                                value={titleInputValue}
                                size="sm"
                                variant="bordered"
                                radius="lg"
                                onChange={(e) => {
                                    const validValue = convertToPythonVariableName(e.target.value)
                                    setTitleInputValue(validValue)
                                    handleTitleChange(validValue)
                                }}
                                onBlur={() => setEditingTitle(false)}
                                onKeyDown={(e: React.KeyboardEvent<HTMLInputElement>) => {
                                    if (e.key === 'Enter' || e.key === 'Escape') {
                                        e.stopPropagation()
                                        e.preventDefault()
                                        setEditingTitle(false)
                                    }
                                }}
                                classNames={{
                                    input: 'text-foreground dark:text-white',
                                    inputWrapper: 'dark:bg-default-100/50 bg-default-100',
                                }}
                            />
                        ) : (
                            <h3
                                className="text-lg font-semibold text-center cursor-pointer hover:text-primary"
                                onClick={() => {
                                    setTitleInputValue(getNodeTitle(node['data']))
                                    setEditingTitle(true)
                                }}
                            >
                                {nodeConfig?.title || 'Group'}
                            </h3>
                        )}
                    </div>
                </CardHeader>
                <CardBody className="px-1">{/* Additional content can go here */}</CardBody>
            </Card>
        </>
    )
}

type IsEqualCompareObj = {
    minWidth: number
    minHeight: number
    hasChildNodes: boolean
}

function isEqual(prev: IsEqualCompareObj, next: IsEqualCompareObj): boolean {
    return (
        prev.minWidth === next.minWidth &&
        prev.minHeight === next.minHeight &&
        prev.hasChildNodes === next.hasChildNodes
    )
}

export default memo(DynamicGroupNode)
