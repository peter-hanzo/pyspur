import React, { useState, useRef, useEffect } from 'react';
import { Handle, Position } from '@xyflow/react';
import BaseNode from './BaseNode';
import { Input, Card, Divider } from '@nextui-org/react';
import { useDispatch } from 'react-redux';
import { updateNodeData } from '../../store/flowSlice';
import styles from './DynamicNode.module.css';

interface ConditionalNodeData {
  condition?: string;
  color?: string;
  config?: {
    condition_schema?: Record<string, string>;
    input_schema?: Record<string, string>;
    output_schema?: Record<string, string>;
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
  const [nodeWidth, setNodeWidth] = useState<string>('auto');
  const nodeRef = useRef<HTMLDivElement | null>(null);
  const dispatch = useDispatch();

  useEffect(() => {
    if (!nodeRef.current || !data) return;

    const condition = data.condition || '';
    const titleLength = ((data.config?.title || 'Conditional Router').length + 10) * 1.25;
    const conditionLength = (condition.length + 15) * 1.25;

    const minNodeWidth = 300;
    const maxNodeWidth = 600;

    const finalWidth = Math.min(
      Math.max(Math.max(conditionLength * 8, titleLength * 8), minNodeWidth),
      maxNodeWidth
    );

    setNodeWidth(`${finalWidth}px`);
  }, [data]);

  const handleConditionChange = (value: string) => {
    dispatch(updateNodeData({
      id,
      data: {
        ...data,
        condition: value,
        config: {
          ...data.config,
          condition_schema: {
            condition: value
          },
          input_schema: {
            input: 'any'  // The input data to be routed
          },
          output_schema: {
            true: 'any',  // Output for true branch
            false: 'any'  // Output for false branch
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
        title: data.config?.title || 'Conditional Router',
        color: data.color || '#F6AD55',
        acronym: 'IF',
        config: data.config
      }}
      style={{ width: nodeWidth }}
    >
      <div className="p-3" ref={nodeRef}>
        {/* Input handle */}
        <div className={`${styles.handleRow} w-full justify-end mb-4`}>
          <Handle
            type="target"
            position={Position.Left}
            id="input"
            className={`${styles.handle} ${styles.handleLeft}`}
          />
          <div className="align-center flex flex-grow flex-shrink ml-2">
            <Input
              size="sm"
              variant="faded"
              radius="lg"
              value={data.condition || ''}
              placeholder="x > 0"
              label="Condition"
              description="Use input variables in expression"
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
              <span className="text-sm font-medium ml-auto text-success">If True →</span>
            </div>
            <Handle
              type="source"
              position={Position.Right}
              id="true"
              className={`${styles.handle} ${styles.handleRight}`}

            />
          </div>

          <div className={`${styles.handleRow} w-full justify-end`}>
            <div className="align-center flex flex-grow flex-shrink mr-2">
              <span className="text-sm font-medium ml-auto text-danger">If False →</span>
            </div>
            <Handle
              type="source"
              position={Position.Right}
              id="false"
              className={`${styles.handle} ${styles.handleRight}`}
            />
          </div>
        </div>
      </div>
    </BaseNode>
  );
};
