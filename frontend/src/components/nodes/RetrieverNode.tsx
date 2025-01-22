import React from 'react'
import { NodeProps } from '@xyflow/react'
import DynamicNode from './DynamicNode'
import { FlowWorkflowNode } from '../../store/flowSlice'

interface RetrieverNodeData {
    title?: string
    config?: {
        index_id: string
        top_k: number
        score_threshold?: number
        semantic_weight: number
        keyword_weight?: number
    }
    run?: {
        results: Array<{
            text: string
            score: number
            metadata: {
                document_id: string
                chunk_id: string
                document_title?: string
                page_number?: number
                chunk_number?: number
            }
        }>
        total_results: number
    }
    error?: string
    output_schema?: {
        texts: string[]
    }
}

interface RetrieverNodeProps extends NodeProps<FlowWorkflowNode> {
    data: RetrieverNodeData
}

const RetrieverNode: React.FC<RetrieverNodeProps> = ({ id, data, ...props }) => {
    // Ensure the output schema is always set to return an array of strings
    const nodeData = {
        ...data,
        output_schema: {
            texts: 'string[]'
        }
    }

    return (
        <DynamicNode
            id={id}
            data={nodeData}
            type="retriever_node"
            displayOutput={true}
            {...props}
        />
    )
}

export default RetrieverNode