import React, { useEffect, useRef, useState } from 'react';
import { Handle } from '@xyflow/react';
import { useSelector } from 'react-redux';
import BaseNode from './BaseNode';
import styles from './DynamicNode.module.css';
import { Divider } from '@nextui-org/react';

const DynamicNode = ({ id, type, data, position, ...props }) => {
  const nodeRef = useRef(null);
  const [nodeWidth, setNodeWidth] = useState('auto');

  const node = useSelector((state) =>
    state.flow.nodes.find((n) => n.id === id)
  );

  const nodeData = data || (node && node.data);


  useEffect(() => {
    if (!nodeRef.current || !nodeData) return;
  
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
  }, [nodeData]);

  const renderHandles = () => {
    if (!nodeData) return null;

    const inputSchema = nodeData?.userconfig?.input_schema || nodeData?.input?.properties || {};
    const outputSchema = nodeData?.userconfig?.output_schema || nodeData?.output?.properties || {};

    const inputs = Object.keys(inputSchema).length;
    const outputs = Object.keys(outputSchema).length;

    return (
      <div style={{ display: 'flex', width: '100%' }} id="handles">
        <div style={{ width: '50%' }}>
          {inputs > 0 && (
            <table style={{ width: '100%' }}>
              <tbody>
                {Object.entries(inputSchema).map(([key, value], index) => (
                  <tr key={`${index}`}>
                    <td style={{ width: '20px' }}>
                      <Handle
                        type="target"
                        position="left"
                        id={`${key}`}
                        className={`${styles.handle} ${styles.handleLeft}`}
                        isConnectable={true}
                      />
                    </td>
                    <td className="text-left align-middle">
                      <span className={styles.handleLabel} style={{ whiteSpace: 'normal', wordWrap: 'break-word', display: 'flex' }}>
                        {key}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
        <div style={{ width: '50%' }}>
          {outputs > 0 && (
            <table style={{ width: '100%' }}>
              <tbody>
                {Object.entries(outputSchema).map(([key, value], index) => (
                  <tr key={`output-${index}`} className="align-middle">
                    <td className="text-right align-middle">
                      <span className={styles.handleLabel} style={{ whiteSpace: 'normal', wordWrap: 'break-word', display: 'flex', justifyContent: 'end'}}>
                        {key}
                      </span>
                    </td>
                    <td style={{ width: '20px', verticalAlign: 'middle', textAlign: 'center' }}>
                      <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '100%' }}>
                        <Handle
                          type="source"
                          position="right"
                          id={`${key}`}
                          className={`${styles.handle} ${styles.handleRight}`}
                          isConnectable={true}
                        />
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      </div>
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
