import React, { useState } from 'react';
import { Handle } from '@xyflow/react';
import { useSelector } from 'react-redux';
import NodeOutputDisplay from './NodeOutputDisplay';
import styles from './DynamicNode.module.css';
import BaseNode from './BaseNode';

const OutputNode = ({ id, data, ...props }) => {
  const [isHovered, setIsHovered] = useState(false);
  const [isCollapsed, setIsCollapsed] = useState(false);
  const nodeData = data || (node && node.data);
  // Select the node data from the Redux store using the node id
  const node = useSelector((state) => state.flow.nodes.find((n) => n.id === id));

  const handleMouseEnter = () => {
    setIsHovered(true);
  };

  const handleMouseLeave = () => {
    setIsHovered(false);
  };

  const cardStyle = {
    borderColor: isHovered ? 'blue' : '#ccc',
    borderWidth: isHovered ? '3px' : '1px',
    borderStyle: 'solid',
    transition: 'border-color 0.1s, border-width 0.02s',
  };

  return (
    <div
      className={styles.outputNodeWrapper}
      style={{ zIndex: props.parentNode ? 1 : 0 }}
    >
      <BaseNode
        id={id}
        data={nodeData}
        style={{
          width: '300px',
          backgroundColor: undefined,
        }}
        isCollapsed={false}
        selected={props.selected}
      >
      <div className={styles.nodeWrapper}>
        {node ? (
          <NodeOutputDisplay node={node} />
        ) : (
          <div>No data available for this node</div>
        )}
      </div>
      </BaseNode>
    </div>
  );
};

export default OutputNode;