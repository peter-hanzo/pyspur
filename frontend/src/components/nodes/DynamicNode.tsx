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

    const maxInputLabelLength = inputLabels.reduce((max, label) => Math.max(max, label.length), 0);
    const maxOutputLabelLength = outputLabels.reduce((max, label) => Math.max(max, label.length), 0);
    const titleLength = ((nodeData?.title || '').length + 10) * 1.25;

    const maxLabelLength = Math.max(
      (maxInputLabelLength + maxOutputLabelLength + 5),
      titleLength
    );

    const minNodeWidth = 300;
    const maxNodeWidth = 600;

    const finalWidth = Math.min(
      Math.max(maxLabelLength * 10, minNodeWidth),
      maxNodeWidth
    );

    setNodeWidth(`${finalWidth}px`);
  }, [nodeData, cleanedInputMetadata, cleanedOutputMetadata]);

  interface HandleRowProps {
    keyName: string;
  }

  const InputHandleRow: React.FC<HandleRowProps> = ({ keyName }) => {
    const connections = useHandleConnections({ type: 'target', id: keyName });

    return (
      <div className={`${styles.handleRow} w-full justify-end`} key={keyName} id={`input-${keyName}-row`}>
        <div className={`${styles.handleCell} ${styles.inputHandleCell}`} id={`input-${keyName}-handle`}>
          <Handle
            type="target"
            position="left"
            id={keyName}
            className={`${styles.handle} ${styles.handleLeft} ${
              isCollapsed ? styles.collapsedHandleInput : ''
            }`}
            isConnectable={!isCollapsed && connections.length === 0}
          />
        </div>
        <div className="border-r border-gray-300 h-full mx-0"></div>
        {!isCollapsed && (
          <div className="align-center flex flex-grow flex-shrink ml-[0.5rem] max-w-full overflow-hidden" id={`input-${keyName}-label`}>
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
                className={`${styles.handleLabel} text-sm font-medium cursor-pointer hover:text-primary mr-auto overflow-hidden text-ellipsis whitespace-nowrap`}
                onClick={() => setEditingField(keyName)}
              >
                {keyName}
              </span>
            )}
          </div>
        )}
      </div>
    );
  };

  const OutputHandleRow: React.FC<HandleRowProps> = ({ keyName }) => {
    return (
      <div className={`${styles.handleRow} w-full justify-end`} key={`output-${keyName}`} id={`output-${keyName}-row`} >
        {!isCollapsed && (
          <div className="align-center flex flex-grow flex-shrink mr-[0.5rem] max-w-full overflow-hidden" id={`output-${keyName}-label`}>
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
                className={`${styles.handleLabel} text-sm font-medium cursor-pointer hover:text-primary ml-auto overflow-hidden text-ellipsis whitespace-nowrap`}
                onClick={() => setEditingField(keyName)}
              >
                {keyName}
              </span>
            )}
          </div>
        )}
        <div className="border-l border-gray-300 h-full mx-0"></div>
        <div className={`${styles.handleCell} ${styles.outputHandleCell}`} id={`output-${keyName}-handle`}>
          <Handle
            type="source"
            position="right"
            id={keyName}
            className={`${styles.handle} ${styles.handleRight} ${
              isCollapsed ? styles.collapsedHandleOutput : ''
            }`}
            isConnectable={!isCollapsed}
          />
        </div>
      </div>
    );
  };

  const renderHandles = () => {
    if (!nodeData) return null;

    const inputSchema = nodeData?.config?.['input_schema'] || cleanedInputMetadata || {};
    const outputSchema = nodeData?.config?.['output_schema'] || cleanedOutputMetadata || {};

    return (
      <div className={`${styles.handlesWrapper}`} id="handles">
        {/* Input Handles */}
        <div className={`${styles.handlesColumn} ${styles.inputHandlesColumn}`} id="input-handles">
          {Object.keys(inputSchema).map((key) => (
            <InputHandleRow key={key} keyName={key} />
          ))}
        </div>

        {/* Output Handles */}
        <div className={`${styles.handlesColumn} ${styles.outputHandlesColumn}`} id="output-handles">
          {Object.keys(outputSchema).map((key) => (
            <OutputHandleRow key={key} keyName={key} />
          ))}
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
        <div className={styles.nodeWrapper} ref={nodeRef} id={`node-${id}-wrapper`}>
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
