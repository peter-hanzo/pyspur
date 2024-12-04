import React, { useState } from 'react';
import { Handle, Position } from '@xyflow/react';
import BaseNode from './BaseNode';
import { Input, Card, Divider } from '@nextui-org/react';
import { useDispatch } from 'react-redux';
import { updateNodeData } from '../../store/flowSlice';
import styles from './DynamicNode.module.css';

interface ConditionalNodeData {
  condition?: string;
  title?: string;
  color?: string;
  config?: {
    condition_schema?: Record<string, string>;
    true_branch_schema?: Record<string, string>;
    false_branch_schema?: Record<string, string>;
    title?: string;
  };
}

interface ConditionalNodeProps {
  id: string;
  data: ConditionalNodeData;
  selected?: boolean;
}

export const ConditionalNode: React.FC<ConditionalNodeProps> = ({ id, data }) => {
  const [isCollapsed, setIsCollapsed] = useState(false);
  const dispatch = useDispatch();

  const handleConditionChange = (value: string) => {
    dispatch(updateNodeData({
      id,
      data: {
        config: {
          ...data.config,
          condition_schema: {
            ...data.config?.condition_schema,
            condition: value
          }
        }
      }
    }));
  };

  return (
    <BaseNode
      id={id}
      isCollapsed={isCollapsed}
      setIsCollapsed={setIsCollapsed}
      data={{
        title: data.config?.title || 'Conditional',
        color: data.color || '#F6AD55',
        acronym: 'IF'
      }}
      style={{ width: 240 }}
    >
      <div className="p-3">
        {/* Input handle */}
        <div className={`${styles.handleRow} w-full justify-end mb-4`}>
          <Handle
            type="target"
            position={Position.Left}
            id="input"
            className={`${styles.handle} ${styles.handleLeft}`}
            style={{ background: '#718096' }}
          />
          <div className="align-center flex flex-grow flex-shrink ml-2">
            <Input
              size="sm"
              variant="faded"
              radius="lg"
              value={data.condition || ''}
              placeholder="Enter condition..."
              onChange={(e) => handleConditionChange(e.target.value)}
              classNames={{
                input: 'bg-default-100',
                inputWrapper: 'shadow-none',
              }}
            />
          </div>
        </div>

        <Divider className="my-2" />

        {/* Output handles with labels */}
        <div className="flex flex-col gap-4 mt-4">
          <div className={`${styles.handleRow} w-full justify-end`}>
            <div className="align-center flex flex-grow flex-shrink mr-2">
              <span className="text-sm font-medium ml-auto">True</span>
            </div>
            <Handle
              type="source"
              position={Position.Right}
              id="true"
              className={`${styles.handle} ${styles.handleRight}`}
              style={{ background: '#48BB78' }}
            />
          </div>

          <div className={`${styles.handleRow} w-full justify-end`}>
            <div className="align-center flex flex-grow flex-shrink mr-2">
              <span className="text-sm font-medium ml-auto">False</span>
            </div>
            <Handle
              type="source"
              position={Position.Right}
              id="false"
              className={`${styles.handle} ${styles.handleRight}`}
              style={{ background: '#F56565' }}
            />
          </div>
        </div>
      </div>
    </BaseNode>
  );
};
