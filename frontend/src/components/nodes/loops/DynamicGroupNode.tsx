import { memo } from 'react'
import { useSelector } from 'react-redux'
import { NodeProps, NodeToolbar, useReactFlow, useStore, useStoreApi, NodeResizer } from '@xyflow/react'

import useDetachNodes from './useDetachNodes'
import { getRelativeNodesBounds } from './utils'
import { RootState } from '@/store/store'

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

const DynamicGroupNode: React.FC<DynamicGroupNodeProps> = ({ id }) => {
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

    const onDelete = () => {
        deleteElements({ nodes: [{ id }] })
    }

    const onDetach = () => {
        const childNodeIds = Array.from(store.getState().nodeLookup.values())
            .filter((n) => n.parentId === id)
            .map((n) => n.id)

        detachNodes(childNodeIds, id)
    }

    const groupClasses = [
        'w-full h-full p-4 rounded-lg transition-colors duration-200',
        'border-2 border-slate-400',
        'bg-slate-50/50 backdrop-blur-sm',
        node?.data?.className === 'active' ? 'border-blue-500 bg-blue-50/50' : '',
    ].join(' ')

    return (
        <>
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
            <div className={groupClasses}>
                {nodeConfig?.title && <div className="text-sm font-medium text-slate-700 mb-2">{nodeConfig.title}</div>}
            </div>
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
