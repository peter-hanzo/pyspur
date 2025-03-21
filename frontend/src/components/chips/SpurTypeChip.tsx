import { Chip } from '@heroui/react'
import { Icon } from '@iconify/react'
import React from 'react'

import { SpurType } from '@/types/api_types/workflowSchemas'

interface SpurTypeChipProps {
    spurType: SpurType
    showText?: boolean
}

const SpurTypeChip: React.FC<SpurTypeChipProps> = ({ spurType, showText = true }) => {
    const text = spurType === SpurType.CHATBOT ? 'Chatbot' : 'Workflow'
    return (
        <Chip
            size="sm"
            variant="flat"
            title={!showText ? text : undefined}
            startContent={
                <Icon icon={spurType === SpurType.CHATBOT ? 'lucide:message-square' : 'lucide:workflow'} width={16} />
            }
        >
            {showText && text}
        </Chip>
    )
}

export default SpurTypeChip
