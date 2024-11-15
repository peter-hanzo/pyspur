import React, { useEffect, useRef, useState, useMemo } from 'react';
import { Handle } from '@xyflow/react';
import BaseNode from './BaseNode';
import styles from './DynamicNode.module.css';
import { Input } from '@nextui-org/react';
import useNode from '../../hooks/useNode';

const DynamicNode = ({ id, nodeTypeConfig, position }) => {
  const nodeRef = useRef(null);
  const [editingField, setEditingField] = useState(null);

  const {
    nodeData,
    input_schema,
    output_schema,
    handleSchemaKeyEdit,
  } = useNode(id);

  const memoizedInputSchema = useMemo(() => input_schema || {}, [input_schema]);
  const memoizedOutputSchema = useMemo(() => output_schema || {}, [output_schema]);
  const memoizedNodeData = useMemo(() => nodeData || {}, [nodeData]);

  const nodeWidth = useMemo(() => {
    if (!nodeRef.current || !memoizedNodeData) return 'auto';

    const inputLabels = Object.keys(memoizedInputSchema);
    const outputLabels = Object.keys(memoizedOutputSchema);

    const maxLabelLength = Math.max(
      ...inputLabels.map(label => label.length),
      ...outputLabels.map(label => label.length),
      (memoizedNodeData?.title || '').length / 1.5
    );

    const calculatedWidth = Math.max(300, maxLabelLength * 20);
    const finalWidth = Math.min(calculatedWidth, 600);

    return `${finalWidth}px`;
  }, [memoizedNodeData, memoizedInputSchema, memoizedOutputSchema]);

  const renderHandles = () => {
    if (!memoizedNodeData) return null;

    const inputSchema = input_schema || [];
    const outputSchema = output_schema || [];

    const inputs = inputSchema.length;
    const outputs = outputSchema.length;

    return (
      <div style={{ display: 'flex', width: '100%' }} id="handles">
        <div style={{ width: '50%' }}>
          {inputs > 0 && (
            <table style={{ width: '100%' }}>
              <tbody>
                {inputSchema.map((field, index) => (
                  <tr key={`${index}`}>
                    <td style={{ width: '20px' }}>
                      <Handle
                        type="target"
                        position="left"
                        id={`${field.field_name}`}
                        className={`${styles.handle} ${styles.handleLeft}`}
                        isConnectable={true}
                      />
                    </td>
                    <td className="text-left align-middle">
                      {editingField === field.field_name ? (
                        <Input
                          autoFocus
                          defaultValue={field.field_name}
                          size="sm"
                          variant="faded"
                          radius="lg"
                          onBlur={(e) => handleSchemaKeyEdit(field.field_name, e.target.value, 'input')}
                          onKeyDown={(e) => {
                            if (e.key === 'Enter') {
                              handleSchemaKeyEdit(field.field_name, e.target.value, 'input');
                            } else if (e.key === 'Escape') {
                              setEditingField(null);
                            }
                          }}
                          classNames={{
                            input: "bg-default-100",
                            inputWrapper: "shadow-none",
                          }}
                        />
                      ) : (
                        <span
                          className={`${styles.handleLabel} text-sm font-medium cursor-pointer hover:text-primary`}
                          onClick={() => setEditingField(field.field_name)}
                          style={{ maxWidth: '8rem', whiteSpace: 'normal', wordWrap: 'break-word' }}
                        >
                          {field.field_name}
                        </span>
                      )}
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
                {outputSchema.map((field, index) => (
                  <tr key={`output-${index}`} className="align-middle">
                    <td className="text-right align-middle">
                      {editingField === field.field_name ? (
                        <Input
                          autoFocus
                          defaultValue={field.field_name}
                          size="sm"
                          variant="faded"
                          radius="lg"
                          onBlur={(e) => handleSchemaKeyEdit(field.field_name, e.target.value, 'output')}
                          onKeyDown={(e) => {
                            if (e.key === 'Enter') {
                              handleSchemaKeyEdit(field.field_name, e.target.value, 'output');
                            } else if (e.key === 'Escape') {
                              setEditingField(null);
                            }
                          }}
                          classNames={{
                            input: "bg-default-100",
                            inputWrapper: "shadow-none",
                          }}
                        />
                      ) : (
                        <span
                          className={`${styles.handleLabel} text-sm font-medium cursor-pointer hover:text-primary`}
                          onClick={() => setEditingField(field.field_name)}
                          style={{ maxWidth: '8rem', whiteSpace: 'normal', wordWrap: 'break-word' }}
                        >
                          {field.field_name}
                        </span>
                      )}
                    </td>
                    <td style={{ width: '20px', verticalAlign: 'middle', textAlign: 'center' }}>
                      <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '100%' }}>
                        <Handle
                          type="source"
                          position="right"
                          id={`${field.field_name}`}
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
    }}>
      <BaseNode
        id={id}
        data={nodeData}
        style={{ width: nodeWidth }}
      >
        <div className={styles.nodeWrapper} ref={nodeRef}>
          {renderHandles()}
        </div>
      </BaseNode>
    </div>
  );
};

export default DynamicNode;
