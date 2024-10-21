import React from 'react';
import { Handle } from 'reactflow';
import { useSelector } from 'react-redux';
import BaseNode from './BaseNode';
import styles from './DynamicNode.module.css';

const DynamicNode = ({ id, type }) => {
  const node = useSelector((state) => state.flow.nodes.find((n) => n.id === id));

  const renderHandles = () => {
    const inputSchema = node.data.config.input_schema || {};
    const outputSchema = node.data.config.output_schema || {};
    
    const inputs = Object.keys(inputSchema).length || 1;
    const outputs = Object.keys(outputSchema).length || 1;

    return (
      <>
        {Object.entries(inputSchema).length > 0 ? (
          Object.entries(inputSchema).map(([key, value], index) => (
            <div key={`input-${index}`} className={styles.inputHandleWrapper} style={{ top: `${(index + 1) * 100 / (inputs + 1)}%` }}>
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
            id="input-default"
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
                id={`output-${key}`}
                className={`${styles.handle} ${styles.handleRight}`}
              />
            </div>
          ))
        ) : (
          <Handle
            type="source"
            position="right"
            id="output-default"
            className={`${styles.handle} ${styles.handleRight}`}
            style={{ top: '50%' }}
          />
        )}
      </>
    );
  };

  return (
    <BaseNode id={id}>
      <div className={styles.nodeWrapper}>
        {renderHandles()}
        <div className="p-2">
          <h3 className="text-lg font-semibold">{type}</h3>
          <p className="text-sm text-gray-500">ID: {id}</p>
        </div>
      </div>
    </BaseNode>
  );
};

export default DynamicNode;
