import React, { useState, useMemo, useEffect, useRef } from 'react';
import { Handle, Position, useHandleConnections } from '@xyflow/react';
import { useSelector } from 'react-redux';
import { RootState } from '../../../store/store';
import { Tooltip } from '@nextui-org/react';

import BaseNode from '../BaseNode';
import styles from '../DynamicNode.module.css';

interface NodeData {
  config?: {
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
  const edges = useSelector((state: RootState) => state.flow.edges);
  const nodes = useSelector((state: RootState) => state.flow.nodes);
  const [isCollapsed, setIsCollapsed] = useState(false);
  const nodeRef = useRef<HTMLDivElement | null>(null);
  const [nodeWidth, setNodeWidth] = useState<string>('auto');

  // Get connection status for the input handle
  const inputConnections = useHandleConnections({
    type: 'target',
    id: 'input'
  });

  // Get incoming edges and their source nodes - recalculate when nodes or edges change
  const incomingBranches = useMemo(() => {
    return edges
      .filter(edge => edge.target === id)
      .map(edge => {
        const sourceNode = nodes.find(node => node.id === edge.source);
        return {
          id: edge.source,
          sourceHandle: edge.sourceHandle,
          label: sourceNode?.data?.config.title || sourceNode?.id || 'Unknown Source'
        };
      });
  }, [edges, nodes, id]); // Recompute when edges, nodes, or id changes

  // Calculate nodeWidth based on title length
  useEffect(() => {
    if (!nodeRef.current || !data) return;

    const titleLength = ((data?.title || data?.config?.title || '').length + 10) * 1.25;

    const minNodeWidth = 300;
    const maxNodeWidth = 600;

    const finalWidth = Math.min(
      Math.max(titleLength * 10, minNodeWidth),
      maxNodeWidth
    );

    setNodeWidth(`${finalWidth}px`);
  }, [data]);

  return (
    <div className={styles.dynamicNodeWrapper}>
      <BaseNode
        id={id}
        data={data}
        isCollapsed={isCollapsed}
        setIsCollapsed={setIsCollapsed}
        style={{ width: nodeWidth }}
      >
        <div className={styles.nodeWrapper} ref={nodeRef}>
          <div className="flex flex-col gap-3">
            {!isCollapsed && (
              <>
                <div className="flex flex-col gap-2">
                  <div className="flex items-center justify-between">
                    <div className="text-xs font-semibold text-gray-500">
                      Incoming Branches ({incomingBranches.length})
                    </div>

                  </div>
                  {incomingBranches.length === 0 ? (
                    <div className="text-xs text-gray-400 italic p-2 border border-dashed border-gray-200 rounded-md text-center">
                      Connect branches to continue the flow
                    </div>
                  ) : (
                    incomingBranches.map((branch) => (
                      <div key={branch.id} className="flex items-center gap-2 p-2 bg-gray-50 rounded-md">
                        <div className="text-sm">
                          <span className="font-medium">{branch.label}</span>

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
                <div className={`${styles.handleRow} w-full`}>
                  <div className={`${styles.handleCell} ${styles.inputHandleCell}`}>
                    <Handle
                      type="target"
                      position={Position.Left}
                      id="input"
                      className={`${styles.handle} ${styles.handleLeft} ${isCollapsed ? styles.collapsedHandleInput : ''}`}
                      style={{ left: '0px' }}
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
