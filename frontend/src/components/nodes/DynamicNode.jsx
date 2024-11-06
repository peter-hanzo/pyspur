import React, { useEffect, useRef, useState } from 'react';
import { Handle } from '@xyflow/react';
import { useSelector } from 'react-redux';
import BaseNode from './BaseNode';
import styles from './DynamicNode.module.css';

const DynamicNode = ({ id, type, data, position, ...props }) => {
  const nodeRef = useRef(null);
  const [nodeWidth, setNodeWidth] = useState('auto');

  const node = useSelector((state) =>
    state.flow.nodes.find((n) => n.id === id)
  );

  const nodeData = data || (node && node.data);

  if (!nodeData) {
    return null;
  }

  useEffect(() => {
    if (nodeRef.current && nodeData) {
      const inputSchema = nodeData?.userconfig?.input_schema || nodeData?.input?.properties || {};
      const outputSchema = nodeData?.userconfig?.output_schema || nodeData?.output?.properties || {};

      const inputLabels = Object.keys(inputSchema);
      const outputLabels = Object.keys(outputSchema);

      const maxLabelLength = Math.max(
        ...inputLabels.map(label => label.length),
        ...outputLabels.map(label => label.length),
        (nodeData?.title || '').length / 1.5
      );

      const calculatedWidth = Math.max(300, maxLabelLength * 15);
      const finalWidth = Math.min(calculatedWidth, 600);

      setNodeWidth(`${finalWidth}px`);
    }
  }, [nodeData]);

  const renderHandles = () => {
    if (!nodeData) return null;

    const inputSchema = nodeData?.userconfig?.input_schema || nodeData?.input?.properties || {};
    const outputSchema = nodeData?.userconfig?.output_schema || nodeData?.output?.properties || {};

    const inputs = Object.keys(inputSchema).length;
    const outputs = Object.keys(outputSchema).length;

    return (
      <>
        {inputs > 0 ? (
          Object.entries(inputSchema).map(([key, value], index) => (
            <div
              key={`${index}`}
              className={styles.inputHandleWrapper}
              style={{
                top: `${(index + 1) * 100 / (inputs + 1)}%`,
                transform: 'translateY(-50%)'
              }}
            >
              <Handle
                type="target"
                position="left"
                id={`${key}`}
                className={`${styles.handle} ${styles.handleLeft}`}
                isConnectable={true}
              />
              <span className={styles.handleLabel}>{key}</span>
            </div>
          ))
        ) : null}

        {outputs > 0 ? (
          Object.entries(outputSchema).map(([key, value], index) => (
            <div
              key={`output-${index}`}
              className={styles.outputHandleWrapper}
              style={{
                top: `${(index + 1) * 100 / (outputs + 1)}%`,
                transform: 'translateY(-50%)'
              }}
            >
              <span className={styles.handleLabel}>{key}</span>
              <Handle
                type="source"
                position="right"
                id={`${key}`}
                className={`${styles.handle} ${styles.handleRight}`}
                isConnectable={true}
              />
            </div>
          ))
        ) : null}
      </>
    );
  };

  return (
    <div style={{
      position: 'relative',
      zIndex: props.parentNode ? 1 : 0
    }}>
      <BaseNode
        id={id}
        data={nodeData}
        style={{ width: nodeWidth }}
        selected={props.selected}
      >
        <div className={styles.nodeWrapper} ref={nodeRef}>
          {renderHandles()}
        </div>
      </BaseNode>
    </div>
  );
};

export default DynamicNode;
