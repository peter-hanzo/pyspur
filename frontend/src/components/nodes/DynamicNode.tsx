import React, { useEffect, useRef, useState, useCallback } from 'react';
import { Handle, useHandleConnections, NodeProps } from '@xyflow/react';
import { useSelector, useDispatch } from 'react-redux';
import BaseNode from './BaseNode';
import styles from './DynamicNode.module.css';
import { Input } from '@nextui-org/react';
import {
  updateNodeData,
  updateEdgesOnHandleRename,
} from '../../store/flowSlice';
import { selectPropertyMetadata } from '../../store/nodeTypesSlice';
import { RootState } from '../../store/store';

interface NodeData {
  config?: {
    input_schema?: Record<string, any>;
    output_schema?: Record<string, any>;
    system_message?: string;
    user_message?: string;
  };
  title?: string;
}

interface SchemaMetadata {
  required?: boolean;
  title?: string;
  type?: string;
  [key: string]: any;
}

const updateMessageVariables = (message: string | undefined, oldKey: string, newKey: string): string | undefined => {
  if (!message) return message;

  const regex = new RegExp(`{{\\s*${oldKey}\\s*}}`, 'g');
  return message.replace(regex, `{{${newKey}}}`);
};

interface DynamicNodeProps extends NodeProps {
  id: string;
  type: string;
  data: NodeData;
  position: { x: number; y: number };
  selected?: boolean;
  parentNode?: string;
}

const DynamicNode: React.FC<DynamicNodeProps> = ({ id, type, data, position, ...props }) => {
  const nodeRef = useRef<HTMLDivElement | null>(null);
  const [nodeWidth, setNodeWidth] = useState<string>('auto');
  const [editingField, setEditingField] = useState<string | null>(null);
  const [isCollapsed, setIsCollapsed] = useState<boolean>(false);

  const node = useSelector((state: RootState) => state.flow.nodes.find((n) => n.id === id));
  const nodeData = data || (node && node.data);
  const dispatch = useDispatch();

  const edges = useSelector((state: RootState) => state.flow.edges);

  const inputMetadata = useSelector((state: RootState) => selectPropertyMetadata(state, `${type}.input`));
  const outputMetadata = useSelector((state: RootState) => selectPropertyMetadata(state, `${type}.output`));

  const excludeSchemaKeywords = (metadata: SchemaMetadata): Record<string, any> => {
    const schemaKeywords = ['required', 'title', 'type'];
    return Object.keys(metadata).reduce((acc: Record<string, any>, key) => {
      if (!schemaKeywords.includes(key)) {
        acc[key] = metadata[key];
      }
      return acc;
    }, {});
  };

  const cleanedInputMetadata = excludeSchemaKeywords(inputMetadata || {});
  const cleanedOutputMetadata = excludeSchemaKeywords(outputMetadata || {});

  const handleSchemaKeyEdit = useCallback(
    (oldKey: string, newKey: string, schemaType: 'input_schema' | 'output_schema') => {
      newKey = newKey.replace(/\s+/g, '_');
      if (oldKey === newKey || !newKey.trim()) {
        setEditingField(null);
        return;
      }

      const updatedSchema = {
        ...nodeData?.config?.[schemaType],
        [newKey]: nodeData?.config?.[schemaType]?.[oldKey],
      };
      delete updatedSchema[oldKey];

      let updatedConfig = {
        ...nodeData?.config,
        [schemaType]: updatedSchema,
      };

      if (schemaType === 'input_schema') {
        if (nodeData?.config?.system_message) {
          updatedConfig.system_message = updateMessageVariables(
            nodeData.config.system_message,
            oldKey,
            newKey
          );
        }
        if (nodeData?.config?.user_message) {
          updatedConfig.user_message = updateMessageVariables(
            nodeData.config.user_message,
            oldKey,
            newKey
          );
        }
      }

      dispatch(
        updateNodeData({
          id,
          data: {
            config: updatedConfig,
          },
        })
      );

      dispatch(
        updateEdgesOnHandleRename({
          nodeId: id,
          oldHandleId: oldKey,
          newHandleId: newKey,
          schemaType,
        })
      );

      setEditingField(null);
    },
    [dispatch, id, nodeData]
  );

  useEffect(() => {
    if (!nodeRef.current || !nodeData) return;

    const inputSchema = nodeData?.config?.['input_schema'] || cleanedInputMetadata || {};
    const outputSchema = nodeData?.config?.['output_schema'] || cleanedOutputMetadata || {};

    const inputLabels = Object.keys(inputSchema);
    const outputLabels = Object.keys(outputSchema);

    const maxLabelLength = Math.max(
      ...inputLabels.map((label) => label.length),
      ...outputLabels.map((label) => label.length),
      (nodeData?.title || '').length / 1.5
    );

    const calculatedWidth = Math.max(300, maxLabelLength * 15);
    const finalWidth = Math.min(calculatedWidth, 600);

    setNodeWidth(`${finalWidth}px`);
  }, [nodeData, cleanedInputMetadata, cleanedOutputMetadata]);

  interface HandleRowProps {
    keyName: string;
  }

  const InputHandleRow: React.FC<HandleRowProps> = ({ keyName }) => {
    const connections = useHandleConnections({ type: 'target', id: keyName });

    return (
      <tr key={keyName}>
        <td className={`${styles.handleCell} border-r border-default-300 w-0 ml-2`}>
          <Handle
            type="target"
            position="left"
            id={keyName}
            className={`${styles.handle} ${styles.handleLeft} ${isCollapsed ? styles.collapsedHandleInput : ''}`}
            isConnectable={!isCollapsed && connections.length === 0}
          />
        </td>
        {!isCollapsed && (
          <td className="text-left align-middle pl-1">
            {editingField === keyName ? (
              <Input
                autoFocus
                defaultValue={keyName}
                size="sm"
                variant="faded"
                radius="lg"
                onBlur={(e) => handleSchemaKeyEdit(keyName, e.target.value, 'input_schema')}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') {
                    handleSchemaKeyEdit(keyName, (e.target as HTMLInputElement).value, 'input_schema');
                  } else if (e.key === 'Escape') {
                    setEditingField(null);
                  }
                }}
                classNames={{
                  input: 'bg-default-100',
                  inputWrapper: 'shadow-none',
                }}
              />
            ) : (
              <span
                className={`${styles.handleLabel} text-sm font-medium cursor-pointer hover:text-primary`}
                onClick={() => setEditingField(keyName)}
              >
                {keyName}
              </span>
            )}
          </td>
        )}
      </tr>
    );
  };

  const OutputHandleRow: React.FC<HandleRowProps> = ({ keyName }) => {
    return (
      <tr key={`output-${keyName}`} className="align-middle">
        {!isCollapsed && (
          <td className="text-right align-middle pr-1">
            {editingField === keyName ? (
              <Input
                autoFocus
                defaultValue={keyName}
                size="sm"
                variant="faded"
                radius="lg"
                onBlur={(e) => handleSchemaKeyEdit(keyName, e.target.value, 'output_schema')}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') {
                    handleSchemaKeyEdit(keyName, (e.target as HTMLInputElement).value, 'output_schema');
                  } else if (e.key === 'Escape') {
                    setEditingField(null);
                  }
                }}
                classNames={{
                  input: 'bg-default-100',
                  inputWrapper: 'shadow-none',
                }}
              />
            ) : (
              <span
                className={`${styles.handleLabel} text-sm font-medium cursor-pointer hover:text-primary`}
                onClick={() => setEditingField(keyName)}
              >
                {keyName}
              </span>
            )}
          </td>
        )}
        <td className={`${styles.handleCell} ${styles.outputHandleCell} border-l border-default-300 w-0 pl-1`}>
          <div className={styles.handleWrapper}>
            <Handle
              type="source"
              position="right"
              id={keyName}
              className={`${styles.handle} ${styles.handleRight} ${isCollapsed ? styles.collapsedHandleOutput : ''}`}
              isConnectable={!isCollapsed}
            />
          </div>
        </td>
      </tr>
    );
  };

  const renderHandles = () => {
    if (!nodeData) return null;

    const inputSchema = nodeData?.config?.['input_schema'] || cleanedInputMetadata || {};
    const outputSchema = nodeData?.config?.['output_schema'] || cleanedOutputMetadata || {};

    const inputs = Object.keys(inputSchema).length;
    const outputs = Object.keys(outputSchema).length;

    return (
      <div className={styles.handlesWrapper} id="handles">
        {/* Input Handles */}
        <div className={styles.handlesColumn}>
          {inputs > 0 && (
            <table style={{ width: '100%' }}>
              <tbody>
                {Object.keys(inputSchema).map((key) => (
                  <InputHandleRow key={key} keyName={key} />
                ))}
              </tbody>
            </table>
          )}
        </div>

        {/* Output Handles */}
        <div className={styles.handlesColumn}>
          {outputs > 0 && (
            <table style={{ width: '100%' }}>
              <tbody>
                {Object.keys(outputSchema).map((key) => (
                  <OutputHandleRow key={key} keyName={key} />
                ))}
              </tbody>
            </table>
          )}
        </div>
      </div>
    );
  };

  const isConditionalNode = type === 'ConditionalNode';

  return (
    <div
      className={styles.dynamicNodeWrapper}
      style={{ zIndex: props.parentNode ? 1 : 0 }}
    >
      <BaseNode
        id={id}
        data={nodeData}
        style={{
          width: nodeWidth,
          backgroundColor: isConditionalNode ? '#e0f7fa' : undefined,
        }}
        isCollapsed={isCollapsed}
        setIsCollapsed={setIsCollapsed}
        selected={props.selected}
      >
        <div className={styles.nodeWrapper} ref={nodeRef}>
          {isConditionalNode ? (
            <div>
              <strong>Conditional Node</strong>
            </div>
          ) : null}
          {renderHandles()}
        </div>
      </BaseNode>
    </div>
  );
};

export default DynamicNode;
