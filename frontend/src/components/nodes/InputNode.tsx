import React, { useEffect, useRef, useState, useCallback } from 'react';
import { Handle, Position } from '@xyflow/react';
import { useDispatch, useSelector } from 'react-redux';
import BaseNode from './BaseNode';
import {
  setWorkflowInputVariable,
  deleteWorkflowInputVariable,
  updateWorkflowInputVariableKey,
} from '../../store/flowSlice';
import { Input, Button } from '@nextui-org/react';
import { Icon } from '@iconify/react';
import styles from './InputNode.module.css';
import { useSaveWorkflow } from '../../hooks/useSaveWorkflow';
import { RootState } from '../../store/store';

interface InputNodeProps {
  id: string;
  data?: {
    title?: string;
    [key: string]: any;
  };
  [key: string]: any;
}

interface WorkflowNode {
  id: string;
  [key: string]: any;
}

const InputNode: React.FC<InputNodeProps> = ({ id, data, ...props }) => {
  const dispatch = useDispatch();
  const nodeRef = useRef<HTMLDivElement | null>(null);
  const [nodeWidth, setNodeWidth] = useState<string>('auto');
  const [editingField, setEditingField] = useState<string | null>(null);
  const [newFieldValue, setNewFieldValue] = useState<string>('');
  const [isCollapsed, setIsCollapsed] = useState<boolean>(false);
  const incomingEdges = useSelector((state: RootState) => state.flow.edges.filter((edge) => edge.target === id));

  const outputSchema = data?.config?.output_schema || {};
  const outputSchemaKeys = Object.keys(outputSchema);

  useEffect(() => {
    if (nodeRef.current) {
      const incomingSchemaKeys = incomingEdges.map((edge) => edge.source);
      const maxLabelLength = Math.max(
        (Math.max(...incomingSchemaKeys.map((label) => label.length)) +
         Math.max(...outputSchemaKeys.map((label) => label.length))),
        (data?.title || '').length / 1.5
      );

      const calculatedWidth = Math.max(300, maxLabelLength * 15);
      const finalWidth = Math.min(calculatedWidth, 600);
      if (finalWidth !== parseInt(nodeWidth)){
        setNodeWidth(`${finalWidth}px`);
      }
    }
  }, [data, outputSchemaKeys]);

  const handleAddWorkflowInputVariable = useCallback(() => {
    if (!newFieldValue.trim()) return;
    const newKey = newFieldValue.trim();

    dispatch(
      setWorkflowInputVariable({
        key: newKey,
        value: 'str',
      })
    );
    setNewFieldValue('');
  }, [dispatch, newFieldValue]);

  const handleDeleteWorkflowInputVariable = useCallback(
    (keyToDelete: string) => {
      dispatch(deleteWorkflowInputVariable({ key: keyToDelete }));
    },
    [dispatch]
  );

  const handleWorkflowInputVariableKeyEdit = useCallback(
    (oldKey: string, newKey: string) => {
      if (oldKey === newKey || !newKey.trim()) {
        setEditingField(null);
        return;
      }

      dispatch(updateWorkflowInputVariableKey({ oldKey, newKey }));
      setEditingField(null);
    },
    [dispatch]
  );

  const InputHandleRow: React.FC<{keyName: string}> = ({ keyName }) => {
    return (
      <div className={`flex overflow-hidden w-full justify-end whitespace-nowrap items-center`} key={keyName} id={`input-${keyName}-row`}>
        <div className={`${styles.handleCell} ${styles.inputHandleCell}`} id={`input-${keyName}-handle`}>
          <Handle
            type="target"
            position={Position.Left}
            id={keyName}
            className={`${styles.handle} ${styles.handleLeft} ${isCollapsed ? styles.collapsedHandleInput : ''
              }`}
            isConnectable={!isCollapsed}
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
                classNames={{
                  input: 'bg-default-100',
                  inputWrapper: 'shadow-none',
                }}
              />
            ) : (
              <span
                className={`${styles.handleLabel} text-sm font-medium cursor-pointer hover:text-primary mr-auto overflow-hidden text-ellipsis whitespace-nowrap`}
              >
                {keyName}
              </span>
            )}
          </div>
        )}
      </div>
    );
  };

  const renderWorkflowInputs = () => {
    return (
      <div className="flex w-full flex-row" id="handles">
        {incomingEdges.length > 0 && (
          <div className={`${styles.handlesColumn} ${styles.inputHandlesColumn}`} id="input-handles">
            {incomingEdges.map((edge) => (
              <InputHandleRow keyName={edge.source} />
            ))}
          </div>
        )}
        <div className={`${styles.handlesColumn} border-r mr-1`}>
          {outputSchemaKeys.length > 0 && (
            <table style={{ width: '100%' }}>
              <tbody>
                {outputSchemaKeys.map((key) => (
                  <tr key={key} className="relative w-full px-4 py-2">
                    <td className={styles.handleLabelCell}>
                      {!isCollapsed && (
                        <div className="flex items-center gap-2">
                          {editingField === key ? (
                            <Input
                              autoFocus
                              defaultValue={key}
                              size="sm"
                              variant="faded"
                              radius="lg"
                              onBlur={(e) => {
                                const target = e.target as HTMLInputElement;
                                handleWorkflowInputVariableKeyEdit(key, target.value);
                              }}
                              onKeyDown={(e) => {
                                const target = e.target as HTMLInputElement;
                                if (e.key === 'Enter') {
                                  handleWorkflowInputVariableKeyEdit(key, target.value);
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
                            <div className="flex flex-col w-full gap-1">
                              <div className="flex items-center justify-between">
                                <span
                                  className={`${styles.handleLabel} text-sm font-medium cursor-pointer hover:text-primary`}
                                  onClick={() => setEditingField(key)}
                                >
                                  {key}
                                </span>
                                <Button
                                  isIconOnly
                                  size="sm"
                                  variant="light"
                                  onClick={() => handleDeleteWorkflowInputVariable(key)}
                                >
                                  <Icon icon="solar:trash-bin-minimalistic-linear" width={16} />
                                </Button>
                              </div>
                            </div>
                          )}
                        </div>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
        <div className="right-0 w-4 items-center justify-center flex">
          <Handle
            type="source"
            position={Position.Right}
            id={id}
            className={`${styles.handle} ${styles.handleRight} ${
              isCollapsed ? styles.collapsedHandleOutput : ''
            }`}
            isConnectable={!isCollapsed}
          />
        </div>
      </div>
    );
  };

  const renderAddField = () =>
    !isCollapsed && (
      <div className="flex items-center gap-2 px-4 py-2">
        <Input
          placeholder="Enter new field name"
          value={newFieldValue}
          onChange={(e) => setNewFieldValue(e.target.value)}
          size="sm"
          variant="faded"
          radius="lg"
          onKeyDown={(e) => {
            if (e.key === 'Enter') {
              handleAddWorkflowInputVariable();
            }
          }}
          classNames={{
            input: "bg-background",
            inputWrapper: "shadow-none bg-background"
          }}
          endContent={
            <Button
              isIconOnly
              size="sm"
              variant="light"
              onClick={handleAddWorkflowInputVariable}
              className="text-default-400 hover:text-default-500"
            >
              <Icon icon="solar:add-circle-bold" width={16} className="text-default-500" />
            </Button>
          }
        />
      </div>
    );

  return (
    <div className={styles.inputNodeWrapper}>
      <BaseNode
        id={id}
        isInputNode={true}
        isCollapsed={isCollapsed}
        setIsCollapsed={setIsCollapsed}
        data={{
          ...data,
          acronym: 'IN',
          color: '#2196F3',
        }}
        style={{ width: nodeWidth }}
        className="hover:!bg-background"
        {...props}
      >
        <div className={styles.nodeWrapper} ref={nodeRef}>
          {renderWorkflowInputs()}
          {renderAddField()}
        </div>
      </BaseNode>
    </div>
  );
};

export default InputNode;