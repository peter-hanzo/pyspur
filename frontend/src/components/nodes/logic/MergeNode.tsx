import React, { useState } from 'react';
import { Handle, Position, useHandleConnections } from '@xyflow/react';
import { useDispatch, useSelector } from 'react-redux';
import { RootState } from '../../../store/store';
import { updateNodeData } from '../../../store/flowSlice';
import { Select, SelectItem, Divider, Tooltip } from '@nextui-org/react';

import BaseNode from '../BaseNode';
import styles from '../DynamicNode.module.css';

interface NodeData {
  config?: {
    merge_strategy?: string;
    input_schemas?: Record<string, Record<string, string>>;
  };
  title?: string;
  color?: string;
  [key: string]: any;
}

interface MergeNodeProps {
  id: string;
  data: NodeData;
  selected?: boolean;
}

const MergeNode: React.FC<MergeNodeProps> = ({ id, data, selected }) => {
  const dispatch = useDispatch();
  const edges = useSelector((state: RootState) => state.flow.edges);
  const nodes = useSelector((state: RootState) => state.flow.nodes);
  const mergeStrategy = data?.config?.merge_strategy || 'concat';
  const [isCollapsed, setIsCollapsed] = useState(false);

  // Get connection status for the input handle
  const inputConnections = useHandleConnections({
    type: 'target',
    id: 'input'
  });

  // Get incoming edges and their source nodes
  const incomingBranches = edges
    .filter(edge => edge.target === id)
    .map(edge => {
      const sourceNode = nodes.find(node => node.id === edge.source);
      return {
        id: edge.source,
        sourceHandle: edge.sourceHandle,
        label: sourceNode?.data?.title || sourceNode?.id || 'Unknown Source'
      };
    });

  const handleStrategyChange = (value: string) => {
    dispatch(
      updateNodeData({
        id,
        data: {
          ...data,
          config: {
            ...data.config,
            merge_strategy: value,
          },
        },
      })
    );
  };

  return (
    <div className={styles.dynamicNodeWrapper}>
      <BaseNode
        id={id}
        data={data}
        isCollapsed={isCollapsed}
        setIsCollapsed={setIsCollapsed}
        style={{ backgroundColor: '#f0f7ff' }}
      >
        <div className={styles.nodeWrapper}>
          <div className="flex flex-col gap-3">
            <div className="flex items-center justify-between">
              <Select
                label="Strategy"
                selectedKeys={[mergeStrategy]}
                onChange={(e) => handleStrategyChange(e.target.value)}
                size="sm"
                className="max-w-[140px]"
              >
                <SelectItem
                  key="concat"
                  value="concat"
                  description="Combines arrays by joining them"
                >
                  Concatenate Arrays
                </SelectItem>
                <SelectItem
                  key="union"
                  value="union"
                  description="Merges objects by combining their properties"
                >
                  Union Objects
                </SelectItem>
              </Select>
            </div>

            {!isCollapsed && (
              <>
                <Divider />
                <div className="flex flex-col gap-2">
                  <div className="flex items-center justify-between">
                    <div className="text-xs font-semibold text-gray-500">
                      Incoming Branches ({incomingBranches.length})
                    </div>
                    <Tooltip content={incomingBranches.length === 0 ? "Connect input branches to merge their data" : "Add more branches to merge"}>
                    </Tooltip>
                  </div>
                  {incomingBranches.length === 0 ? (
                    <div className="text-xs text-gray-400 italic p-2 border border-dashed border-gray-200 rounded-md text-center">
                      Connect branches to merge their outputs
                    </div>
                  ) : (
                    incomingBranches.map((branch) => (
                      <div key={branch.id} className="flex items-center gap-2 p-2 bg-gray-50 rounded-md">
                        <div className="text-xs">
                          <span className="font-medium">{branch.label as string}</span>
                          {branch.sourceHandle && (
                            <span className="text-gray-500"> → {branch.sourceHandle as string}</span>
                          )}
                        </div>
                      </div>
                    ))
                  )}
                </div>
              </>
            )}

            {/* Input and Output Handles */}
            <div className={`${styles.handlesWrapper}`}>
              {/* Input Handle */}
              <div className={`${styles.handlesColumn} ${styles.inputHandlesColumn}`}>
                <div className={`${styles.handleRow} w-full justify-end`}>
                  <div className={`${styles.handleCell} ${styles.inputHandleCell}`}>
                    <Handle
                      type="target"
                      position={Position.Left}
                      id="input"
                      className={`${styles.handle} ${styles.handleLeft} ${isCollapsed ? styles.collapsedHandleInput : ''}`}

                    />
                  </div>
                </div>
              </div>

              {/* Output Handle */}
              <div className={`${styles.handlesColumn} ${styles.outputHandlesColumn}`}>
                <div className={`${styles.handleRow} w-full justify-end`}>
                  <div className={`${styles.handleCell} ${styles.outputHandleCell}`}>
                    <Handle
                      type="source"
                      position={Position.Right}
                      id="output"
                      className={`${styles.handle} ${styles.handleRight} ${isCollapsed ? styles.collapsedHandleOutput : ''}`}
                    />
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </BaseNode>
    </div>
  );
};

export default MergeNode;
