import React, { useEffect, useRef, useState, useMemo, memo } from 'react'
import {
    Handle,
    // useNodeConnections,
    NodeProps,
    useConnection,
    Position,
    // useUpdateNodeInternals,
    // NodeResizer,
} from '@xyflow/react'
// import { useSelector } from 'react-redux'
import BaseNode from './BaseNode'
import styles from './DynamicNode.module.css'
// import { CardBody, Input } from '@heroui/react'
import { FlowWorkflowNode } from '@/types/api_types/nodeTypeSchemas'
// import { selectPropertyMetadata } from '../../store/nodeTypesSlice'
// import { RootState } from '../../store/store'
import NodeOutputDisplay from './NodeOutputDisplay'
import NodeOutputModal from './NodeOutputModal'
// import isEqual from 'lodash/isEqual'
import NodeErrorDisplay from './NodeErrorDisplay'
// import { isTargetAncestorOfSource } from '@/utils/cyclicEdgeUtils'

const baseNodeStyle = {
    width: 'auto',
    minWidth: '300px',
    maxWidth: '600px',
    height: 'auto',
    minHeight: '150px',
    maxHeight: '800px',
    transition: 'all 0.3s cubic-bezier(0.4, 0, 0.2, 1)',
    backdropFilter: 'blur(8px)',
    backgroundColor: 'rgba(255, 255, 255, 0.8)',
}

// const nodeResizerHandleStyle = {
//     width: '12px',
//     height: '12px',
//     borderRadius: '4px',
// }
// interface SchemaMetadata {
//     required?: boolean
//     title?: string
//     type?: string
//     [key: string]: any
// }
export interface DynamicNodeProps extends NodeProps<FlowWorkflowNode> {
    displayOutput?: boolean
    readOnly?: boolean
    displaySubflow?: boolean
    displayResizer?: boolean
}

const DynamicNode: React.FC<DynamicNodeProps> = ({
    id,
    data,
    dragHandle,
    type,
    selected,
    isConnectable,
    zIndex,
    positionAbsoluteX,
    positionAbsoluteY,
    displayOutput,
    ...props
}) => {
    const [isCollapsed, setIsCollapsed] = useState<boolean>(false)
    const [isModalOpen, setIsModalOpen] = useState<boolean>(false)

    const nodeData = data
    
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
        <>
            <div className={styles.dynamicNodeWrapper} style={{ zIndex: props.parentId ? 1 : 0 }}>
                <BaseNode
                    id={id}
                    data={nodeData}
                    style={baseNodeStyle}
                    isCollapsed={isCollapsed}
                    setIsCollapsed={setIsCollapsed}
                    handleOpenModal={setIsModalOpen}
                    className="hover:!bg-background"
                    positionAbsoluteX={positionAbsoluteX}
                    positionAbsoluteY={positionAbsoluteY}
                    renderOutputHandles={renderOutputHandles}
                    {...props}
                >
                </BaseNode>
            </div>
            <NodeOutputModal
                isOpen={isModalOpen}
                onOpenChange={setIsModalOpen}
                title={nodeData?.title || 'Node Output'}
                data={nodeData}
            />
        </>
    )
}

export default DynamicNode
