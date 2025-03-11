import { SpurType } from '@/types/api_types/workflowSchemas'
import { Chip } from '@heroui/react'
import { Icon } from '@iconify/react'
import React from 'react'

interface SpurTypeChipProps {
    spurType: SpurType
}

const SpurTypeChip: React.FC<SpurTypeChipProps> = ({ spurType }) => {
    return (
        <Chip
            size="sm"
            variant="flat"
            startContent={
                <Icon icon={spurType === SpurType.CHATBOT ? 'lucide:message-square' : 'lucide:workflow'} width={16} />
            }
        >
            {spurType === SpurType.CHATBOT ? 'Chatbot' : 'Workflow'}
        </Chip>
    )
}

export default SpurTypeChip
