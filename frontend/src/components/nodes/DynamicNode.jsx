import React, { useEffect, useRef, useState, useCallback } from 'react';
import { Handle } from '@xyflow/react';
import { useSelector, useDispatch } from 'react-redux';
import BaseNode from './BaseNode';
import styles from './DynamicNode.module.css';
import { Divider, Input } from '@nextui-org/react';
import { updateNodeData } from '../../store/flowSlice';

const DynamicNode = ({ id, type, data, position, ...props }) => {
  const nodeRef = useRef(null);
  const [nodeWidth, setNodeWidth] = useState('auto');
  const [editingField, setEditingField] = useState(null);
  const [newFieldValue, setNewFieldValue] = useState('');

  const node = useSelector((state) =>
    state.flow.nodes.find((n) => n.id === id)
  );

  const nodeData = data || (node && node.data);

  const dispatch = useDispatch();

  const handleSchemaKeyEdit = useCallback((oldKey, newKey, schemaType) => {
    if (oldKey === newKey || !newKey.trim()) {
      setEditingField(null);
      return;
    }

    const updatedSchema = {
      ...nodeData?.config?.[`${schemaType}_schema`],
      [newKey]: nodeData?.config?.[`${schemaType}_schema`][oldKey],
    };
    delete updatedSchema[oldKey];
    dispatch(updateNodeData({
      id,
      data: {
        config: {
          ...nodeData?.config,
          [`${schemaType}_schema`]: updatedSchema
        }
      }
    }));
    setEditingField(null);
  }, [dispatch, id, nodeData]);

  useEffect(() => {
    if (!nodeRef.current || !nodeData) return;

    const inputSchema = nodeData?.config?.input_schema || {};
    const outputSchema = nodeData?.config?.output_schema || {};

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

    const inputSchema = nodeData?.config?.input_schema || {};
    const outputSchema = nodeData?.config?.output_schema || {};

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
                      {editingField === key ? (
                        <Input
                          autoFocus
                          defaultValue={key}
                          size="sm"
                          variant="faded"
                          radius="lg"
                          onBlur={(e) => handleSchemaKeyEdit(key, e.target.value, 'input')}
                          onKeyDown={(e) => {
                            if (e.key === 'Enter') {
                              handleSchemaKeyEdit(key, e.target.value, 'input');
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
                          onClick={() => setEditingField(key)}
                        >
                          {key}
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
                {Object.entries(outputSchema).map(([key, value], index) => (
                  <tr key={`output-${index}`} className="align-middle">
                    <td className="text-right align-middle">
                      {editingField === key ? (
                        <Input
                          autoFocus
                          defaultValue={key}
                          size="sm"
                          variant="faded"
                          radius="lg"
                          onBlur={(e) => handleSchemaKeyEdit(key, e.target.value, 'output')}
                          onKeyDown={(e) => {
                            if (e.key === 'Enter') {
                              handleSchemaKeyEdit(key, e.target.value, 'output');
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
                          onClick={() => setEditingField(key)}
                        >
                          {key}
                        </span>
                      )}
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
