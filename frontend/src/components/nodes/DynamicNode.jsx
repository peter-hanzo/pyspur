import React, { useEffect, useRef, useState } from 'react';
import { Handle } from 'reactflow';
import { useSelector } from 'react-redux';
import BaseNode from './BaseNode';
import styles from './DynamicNode.module.css';

const DynamicNode = ({ id, type }) => {
  const node = useSelector((state) => state.flow.nodes.find((n) => n.id === id));
  const nodeRef = useRef(null);
  const [nodeWidth, setNodeWidth] = useState('auto');

  useEffect(() => {
    if (nodeRef.current && node) { // Ensure node exists before accessing its properties
      const inputLabels = Object.keys(node.data?.config?.input_schema || {});
      const outputLabels = Object.keys(node.data?.config?.output_schema || {});
      const maxLabelLength = Math.max(
        ...inputLabels.map(label => label.length),
        ...outputLabels.map(label => label.length)
      );
      const calculatedWidth = Math.max(150, (type.length + maxLabelLength) * 10 + 100); // Adjust multiplier as needed
      setNodeWidth(`${calculatedWidth}px`);
    }
  }, [node]);

  const renderHandles = () => {
    if (!node) return null; // Return early if node is undefined

    const inputSchema = node.data?.config?.input_schema || {};
    const outputSchema = node.data?.config?.output_schema || {};

    const inputs = Object.keys(inputSchema).length || 1;
    const outputs = Object.keys(outputSchema).length || 1;

    return (
      <>
        {Object.entries(inputSchema).length > 0 ? (
          Object.entries(inputSchema).map(([key, value], index) => (
            <div key={`${index}`} className={styles.inputHandleWrapper} style={{ top: `${(index + 1) * 100 / (inputs + 1)}%` }}>
              <Handle
                type="target"
                position="left"
                id={`input-${key}`}
                className={`${styles.handle} ${styles.handleLeft}`}
              />
              <span className={styles.handleLabel}>{key}</span>
            </div>
          ))
        ) : (
          <Handle
            type="target"
            position="left"
            id="assistant_message"
            className={`${styles.handle} ${styles.handleLeft}`}
            style={{ top: '50%' }}
          />
        )}

        {Object.entries(outputSchema).length > 0 ? (
          Object.entries(outputSchema).map(([key, value], index) => (
            <div key={`output-${index}`} className={styles.outputHandleWrapper} style={{ top: `${(index + 1) * 100 / (outputs + 1)}%` }}>
              <span className={styles.handleLabel}>{key}</span>
              <Handle
                type="source"
                position="right"
                id={`${key}`}
                className={`${styles.handle} ${styles.handleRight}`}
              />
            </div>
          ))
        ) : (
          <Handle
            type="source"
            position="right"
            id="assistant_message"
            className={`${styles.handle} ${styles.handleRight}`}
            style={{ top: '50%' }}
          />
        )}
      </>
    );
  };

  if (!node) {
    return null; // Return null if the node is not found (i.e., it has been deleted)
  }

  return (
    <BaseNode id={id} data={node.data} style={{ width: nodeWidth }}>  {/* Pass node.data as the data prop */}
      <div className={styles.nodeWrapper} ref={nodeRef}>
        {renderHandles()}
      </div>
    </BaseNode>
  );
};

export default DynamicNode;
